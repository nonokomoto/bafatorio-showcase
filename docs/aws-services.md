# Serviços usados pelo Bafatório (todos os repos)

Conta AWS: `074280453839` — Região primária: `eu-west-1` (Dublin)

## Repos

1. [BafatorioApp](#1-bafatorioapp--webapp-principal) — webapp principal
2. [api-bafatorio (Akili)](#2-api-bafatorio--akili-backend-llm) — backend LLM (V2, inativo)
3. [bafatorio-admin](#3-bafatorio-admin--wiki-interna-docmost) — wiki interna self-hosted
4. [bafatorio-docs](#4-bafatorio-docs--portal-de-documentação) — docs públicas

---

## 1. BafatorioApp — webapp principal

App Amplify ID: `dEXAMPLEAPPID`

### Serviços AWS
| Serviço | Uso |
|---|---|
| AWS Amplify Hosting | Hosting da SPA React, builds CI/CD por branch |
| AWS AppSync | API GraphQL (resolvers para DynamoDB + Lambda) |
| AWS Lambda | Funções backend (permissões, integrações, streams) |
| Amazon DynamoDB | Base de dados principal (todos os modelos) |
| Amazon DynamoDB Streams | 3 streams activos: Event, Participant, Dependent → trigger Lambdas |
| Amazon S3 | Storage de documentos e assets |
| Amazon Cognito | Autenticação (User Pool + Identity Pool) |
| Amazon SES | Envio de emails transacionais |
| Amazon SQS | Email queue + Email DLQ (14 dias), ParticipantStream DLQ (14 dias), DependentStream DLQ (14 dias) |
| AWS KMS | Encriptação de tokens OAuth Notion + API keys Fidelize |
| AWS Systems Manager (SSM) | Parameter Store para config de Lambdas |
| AWS Step Functions | `AmplifyTableWaiterStateMachine` (4 instâncias) — gerido pelo Amplify Gen 2, usado internamente durante deploys para aguardar provisioning de tabelas DynamoDB |
| AWS CloudFormation | IaC (gerido pelo Amplify Gen 2) |
| Amazon Route 53 | Domínio `bafatorio.com` e subdomínios |
| AWS IAM | Roles e policies |
| AWS CloudWatch | Logs e métricas (implícito) |

### Integrações externas
| Serviço | Uso |
|---|---|
| Stripe | Pagamentos e subscrições |
| Notion | Importação de páginas como documentos |
| Fidelize | Sincronização de participantes (POS) |

---

## 2. api-bafatorio — Akili (backend LLM)

**Estado:** inativo em produção. Apenas endpoints de normalização de Excel estão ativos. LLM/RAG adiados para V2.

**Hosting:** Fly.io (Paris `cdg`) via Docker.

### Serviços AWS (partilhados com BafatorioApp)
| Serviço | Uso |
|---|---|
| AWS Cognito | JWT verification (User Pool partilhado) |
| AWS AppSync | GraphQL tool calling (partilhado) |

### Outros serviços
| Categoria | Serviço | Uso |
|---|---|---|
| Hosting | Fly.io | Deploy da API (Docker) |
| Database | Supabase (PostgreSQL + pgVector) | DB + embeddings (subutilizado em V1) |
| LLM | Groq | LLM primário (`kimi-k2-instruct`) — **inativo** |
| LLM | Google Gemini | LLM fallback — **inativo** |
| LLM | Mistral | Embeddings + fallback — **inativo** |
| Search | Tavily | Web search — **inativo** |

---

## 3. bafatorio-admin — wiki interna (Docmost)

**Hosting:** self-hosted no desktop (`ney-desktop.tail97d091.ts.net`) via Docker Compose, acesso por Tailscale.

### Serviços
| Categoria | Serviço | Uso |
|---|---|---|
| Hosting | Self-hosted Docker | Container Docmost |
| Network | Tailscale | Acesso privado (`*.ts.net`) |
| Database | PostgreSQL 18 (container) | DB do Docmost |
| Cache | Redis 8 (container) | Cache e jobs |
| Email | Resend (SMTP) | Envio de emails |
| AI | Google Gemini | Auto-completion (`gemini-2.0-flash`) |

**Não usa AWS.**

---

## 4. bafatorio-docs — portal de documentação

**Hosting:** Vercel.

### Serviços
| Categoria | Serviço | Uso |
|---|---|---|
| Hosting | Vercel | Deploy do site estático |
| Framework | VitePress | Static Site Generator |

**Não usa AWS. Sem integrações externas.**
