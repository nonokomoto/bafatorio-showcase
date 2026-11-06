# ADR-037 — Landing hello.bafatorio.com: monorepo, hosting dedicado e deploy manual por CLI

**Estado:** Accepted (em produção desde 2026-07-17)
**Data:** 2026-07-17
**Relacionados:** ADR-001 (infra Amplify), ADR-014 (git workflow), `sites/hello-bafatorio/AGENTS.md`

## Contexto

O evento Human Leaders (Cabo Verde) precisa de uma landing de captação de
leads acessível por QR code: `hello.bafatorio.com`. A audiência chega por
telemóvel, muitas vezes com rede fraca, e existe uma única ação de conversão
("Quero ser dos primeiros"). A landing não partilha autenticação, estado nem
UI com o dashboard — mas o backend de captação (validação, honeypot, rate
limit, dedup) precisa de infraestrutura AWS com os mesmos padrões do resto
do produto.

## Decisões

### 1. Monorepo, não repo separado

A landing vive em `sites/hello-bafatorio/` com Vite, entrypoint e
`package.json` próprios. Um repo separado partia em dois o contrato
frontend↔backend (o `PRIVACY_VERSION` do form tem de bater com o
`EARLY_ACCESS_PRIVACY_VERSION` do `amplify/backend.ts`) e duplicava CI,
secrets e regras. O isolamento é garantido por
`scripts/verify-boundaries.mjs`: a landing não importa nada da app
principal (Redux, Cognito, AppSync, componentes do dashboard).

### 2. Backend de leads declarado no Gen 2 da app principal

`save-early-access-lead` (Lambda) + `HelloLeadsHttpApi` (API Gateway HTTP
API) + tabela `HelloEarlyAccessLeads` estão declarados em
`amplify/backend.ts`. Cada environment (sandbox, development, main)
materializa o seu próprio trio — nunca se aponta um frontend de um ambiente
ao backend de outro. CORS: qualquer branch ≠ `main` autoriza
`https://hello.bafatorio.com` + localhost; `main` autoriza apenas o domínio
real.

A tabela em `main` **e em `development`** tem PITR, deletion protection e
`RemovalPolicy.RETAIN` — development guarda leads reais como armazém
interino até à migração para produção (decisão de 2026-07-17: main ainda
não tem tudo o que development tem testado).

### 3. Amplify Hosting dedicado com deploy manual por CLI

O frontend é servido por uma app Amplify Hosting própria
(`hello-bafatorio`, appId `d2g9vxgkkbqwy4`, eu-west-1) sem ligação ao
GitHub. O deploy é manual:

```bash
cd sites/hello-bafatorio
npm run build
cd dist && zip -r /tmp/hello-dist.zip . && cd ..
aws amplify create-deployment --app-id d2g9vxgkkbqwy4 --branch-name main --region eu-west-1
curl -X PUT -T /tmp/hello-dist.zip "<zipUploadUrl devolvido>"
aws amplify start-deployment --app-id d2g9vxgkkbqwy4 --branch-name main --job-id <jobId> --region eu-west-1
```

Consequências deliberadas: pushes para `development` **não** alteram o site
(o pipeline GitHub só deploya o backend da app principal), o momento do
deploy é sempre controlado, e o endpoint de leads é fixado no build via
`VITE_LEADS_API_URL` (`.env.local`, gitignored — nunca commitar endpoints).

### 4. Domínio: apenas `hello.bafatorio.com`, sem www

A associação de domínio vive na app de hosting (prefixo `hello` sobre
`bafatorio.com`, DNS auto-gerido no Route 53). **Não é possível servir
`www.hello.bafatorio.com`**: o Amplify rejeita prefixos com ponto, e uma
segunda associação com raiz em `hello.bafatorio.com` rouba o alias
CloudFront ao site (incidente de 2026-07-17 — 404 em produção até se apagar
a associação e forçar `update-domain-association` na original). Ao validar
disponibilidade após mudanças de domínio, testar com paths não-cacheáveis e
exigir `x-cache: Miss` — respostas `Hit` mascaram o estado real.

## Opções rejeitadas

- **Repo separado** — contrato cross-repo e custo fixo de infraestrutura de
  projeto para um site de uma página; a estrutura autocontida torna a
  extração barata se um dia se justificar.
- **Hosting na app Amplify principal** — acoplava o deploy da landing ao
  pipeline do dashboard e impedia domínio/cadência independentes.
- **Ligação GitHub na app de hosting** — exigia OAuth interativo e retirava
  o controlo manual do momento do deploy; reavaliar se a cadência de
  alterações aumentar (via console ou GitHub Actions).
- **Sandbox como armazém de leads** — descartável por natureza e em rota de
  colisão com o alívio da quota IAM; substituído por development
  endurecido (ver Decisão 2).

## Migração para produção (pendente)

Quando `development` → `main` mergear: o pipeline de prod cria o trio de
leads em produção; exportar a tabela de development, importar em prod,
rebuild da landing com o endpoint de prod, e só depois desativar o armazém
interino. O sandbox `hello` só pode ser apagado depois de exportado
(liberta ~145 IAM roles).
