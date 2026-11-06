# AGENTS.md — hello.bafatorio.com

Estas instruções aplicam-se a todo o conteúdo dentro de `sites/hello-bafatorio/`. Complementam as regras do `AGENTS.md` do monorepo e as instruções do BafatorioApp. Em caso de conflito, a regra mais específica deste ficheiro prevalece para a landing.

## Objetivo do projeto

`hello.bafatorio.com` é uma landing mobile-first para apresentar o Bafatório no evento Human Leaders em Cabo Verde e captar inscrições para early access. A maioria do tráfego chegará através de QR code em telemóveis.

- Existe uma única ação de conversão: `Quero ser dos primeiros`.
- O dashboard Bafatório é o protagonista visual; não adicionar mockup de telemóvel.
- Os protótipos e decisões aprovados vivem em `docs/plans/hello-bafatorio/` e são a referência para conteúdo, composição e motion.

## Stack e limites

- React 18 com JavaScript/JSX; não introduzir TypeScript no frontend.
- Vite com build e entrypoint independentes da aplicação principal.
- Tailwind CSS com tokens semânticos existentes; evitar cores raw quando existir token adequado.
- Framer Motion para motion de entrada e mudança de estado; respeitar sempre `prefers-reduced-motion`/`useReducedMotion()`.
- React Hook Form para o formulário e componentes acessíveis para o modal.
- Strings visíveis em `pt-PT`, `en-US` e `fr-FR` num namespace próprio da landing.
- Não importar Redux, Cognito, o entrypoint do BafatorioApp, componentes internos do dashboard ou clientes AppSync para o bundle da landing.

## Direção de UI e experiência

- Projetar primeiro para `390px` e validar depois tablet e desktop.
- Preservar a sequência aprovada: hero + produto + CTA, prova social, principais funcionalidades, ecossistema de funcionalidades e CTA final.
- Manter HTML real para copy e CTA; screenshots são apenas demonstração do produto.
- Motion deve explicar ação: gráficos preenchem, checks concluem e estados mudam. Evitar movimento decorativo contínuo que prejudique leitura ou performance.
- O Hero usa a narrativa visual `do bastidor ao palco`, com feixes de origem fixa e varrimento controlado.
- Priorizar legibilidade, contraste, carregamento rápido e estabilidade visual em redes móveis.

## Arquitetura AWS

O fluxo aprovado é:

`Route 53 → Amplify Hosting/CloudFront → React → API Gateway HTTP API → Lambda → DynamoDB`.

- Frontend num novo Amplify Hosting app, com deploy independente e domínio `hello.bafatorio.com`.
- API Gateway HTTP API, Lambda e DynamoDB em `eu-west-1`.
- Tabela dedicada em modo `PAY_PER_REQUEST`.
- Não usar Cloudflare, CAPTCHA, AWS WAF, AppSync público, Lambda Function URL ou S3 website direto na primeira versão.
- Não guardar credenciais AWS no frontend nem permitir acesso direto do browser ao DynamoDB.

## Infraestrutura e environments

- Declarar recursos em código através de Amplify Gen 2/CDK; nunca criar recursos permanentes manualmente com AWS CLI ou consola.
- Reutilizar o fluxo do BafatorioApp: sandbox → `development` → `main`/production.
- Cada environment deve possuir API, Lambda e tabela próprios; não fixar nomes físicos que provoquem colisões.
- O agente não deve executar `npx ampx sandbox`. Preparar e validar o código; o utilizador inicia e elimina sandboxes.
- Usar AWS CLI apenas para inspeção, diagnóstico, testes e verificação pós-deploy.
- Nunca apontar uma build de development/sandbox para a tabela ou endpoint production.

### Sandbox dedicado da landing

- Identificador Amplify: `hello` (usar esta grafia exata, apesar de o projeto se chamar `hello.bafatorio.com`).
- Stack raiz: `amplify-bafatorioapp-hello-sandbox-505308fa2c`.
- Região e conta: `eu-west-1`, conta AWS do Bafatório configurada no profile `default`.
- Todos os comandos locais de secrets e sandbox desta landing devem incluir `--identifier hello`.
- Nunca usar ou atualizar os sandboxes `macbook`, `vagne`, `devsandbox` ou o identificador padrão para trabalho da landing.
- O utilizador controla o processo `npx ampx sandbox --identifier hello`; agentes limitam-se a preparar código e consultar/verificar recursos com AWS CLI.

## Contrato e proteção de leads

- Endpoint público: `POST /v1/leads`.
- Dados iniciais: nome, email, organização opcional, campanha/origem, locale, consentimento e timestamps.
- Normalizar email antes da escrita e usar escrita condicional para deduplicação.
- Validar schema, comprimentos e tipos na Lambda; rejeitar payloads desconhecidos ou excessivos.
- Implementar honeypot, throttling, rate limit sem armazenar IP em claro, reserved concurrency e respostas genéricas que não revelem se um email existe.
- CORS apenas para `https://hello.bafatorio.com` e origens locais explicitamente autorizadas em ambientes não produtivos.
- Não registar nome, email, payload completo ou outros dados pessoais em logs.

## Workflow obrigatório

1. Explorar os protótipos, ADRs e código relacionado.
2. Registar o plano em `tasks/todo.md` e validar mudanças não triviais antes de implementar.
3. Fazer a menor alteração correta, mantendo frontend, infraestrutura e Lambda em unidades independentes.
4. Verificar com testes focados, lint, build da landing e TypeScript do backend Amplify quando aplicável.
5. Validar manualmente a experiência em `390px`, desktop, teclado e reduced motion.
6. Atualizar `tasks/lessons.md` após qualquer correção do utilizador.

## Critérios mínimos antes de produção

- Formulário testado para sucesso, duplicado, validação, honeypot, rate limit e falha transitória.
- Nenhum endpoint sandbox/development no bundle production.
- Sem overflow horizontal em mobile e sem erros no browser.
- Modal navegável por teclado, foco controlado e mensagens acessíveis.
- Lighthouse mobile com metas mínimas de 90 para Performance, Accessibility, Best Practices e SEO.
- Logs e alarmes verificados sem exposição de dados pessoais.
