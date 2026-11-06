# ADR-010: Internationalization (i18n) Architecture

## Status
**Accepted** | Data: 2025-01-23

## Contexto

O Bafatorio é uma plataforma destinada a mercados internacionais, necessitando de suporte multilíngue completo. Os requisitos incluem:

- Suporte para Português (Portugal), Inglês (EUA) e Francês (França)
- Tradução de toda a interface do utilizador
- Persistência da preferência de idioma
- Sincronização com atributos do utilizador Cognito
- Interpolação de variáveis dinâmicas
- Organização modular por funcionalidade

## Decisão

Implementámos internacionalização utilizando **react-i18next**, com traduções organizadas por namespace em ficheiros JSON, e persistência via localStorage com sincronização opcional para Cognito.

### Regra de Fronteira Backend/Frontend

Copy orientada ao utilizador pertence ao frontend, não ao backend.

Para operações vindas de GraphQL/Lambda:
- o backend deve devolver **reason codes** e metadata
- o frontend deve converter esses códigos em texto traduzido através de `i18next`

**Exemplo recomendado:**

```json
{
  "success": false,
  "reason": "ALL_DUPLICATES",
  "duplicateCount": 3
}
```

```javascript
t('supplier.import.allDuplicates', { count: duplicateCount });
```

**Evitar:**
- mostrar diretamente `message` devolvida pela Lambda como copy final
- colocar mensagens hardcoded em inglês em handlers backend
- usar parsing de strings de erro no frontend para decidir UX

`message` textual pode existir como fallback técnico, logging ou compatibilidade transitória, mas não deve ser a fonte primária de internacionalização.

Nos fluxos de importação em massa, isto aplica-se explicitamente a estados como:
- `ALL_DUPLICATES`
- `ALL_SKIPPED`
- `SUCCESS_WITH_SKIPS`
- `NO_SUPPLIERS_TO_IMPORT`

O frontend deve converter estes códigos em copy localizada e coerente com o estado visual apresentado (sucesso, aviso ou erro).

### Arquitetura de Alto Nível

```
┌──────────────────────────────────────────────────────────────────────────────┐
│                          I18N ARCHITECTURE                                    │
└──────────────────────────────────────────────────────────────────────────────┘

┌─────────────────────────────────────────────────────────────────────────────┐
│                              SOURCES                                         │
├─────────────────────────────────────────────────────────────────────────────┤
│                                                                              │
│   ┌─────────────┐    ┌─────────────┐    ┌─────────────┐                     │
│   │   pt-PT/    │    │   en-US/    │    │   fr-FR/    │                     │
│   │  (15 JSON)  │    │  (16 JSON)  │    │  (14 JSON)  │                     │
│   └──────┬──────┘    └──────┬──────┘    └──────┬──────┘                     │
│          │                  │                  │                             │
│          └──────────────────┼──────────────────┘                             │
│                             │                                                │
│                             ▼                                                │
│                    ┌─────────────────┐                                       │
│                    │   i18n/config   │                                       │
│                    │   (i18next)     │                                       │
│                    └────────┬────────┘                                       │
│                             │                                                │
└─────────────────────────────┼────────────────────────────────────────────────┘
                              │
                              ▼
┌─────────────────────────────────────────────────────────────────────────────┐
│                           RUNTIME                                            │
├─────────────────────────────────────────────────────────────────────────────┤
│                                                                              │
│  ┌─────────────────┐                      ┌─────────────────┐               │
│  │  localStorage   │◀────────────────────▶│ Language        │               │
│  │ preferredLang   │                      │ Switcher        │               │
│  └─────────────────┘                      └─────────────────┘               │
│          │                                        │                          │
│          │    ┌───────────────────────────────────┘                          │
│          │    │                                                              │
│          ▼    ▼                                                              │
│  ┌─────────────────┐         ┌─────────────────┐                            │
│  │   useTranslation│────────▶│   Components    │                            │
│  │   hook (t fn)   │         │   (JSX)         │                            │
│  └─────────────────┘         └─────────────────┘                            │
│                                                                              │
│  ┌─────────────────┐                                                         │
│  │     Cognito     │◀─── Sync (authenticated users)                          │
│  │  custom:signup_ │                                                         │
│  │    language     │                                                         │
│  └─────────────────┘                                                         │
│                                                                              │
└─────────────────────────────────────────────────────────────────────────────┘
```

