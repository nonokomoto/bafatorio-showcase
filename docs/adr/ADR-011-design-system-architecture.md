# ADR-011: Arquitetura do Design System

**Estado:** Aceite  
**Data:** 2025-01-01  
**Responsáveis:** Equipa de Desenvolvimento Bafatorio

## Contexto

O Bafatorio necessita de um design system consistente, escalável e de fácil manutenção que forneça:
- Consistência visual em todas as páginas e componentes
- Suporte a modo escuro com alternância fluida de tema
- Design responsivo em todos os tamanhos de dispositivos
- Componentes UI acessíveis e bem documentados
- Efeitos visuais modernos (glassmorphism, animações)

## Decisão

### 1. Framework CSS: Tailwind CSS

**Justificação:**
- Abordagem utility-first permite desenvolvimento rápido de UI
- Excelente suporte a modo escuro via prefixo `dark:`
- Altamente customizável através de configuração
- Bundle de produção pequeno com PurgeCSS
- Comunidade forte e ecossistema robusto

**Configuração:** `tailwind.config.js` (520+ linhas)
- `darkMode: 'class'` - Alternância de modo escuro baseada em classes
- Sistema de cores, tipografia, espaçamento, sombras e animações extendidos

### 2. Sistema de Cores

#### 2.1 Paleta de Cores Semântica

Todas as cores seguem uma escala 50-950 para variantes consistentes light/dark:

```
Primary (Azul)     #4069FF → primary-50 até primary-950
Secondary (Índigo) #6366F1 → secondary-50 até secondary-950
Success (Verde)    #10B981 → success-50 até success-950
Warning (Âmbar)    #f59e0b → warning-50 até warning-950
Error (Vermelho)   #ef4444 → error-50 até error-950
Neutral (Slate)    → neutral-50 até neutral-950
```

#### 2.2 Tokens de Background e Texto

**Tokens de Background:**
```javascript
background: {
  DEFAULT: '#FFFFFF',
  app: '#F8FAFC',      // Background principal da app
  surface: '#FFFFFF',   // Superfícies de cards/componentes
  hover: '#F1F5F9',     // Estados hover
  // Modo escuro
  'app-dark': '#0F172A',
  'surface-dark': '#1E293B',
  'hover-dark': '#334155'
}
```

**Tokens de Texto:**
```javascript
text: {
  DEFAULT: '#1E293B',
  50: '#f8fafc',
  // ... escala completa
  950: '#020617',
  // Semântico (adaptável a modo escuro)
  primary: '#1E293B → #F1F5F9',
  secondary: '#64748B → #94A3B8',
  muted: '#94A3B8 → #64748B'
}
```

#### 2.3 Cores de Função/Papel

Para status de participantes/eventos:
```javascript
roles: {
  team: '#4069FF',      // Azul primário
  attendee: '#10B981',  // Verde sucesso
  vip: '#f59e0b'        // Âmbar warning
}
```

### 3. Sistema Tipográfico

#### 3.1 Famílias de Fontes

```javascript
fontFamily: {
  sans: ['"Plus Jakarta Sans"', 'system-ui', 'sans-serif'],
  display: ['Lexend', 'system-ui', 'sans-serif'],
  mono: ['JetBrains Mono', 'monospace']
}
```

**Utilização:**
- `font-sans` → Texto de corpo, conteúdo geral
- `font-display` → Títulos, texto de destaque
- `font-mono` → Código, IDs

#### 3.2 Escala de Tamanhos de Fonte

```javascript
fontSize: {
  'xs':   ['0.75rem',   { lineHeight: '1rem' }],
  'sm':   ['0.875rem',  { lineHeight: '1.25rem' }],
  'base': ['1rem',      { lineHeight: '1.5rem' }],
  'lg':   ['1.125rem',  { lineHeight: '1.75rem' }],
  'xl':   ['1.25rem',   { lineHeight: '1.75rem' }],
  '2xl':  ['1.5rem',    { lineHeight: '2rem' }],
  '3xl':  ['1.875rem',  { lineHeight: '2.25rem' }],
  '4xl':  ['2.25rem',   { lineHeight: '2.5rem' }],
  '5xl':  ['3rem',      { lineHeight: '1' }]
}
```

