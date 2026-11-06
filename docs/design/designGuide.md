# Design Guide - Bafatório

## Índice
1. [Layout e Estrutura](#layout-e-estrutura)
2. [Componentes](#componentes)
3. [Tipografia](#tipografia)
4. [Cores e Temas](#cores-e-temas)
5. [Espaçamento e Grid](#espaçamento-e-grid)
6. [Responsividade](#responsividade)

## Layout e Estrutura

### Organização de Conteúdo
- **Hierarquia Visual**: Informações mais importantes devem estar no topo
- **Agrupamento Lógico**: Informações relacionadas devem estar agrupadas em seções
- **Espaçamento Consistente**: Usar `space-y-6` para seções principais e `space-y-4` para elementos dentro das seções

### Exemplo de Estrutura (SupplierDetail)
```jsx
1. Header (Informações Principais)
   - Nome do Fornecedor
   - Categoria
   - Status
   - Orçamento em Destaque

2. Grid Principal (2 colunas em desktop)
   - Informações de Contato
   - Endereço e Informações Legais
   - Detalhes do Orçamento
   - Informações Financeiras

3. Informações Complementares
   - Tags e Local (2 colunas)
   - Notas
```

## Componentes

### DetailSection
- **Uso**: Para agrupar informações relacionadas
- **Estrutura**:
  ```jsx
  - Título da Seção (bg-background-50)
  - Conteúdo (bg-white)
  - Borda e Arredondamento
  ```
- **Classes Padrão**: 
  - Container: `rounded-lg border border-background-200`
  - Header: `bg-background-50 px-4 py-3`
  - Conteúdo: `p-4 bg-white`

### DetailItem
- **Uso**: Para exibir informações com ícone e label
- **Estrutura**:
  ```jsx
  - Ícone (container colorido)
  - Label
  - Valor ou Conteúdo
  ```
- **Variações**:
  - Link (para websites e emails)
  - Valor padrão
  - Conteúdo customizado

### Badge
- **Uso**: Para status, tags e categorias
- **Variações**:
  - Status: Com ícone e cor contextual
  - Tag: Neutro e compacto
  - Categoria: Cor primária, mais proeminente

## Tipografia

### Hierarquia de Texto
- **Títulos Principais**: variant="h4" + font-semibold
- **Títulos de Seção**: variant="subtitle2" + font-semibold
- **Labels**: variant="caption" + text-text-400
- **Valores**: variant="body2" + font-medium
- **Texto de Destaque**: Combinar com cores contextuais

### Cores de Texto
- **Texto Principal**: text-text-900 dark:text-text-50
- **Texto Secundário**: text-text-600 dark:text-text-300
- **Labels**: text-text-400 dark:text-text-500
- **Links**: text-primary-600 hover:text-primary-700

## Cores e Temas

### Esquema de Cores
- **Primária**: primary-{50,100,500,600,700}
- **Background**: background-{50,100,200,700,800}
- **Texto**: text-{50,200,300,400,500,600,900}
- **Status**:
  - Sucesso: success-{400,500,600}
  - Erro: error-{400,500,600}
  - Aviso: warning-{400,500,600}

### Dark Mode
- Inversão automática de cores usando classes dark:
- Fundos mais escuros: dark:bg-background-800
- Texto mais claro: dark:text-text-50
- Elementos de UI adaptados: dark:border-background-700

## Espaçamento e Grid

### Sistema de Grid
- **Container Principal**: grid grid-cols-1 md:grid-cols-2
- **Gap Padrão**: gap-6 (entre seções)
- **Gap Interno**: gap-4 (entre elementos)

### Espaçamento
- **Entre Seções**: space-y-6
- **Entre Elementos**: space-y-4
- **Padding Interno**: p-4 ou p-6 (dependendo da importância)
- **Margin para Tipografia**: mb-1, mb-2, mb-3

## Responsividade

### Breakpoints
- **Mobile First**: Layout base para mobile
- **md**: 768px (tablets e desktop)
- **lg**: 1024px (desktop maior)

### Adaptações
- Grid muda de 1 para 2 colunas
- Espaçamento ajustado para cada breakpoint
- Flexbox para alinhamentos responsivos
- Tamanhos de texto adaptáveis

---

## Exemplos de Implementação

### Header com Gradiente
```jsx
<div className="bg-gradient-to-r from-primary-50 to-primary-100/50 dark:from-primary-900/20 dark:to-primary-800/10 rounded-lg p-6">
```

### Card com Informações
```jsx
<DetailSection title="Título">
    <div className="space-y-4">
        <DetailItem
            icon={FiUser}
            label="Label"
            value="Valor"
        />
    </div>
</DetailSection>
```

---

> Este guia está em constante evolução. Novas práticas e padrões serão adicionados conforme o desenvolvimento do projeto. 