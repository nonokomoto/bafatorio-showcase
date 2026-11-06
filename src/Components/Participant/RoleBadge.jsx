import PropTypes from 'prop-types';
import { getRoleStyle } from './roleBadgeConfig';

/**
 * Role label: a dot in the role's highlight color plus plain text, no box. In
 * dense lists (tables, check-in) the status pill is the one colored box per row;
 * the solid role fill is kept for the active filter chip only.
 */
const RoleBadge = ({ roleName, roleStyles, colorKey, className = '' }) => {
  if (!roleName) return null;

  const style = getRoleStyle(roleName, roleStyles, colorKey);
  // Legacy per-name overrides only carry `dot`.
  const color = style.bg || style.dot;

  return (
    <span className={`inline-flex items-center gap-2 max-w-full text-sm text-foreground whitespace-nowrap ${className}`}>
      <span className="w-2 h-2 rounded-full flex-shrink-0" style={{ backgroundColor: color }} />
      <span className="truncate">{roleName}</span>
    </span>
  );
};

RoleBadge.propTypes = {
  roleName: PropTypes.string,
  roleStyles: PropTypes.object,
  colorKey: PropTypes.string,
  className: PropTypes.string,
};

export default RoleBadge;
