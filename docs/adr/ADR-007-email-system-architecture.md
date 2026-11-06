# ADR-007: Email System Architecture

## Status
**Accepted (âmbito reduzido no launch v1.0)** | Data: 2025-01-23

> **Atualização 2026-07-13 (sunset market-fit).** A **feature** de envio de email a
> participantes (`SendEmail`) foi descontinuada no launch v1.0 — ver
> `docs/plans/2026-07-02-feature-sunset-design.md` §3. O motor de email descrito
> neste ADR **mantém-se**, mas exclusivamente como **infra de notificação** dos
> fluxos internos que ficam: convites de colaboradores, confirmação de participação,
> emails de criação/atualização de evento, welcome (Cognito) e limpeza GDPR. Não há
> composição/envio de campanhas a participantes. Ler este ADR como "notificação
> transacional", não como feature de comunicação a participantes.

## Contexto

O Bafatorio necessita de um sistema de email robusto para comunicação com utilizadores e participantes de eventos. Os requisitos incluem:

- Envio assíncrono para evitar timeouts
- Suporte multilíngue (Português, Inglês, Francês)
- Templates personalizados por tipo de email
- Tracking de status de entrega
- Rate limiting para respeitar limites da AWS SES
- Retry strategy para falhas transitórias
- Dead Letter Queue para emails falhados

## Decisão

Implementámos uma arquitetura baseada em filas SQS com processamento assíncrono via Lambda, utilizando AWS SES para entrega de emails e DynamoDB para tracking de status.

### Arquitetura de Alto Nível

```
┌──────────────────────────────────────────────────────────────────────────────┐
│                            EMAIL SYSTEM FLOW                                  │
└──────────────────────────────────────────────────────────────────────────────┘

┌─────────────┐     ┌─────────────────┐     ┌──────────────┐     ┌────────────┐
│   AppSync   │────▶│  send-email     │────▶│  SQS Queue   │────▶│ process-   │
│   Mutation  │     │  Lambda         │     │ (EmailQueue) │     │ email-queue│
└─────────────┘     └─────────────────┘     └──────────────┘     └────────────┘
                           │                        │                    │
                           │                        │                    ▼
                           ▼                        │             ┌────────────┐
                    ┌─────────────┐                 │             │  AWS SES   │
                    │ DynamoDB    │                 │             │  (Email    │
                    │ EmailLog    │◀────────────────┴─────────────│  Delivery) │
                    │ (QUEUED)    │                               └────────────┘
                    └─────────────┘                                      │
                           ▲                                             │
                           │                                             ▼
                    ┌─────────────┐     ┌──────────────┐         ┌────────────┐
                    │ Update to   │◀────│ Failed after │◀────────│ Recipient  │
                    │ SENT/FAILED │     │ 3 retries    │         │            │
                    └─────────────┘     └──────────────┘         └────────────┘
                                               │
                                               ▼
                                        ┌──────────────┐
                                        │ Dead Letter  │
                                        │ Queue (DLQ)  │
                                        └──────────────┘
```

## Componentes Principais

### 1. Tipos de Email Suportados

| Tipo | Descrição | Prioridade |
|------|-----------|------------|
| `welcome` | Boas-vindas a novo utilizador | 2 (Normal) |
| `participantInvitation` | Convite para participante | 3 (Alta) |
| `participantConfirmation` | Confirmação de participação | 3 (Alta) |
| `eventCreation` | Confirmação de criação de evento | 2 (Normal) |
| `saveTheDate` | Save the date para evento | 2 (Normal) |
| `eventReminder` | Lembrete de evento | 2 (Normal) |
| `eventUpdate` | Atualização de evento | 2 (Normal) |
| `loginAlert` | Alerta de novo login | 2 (Normal) |

### 2. Estrutura de Ficheiros

```
amplify/function/send-email/
├── handler.ts                    # AppSync resolver entry point
├── emailService.ts               # Core email service (466 lines)
├── templateManager.ts            # Template initialization
├── resource.ts                   # Function definition
│
├── process-email-queue/          # SQS processor Lambda
│   ├── handler.ts               
│   └── resource.ts              
│
├── templates/                    # Email templates
│   ├── content/                 # Template content
│   └── logic/                   # Template logic
│
└── utils/                        # Utility modules
    ├── batchProcessor.ts        # Batch processing utilities
    ├── metrics.ts               # CloudWatch metrics
    ├── rateLimiter.ts           # SES rate limiting
    ├── retryStrategy.ts         # Retry with exponential backoff
    └── sleep.ts                 # Sleep utility
```