## Componentes Principais

### 1. Estrutura de Ficheiros

```
src/i18n/
├── config.js                    # Configuração central do i18next
│
└── locales/                     # Traduções por idioma
    ├── pt-PT/                   # Português (Portugal) - Default
    │   ├── akili.json          # Assistente Akili
    │   ├── billing.json        # Faturação e planos
    │   ├── common.json         # Elementos comuns
    │   ├── dashboard.json      # Dashboard
    │   ├── event.json          # Gestão de eventos
    │   ├── landingPageAlt.json # Landing page
    │   ├── layout.json         # Layout (header, sidebar, footer)
    │   ├── login.json          # Autenticação
    │   ├── notes.json          # Notas de eventos
    │   ├── notes 2.json        # ⚠️ Artefacto/duplicado (apenas pt-PT)
    │   ├── participant.json    # Gestão de participantes
    │   ├── report.json         # Relatórios
    │   ├── settings.json       # Configurações
    │   ├── supplier.json       # Gestão de fornecedores
    │   └── team.json           # Gestão de equipa
    │
    ├── en-US/                   # English (United States)
    │   └── (mesmos 15 ficheiros + pages.json extra)
    │
    └── fr-FR/                   # Français (France)
        └── (mesmos 14 ficheiros + team.json)
```

### 2. Idiomas Suportados

| Código | Idioma | Região | Flag | Default |
|--------|--------|--------|------|---------|
| `pt-PT` | Português | Portugal | 🇵🇹 | ✅ Sim |
| `en-US` | English | United States | 🇺🇸 | Não |
| `fr-FR` | Français | France | 🇫🇷 | Não |

### 3. Configuração do i18next

```javascript
// src/i18n/config.js
import i18n from 'i18next';
import { initReactI18next } from 'react-i18next';

// Importar traduções (exemplo para pt-PT)
import commonPT from './locales/pt-PT/common.json';
import billingPT from './locales/pt-PT/billing.json';
// ... outros namespaces

i18n.use(initReactI18next).init({
  resources: {
    'pt-PT': {
      common: commonPT,
      billing: billingPT,
      dashboard: dashboardPT,
      event: eventPT,
      landingPageAlt: landingPageAltPT,
      layout: layoutPT,
      login: loginPT,
      participant: participantPT,
      report: reportPT,
      settings: settingsPT,
      notes: notesPT,
      supplier: supplierPT,
      akili: akiliPT
    },
    'en-US': { /* mesma estrutura */ },
    'fr-FR': { /* mesma estrutura */ }
  },
  
  // Idioma inicial: localStorage ou fallback
  lng: localStorage.getItem('preferredLanguage') || 'pt-PT',
  
  // Fallback quando tradução não existe
  fallbackLng: 'pt-PT',
  
  // Interpolação de variáveis
  interpolation: {
    escapeValue: false  // React já escapa por padrão
  },
  
  // Namespaces disponíveis
  ns: [
    'common', 
    'billing', 
    'dashboard', 
    'event', 
    'landingPageAlt', 
    'layout', 
    'login', 
    'participant', 
    'report', 
    'sendEmail', 
    'settings',
    'notes',
    'supplier',
    'akili',
    'team'
  ],
  
  // Namespace padrão
  defaultNS: 'common',
  
  // Detecção de idioma
  detection: {
    order: ['localStorage', 'navigator'],
    caches: ['localStorage'],
  }
});

export default i18n;
```

### 4. Namespaces e Conteúdos

