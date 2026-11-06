import React from 'react';
import PropTypes from 'prop-types';
import Text from './Text';

// Cabeçalho de campo (ícone + label + obrigatório) partilhado pelo FormField e
// por quem precisa do mesmo aspecto à volta de um controlo que o FormField não
// cobre — um Select com optionGroups/multiple, um picker de cor. Extraído para
// que o visual dos forms tenha uma fonte só.
const FieldLabel = ({
  icon,
  label,
  required = false,
  htmlFor,
  id,
  className = '',
  iconClassName = 'text-primary-500/70 dark:text-primary-400/70',
  requiredClassName = 'text-primary-500/70 dark:text-primary-400/70',
}) => (
  <div className={`flex items-center gap-2 mb-2 text-muted-foreground transition-colors duration-200 ${className}`}>
    {icon && React.cloneElement(icon, { className: `w-4 h-4 ${icon.props.className || iconClassName}` })}
    {/* Sem htmlFor cai no default do Text para subtitle2, que é <p> — mantém o
        markup que o FormField já produzia antes desta extração. Com htmlFor
        vira <label> a sério, para controlos que o FormField não cobre. */}
    {label && (
      <Text as={htmlFor ? 'label' : undefined} htmlFor={htmlFor} id={id} variant="subtitle2" className="font-medium">
        {label}
      </Text>
    )}
    {required && <span className={`${requiredClassName} text-xs ml-0.5 transition-colors duration-200`}>*</span>}
  </div>
);

FieldLabel.propTypes = {
  icon: PropTypes.element,
  label: PropTypes.string,
  required: PropTypes.bool,
  htmlFor: PropTypes.string,
  id: PropTypes.string,
  className: PropTypes.string,
  iconClassName: PropTypes.string,
  requiredClassName: PropTypes.string,
};

export default FieldLabel;
