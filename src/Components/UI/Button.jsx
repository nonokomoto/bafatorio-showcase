import PropTypes from 'prop-types';
import { forwardRef } from 'react';
import { cn } from '../../Utils/cn';

const Button = forwardRef(({
  children,
  variant = 'primary',
  size = 'md',
  className = '',
  fullWidth = false,
  loading = false,
  disabled = false,
  icon = null,
  iconPosition = 'left',
  iconOnly = false,
  type = 'button',
  as = 'button',
  startIcon,
  endIcon,
  ...props
}, ref) => {
  const Component = as;
  
  const baseClasses = 'inline-flex items-center justify-center font-medium rounded-md transition-all duration-200 focus:outline-none focus-visible:outline-primary focus-visible:outline-offset-3 dark:focus-visible:outline-primary-400 no-tap-highlight';
  
  const variants = {
    primary: 'bg-primary-500 hover:bg-primary-600 text-white disabled:bg-primary-300 focus:ring-primary-200 active:scale-[0.98] dark:bg-primary-600 dark:hover:bg-primary-700',
    secondary: 'bg-secondary-500 hover:bg-secondary-600 text-white disabled:bg-secondary-300 focus:ring-secondary-200 active:scale-[0.98] dark:bg-secondary-600 dark:hover:bg-secondary-700',
    outline: 'bg-transparent border border-border hover:bg-accent text-foreground disabled:text-muted-foreground focus:ring-ring',
    ghost: 'bg-transparent hover:bg-accent text-foreground disabled:text-muted-foreground focus:ring-ring',
    danger: 'bg-error-500 hover:bg-error-600 text-white disabled:bg-error-300 focus:ring-error-200 active:scale-[0.98] dark:bg-error-600 dark:hover:bg-error-700',
    success: 'bg-success-500 hover:bg-success-600 text-white disabled:bg-success-300 focus:ring-success-200 active:scale-[0.98] dark:bg-success-600 dark:hover:bg-success-700',
    warning: 'bg-warning-500 hover:bg-warning-600 text-white disabled:bg-warning-300 focus:ring-warning-200 active:scale-[0.98] dark:bg-warning-600 dark:hover:bg-warning-700',
    light: 'bg-muted hover:bg-accent text-foreground border border-border',
    soft: 'bg-primary-50 hover:bg-primary-100 text-primary-700 disabled:opacity-50 focus:ring-primary-100 dark:bg-primary-900/30 dark:hover:bg-primary-900/40 dark:text-primary-300',
    glass: 'backdrop-blur-sm bg-white/10 hover:bg-white/20 text-white border border-white/20 shadow-glass dark:bg-black/10 dark:hover:bg-black/20 active:scale-[0.98]',
  };

  const sizes = {
    xs: 'px-2 py-1 text-xs',
    sm: 'px-3 py-1.5 text-sm',
    md: 'px-4 py-2 text-sm',
    lg: 'px-6 py-3 text-base',
    xl: 'px-8 py-4 text-lg',
  };

  const iconOnlySizes = {
    xs: 'p-1',
    sm: 'p-1.5',
    md: 'p-2',
    lg: 'p-2.5',
    xl: 'p-3',
  };
  
  const disabledClasses = 'disabled:opacity-60 disabled:cursor-not-allowed disabled:transform-none';

  const finalIcon = endIcon || startIcon || icon;
  const finalIconPosition = endIcon ? 'right' : startIcon ? 'left' : iconPosition;

  return (
    <Component
      ref={ref}
      type={as === 'button' ? type : undefined}
      disabled={disabled || loading}
      className={cn(
        baseClasses,
        variants[variant],
        iconOnly ? iconOnlySizes[size] : sizes[size],
        fullWidth && 'w-full',
        iconOnly && 'aspect-square',
        disabledClasses,
        className
      )}
      {...props}
    >
      {loading && (
        <svg className="animate-spin -ml-1 mr-2 h-4 w-4 text-current" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
          <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
          <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
        </svg>
      )}
      
      {finalIcon && finalIconPosition === 'left' && !loading && (
        <span className={`${iconOnly ? '' : 'mr-2 -ml-0.5'} inline-flex`}>{finalIcon}</span>
      )}
      
      {!iconOnly && (
        <span className={loading || (finalIcon && finalIconPosition === 'left') ? 'inline-block' : ''}>{children}</span>
      )}
      
      {finalIcon && finalIconPosition === 'right' && !iconOnly && (
        <span className="ml-2 -mr-0.5 inline-flex">{finalIcon}</span>
      )}
    </Component>
  );
});

Button.displayName = 'Button';

Button.propTypes = {
  children: PropTypes.node,
  variant: PropTypes.oneOf(['primary', 'secondary', 'outline', 'ghost', 'danger', 'success', 'warning', 'light', 'soft', 'glass']),
  size: PropTypes.oneOf(['xs', 'sm', 'md', 'lg', 'xl']),
  className: PropTypes.string,
  fullWidth: PropTypes.bool,
  loading: PropTypes.bool,
  disabled: PropTypes.bool,
  icon: PropTypes.node,
  startIcon: PropTypes.node,
  endIcon: PropTypes.node,
  iconPosition: PropTypes.oneOf(['left', 'right']),
  iconOnly: PropTypes.bool,
  type: PropTypes.string,
  as: PropTypes.elementType,
};

export default Button;