| Namespace | Descrição | Chaves Exemplo |
|-----------|-----------|----------------|
| `common` | Elementos comuns (spinners, alerts, actions) | `spinner.loading.default`, `actions.save` |
| `event` | Gestão de eventos | `eventCard.status.scheduled`, `eventDetails.title` |
| `participant` | Gestão de participantes | `participantList.columns.name`, `importModal.title` |
| `supplier` | Gestão de fornecedores | `supplierForm.fields.name`, `supplierList.empty` |
| `billing` | Faturação e planos | `plans.organizer.name`, `checkout.button` |
| `dashboard` | Dashboard e métricas | `charts.participants`, `stats.totalEvents` |
| `login` | Autenticação | `signIn.title`, `forgotPassword.button` |
| `settings` | Configurações | `profile.title`, `notifications.email` |
| `layout` | Layout (header, sidebar) | `sidebar.events`, `header.logout` |
| `report` | Relatórios | `pdf.title`, `sections.participants` |
| `notes` | Notas de eventos | `noteEditor.placeholder`, `noteList.empty` |
| `akili` | Assistente Akili | `chat.welcome`, `suggestions.events` |
| `landingPageAlt` | Landing page | `hero.title`, `features.list` |
| `team` | Gestão de equipa | `teamList.columns.role`, `teamInvite.title` |

> **Nota:** O locale pt-PT contém um ficheiro artefacto `notes 2.json` (duplicado de `notes.json`) que deve ser removido. O locale en-US contém um ficheiro extra `pages.json` que não existe nos outros locales.

### 5. Estrutura de Chaves de Tradução

```json
// pt-PT/common.json - Exemplo de estrutura hierárquica
{
  "spinner": {
    "loading": {
      "default": "A carregar...",
      "participants": "A carregar participantes",
      "processing": "A processar {{current}} de {{total}} registos..."
    },
    "success": {
      "title": "Concluído",
      "default": "Operação concluída com sucesso."
    },
    "error": {
      "title": "Erro",
      "default": "Ocorreu um problema. Por favor, tente novamente."
    }
  },
  "actions": {
    "delete": "Eliminar",
    "cancel": "Cancelar",
    "edit": "Editar",
    "save": "Guardar"
  },
  "featureAccess": {
    "alerts": {
      "expired": {
        "title": "Plano Inativo",
        "message": "Para registar um evento é necessário ter um plano ativo.",
        "confirmText": "Ativar Plano"
      }
    }
  }
}
```

### 6. Uso nos Componentes

#### Hook useTranslation
```jsx
import { useTranslation } from 'react-i18next';

const EventCard = ({ event }) => {
  // Especifica o namespace
  const { t } = useTranslation('event');
  
  return (
    <div className="event-card">
      <span className="status">
        {t('eventCard.status.scheduled')}
      </span>
      <button>
        {t('eventCard.buttons.details')}
      </button>
    </div>
  );
};
```

#### Múltiplos Namespaces
```jsx
const SendEmail = () => {
  // Carrega múltiplos namespaces
  const { t, i18n } = useTranslation(['participant', 'common']);
  
  return (
    <div>
      {/* Namespace específico */}
      <h1>{t('participant:sendEmail.title')}</h1>
      
      {/* Namespace padrão (primeiro) */}
      <button>{t('common:actions.cancel')}</button>
    </div>
  );
};
```

#### Interpolação de Variáveis
```jsx
const ParticipantCounter = ({ current, total }) => {
  const { t } = useTranslation('common');
  
  return (
    <span>
      {t('spinner.loading.processing', { current, total })}
      {/* Resultado: "A processar 5 de 100 registos..." */}
    </span>
  );
};
```

#### Pluralização
```json
// event.json
{
  "eventDelete": {
    "confirmWithParticipants": "Irá eliminar {{count}} participante associado.",
    "confirmWithParticipants_plural": "Irá eliminar {{count}} participantes associados."
  }
}
```

```jsx
const DeleteConfirm = ({ count }) => {
  const { t } = useTranslation('event');
  
  return (
    <p>{t('eventDelete.confirmWithParticipants', { count })}</p>
    // count=1: "Irá eliminar 1 participante associado."
    // count=5: "Irá eliminar 5 participantes associados."
  );
};
```

### 7. Language Switcher Component

