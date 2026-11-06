import PropTypes from 'prop-types';

/**
 * Componente Text unificado para garantir consistência tipográfica em toda a aplicação
 * Adaptado para balancear os estilos entre EventCard, ParticipantDetails e ConfirmedParticipantsList
 */
const Text = ({
  children,
  variant = 'body',
  color = 'default',
  weight = 'normal',
  align = 'left',
  decoration = 'none',
  transform = 'none',
  italic = false,
  lineClamp = null,
  truncate = false,
  animated = false,
  t = null, // Função de tradução que pode ser passada
  translationKey = '', // Chave para tradução
  translationValues = {}, // Valores para interpolação
  className = '',
  as,
  ...props
}) => {
  // Função para obter texto traduzido se t for fornecido
  const getTranslatedText = () => {
    if (t && translationKey) {
      return t(translationKey, translationValues);
    }
    return children;
  };

  // Variantes de tipografia unificadas, usando os padrões observados nos componentes
  const variants = {
    // Headings - mantendo a fonte display consistente
    h1: 'text-4xl sm:text-5xl font-display leading-tight tracking-tight',
    h2: 'text-3xl sm:text-4xl font-display leading-tight',
    h3: 'text-2xl sm:text-3xl font-display leading-tight',
    h4: 'text-xl sm:text-2xl font-display leading-tight',
    h5: 'text-lg sm:text-xl font-display leading-tight',
    h6: 'text-base sm:text-lg font-display leading-tight',
    
    // Display typography
    display1: 'text-6xl sm:text-7xl font-display font-bold leading-none',
    display2: 'text-5xl sm:text-6xl font-display font-bold leading-none',
    display3: 'text-4xl sm:text-5xl font-display font-bold leading-tight',
    
    // Body text - estilos unificados dos componentes analisados
    subtitle1: 'text-xl font-sans leading-relaxed',
    subtitle2: 'text-lg font-sans leading-relaxed',
    body: 'text-base font-sans leading-relaxed',
    body1: 'text-base font-sans leading-relaxed',
    body2: 'text-sm font-sans leading-relaxed',

    
    // Special text styles - adicionando small para compatibilidade com ConfirmedParticipantsList
    small: 'text-xs font-sans leading-normal',
    caption: 'text-xs font-sans leading-normal',
    overline: 'text-xs font-sans uppercase tracking-wider leading-normal',
    label: 'text-sm font-medium leading-tight',
    quote: 'text-lg font-serif italic leading-relaxed',
  };

  // Cores unificadas - garantindo consistência entre todos os componentes
  const colors = {
    // Cores de texto primárias
    default: 'text-foreground',
    muted: 'text-muted-foreground',
    subtle: 'text-text-500 dark:text-text-500',
    
    // Cores de texto compatíveis com modo dark/light em todos os componentes
    'text': 'text-foreground', 
    'text-dark': 'text-foreground',
    'text-light': 'text-muted-foreground',
    
    // Cores primárias e variações
    primary: 'text-primary-600 dark:text-primary-400',
    'primary-light': 'text-primary-500 dark:text-primary-300',
    'primary-dark': 'text-primary-700 dark:text-primary-500',
    
    // Cores de feedback com suporte a dark mode
    secondary: 'text-secondary-600 dark:text-secondary-400',
    'secondary-light': 'text-secondary-500 dark:text-secondary-300',
    'secondary-dark': 'text-secondary-700 dark:text-secondary-500',
    
    success: 'text-success-600 dark:text-success-400',
    'success-light': 'text-success-500 dark:text-success-300',
    'success-dark': 'text-success-700 dark:text-success-500',
    
    warning: 'text-warning-600 dark:text-warning-400',
    'warning-light': 'text-warning-500 dark:text-warning-300',
    'warning-dark': 'text-warning-700 dark:text-warning-500',
    
    error: 'text-error-600 dark:text-error-400',
    'error-light': 'text-error-500 dark:text-error-300',
    'error-dark': 'text-error-700 dark:text-error-500',
    
    info: 'text-blue-600 dark:text-blue-400',
    'info-light': 'text-blue-500 dark:text-blue-300',
    'info-dark': 'text-blue-700 dark:text-blue-500',
    
    // Cores adicionais para maior compatibilidade
    light: 'text-muted-foreground',
    lighter: 'text-muted-foreground',
    white: 'text-white',
    black: 'text-black',
    inherit: 'text-inherit',
  };

  const weights = {
    thin: 'font-thin',
    extralight: 'font-extralight',
    light: 'font-light',
    normal: 'font-normal',
    medium: 'font-medium',
    semibold: 'font-semibold',
    bold: 'font-bold',
    extrabold: 'font-extrabold',
    black: 'font-black',
  };

  const aligns = {
    left: 'text-left',
    center: 'text-center',
    right: 'text-right',
    justify: 'text-justify',
  };
  
  const decorations = {
    none: '',
    underline: 'underline decoration-1 underline-offset-2',
    'underline-thick': 'underline decoration-2 underline-offset-2',
    'underline-dotted': 'underline decoration-dotted underline-offset-2',
    'underline-dashed': 'underline decoration-dashed underline-offset-2',
    'underline-wavy': 'underline decoration-wavy underline-offset-2',
    'line-through': 'line-through',
    overline: 'overline',
  };
  
  const transforms = {
    none: '',
    uppercase: 'uppercase',
    lowercase: 'lowercase',
    capitalize: 'capitalize',
  };
  
  // Estilos para animate-in
  const animationClasses = animated ? 'animate-fade-in' : '';
  
  // Estilos para line-clamp
  const lineClampClass = lineClamp ? `line-clamp-${lineClamp}` : '';
  
  // Estilos para itálico
  const italicClass = italic ? 'italic' : '';

  // Determinar o elemento HTML baseado no variant ou no as prop
  const Component = as || (
    variant.startsWith('h') && variant.length === 2 ? variant : 'p'
  );

  const displayedContent = getTranslatedText();

  return (
    <Component
      className={`
        ${variants[variant]}
        ${colors[color]}
        ${weights[weight]}
        ${aligns[align]}
        ${decorations[decoration]}
        ${transforms[transform]}
        ${italicClass}
        ${truncate ? 'truncate' : ''}
        ${lineClampClass}
        ${animationClasses}
        transition-colors duration-200
        ${className}
      `}
      {...props}
    >
      {displayedContent}
    </Component>
  );
};