### 3. Interfaces Principais

```typescript
// Dados de email para envio
interface EmailData {
  recipient: {
    name: string;
    email: string;
  };
  eventName?: string;
  eventDate?: string;
  eventLocation?: string;
  confirmationLink?: string;
  participantId?: string;
  eventId?: string;
  language?: 'pt' | 'en' | 'fr';
}

// Mensagem na fila SQS
interface QueueMessage {
  emailType: EmailType;
  data: EmailData;
  attempts?: number;
  priority?: number;
  timestamp?: string;
}

// Log de email no DynamoDB
interface EmailLogEntry {
  participantId: string;
  eventId: string;
  status: 'QUEUED' | 'SENT' | 'FAILED';
  attempts: number;
  errorMessage?: string;
  messageId: string;
  createdAt: string;
  updatedAt: string;
}
```

### 4. Fluxo de Processamento

#### 4.1 Envio Único (Single Email)

```typescript
// 1. Mutation GraphQL chama sendEmail
sendEmail(input: {
  to: "participant@email.com",
  emailType: "participantInvitation",
  participantName: "João Silva",
  eventName: "Conferência Tech 2025",
  eventId: "evt_123",
  participantId: "part_456",
  language: "pt"
})

// 2. Lambda enfileira na SQS
await enqueueEmail(emailType, {
  recipient: { name, email },
  eventName,
  confirmationLink,
  participantId,
  eventId,
  language
});

// 3. Cria registro no DynamoDB com status QUEUED
await updateEmailLog({
  participantId,
  eventId,
  status: 'QUEUED',
  messageId: sqsMessageId
});

// 4. SQS trigger invoca processEmailQueue Lambda
// 5. Lambda processa mensagem e envia via SES
// 6. Atualiza status para SENT ou FAILED
```

#### 4.2 Envio em Massa (Bulk Email)

```typescript
// Processamento em lotes de 10 emails
const batchSize = 10;
const batches = [];

for (let i = 0; i < participants.length; i += batchSize) {
  batches.push(participants.slice(i, i + batchSize));
}

// Processa cada lote sequencialmente para respeitar rate limits
for (const batch of batches) {
  await Promise.all(batch.map(p => sendEmail(emailType, p)));
  await sleep(100); // Pequena pausa entre lotes
}
```

### 5. Sistema de Templates

#### 5.1 Nomenclatura de Templates

Os templates AWS SES seguem o padrão: `{TemplateName}_{language}`

| Template Base | pt | en | fr |
|--------------|----|----|-----|
| WelcomeTemplate | `WelcomeTemplate_pt` | `WelcomeTemplate_en` | `WelcomeTemplate_fr` |
| ParticipantInvitationTemplate | `ParticipantInvitationTemplate_pt` | `ParticipantInvitationTemplate_en` | `ParticipantInvitationTemplate_fr` |
| EventReminderTemplate | `EventReminderTemplate_pt` | `EventReminderTemplate_en` | `EventReminderTemplate_fr` |

#### 5.2 Mapeamento de Assuntos (Subjects)

```typescript
const SUBJECT_MAP: Record<EmailType, Record<string, string>> = {
  welcome: {
    pt: 'Bem-vindo ao Bafatorio!',
    en: 'Welcome to Bafatorio!',
    fr: 'Bienvenue à Bafatorio!'
  },
  participantInvitation: {
    pt: 'Você foi convidado para {eventName}',
    en: 'You have been invited to {eventName}',
    fr: 'Vous êtes invité à {eventName}'
  },
  participantConfirmation: {
    pt: 'Confirmação de participação - {eventName}',
    en: 'Participation confirmed - {eventName}',
    fr: 'Confirmation de participation - {eventName}'
  },
  eventReminder: {
    pt: 'Lembrete: {eventName} está chegando!',
    en: 'Reminder: {eventName} is coming up!',
    fr: 'Rappel: {eventName} approche!'
  },
  // ... outros tipos
};
```

### 6. Rate Limiting

