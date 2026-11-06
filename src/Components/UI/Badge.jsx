import PropTypes from 'prop-types';

const Badge = ({
  children,
  variant = 'primary',
  tone = 'light',
  size = 'md',
  pill = false,
  dot = false,
  dotColor,
  icon = null,
  count = null,
  animated = false,
  removable = false,
  onRemove = () => {},
  className = '',
  ...props
}) => {
  const tones = {
    solid: {
      primary: 'bg-primary-500 text-white dark:bg-primary-600',
      secondary: 'bg-secondary-500 text-white dark:bg-secondary-600',
      success: 'bg-success-500 text-white dark:bg-success-600',
      warning: 'bg-warning-500 text-white dark:bg-warning-600',
      error: 'bg-error-500 text-white dark:bg-error-600',
      info: 'bg-blue-500 text-white dark:bg-blue-600',
      neutral: 'bg-neutral-500 text-white dark:bg-neutral-600',
      gray: 'bg-neutral-500 text-white dark:bg-neutral-600',
      purple: 'bg-purple-500 text-white dark:bg-purple-600',
      teal: 'bg-teal-500 text-white dark:bg-teal-600',
      pink: 'bg-pink-500 text-white dark:bg-pink-600',
    },
    light: {
      primary: 'bg-primary-100 text-primary-800 dark:bg-primary-900/40 dark:text-primary-300',
      secondary: 'bg-secondary-100 text-secondary-800 dark:bg-secondary-900/40 dark:text-secondary-300',
      success: 'bg-success-100 text-success-800 dark:bg-success-900/40 dark:text-success-300',
      warning: 'bg-warning-100 text-warning-800 dark:bg-warning-900/40 dark:text-warning-300',
      error: 'bg-error-100 text-error-800 dark:bg-error-900/40 dark:text-error-300',
      info: 'bg-blue-100 text-blue-800 dark:bg-blue-900/40 dark:text-blue-300',
      neutral: 'bg-muted text-muted-foreground',
      gray: 'bg-neutral-100 text-neutral-800 dark:bg-neutral-900/40 dark:text-neutral-300',
      purple: 'bg-purple-100 text-purple-800 dark:bg-purple-900/40 dark:text-purple-300',
      teal: 'bg-teal-100 text-teal-800 dark:bg-teal-900/40 dark:text-teal-300',
      pink: 'bg-pink-100 text-pink-800 dark:bg-pink-900/40 dark:text-pink-300',
    },
    outline: {
      primary: 'bg-transparent border border-primary-500 text-primary-600 dark:border-primary-400 dark:text-primary-400',
      secondary: 'bg-transparent border border-secondary-500 text-secondary-600 dark:border-secondary-400 dark:text-secondary-400',
      success: 'bg-transparent border border-success-500 text-success-600 dark:border-success-400 dark:text-success-400',
      warning: 'bg-transparent border border-warning-500 text-warning-600 dark:border-warning-400 dark:text-warning-400',
      error: 'bg-transparent border border-error-500 text-error-600 dark:border-error-400 dark:text-error-400',
      info: 'bg-transparent border border-blue-500 text-blue-600 dark:border-blue-400 dark:text-blue-400',
      neutral: 'bg-transparent border border-neutral-500 text-neutral-600 dark:border-neutral-400 dark:text-neutral-400',
      gray: 'bg-transparent border border-neutral-500 text-neutral-600 dark:border-neutral-400 dark:text-neutral-400',
      purple: 'bg-transparent border border-purple-500 text-purple-600 dark:border-purple-400 dark:text-purple-400',
      teal: 'bg-transparent border border-teal-500 text-teal-600 dark:border-teal-400 dark:text-teal-400',
      pink: 'bg-transparent border border-pink-500 text-pink-600 dark:border-pink-400 dark:text-pink-400',
    },
    // For labels sitting on a solid colored surface — always white, no fill/border.
    // Legibility comes from the surface behind it (see eventStatusConfig headerBg).
    onSolid: {
      primary: 'bg-transparent text-white',
      secondary: 'bg-transparent text-white',
      success: 'bg-transparent text-white',
      warning: 'bg-transparent text-white',
      error: 'bg-transparent text-white',
      info: 'bg-transparent text-white',
      neutral: 'bg-transparent text-white',
      gray: 'bg-transparent text-white',
      purple: 'bg-transparent text-white',
      teal: 'bg-transparent text-white',
      pink: 'bg-transparent text-white',
    },
    soft: {
      primary: 'bg-primary-50 text-primary-700 dark:bg-primary-900/20 dark:text-primary-300',
      secondary: 'bg-secondary-50 text-secondary-700 dark:bg-secondary-900/20 dark:text-secondary-300',
      success: 'bg-success-50 text-success-700 dark:bg-success-900/20 dark:text-success-300',
      warning: 'bg-warning-50 text-warning-700 dark:bg-warning-900/20 dark:text-warning-300',
      error: 'bg-error-50 text-error-700 dark:bg-error-900/20 dark:text-error-300',
      info: 'bg-blue-50 text-blue-700 dark:bg-blue-900/20 dark:text-blue-300',
      neutral: 'bg-neutral-50 text-neutral-700 dark:bg-neutral-900/20 dark:text-neutral-300',
      gray: 'bg-neutral-50 text-neutral-700 dark:bg-neutral-900/20 dark:text-neutral-300',
      purple: 'bg-purple-50 text-purple-700 dark:bg-purple-900/20 dark:text-purple-300',
      teal: 'bg-teal-50 text-teal-700 dark:bg-teal-900/20 dark:text-teal-300',
      pink: 'bg-pink-50 text-pink-700 dark:bg-pink-900/20 dark:text-pink-300',
    }
  };

  const sizes = {
    xs: 'text-xs px-1 py-0.5 leading-none',
    sm: 'text-xs px-1.5 py-0.5',
    md: 'text-sm px-2 py-1',
    lg: 'text-base px-2.5 py-1'
  };

  const iconSizes = {
    xs: 'w-3 h-3',
    sm: 'w-3.5 h-3.5',
    md: 'w-4 h-4',
    lg: 'w-5 h-5'
  };

  const dotSizes = {
    xs: 'w-1.5 h-1.5',
    sm: 'w-2 h-2',
    md: 'w-2 h-2',
    lg: 'w-2.5 h-2.5'
  };

  const getDotColor = () => {
    if (dotColor) return `bg-${dotColor}`;
    
    // Use the variant color if no specific dot color is provided
    if (tone === 'outline') return 'bg-current';
    if (tone === 'solid' || tone === 'onSolid') return 'bg-white';
    return '';
  };

  const countStyles = count !== null 
    ? {
        xs: 'ml-1 -mr-0.5',
        sm: 'ml-1 -mr-0.5',
        md: 'ml-1.5 -mr-1',
        lg: 'ml-2 -mr-1'
      }[size]
    : '';

  const animationClass = animated 
    ? 'animate-badge-pulse'
    : '';

  const handleRemoveClick = (e) => {
    e.stopPropagation();
    onRemove(e);
  };

  const borderRadius = pill ? 'rounded-full' : 'rounded';

  return (
    <span
      className={`
        inline-flex items-center justify-center font-medium
        ${tones[tone][variant]}
        ${sizes[size]}
        ${borderRadius}
        ${animationClass}
        transition-all duration-200 ease-in-out
        ${className}
      `}
      {...props}
    >
      {icon && (
        <span className={`${children ? 'mr-1.5' : ''} ${iconSizes[size]} inline-flex items-center justify-center`}>
          {icon}
        </span>
      )}
      
      {dot && (
        <span className={`
          inline-block ${dotSizes[size]} rounded-full mr-1.5
          ${getDotColor()}
        `}></span>
      )}
      
      {children}
      
      {count !== null && (
        <span className={`font-semibold ${countStyles}`}>
          {count}
        </span>
      )}
      
      {removable && (
        <button
          type="button"
          onClick={handleRemoveClick}
          className={`
            ml-1.5 inline-flex items-center justify-center rounded-full
            hover:bg-black/10 dark:hover:bg-white/10
            transition-colors duration-150
            ${iconSizes[size]}
          `}
          aria-label="Remove"
        >
          <svg 
            xmlns="http://www.w3.org/2000/svg" 
            fill="none" 
            viewBox="0 0 24 24" 
            stroke="currentColor" 
            className="w-3/4 h-3/4"
          >
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
          </svg>
        </button>
      )}
    </span>
  );
};

Badge.propTypes = {
  children: PropTypes.node,
  variant: PropTypes.oneOf([
    'primary', 'secondary', 'success', 'warning', 
    'error', 'info', 'neutral', 'gray',
    'purple', 'teal', 'pink'
  ]),
  tone: PropTypes.oneOf(['solid', 'light', 'outline', 'soft', 'onSolid']),
  size: PropTypes.oneOf(['xs', 'sm', 'md', 'lg']),
  pill: PropTypes.bool,
  dot: PropTypes.bool,
  dotColor: PropTypes.string,
  icon: PropTypes.node,
  count: PropTypes.oneOfType([PropTypes.number, PropTypes.string]),
  animated: PropTypes.bool,
  removable: PropTypes.bool,
  onRemove: PropTypes.func,
  className: PropTypes.string
};

export default Badge;