Text.propTypes = {
  children: PropTypes.node,
  variant: PropTypes.oneOf([
    'h1', 'h2', 'h3', 'h4', 'h5', 'h6',
    'display1', 'display2', 'display3',
    'subtitle1', 'subtitle2',
    'body', 'body2', 'body1',
    'small', 'caption', 'overline', 'label', 'quote'
  ]),
  color: PropTypes.oneOf([
    'default', 'muted', 'subtle',
    'text', 'text-dark', 'text-light',
    'primary', 'primary-light', 'primary-dark',
    'secondary', 'secondary-light', 'secondary-dark',
    'success', 'success-light', 'success-dark',
    'warning', 'warning-light', 'warning-dark',
    'error', 'error-light', 'error-dark',
    'info', 'info-light', 'info-dark',
    'light', 'lighter', 'white', 'black', 'inherit'
  ]),
  weight: PropTypes.oneOf([
    'thin', 'extralight', 'light', 'normal',
    'medium', 'semibold', 'bold', 'extrabold', 'black'
  ]),
  align: PropTypes.oneOf(['left', 'center', 'right', 'justify']),
  decoration: PropTypes.oneOf([
    'none', 'underline', 'underline-thick', 'underline-dotted', 
    'underline-dashed', 'underline-wavy', 'line-through', 'overline'
  ]),
  transform: PropTypes.oneOf(['none', 'uppercase', 'lowercase', 'capitalize']),
  italic: PropTypes.bool,
  lineClamp: PropTypes.oneOfType([PropTypes.number, PropTypes.string]),
  truncate: PropTypes.bool,
  animated: PropTypes.bool,
  t: PropTypes.func,
  translationKey: PropTypes.string,
  translationValues: PropTypes.object,
  className: PropTypes.string,
  as: PropTypes.elementType,
};

export default Text;