#### 3.3 Variantes do Componente Text

O componente `Text` (`src/Components/UI/Text.jsx`) fornece variantes semânticas:

| Variante | Classes | Caso de Uso |
|----------|---------|-------------|
| `h1`-`h6` | `text-4xl...text-base font-display` | Títulos de página/secção |
| `display1`-`display3` | `text-6xl...text-4xl font-display font-bold` | Secções hero |
| `subtitle1`-`subtitle2` | `text-xl/lg font-sans` | Subtítulos de secção |
| `body`/`body1`/`body2` | `text-base/sm font-sans` | Conteúdo de corpo |
| `caption`/`small` | `text-xs font-sans` | Texto auxiliar, timestamps |
| `label` | `text-sm font-medium` | Labels de formulário |
| `overline` | `text-xs uppercase tracking-wider` | Labels de categoria |

### 4. Sistema de Espaçamento

#### 4.1 Tokens de Espaçamento Semântico

```javascript
spacing: {
  // Padding de container
  'container-sm': '1rem',      // 16px
  'container-md': '1.5rem',    // 24px
  'container-lg': '2rem',      // 32px
  
  // Padding de card
  'card-sm': '1rem',
  'card-md': '1.5rem',
  'card-lg': '2rem',
  
  // Espaçamento de secção
  'section-xs': '1rem',
  'section-sm': '1.5rem',
  'section-md': '2rem',
  'section-lg': '3rem',
  
  // Gaps de componentes
  'gap-component': '1rem',
  'gap-element': '0.5rem'
}
```

#### 4.2 Directrizes de Utilização

```jsx
// Espaçamento de secção
<section className="space-y-section-md">
  <Card className="p-card-md">
    <div className="space-y-gap-element">
      {/* conteúdo */}
    </div>
  </Card>
</section>
```

### 5. Sistema de Breakpoints

```javascript
screens: {
  'xs': '475px',    // Telemóveis grandes
  'sm': '640px',    // Tablets pequenos
  'md': '768px',    // Tablets
  'lg': '1030px',   // Desktop
  'xl': '1280px',   // Desktop grande
  '2xl': '1536px'   // Extra grande
}
```

**Abordagem mobile-first:** Estilos base para mobile, melhorar progressivamente:
```jsx
<div className="flex-col md:flex-row lg:grid-cols-3">
```

### 6. Sistema de Sombras

#### 6.1 Sombras Modo Claro

```javascript
boxShadow: {
  'sm': '0 1px 2px 0 rgb(0 0 0 / 0.05)',
  'card': '0 2px 8px -2px rgba(15, 23, 42, 0.08), 0 4px 12px -4px rgba(15, 23, 42, 0.04)',
  'dropdown': '0 4px 6px -1px rgb(0 0 0 / 0.1), 0 2px 4px -2px rgb(0 0 0 / 0.1)',
  'elevated': '0 10px 15px -3px rgb(0 0 0 / 0.1), 0 4px 6px -4px rgb(0 0 0 / 0.1)',
  'glass': '0 8px 32px 0 rgba(31, 38, 135, 0.07)'
}
```

#### 6.2 Sombras Modo Escuro

```javascript
boxShadow: {
  'dark-card': '0 2px 8px -2px rgba(0, 0, 0, 0.4), 0 4px 12px -4px rgba(0, 0, 0, 0.3)',
  'dark-elevated': '0 10px 40px -10px rgba(0, 0, 0, 0.5)',
  'dark-glass': '0 8px 32px 0 rgba(0, 0, 0, 0.4)',
  'glow-primary': '0 0 20px rgba(64, 105, 255, 0.3)',
  'glow-success': '0 0 20px rgba(16, 185, 129, 0.3)'
}
```

### 7. Sistema de Modo Escuro

> **Nota:** A abordagem de dark mode via `dark:` prefix foi parcialmente substituída pelo sistema de CSS variables documentado em ADR-025. O novo padrão usa custom properties (shadcn/ui conventions) com tokens semânticos como `bg-card`, `text-card-foreground`. Ambos os sistemas coexistem durante a migração.

#### 7.1 Theme Initializer

`src/Components/Theme/ThemeInitializer.jsx`:

