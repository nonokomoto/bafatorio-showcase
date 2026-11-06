import PropTypes from 'prop-types';
import { cn } from '../../Utils/cn';

/**
 * Componente Card unificado para garantir consistência visual com o sistema tipográfico
 * Atualizado para usar as mesmas classes de cor que o componente Text
 *
 * @example Nota de Uso (Estilo Base Preferido):
 * Para o estilo base padrão recomendado (com animação e hover):
 * <Card 
 *   elevated="sm" // Ou outra elevação desejada
 *   interactive // Para ativar o efeito hover
 *   className="animate__animated animate__fadeIn transition-all duration-300 overflow-hidden"
 *   // ...outras props
 * >
 *   {...conteúdo}
 * </Card>
 */
const Card = ({
  children,
  variant = 'default',
  className = '',
  padded = true,
  bordered = true,
  elevated = true,
  interactive = false,
  as = 'div',
  ...props
}) => {
  const Component = as;
  
  const baseClasses = 'rounded-xl transition-all duration-200';
  
  const variants = {
    default: 'bg-card text-card-foreground',
    primary: 'bg-primary-50 dark:bg-primary-900/30 text-primary-800 dark:text-primary-200',
    secondary: 'bg-secondary-50 dark:bg-secondary-900/30 text-secondary-800 dark:text-secondary-200',
    success: 'bg-success-50 dark:bg-success-900/30 text-success-800 dark:text-success-200',
    error: 'bg-error-50 dark:bg-error-900/30 text-error-800 dark:text-error-200',
    warning: 'bg-warning-50 dark:bg-warning-900/30 text-warning-800 dark:text-warning-200',
    info: 'bg-blue-50 dark:bg-blue-900/30 text-blue-800 dark:text-blue-200',
    glass: 'bg-background-surface/80 dark:bg-background-surface-dark/80 backdrop-blur-md',
    transparent: 'bg-transparent',
  };
  
  const padding = {
    none: '',
    sm: 'p-card-sm',
    md: 'p-card-md',
    lg: 'p-card-lg',
  };
  
  const getPadding = () => {
    if (!padded) return padding.none;
    if (typeof padded === 'string' && padding[padded]) return padding[padded];
    return padding.md;
  };
  
  const shadows = {
    none: '',
    sm: 'shadow-sm dark:shadow-dark-card',
    md: 'shadow-md dark:shadow-dark-card',
    lg: 'shadow-lg dark:shadow-dark-elevated',
    xl: 'shadow-xl dark:shadow-dark-elevated',
    card: 'shadow-card dark:shadow-dark-card',
    elevated: 'shadow-elevated dark:shadow-dark-elevated',
    glass: 'shadow-glass dark:shadow-dark-glass',
  };
  
  const getShadow = () => {
    if (!elevated) return shadows.none;
    if (typeof elevated === 'string' && shadows[elevated]) return shadows[elevated];
    return shadows.card;
  };
  
  const borderStyles = bordered === true
    ? 'border border-border'
    : bordered
      ? `border ${bordered}`
      : '';
  
  // Hover effects for interactive cards
  const interactiveClasses = interactive 
    ? 'cursor-pointer hover:shadow-lg dark:hover:shadow-dark-elevated hover:translate-y-hover hover:scale-102 active:translate-y-active active:scale-98 transition-all duration-200'
    : '';
  
  return (
    <Component
      className={cn(
        baseClasses,
        variants[variant],
        getPadding(),
        getShadow(),
        borderStyles,
        interactiveClasses,
        className
      )}
      {...props}
    >
      {children}
    </Component>
  );
};

Card.propTypes = {
  children: PropTypes.node,
  variant: PropTypes.oneOf([
    'default', 'primary', 'secondary', 'success', 
    'error', 'warning', 'info', 'glass', 'transparent'
  ]),
  className: PropTypes.string,
  padded: PropTypes.oneOfType([
    PropTypes.bool,
    PropTypes.oneOf(['none', 'sm', 'md', 'lg'])
  ]),
  bordered: PropTypes.oneOfType([
    PropTypes.bool,
    PropTypes.string
  ]),
  elevated: PropTypes.oneOfType([
    PropTypes.bool,
    PropTypes.oneOf(['none', 'sm', 'md', 'lg', 'xl', 'card', 'elevated', 'glass'])
  ]),
  interactive: PropTypes.bool,
  as: PropTypes.elementType
};

export default Card;