```typescript
// SES permite ~14 emails/segundo em sandbox mode
class RateLimiter {
  private readonly maxRequestsPerSecond: number = 14;
  private readonly timeWindowMs: number = 1000;
  private requests: number[] = [];

  async acquire(): Promise<void> {
    const now = Date.now();
    // Remove requests fora da janela de tempo
    this.requests = this.requests.filter(
      time => time > now - this.timeWindowMs
    );

    if (this.requests.length >= this.maxRequestsPerSecond) {
      // Calcula tempo de espera
      const oldestRequest = this.requests[0];
      const waitTime = oldestRequest + this.timeWindowMs - now;
      
      // Regista métrica de throttling
      await this.trackThrottling(waitTime);
      await sleep(waitTime);
    }

    this.requests.push(now);
  }
}
```

### 7. Retry Strategy

```typescript
class RetryStrategy {
  private config: RetryConfig = {
    maxAttempts: 2,        // 2 tentativas (1 original + 1 retry)
    baseDelay: 1000,       // 1 segundo inicial
    maxDelay: 10000,       // Máximo 10 segundos
    jitter: true           // Adiciona variação aleatória
  };

  private calculateDelay(attempt: number): number {
    // Exponential backoff: 1s, 2s, 4s, 8s, 10s (max)
    let delay = Math.min(
      this.config.maxDelay,
      this.config.baseDelay * Math.pow(2, attempt - 1)
    );

    // Jitter: delay * (0.5 to 1.5)
    if (this.config.jitter) {
      delay = delay * (0.5 + Math.random());
    }

    return delay;
  }

  async execute<T>(operation: () => Promise<T>): Promise<T> {
    for (let attempt = 1; attempt <= this.config.maxAttempts; attempt++) {
      try {
        return await operation();
      } catch (error) {
        if (attempt === this.config.maxAttempts) {
          throw error;
        }
        const delay = this.calculateDelay(attempt);
        await sleep(delay);
      }
    }
  }
}
```

### 8. Configuração SQS

```typescript
// Em backend.ts
const emailQueue = new Queue(stack, 'EmailQueue', {
  queueName: 'bafatorio-email-queue',
  visibilityTimeout: Duration.seconds(300),  // 5 minutos
  retentionPeriod: Duration.days(7),         // 7 dias
  deadLetterQueue: {
    queue: emailDLQ,
    maxReceiveCount: 3                        // Move para DLQ após 3 falhas
  }
});

// Event source para Lambda
sendEmailFunction.addEventSource(new SqsEventSource(emailQueue, {
  batchSize: 10,                              // Processa até 10 mensagens
  maxBatchingWindow: Duration.seconds(30),   // Espera até 30s para juntar batch
  reportBatchItemFailures: true              // Partial batch failure handling
}));
```

### 9. Tracking de Status (EmailLog)

```typescript
// Modelo DynamoDB
const EmailLog = a.model('EmailLog', {
  id: a.id().required(),
  participantId: a.string().required(),
  eventId: a.string().required(),
  emailType: a.string().required(),
  status: a.enum(['QUEUED', 'SENT', 'FAILED']),
  recipient: a.string().required(),
  subject: a.string(),
  sentAt: a.datetime(),
  attempts: a.integer().default(0),
  errorMessage: a.string(),
  messageId: a.string(),      // SQS Message ID
  sesMessageId: a.string(),   // SES Message ID
  createdAt: a.datetime(),
  updatedAt: a.datetime()
});

// Índice para consultas por evento
// GSI: eventId-createdAt-index
```

### 10. Variáveis de Ambiente

| Variável | Descrição | Exemplo |
|----------|-----------|---------|
| `EMAIL_QUEUE_URL` | URL da fila SQS principal | `https://sqs.eu-west-1.amazonaws.com/...` |
| `EMAIL_DLQ_URL` | URL da Dead Letter Queue | `https://sqs.eu-west-1.amazonaws.com/...` |
| `BAFATORIO_APP_REGION` | Região AWS | `eu-west-1` |
| `BAFATORIO_APP_DEFAULT_FROM_EMAIL` | Email remetente | `noreply@bafatorio.com` |
| `BAFATORIO_APP_EMAIL_LOG_TABLE_NAME` | Nome da tabela DynamoDB | `EmailLog-xxxx` |
| `SES_TEMPLATE_PREFIX` | Prefixo dos templates SES | `Bafatorio_` |

### 11. Permissões IAM