```jsx
useEffect(() => {
  const storedTheme = localStorage.getItem('theme');
  const systemPrefersDark = window.matchMedia('(prefers-color-scheme: dark)').matches;
  
  if (storedTheme === 'dark' || (storedTheme === 'system' && systemPrefersDark)) {
    document.documentElement.classList.add('dark');
  }
  
  // Escutar alterações de preferência do sistema
  const mediaQuery = window.matchMedia('(prefers-color-scheme: dark)');
  const handleChange = (e) => {
    if (localStorage.getItem('theme') === 'system') {
      document.documentElement.classList.toggle('dark', e.matches);
    }
  };
  mediaQuery.addEventListener('change', handleChange);
}, []);
```

#### 7.2 Modos de Tema

| Modo | Comportamento |
|------|---------------|
| `light` | Sempre tema claro |
| `dark` | Sempre tema escuro |
| `system` | Segue preferência do SO |

#### 7.3 Padrão de Classes Dark Mode

Sempre emparelhar variantes light e dark:
```jsx
// ✅ Correto
<div className="bg-background-surface dark:bg-background-surface-dark text-text-700 dark:text-text-300">

// ❌ Evitar - quebra modo escuro
<div className="bg-white text-gray-800">
```

### 8. Sistema de Animações

#### 8.1 Animações Keyframe

```javascript
keyframes: {
  fadeIn: { '0%': { opacity: 0 }, '100%': { opacity: 1 } },
  scaleIn: { '0%': { opacity: 0, transform: 'scale(0.95)' }, '100%': { opacity: 1, transform: 'scale(1)' } },
  slideUp: { '0%': { transform: 'translateY(10px)', opacity: 0 }, '100%': { transform: 'translateY(0)', opacity: 1 } },
  modalFade: { '0%': { opacity: 0 }, '100%': { opacity: 1 } },
  modalScale: { '0%': { opacity: 0, transform: 'scale(0.95)' }, '100%': { opacity: 1, transform: 'scale(1)' } },
  dropdownSlide: { '0%': { opacity: 0, transform: 'translateY(-5px)' }, '100%': { opacity: 1, transform: 'translateY(0)' } }
}
```

#### 8.2 Classes de Animação

```javascript
animation: {
  'fade-in': 'fadeIn 0.2s ease-out',
  'scale-in': 'scaleIn 0.2s ease-out',
  'slide-up': 'slideUp 0.3s ease-out',
  'modal-fade': 'modalFade 0.15s ease-out',
  'modal-scale': 'modalScale 0.2s ease-out forwards',
  'dropdown-slide': 'dropdownSlide 0.15s ease-out'
}
```

#### 8.3 Micro-animações Interactivas

```javascript
translate: {
  'hover': '-2px',    // Elevação subtil no hover
  'active': '1px'     // Feedback subtil de pressão
},
scale: {
  '98': '0.98',       // Estado activo/pressionado
  '102': '1.02'       // Crescimento subtil no hover
}
```

### 9. Utilitários de Glassmorphism

Classes utilitárias customizadas para efeitos de vidro modernos:

```javascript
// plugin tailwind.config.js
'.glass': {
  'background': 'rgba(255, 255, 255, 0.25)',
  'backdrop-filter': 'blur(8px)',
  '-webkit-backdrop-filter': 'blur(8px)'
},
'.dark-glass': {
  'background': 'rgba(17, 25, 40, 0.75)',
  'backdrop-filter': 'blur(8px)'
},
'.glass-light': {
  'background': 'rgba(255, 255, 255, 0.7)',
  'backdrop-filter': 'blur(12px) saturate(150%)',
  'border': '1px solid rgba(255, 255, 255, 0.2)',
  'box-shadow': '0 8px 32px 0 rgba(31, 38, 135, 0.07)'
},
'.glass-primary': {
  'background': 'rgba(64, 105, 255, 0.15)',
  'backdrop-filter': 'blur(12px)',
  'border': '1px solid rgba(64, 105, 255, 0.2)',
  'box-shadow': '0 0 20px rgba(64, 105, 255, 0.1)'
}
```

### 10. Biblioteca de Componentes UI

#### 10.1 Componentes Core (`src/Components/UI/`)