```jsx
// src/Components/Common/LanguageSwitcher.jsx
const languages = [
  { code: 'pt-PT', name: 'Português', flag: '🇵🇹' },
  { code: 'en-US', name: 'English', flag: '🇺🇸' },
  { code: 'fr-FR', name: 'Français', flag: '🇫🇷' }
];

const LanguageSwitcher = () => {
  const { i18n } = useTranslation();
  const dispatch = useDispatch();
  const isAuthenticated = useSelector(state => state.user.isAuthenticated);
  
  // Carregar preferência salva ao montar
  useEffect(() => {
    const savedLanguage = localStorage.getItem('preferredLanguage');
    if (savedLanguage && i18n.language !== savedLanguage) {
      i18n.changeLanguage(savedLanguage);
    }
  }, [i18n]);

  const handleLanguageChange = (langCode) => {
    // Mudar idioma no i18next
    i18n.changeLanguage(langCode);
    
    // Persistir em localStorage
    localStorage.setItem('preferredLanguage', langCode);
    
    // Se autenticado, sincronizar com Cognito
    if (isAuthenticated) {
      dispatch(updateUserAttributeThunk({
        attributeKey: 'custom:signup_language',
        value: langCode
      }));
    }
  };

  const currentLanguage = languages.find(
    lang => lang.code === i18n.language
  ) || languages[0];

  return (
    <Dropdown>
      <DropdownButton>
        <span>{currentLanguage.flag}</span>
        <span>{currentLanguage.name}</span>
      </DropdownButton>
      <DropdownMenu>
        {languages.map((lang) => (
          <DropdownItem
            key={lang.code}
            onClick={() => handleLanguageChange(lang.code)}
            active={i18n.language === lang.code}
          >
            <span>{lang.flag}</span>
            <span>{lang.name}</span>
            {i18n.language === lang.code && <CheckIcon />}
          </DropdownItem>
        ))}
      </DropdownMenu>
    </Dropdown>
  );
};
```

### 8. Persistência de Preferência

```
┌─────────────────────────────────────────────────────────────────────────────┐
│                      LANGUAGE PREFERENCE FLOW                                │
└─────────────────────────────────────────────────────────────────────────────┘

                        User selects language
                               │
                               ▼
              ┌────────────────────────────────┐
              │    i18n.changeLanguage()       │
              │    (Atualiza UI imediatamente) │
              └────────────────────────────────┘
                               │
              ┌────────────────┴────────────────┐
              │                                  │
              ▼                                  ▼
┌─────────────────────────┐        ┌─────────────────────────┐
│      localStorage       │        │   Cognito (se auth)     │
│  'preferredLanguage'    │        │  'custom:signup_lang'   │
│       = 'pt-PT'         │        │       = 'pt-PT'         │
└─────────────────────────┘        └─────────────────────────┘
              │                                  │
              │                                  │
              ▼                                  ▼
    On App Load (config.js)            On Login (future)
    ─────────────────────              ──────────────────
    lng: localStorage.get()            Sync from Cognito
    || 'pt-PT'                         to localStorage
```

### 9. Detecção Automática

O i18next está configurado para detetar o idioma na seguinte ordem:

1. **localStorage** - Preferência guardada anteriormente
2. **navigator** - Idioma do browser
3. **Fallback** - `pt-PT` (idioma padrão)

```javascript
detection: {
  order: ['localStorage', 'navigator'],
  caches: ['localStorage'],
}
```

### 10. Integração com Backend

#### Emails Multilíngue
Os emails enviados pelo sistema respeitam a preferência de idioma:

```typescript
// No handler de email
const language = participantData.language || 'pt';

// Template naming: WelcomeTemplate_pt, WelcomeTemplate_en, WelcomeTemplate_fr
const templateName = `${baseTemplate}_${language}`;
```

#### Akili Chatbot
O Akili deteta e responde no idioma da pergunta:

```typescript
// System prompt com regras de idioma
SYSTEM_PROMPT = `
**LANGUAGE RULE (ABSOLUTE):**
- If user writes in English, respond in English.
- If user writes in Portuguese, respond in European Portuguese (PT-PT).
- If user writes in French, respond in French.
`;
```

### 11. Convenções de Tradução

#### Nomenclatura de Chaves
```
namespace.section.subsection.key

Exemplos:
- event.eventCard.status.scheduled
- common.actions.delete
- participant.importModal.errors.invalidFormat
```

#### Variáveis de Interpolação
```json
{
  "message": "Olá {{name}}, tem {{count}} notificações."
}
```

