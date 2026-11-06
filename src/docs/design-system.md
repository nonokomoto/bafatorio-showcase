# Design System Guide

## 🎨 Cores
### Principais
- **Primary** 
  - Default: `bg-primary` (#4069FF) - Botões principais, links, elementos de destaque
  - Light: `bg-primary-light` (#6687FF) - Links hover, elementos secundários
  - Dark: `bg-primary-dark` (#3451DB) - Estados ativos, texto sobre fundos claros

- **Secondary**
  - Default: `bg-secondary` (#6366F1) - Botões secundários, badges
  - Light: `bg-secondary-light` (#818CF8) - Hover states secundários
  - Dark: `bg-secondary-dark` (#4F46E5) - Estados ativos secundários

### Estados
- **Success** 
  - Default: `bg-success` (#10B981) - Confirmações, checkmarks
  - Light: `bg-success-light` (#DCFCE7) - Banners de sucesso, backgrounds
  - Dark: `bg-success-dark` (#059669) - Texto em fundos success-light

- **Error**: `bg-error` (#ef4444) - Mensagens de erro, alertas críticos
- **Warning**: `bg-warning` (#f59e0b) - Alertas, notificações importantes
- **Confirmed**: `bg-confirmed` (#0ea5e9) - Status confirmado
- **VIP**: `bg-vip` (#1f2937) - Elementos VIP
- **Media**: `bg-media` (#8b5cf6) - Elementos de mídia

### Neutras
- **Background**
  - Default: `bg-background` (#F1F5F9) - Fundo da aplicação
  - Light: `bg-background-light` (#FFFFFF) - Cards, elementos elevados
  - Dark: `bg-background-dark` (#E2E8F0) - Hover states, backgrounds secundários

- **Text**
  - Default: `text-text` (#334155) - Texto principal
  - Light: `text-text-light ` (#64748B) - Texto secundário, descrições
  - Dark: `text-text` (#1E293B) - Títulos, texto em destaque

- **Neutral**
  - Default: `text-neutral` (#9CA3AF) - Bordas, elementos desabilitados
  - Light: `bg-neutral-light` (#F3F4F6) - Backgrounds suaves
  - Dark: `text-neutral-dark` (#4B5563) - Texto em destaque neutro

### Cores dos Papéis (Roles)
- **Team (Equipe)** 
  - Default: `bg-roles-team` (#10B981) - Cor success para equipe
  - Light: `bg-roles-team-light` (#DCFCE7) - Background e estados hover
  - Dark: `bg-roles-team-dark` (#059669) - Estados ativos

- **Attendee (Participante)**
  - Default: `bg-roles-attendee` (#4069FF) - Cor primary para participantes
  - Light: `bg-roles-attendee-light` (#6687FF) - Background e estados hover
  - Dark: `bg-roles-attendee-dark` (#3451DB) - Estados ativos

- **VIP**
  - Default: `bg-roles-vip` (#1f2937) - Elementos VIP

- **Media**
  - Default: `bg-roles-media` (#8b5cf6) - Elementos de mídia

## 🎭 Estados
- **Interativo**
  ```jsx
  <button className="
    bg-primary 
    hover:bg-primary-dark 
    focus:ring-2 focus:ring-focus focus:ring-offset-2
    active:bg-primary-dark 
    transition-colors duration-normal
  ">
    Botão
  </button>
  ```

- **Disabled**
  ```jsx
  <button className="
    bg-neutral
    opacity-50 
    cursor-not-allowed
  ">
    Desabilitado
  </button>
  ```

- **Loading**
  ```jsx
  <div className="animate-spin">●</div>
  <div className="animate-pulse">Carregando...</div>
  <div className="animate-fade-in">Conteúdo</div>
  ```

## 🎬 Animações
- **Transições**
  - `transition-colors`: Para mudanças de cor
  - `transition-shadow`: Para mudanças de sombra
  - `transition-all`: Para múltiplas propriedades
  - `duration-normal`: 200ms (duração padrão)

- **Animações Personalizadas**
  ```scss
  .animate-fade-in {
    animation: fadeIn 0.5s ease-out;
  }
  
  .animate-slide-in {
    animation: slideIn 0.5s ease-out;
  }
  ```

## 📦 Shadows & Borders
### Shadows
```scss
// Cards
shadow-card: '0px 1px 3px 0px rgba(0, 0, 0, 0.08), 
             0px 1px 2px -1px rgba(0, 0, 0, 0.08)'

// Hover state para cards
shadow-card-hover: '0px 4px 6px -1px rgba(0, 0, 0, 0.1), 
                   0px 2px 4px -2px rgba(0, 0, 0, 0.1)'

// Dropdowns e elementos flutuantes
shadow-dropdown: '0px 10px 15px -3px rgba(0, 0, 0, 0.1), 
                 0px 4px 6px -4px rgba(0, 0, 0, 0.1)'

// Modais e diálogos
shadow-modal: '0px 20px 25px -5px rgba(0, 0, 0, 0.1), 
              0px 8px 10px -6px rgba(0, 0, 0, 0.1)'
```

### Border Radius
- `rounded-sm`: 0.125rem (2px)
- `rounded-md`: 0.375rem (6px)
- `rounded-lg`: 0.5rem (8px)
- `rounded-xl`: 1rem (16px)
- `rounded-card`: 0.75rem (12px)

## 🛠️ Boas Práticas

### 1. Consistência
- Use os componentes base para manter consistência visual
  ```jsx
  // CORRETO: Usar classes consistentes para cards
  <div className="bg-white p-6 rounded-lg shadow-card">
  
  // INCORRETO: Criar variações customizadas
  <div className="bg-white p-5 rounded-md shadow-[0px_2px_4px_rgba(0,0,0,0.1)]">
  ```

- Mantenha padrões de espaçamento
  ```jsx
  // Espaçamento entre seções
  <div className="space-y-6"com >
  
  // Espaçamento entre elementos relacionados
  <div className="space-y-2">
  ```

- Siga a hierarquia tipográfica
  ```jsx
  // Títulos principais
  <h2 className="font-display text-2xl font-semibold text-text">
  
  // Subtítulos
  <h3 className="font-display text-xl font-medium text-text">
  ```

### 2. Acessibilidade
- Inclua estados de foco
  ```jsx
  <button className="focus:ring-2 focus:ring-focus focus:ring-offset-2 focus:outline-none">
  ```

- Use cores com contraste adequado
  ```jsx
  // Texto escuro em fundos claros
  <p className="text-text  dark:text-text-dark  bg-background-light">
  
  // Texto claro em fundos escuros
  <p className="text-white bg-primary">
  ```

- Adicione aria-labels
  ```jsx
  <button 
    aria-label="Fechar modal"
    className="text-gray-500 hover:text-gray-700"
  >
    <FiX size={24} />
  </button>
  ```

### 3. Responsividade
- Mobile-first
  ```jsx
  <div className="
    flex flex-col 
    sm:flex-row 
    items-start 
    sm:items-center
  ">
  ```

- Grid responsivo
  ```jsx
  <div className="
    grid 
    grid-cols-1 
    md:grid-cols-2 
    lg:grid-cols-3 
    gap-6
  ">
  ```

### 4. Performance
- Agrupe transições
  ```jsx
  // CORRETO: Transição específica
  transition-colors duration-normal
  
  // EVITAR: Transição genérica
  transition-all
  ```

## 📱 Layout & Grid

### Container Widths
```jsx
// Breakpoints do projeto
sm: '640px'
md: '768px'
lg: '1030px'
xl: '1280px'
2xl: '1536px'

// Uso
<div className="container mx-auto px-4">
```

### Grid System
```jsx
// Grid básico responsivo
<div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">

// Grid com sidebar
<div className="grid grid-cols-1 lg:grid-cols-[300px_1fr] gap-6">
```

### Flexbox Patterns
```jsx
// Layout com cabeçalho justificado
<div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">

// Agrupamento de items
<div className="flex items-center space-x-2">
```

## 🎯 Componentes Comuns

### Cards

1. Card Base
```jsx
<div className="bg-white p-6 rounded-lg shadow-card animate-fade-in hover:shadow-card-hover transition-shadow duration-normal">
  {/* Conteúdo */}
</div>
```

2. Status Card (Como CompletedEventBanner)
```jsx
<div className="mt-6 p-4 bg-success-light border border-success/20 rounded-lg animate-fade-in">
  <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
    <div className="flex items-start gap-3">
      <div className="w-8 h-8 bg-success rounded-full flex items-center justify-center">
        <Icon className="text-white text-lg" />
      </div>
      <div>
        <h4 className="text-base font-semibold text-success-dark">
          {title}
        </h4>
        <p className="text-sm text-success-dark/80 mt-1">
          {description}
        </p>
      </div>
    </div>
  </div>
</div>
```

### Botões

1. Botão Primário
```jsx
<button className="
  flex items-center px-4 py-2
  bg-primary hover:bg-primary-dark
  text-white rounded-md
  focus:ring-2 focus:ring-focus focus:ring-offset-2
  focus:outline-none
  transition-colors duration-normal
  whitespace-nowrap text-sm font-medium
">
  <Icon className="mr-2" />
  Texto do Botão
</button>
```

2. Botão Secundário
```jsx
<button className="
  px-4 py-2 
  bg-background hover:bg-background-dark 
  text-primary font-medium text-sm 
  rounded-lg transition-colors duration-normal
">
  Ação Secundária
</button>
```

3. Botão Loading
```jsx
<button 
  disabled
  className="
    flex items-center px-4 py-2
    bg-primary opacity-50 cursor-not-allowed
    text-white rounded-md
  "
>
  <FiLoader className="animate-spin mr-2" />
  Carregando...
</button>
```

### Tabelas
```jsx
<table className="w-full">
  <thead>
    <tr className="border-b border-background">
      <th className="py-3 px-4 text-left">
        <span className="font-display text-sm font-medium text-text">
          Cabeçalho
        </span>
      </th>
    </tr>
  </thead>
  <tbody>
    <tr className="border-b border-background hover:bg-background-light transition-colors duration-normal">
      <td className="py-3 px-4">
        <span className="font-sans text-base text-text-light ">
          Conteúdo
        </span>
      </td>
    </tr>
  </tbody>
</table>
```

### DetailItem (Como usado em EventDetailsCard)
```jsx
<div className="flex flex-col sm:flex-row items-start sm:items-center py-3 border-b border-neutral-light last:border-0 group relative hover:bg-neutral-light/50 transition-colors duration-200">
  {/* Título e Ícone */}
  <div className="flex items-center space-x-2 min-w-[200px] mb-1 sm:mb-0">
    <Icon className="text-primary text-lg" />
    <span className="font-display text-sm font-medium text-neutral-dark">
      {title}
    </span>
  </div>
  
  {/* Valor */}
  <div className="pl-6 sm:pl-4">
    <span className="font-sans text-base text-text-light ">
      {value}
    </span>
  </div>
</div>
```

### Modal
```jsx
<div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
  <div className="w-full max-w-xl bg-white rounded-xl shadow-modal overflow-hidden transform transition-all duration-500 ease-in-out hover:scale-105 animate__animated animate__fadeIn">
    <div className="p-4 sm:p-6 md:p-8">
      {/* Cabeçalho */}
      <div className="flex justify-between items-center mb-4">
        <h2 className="text-xl font-bold text-primary">
          {title}
        </h2>
        <button onClick={onClose} className="text-gray-500 hover:text-gray-700">
          <FiX size={24} />
        </button>
      </div>
      
      {/* Conteúdo */}
      <div className="mb-4">
        {content}
      </div>
      
      {/* Ações */}
      <div className="flex justify-end space-x-2">
        {actions}
      </div>
    </div>
  </div>
</div>
```

### Campos de Pesquisa

1. Campo de Pesquisa com Ícone
```jsx
<div className="relative max-w-md">
  <input
    type="text"
    placeholder="Pesquisar..."
    className="w-full pl-10 pr-4 py-2 
      bg-background 
      border-none rounded-lg 
      focus:ring-2 focus:ring-focus focus:ring-offset-2
      focus:outline-none
      font-sans text-base text-text  dark:text-text-dark  
      placeholder:text-neutral"
  />
  <FaSearch className="absolute left-3 top-1/2 transform -translate-y-1/2 text-text-light " />
</div>
```

### Tabelas

1. Cabeçalho da Tabela
```jsx
<th className="py-3 px-4 text-left">
  <span className="font-display text-sm font-medium text-text">
    {headerText}
  </span>
</th>
```

2. Célula da Tabela
```jsx
<td className="py-3 px-4">
  <span className="font-sans text-base text-text-light ">
    {content}
  </span>
</td>
```

3. Link em Célula
```jsx
<td className="py-3 px-4">
  <a href={url} 
    className="font-sans text-base text-primary hover:text-primary-dark transition-colors duration-normal">
    {linkText}
  </a>
</td>
```

4. Linha da Tabela
```jsx
<tr className="border-b border-background hover:bg-background-light transition-colors duration-normal">
  {/* células */}
</tr>
```

### Botões de Ação

1. Botão de Ação Pequeno
```jsx
<button 
  className="p-1.5 text-text  dark:text-text-dark  hover:text-primary rounded-md transition-colors duration-normal"
>
  <Icon />
</button>
```

2. Botão de Ação Destrutivo
```jsx
<button 
  className="p-1.5 text-text  dark:text-text-dark  hover:text-error rounded-md transition-colors duration-normal"
>
  <Icon />
</button>
```

### Estados de Loading

1. Barra de Progresso
```jsx
<div className="w-full bg-gray-200 rounded-full h-2.5">
  <div 
    className="bg-primary h-2.5 rounded-full transition-all duration-500 ease-out"
    style={{ width: `${progress}%` }}
  >
  </div>
</div>
```

2. Texto de Progresso
```jsx
<p className="text-sm text-center mt-2 text-text-light ">
  {progressText}
</p>
```

### Estados de Mensagem

1. Mensagem de Erro
```jsx
<p className="text-error mb-4 text-base animate__animated animate__shakeX">
  {errorMessage}
</p>
```

2. Mensagem de Sucesso
```jsx
<p className="text-success mb-4 text-base animate__animated animate__fadeIn">
  {successMessage}
</p>
```

### Estados Vazios

1. Estado Vazio com Ilustração
```jsx
<div className="text-center mt-10 animate__animated animate__fadeIn">
  <img src={noDataImage} alt="Sem dados" className="mx-auto w-28" />
  <h2 className="text-base font-semibold my-4 text-center">
    {title}
  </h2>
  <p className="mb-4 text-sm text-text-light ">
    {message}
  </p>
</div>
```

### Formulários 

1. Campo de Input Base
```jsx
<div className="group relative w-full mb-6 hover:bg-background/40 p-4 rounded-lg transition-all duration-normal">
  {/* Label com ícone */}
  <div className="flex items-center gap-2 mb-2 text-text-light  group-hover:text-primary transition-colors duration-normal">
    <Icon className="w-4 h-4" />
    <span className="text-sm font-medium">{label}</span>
  </div>

  {/* Input */}
  <input
    className="w-full px-3 py-2 text-text  dark:text-text-dark  bg-transparent border-0 
      focus:ring-0 placeholder-text-light/50
      text-lg font-light"
    placeholder={`Digite ${placeholder.toLowerCase()}...`}
  />

  {/* Barra de progresso sutil */}
  <div className="absolute bottom-0 left-0 w-full h-0.5 bg-background-dark/10">
    <div className="h-full bg-primary transform scale-x-0 group-hover:scale-x-100 
      transition-transform duration-normal origin-left"/>
  </div>

  {/* Tooltip de ajuda */}
  <div className="absolute right-4 top-4 opacity-0 group-hover:opacity-100 transition-opacity duration-normal">
    <button type="button" className="text-text-light  hover:text-primary">
      <FiHelpCircle className="w-4 h-4" />
    </button>
  </div>
</div>
```

2. Campo Select 
```jsx
<div className="group relative w-full mb-6 hover:bg-background/40 p-4 rounded-lg transition-all duration-normal">
  {/* Label com ícone */}
  <div className="flex items-center gap-2 mb-2 text-text-light  group-hover:text-primary transition-colors duration-normal">
    <Icon className="w-4 h-4" />
    <span className="text-sm font-medium">{label}</span>
  </div>

  {/* Select customizado */}
  <div className="relative">
    <select
      className="w-full px-3 py-2 text-text  dark:text-text-dark  bg-transparent border border-neutral/20 
        rounded-lg appearance-none cursor-pointer
        focus:outline-none focus:ring-1 focus:ring-primary/20 focus:border-primary/20
        text-lg font-light hover:border-primary/30
        transition-all duration-normal"
    >
      <option value="" className="text-text-light ">
        Selecione {placeholder.toLowerCase()}...
      </option>
      {options.map(option => (
        <option className="text-text  dark:text-text-dark  bg-background-light py-2">
          {option.label}
        </option>
      ))}
    </select>

    {/* Ícone de seta customizado */}
    <div className="absolute right-3 top-1/2 -translate-y-1/2 pointer-events-none 
      text-text-light  group-hover:text-primary transition-colors duration-normal">
      <FiChevronDown className="w-5 h-5" />
    </div>
  </div>
</div>
```

3. Área de Texto 
```jsx
<div className="group relative w-full mb-6 hover:bg-background/40 p-4 rounded-lg transition-all duration-normal">
  <div className="flex items-center gap-2 mb-2 text-text-light  group-hover:text-primary transition-colors duration-normal">
    <Icon className="w-4 h-4" />
    <span className="text-sm font-medium">{label}</span>
  </div>

  <textarea
    className="w-full px-3 py-2 text-text  dark:text-text-dark  bg-transparent border-0 
      focus:ring-0 placeholder-text-light/50
      text-lg font-light resize-none min-h-[100px]"
    placeholder={`Digite ${placeholder.toLowerCase()}...`}
  />
</div>
```

4. Mensagem de Erro
```jsx
<div className="mt-2 flex items-center gap-2 text-error animate__animated animate__fadeIn">
  <FiAlertCircle className="w-4 h-4" />
  <span className="text-sm">{errorMessage}</span>
</div>
```

5. Barra de Ações do Formulário
```jsx
<div className="fixed bottom-0 left-0 right-0 bg-background-light border-t border-background p-4 flex justify-end gap-4">
  <button type="button" 
    className="px-4 py-2 text-sm text-text-light  hover:text-text  dark:text-text-dark  transition-colors duration-normal">
    Cancelar
  </button>
  <button type="submit" 
    className="px-6 py-2 bg-primary hover:bg-primary-dark text-white text-sm font-medium rounded-lg
      transition-colors duration-normal flex items-center gap-2">
    <FiSave className="w-4 h-4" />
    Guardar
  </button>
</div>
```

### Características do Formulário 
- Hover states sutis com background light
- Barra de progresso animada no hover
- Ícones informativos
- Tooltips de ajuda
- Transições suaves
- Feedback visual rico
- Mensagens de erro animadas
- Barra de ações fixa no rodapé
- Design minimalista e clean
- Foco na usabilidade