| Componente | Propósito | Variantes Principais |
|------------|-----------|----------------------|
| `Button` | Acções interactivas | primary, secondary, outline, ghost, danger, success, warning, soft, glass |
| `Card` | Contentores de conteúdo | default, primary, success, error, warning, info, glass, transparent |
| `Text` | Wrapper tipográfico | h1-h6, display1-3, body, subtitle, caption, label |
| `Badge` | Indicadores de estado | Cores semânticas |
| `Input` | Inputs de formulário | text, password, email, etc. |
| `Select` | Dropdowns | Selecção única/múltipla |
| `Modal` | Diálogos | Tamanhos configuráveis |
| `Table` | Exibição de dados | Ordenável, filtrável |
| `Skeleton` | Estados de loading | Várias formas |
| `Spinner` | Indicador de loading | Tamanhos |
| `FormField` | Wrapper de formulário | Com label, estados de erro |
| `Container` | Wrapper de layout | Max-width responsivo |
| `Grid` | Layouts em grid | Colunas configuráveis |

#### 10.2 Escala de Tamanhos de Componentes

Tamanhos consistentes em todos os componentes:

```jsx
// Tamanhos de Button
sizes: {
  xs: 'px-2 py-1 text-xs',
  sm: 'px-3 py-1.5 text-sm',
  md: 'px-4 py-2 text-sm',
  lg: 'px-6 py-3 text-base',
  xl: 'px-8 py-4 text-lg'
}
```

#### 10.3 Exemplo de Componente: Button

```jsx
import { Button } from '@/Components/UI';

// Acção primária
<Button variant="primary" size="md">Guardar Alterações</Button>

// Com ícone
<Button variant="outline" startIcon={<PlusIcon />}>Adicionar Item</Button>

// Estado de loading
<Button loading>A guardar...</Button>

// Efeito glass (sobre imagens/gradientes)
<Button variant="glass">Acção Overlay</Button>
```

#### 10.4 Exemplo de Componente: Card

```jsx
import { Card } from '@/Components/UI';

// Card standard
<Card elevated="md" padded="lg">
  <Text variant="h5">Título do Card</Text>
  <Text color="muted">Conteúdo do card</Text>
</Card>

// Card interactivo
<Card interactive elevated="card" onClick={handleClick}>
  Conteúdo clicável
</Card>

// Card de estado
<Card variant="success" elevated="sm">
  Mensagem de sucesso
</Card>
```

### 11. Sistema de Gradientes

```javascript
backgroundImage: {
  // Gradientes primários
  'gradient-primary': 'linear-gradient(135deg, #4069FF 0%, #6366F1 100%)',
  'gradient-primary-soft': 'linear-gradient(135deg, rgba(64, 105, 255, 0.1) 0%, rgba(99, 102, 241, 0.1) 100%)',
  
  // Gradientes de estado
  'gradient-success': 'linear-gradient(135deg, #10B981 0%, #059669 100%)',
  'gradient-error': 'linear-gradient(135deg, #ef4444 0%, #dc2626 100%)',
  'gradient-warm': 'linear-gradient(135deg, #f59e0b 0%, #ef4444 100%)',
  'gradient-cool': 'linear-gradient(135deg, #06b6d4 0%, #3b82f6 100%)',
  
  // Modo escuro
  'gradient-dark': 'linear-gradient(180deg, #1E293B 0%, #0F172A 100%)',
  
  // Efeitos glass
  'gradient-glass-light': 'linear-gradient(135deg, rgba(255,255,255,0.1) 0%, rgba(255,255,255,0.05) 100%)',
  'gradient-glass-dark': 'linear-gradient(135deg, rgba(0,0,0,0.3) 0%, rgba(0,0,0,0.1) 100%)'
}
```

### 12. Arquitectura CSS

#### 12.1 Layers Tailwind (`src/index.css`)

```css
@tailwind base;
@tailwind components;
@tailwind utilities;

@layer base {
  html {
    @apply bg-background-app text-text-700 dark:bg-background-app-dark dark:text-text-300;
  }
}

@layer components {
  .btn { /* estilos base de button */ }
  .btn-primary { /* variante primária */ }
  .card { /* estilos base de card */ }
}

@layer utilities {
  .text-shadow { text-shadow: 0 2px 4px rgba(0,0,0,0.1); }
  .scrollbar-hide { /* esconder scrollbar */ }
}
```

