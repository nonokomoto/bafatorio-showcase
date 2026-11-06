import { forwardRef } from 'react';
import PropTypes from 'prop-types';
import Text from './Text';
import { cn } from '../../Utils/cn';

const Input = forwardRef(({
  id,
  name,
  type = 'text',
  label,
  placeholder,
  helperText,
  error,
  size = 'md',
  required = false,
  disabled = false,
  readOnly = false,
  fullWidth = true,
  startIcon = null,
  endIcon = null,
  className = '',
  containerClassName = '',
  labelClassName = '',
  inputClassName = '',
  helperTextClassName = '',
  t = null, // Função de tradução que pode ser passada
  translationKey = '', // Chave base para tradução (ex: 'form.fields')
  onChange,
  onBlur,
  ...props
}, ref) => {
  // Determinar placeholder com base em tradução ou valor direto
  const getPlaceholder = () => {
    if (t && translationKey && placeholder === undefined) {
      return t(`${translationKey}.${name}.placeholder`);
    }
    return placeholder;
  };

  // Determinar label com base em tradução ou valor direto
  const getLabel = () => {
    if (t && translationKey && label === undefined) {
      return t(`${translationKey}.${name}.label`);
    }
    return label;
  };

  // Determinar texto de ajuda com base em tradução ou valor direto
  const getHelperText = () => {
    if (t && translationKey && helperText === undefined && !error) {
      const key = `${translationKey}.${name}.helperText`;
      const translated = t(key);
      return translated !== key ? translated : '';
    }
    return helperText;
  };

  // Determinar erro com base em tradução ou valor direto
  const getError = () => {
    if (typeof error === 'string') {
      return error;
    }
    if (t && translationKey && error === true) {
      return t(`${translationKey}.${name}.error`);
    }
    return '';
  };

  const sizes = {
    sm: 'px-3 py-1.5 text-sm',
    md: 'px-4 py-2 text-base',
    lg: 'px-5 py-2.5 text-lg',
  };

  const errorMessage = getError();
  const displayHelperText = getHelperText();
  const displayLabel = getLabel();
  const displayPlaceholder = getPlaceholder();

  return (
    <div className={cn(fullWidth && 'w-full', containerClassName)}>
      {displayLabel && (
        <label 
          htmlFor={id || name}
          className={`block mb-2 font-medium text-foreground ${labelClassName}`}
        >
          {displayLabel}
          {required && <span className="ml-1 text-error-500">*</span>}
        </label>
      )}
      
      <div className="relative">
        {startIcon && (
          <div className="absolute inset-y-0 left-0 flex items-center pl-3 pointer-events-none text-muted-foreground">
            {startIcon}
          </div>
        )}
        
        <input
          ref={ref}
          type={type}
          id={id || name}
          name={name}
          className={cn(
            'block w-full rounded-md',
            sizes[size],
            startIcon && 'pl-10',
            endIcon && 'pr-10',
            error
              ? 'border-error-500 focus:ring-error-500 focus:border-error-500 dark:border-error-600'
              : 'border-input focus:ring-primary-500 focus:border-primary-500',
            'bg-card text-foreground',
            'disabled:bg-muted disabled:opacity-70 disabled:cursor-not-allowed',
            'read-only:bg-muted read-only:opacity-70 read-only:cursor-default',
            'shadow-sm focus:outline-none focus:ring-2 focus:ring-offset-1',
            'focus-visible:outline-primary focus-visible:outline-offset-2 dark:focus-visible:outline-primary-400',
            'transition-all duration-200 ease-in-out',
            'placeholder:text-muted-foreground',
            inputClassName,
            className
          )}
          placeholder={displayPlaceholder || ''}
          disabled={disabled}
          readOnly={readOnly}
          required={required}
          onChange={onChange}
          onBlur={onBlur}
          {...props}
        />
        
        {endIcon && (
          <div className="absolute inset-y-0 right-0 flex items-center pr-3 text-muted-foreground">
            {endIcon}
          </div>
        )}
      </div>
      
      {(errorMessage || displayHelperText) && (
        <Text
          variant="body2"
          color={error ? 'error' : 'light'}
          className={`mt-1.5 ${helperTextClassName} ${error ? 'animate-fade-in' : ''}`}
        >
          {errorMessage || displayHelperText}
        </Text>
      )}
    </div>
  );
});

Input.displayName = 'Input';

Input.propTypes = {
  id: PropTypes.string,
  name: PropTypes.string.isRequired,
  type: PropTypes.string,
  label: PropTypes.string,
  placeholder: PropTypes.string,
  helperText: PropTypes.string,
  error: PropTypes.oneOfType([PropTypes.bool, PropTypes.string]),
  size: PropTypes.oneOf(['sm', 'md', 'lg']),
  required: PropTypes.bool,
  disabled: PropTypes.bool,
  readOnly: PropTypes.bool,
  fullWidth: PropTypes.bool,
  startIcon: PropTypes.node,
  endIcon: PropTypes.node,
  className: PropTypes.string,
  containerClassName: PropTypes.string,
  labelClassName: PropTypes.string,
  inputClassName: PropTypes.string,
  helperTextClassName: PropTypes.string,
  t: PropTypes.func,
  translationKey: PropTypes.string,
  onChange: PropTypes.func,
  onBlur: PropTypes.func
};

export default Input;