```typescript
// sendEmailFunction
{
  Effect: 'Allow',
  Action: [
    'ses:SendEmail',
    'ses:SendTemplatedEmail',
    'ses:SendRawEmail',
    'ses:GetTemplate',
    'ses:CreateTemplate',
    'ses:UpdateTemplate'
  ],
  Resource: '*'
},
{
  Effect: 'Allow',
  Action: [
    'sqs:SendMessage',
    'sqs:GetQueueAttributes'
  ],
  Resource: [emailQueue.queueArn]
},
{
  Effect: 'Allow',
  Action: [
    'dynamodb:PutItem',
    'dynamodb:UpdateItem',
    'dynamodb:GetItem',
    'dynamodb:Query'
  ],
  Resource: [emailLogTable.tableArn]
}

// processEmailQueueFunction
{
  Effect: 'Allow',
  Action: [
    'sqs:ReceiveMessage',
    'sqs:DeleteMessage',
    'sqs:GetQueueAttributes'
  ],
  Resource: [emailQueue.queueArn, emailDLQ.queueArn]
}
```

## Suporte a Anexos

```typescript
async function prepareEmailWithAttachment(
  emailData: EmailData,
  attachment?: Buffer
): Promise<SESv2.SendEmailRequest> {
  const mailOptions = {
    from: process.env.BAFATORIO_APP_DEFAULT_FROM_EMAIL,
    to: emailData.recipient.email,
    subject: getSubject(emailData.emailType, emailData),
    html: await renderTemplate(emailData.emailType, emailData),
    attachments: attachment ? [{
      filename: 'document.pdf',
      content: attachment,
      contentType: 'application/pdf'
    }] : []
  };

  // Usa nodemailer para construir MIME message
  const transporter = nodemailer.createTransport({ SES: sesClient });
  return transporter.sendMail(mailOptions);
}
```

## Métricas CloudWatch

```typescript
// Namespace: EmailService/RateLimiter
// Métrica: ThrottlingDelay (Milliseconds)

// Namespace: Bafatorio/EmailService
// Métricas:
// - EmailsQueued (Count)
// - EmailsSent (Count)
// - EmailsFailed (Count)
// - ProcessingTime (Milliseconds)
// - QueueDepth (Count)
```

## Tratamento de Erros

### Erros Recuperáveis (Retry)
- `ServiceUnavailableException` - SES temporariamente indisponível
- `ThrottlingException` - Rate limit excedido
- `Network timeouts` - Problemas de rede

### Erros Permanentes (Não Retry)
- `InvalidEmailAddress` - Endereço inválido
- `MessageRejected` - Conteúdo rejeitado
- `ConfigurationSetDoesNotExist` - Configuração não existe

```typescript
function isRetryableError(error: Error): boolean {
  const retryableCodes = [
    'ServiceUnavailableException',
    'ThrottlingException',
    'RequestTimeout',
    'NetworkingError'
  ];
  return retryableCodes.some(code => error.name?.includes(code));
}
```

## Consequências

### Positivas
- ✅ **Assíncrono**: Mutations retornam imediatamente, sem timeouts
- ✅ **Resiliente**: DLQ captura falhas para análise posterior
- ✅ **Escalável**: SQS + Lambda escala automaticamente
- ✅ **Rastreável**: EmailLog permite debugging e auditorias
- ✅ **Multilíngue**: Suporte completo pt/en/fr
- ✅ **Rate Limited**: Respeita limites SES automaticamente

### Negativas
- ⚠️ **Complexidade**: Múltiplos componentes a manter
- ⚠️ **Custo**: SQS, Lambda e SES têm custos separados
- ⚠️ **Latência**: Emails não são instantâneos (fila)
- ⚠️ **Debugging**: Logs distribuídos entre Lambda, SQS, SES

## Monitorização Recomendada

### Alarmes CloudWatch
1. **DLQ não vazia**: Alerta quando há mensagens na DLQ
2. **Taxa de falha alta**: >5% de emails falhados
3. **Fila crescente**: Queue depth > 1000 mensagens
4. **Latência alta**: Tempo de processamento > 30s

### Dashboards
- Emails enviados por hora/dia
- Taxa de sucesso vs falha
- Tempo médio na fila
- Throttling events

## Referências

- [AWS SES Best Practices](https://docs.aws.amazon.com/ses/latest/dg/best-practices.html)
- [SQS Dead Letter Queues](https://docs.aws.amazon.com/AWSSimpleQueueService/latest/SQSDeveloperGuide/sqs-dead-letter-queues.html)
- [Lambda Partial Batch Failure](https://docs.aws.amazon.com/lambda/latest/dg/with-sqs.html#services-sqs-batchfailurereporting)

---

**Autor**: Sistema de Documentação Bafatorio  
**Última Atualização**: 2025-01-23