#### 12.2 Utilitários Customizados Adicionais

```javascript
// Em tailwind.config.js plugins
'.scrollbar-thin': {
  'scrollbar-width': 'thin',
  '&::-webkit-scrollbar': { width: '4px' },
  '&::-webkit-scrollbar-thumb': { 
    backgroundColor: 'rgba(0, 0, 0, 0.2)',
    borderRadius: '9999px'
  }
},
'.no-tap-highlight': {
  '-webkit-tap-highlight-color': 'transparent'
}
```

## Estrutura de Ficheiros

```
src/
├── Components/
│   ├── UI/                      # Componentes UI core
│   │   ├── Button.jsx
│   │   ├── Card.jsx
│   │   ├── Text.jsx
│   │   ├── Input.jsx
│   │   ├── Modal.jsx
│   │   ├── Badge.jsx
│   │   ├── Table.jsx
│   │   ├── Skeleton.jsx
│   │   ├── UIGuide.jsx          # Showcase/documentação de componentes
│   │   └── index.js             # Barrel exports
│   ├── Theme/
│   │   └── ThemeInitializer.jsx # Inicialização de tema & pref. sistema
│   └── Layout/
│       └── Container.jsx        # Layout wrapper
├── index.css                    # Directivas Tailwind & layers customizados
tailwind.config.js               # Configuração do design system
docs/
└── designGuide.md              # Documentação de design
```

## Consequências

### Benefícios

1. **Consistência Visual**: Tokens de design centralizados garantem aparência uniforme
2. **Modo Escuro**: Suporte de primeira classe com detecção automática de preferência do sistema
3. **Experiência de Desenvolvimento**: Abordagem utility-first acelera o desenvolvimento
4. **Manutenibilidade**: Alterações nos tokens de design propagam-se automaticamente
5. **Acessibilidade**: Estados de foco e considerações de contraste de cor incorporados
6. **Performance**: PurgeCSS do Tailwind remove estilos não utilizados em produção
7. **Responsivo**: Sistema de breakpoints mobile-first

### Trade-offs

1. **Curva de Aprendizagem**: Desenvolvedores devem aprender classes utilitárias do Tailwind
2. **Verbosidade HTML**: Strings de classes longas em JSX (mitigado por componentes)
3. **Esforço de Customização**: Ficheiro de config grande requer manutenção
4. **Tamanho de Bundle (Dev)**: CSS Tailwind completo em modo de desenvolvimento

### Considerações de Migração

- Estilos inline existentes devem migrar para utilitários Tailwind
- CSS customizado deve usar directiva `@layer` para especificidade correcta
- Cores do tema devem ser acedidas via classes Tailwind, não valores arbitrários

## Referência Rápida de Design Tokens

| Token | Light | Dark |
|-------|-------|------|
| App Background | `bg-background-app` | `dark:bg-background-app-dark` |
| Surface | `bg-background-surface` | `dark:bg-background-surface-dark` |
| Texto Primário | `text-text-700` | `dark:text-text-300` |
| Texto Muted | `text-text-500` | `dark:text-text-500` |
| Acção Primária | `bg-primary-500` | `dark:bg-primary-600` |
| Sombra Card | `shadow-card` | `dark:shadow-dark-card` |

## Referências

- [tailwind.config.js](../tailwind.config.js) - Configuração completa do design system
- [src/Components/UI/](../src/Components/UI/) - Biblioteca de componentes UI
- [src/Components/Theme/ThemeInitializer.jsx](../src/Components/Theme/ThemeInitializer.jsx) - Gestão de tema
- [docs/designGuide.md](./designGuide.md) - Documentação adicional de design
- [Documentação Tailwind CSS](https://tailwindcss.com/docs)

## Update (2026-03-15)

The dark mode implementation has been migrated from Tailwind `dark:` prefix to CSS custom properties (shadcn/ui pattern). See **ADR-025** for the new theming system and token reference.

## Changelog

| Data | Autor | Alteração |
|------|-------|-----------|
| 2026-03-15 | — | Update sobre migração dark mode para CSS variables (ADR-025) |
| 2026-03-20 | Ney Carvalho | Adicionada nota sobre ADR-025 superseding dark mode approach |
