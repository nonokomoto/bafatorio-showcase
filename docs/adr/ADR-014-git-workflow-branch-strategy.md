# ADR-014: Git Workflow e Estratégia de Branches

**Status:** Aceite  
**Data:** 2026-01-24  
**Autor:** Ney Carvalho  
**Decisores:** Ney Carvalho

---

## Contexto

O projeto Bafatorio necessita de uma estratégia clara de gestão de branches para:
1. Separar código de desenvolvimento de produção
2. Garantir que mudanças em produção (`main`) sejam sempre revisadas
3. Facilitar o desenvolvimento contínuo sem afetar a estabilidade da branch principal
4. Alinhar com as práticas de CI/CD do Amplify Hosting

---

## Decisão

### Estratégia de Branches

#### **1. Branch `main` - Produção**
- **Propósito**: Código em produção, sempre estável
- **Deploy**: Automático via Amplify Hosting para ambiente de produção
- **Proteção**: 
  - Configuração local: `git config branch.main.pushRemote no_push`
  - Pushes diretos bloqueados localmente
  - Apenas aceita mudanças via Pull Request no GitHub
- **Regra**: Nunca commitar diretamente

#### **2. Branch `development` - Desenvolvimento**
- **Propósito**: Integração contínua de features em desenvolvimento
- **Deploy**: Automático via Amplify Hosting para ambiente de desenvolvimento
- **Workflow**:
  - Branch padrão para desenvolvimento local
  - Aceita pushes diretos da equipa
  - Base para criação de feature branches
- **Configuração**: `git branch --set-upstream-to=origin/development`

#### **3. Feature Branches (opcional)**
- **Nomenclatura**: `feature/nome-da-feature`, `fix/nome-do-bug`, etc.
- **Base**: Criadas a partir de `development`
- **Merge**: Via PR para `development`

---

## Workflow Diário

### Desenvolvimento Normal
```bash
# Trabalhar em development
git checkout development
git pull

# Fazer alterações
git add .
git commit -m "feat: descrição"
git push  # Push direto para origin/development
```

### Release para Produção
```bash
# 1. Garantir que development está atualizado
git checkout development
git pull

# 2. Criar Pull Request no GitHub
#    development → main
#    - Revisão de código
#    - Testes automáticos
#    - Aprovação necessária

# 3. Merge via GitHub UI
# 4. Deploy automático para produção via Amplify
```

### Proteção Local de Main
```bash
# Configuração aplicada
git config branch.main.pushRemote no_push

# Resultado: Push em main causa erro
git checkout main
git push  
# fatal: 'no_push' does not appear to be a git repository
```

---

## Configuração Inicial

Para configurar um novo ambiente de desenvolvimento:

```bash
# 1. Clonar repositório
git clone https://github.com/nonokomoto/BafatorioApp.git
cd BafatorioApp

# 2. Configurar branch development como padrão
git checkout development
git pull

# 3. Proteger main contra push direto
git config branch.main.pushRemote no_push

# 4. Verificar configuração
git branch -vv
```

---

## Ambientes Amplify Mapping

| Branch | Amplify Environment | URL | Propósito |
|--------|-------------------|-----|-----------|
| `main` | Produção | `main.dEXAMPLEAPPID.amplifyapp.com` | App em produção |
| `development` | Development | `development.dEXAMPLEAPPID.amplifyapp.com` | Testes e desenvolvimento |

---

## Consequências

### Positivas ✅
- Proteção da branch de produção contra commits acidentais
- Processo de review obrigatório via PR para produção
- Desenvolvimento contínuo sem afetar produção
- Rastreabilidade de mudanças via Pull Requests
- Alinhamento com CI/CD do Amplify

### Negativas ⚠️
- Requer disciplina da equipa para seguir o processo
- PRs podem adicionar delay no deploy de hotfixes urgentes
- Proteção local (`no_push`) pode ser contornada com `git push origin main`

### Mitigações
- Documentar processo claramente (este ADR)
- Adicionar regras de proteção de branch no GitHub (opcional)
- Para hotfixes urgentes: criar branch `hotfix/*` a partir de `main`

---

## Alternativas Consideradas

### 1. Git Flow Completo
- **Descartado**: Complexidade excessiva para equipa pequena
- Requer branches adicionais: `release/*`, `hotfix/*`, `develop`

### 2. Trunk-Based Development
- **Descartado**: Requer CI/CD muito robusto e feature flags
- Risco maior de código instável em produção

### 3. GitHub Flow (Escolhido Simplificado)
- **Adoptado**: Simples, alinhado com Amplify Hosting
- Modificação: `development` como buffer antes de `main`

---

## Referências

- [GitHub Flow](https://docs.github.com/en/get-started/quickstart/github-flow)
- [AWS Amplify Hosting - Branch-based Deployments](https://docs.aws.amazon.com/amplify/latest/userguide/multi-environments.html)
- ADR-001: Arquitetura de Ambientes AWS Amplify

---

## Notas de Implementação

- Data de implementação: 2026-01-24
- Branches existentes migradas para novo workflow
- Configuração de proteção aplicada em ambiente local
- Próximo passo: Considerar branch protection rules no GitHub