#### Formatação de Datas
```jsx
// Usar bibliotecas de formatação com locale
import { format } from 'date-fns';
import { pt, enUS, fr } from 'date-fns/locale';

const locales = { 'pt-PT': pt, 'en-US': enUS, 'fr-FR': fr };

const formattedDate = format(date, 'PPP', {
  locale: locales[i18n.language]
});
```

### 12. Boas Práticas

#### ✅ Fazer
```jsx
// Sempre usar traduções para texto visível
<button>{t('actions.save')}</button>

// Especificar namespace quando não é o default
const { t } = useTranslation('billing');

// Usar interpolação para valores dinâmicos
t('message.welcome', { name: user.name })

// Organizar chaves hierarquicamente
t('participant.list.columns.email')
```

#### ❌ Evitar
```jsx
// NUNCA hardcode strings
<button>Guardar</button>  // ❌

// NÃO concatenar strings traduzidas
t('hello') + ' ' + userName  // ❌

// NÃO usar chaves sem namespace quando ambíguo
t('title')  // ❌ Usar t('event.title') ou t('dashboard.title')
```

## Consequências

### Positivas
- ✅ **Completo**: 15 namespaces cobrindo toda a aplicação
- ✅ **3 Idiomas**: PT-PT, EN-US, FR-FR completamente traduzidos
- ✅ **Persistente**: Preferência guardada em localStorage
- ✅ **Sincronizado**: Integração com Cognito para utilizadores autenticados
- ✅ **Modular**: Organização por namespace facilita manutenção
- ✅ **Type-safe friendly**: Chaves hierárquicas permitem autocompletar

### Negativas
- ⚠️ **Bundle size**: Todas as traduções carregadas inicialmente
- ⚠️ **Manutenção**: Necessário manter 3 ficheiros por namespace (45 ficheiros total)
- ⚠️ **Sincronização manual**: Adicionar nova chave requer atualizar 3 idiomas

## Métricas de Cobertura

| Namespace | Chaves (aprox.) | PT-PT | EN-US | FR-FR |
|-----------|-----------------|-------|-------|-------|
| common | ~150 | ✅ | ✅ | ✅ |
| event | ~400 | ✅ | ✅ | ✅ |
| participant | ~300 | ✅ | ✅ | ✅ |
| supplier | ~200 | ✅ | ✅ | ✅ |
| billing | ~150 | ✅ | ✅ | ✅ |
| dashboard | ~100 | ✅ | ✅ | ✅ |
| login | ~80 | ✅ | ✅ | ✅ |
| settings | ~120 | ✅ | ✅ | ✅ |
| layout | ~50 | ✅ | ✅ | ✅ |
| report | ~80 | ✅ | ✅ | ✅ |
| notes | ~40 | ✅ | ✅ | ✅ |
| akili | ~60 | ✅ | ✅ | ✅ |
| landingPageAlt | ~100 | ✅ | ✅ | ✅ |
| team | ~50 | ✅ | ✅ | ✅ |

**Total estimado**: ~1800+ chaves de tradução por idioma

## Roadmap Futuro

1. **Lazy Loading**: Carregar traduções por rota para reduzir bundle inicial
2. **i18n Management Tool**: Integrar ferramentas como Lokalise ou Crowdin
3. **Mais idiomas**: Espanhol (ES-ES), Alemão (DE-DE)
4. **RTL Support**: Preparar para idiomas right-to-left (Árabe, Hebraico)
5. **Validation**: Scripts para validar completude de traduções

## Referências

- [react-i18next Documentation](https://react.i18next.com/)
- [i18next Documentation](https://www.i18next.com/)
- [Pluralization Rules](https://www.i18next.com/translation-function/plurals)

---

**Autor**: Sistema de Documentação Bafatorio
**Última Atualização**: 2026-03-20

---

## Changelog

| Date | Author | Description |
|------|--------|-------------|
| 2025-01-23 | Dev Team | Initial version documenting i18n architecture |
| 2026-03-20 | Ney Carvalho | Atualizado contagem de namespaces (14->15); adicionado namespace 'team'; notado artefacto 'notes 2.json' e 'pages.json' extra em en-US |
