import React from 'react';
import PropTypes from 'prop-types';
import { Text } from './index';

/**
 * Componente de cabeçalho da tabela.
 */
const TableHead = ({ children, className = '', ...props }) => {
  return (
    <thead className={className} {...props}>
      {children}
    </thead>
  );
};

TableHead.propTypes = {
  children: PropTypes.node.isRequired,
  className: PropTypes.string
};

/**
 * Componente de corpo da tabela.
 */
const TableBody = ({ children, className = '', ...props }) => {
  return (
    <tbody className={className} {...props}>
      {children}
    </tbody>
  );
};

TableBody.propTypes = {
  children: PropTypes.node.isRequired,
  className: PropTypes.string
};

/**
 * Componente de linha da tabela.
 */
const TableRow = ({ 
  children, 
  isHeader = false, 
  selected = false, 
  className = '', 
  hover = true,
  striped = false,
  index,
  ...props 
}) => {
  return (
    <tr 
      className={`
        ${hover && !isHeader ? 'hover:bg-accent' : ''}
        ${selected ? 'bg-primary-50 dark:bg-primary-900/10' : ''}
        ${striped && !isHeader && index % 2 === 1 ? 'bg-neutral-50/80 dark:bg-neutral-800/20' : ''}
        transition-colors duration-200
        ${className}
      `}
      {...props}
    >
      {children}
    </tr>
  );
};

TableRow.propTypes = {
  children: PropTypes.node.isRequired,
  isHeader: PropTypes.bool,
  selected: PropTypes.bool,
  hover: PropTypes.bool,
  striped: PropTypes.bool,
  index: PropTypes.number,
  className: PropTypes.string
};

/**
 * Componente de célula da tabela.
 */
const TableCell = ({ 
  children, 
  isHeader = false, 
  align = 'left', 
  className = '',
  showDot = false,
  dotColor = 'primary',
  ...props 
}) => {
  const Component = isHeader ? 'th' : 'td';
  const alignClasses = {
    left: 'text-left',
    center: 'text-center',
    right: 'text-right'
  };

  const paddingClasses = isHeader 
    ? 'py-4 pl-6 pr-3' 
    : 'py-3 pl-6 pr-3';

  const dotColors = {
    primary: 'bg-primary-500 dark:bg-primary-400',
    success: 'bg-success-500 dark:bg-success-400',
    error: 'bg-error-500 dark:bg-error-400',
    warning: 'bg-warning-500 dark:bg-warning-400',
    info: 'bg-info-500 dark:bg-info-400'
  };

  return (
    <Component 
      className={`
        ${paddingClasses}
        ${alignClasses[align]}
        ${className}
      `}
      {...props}
    >
      {showDot ? (
        <div className="flex items-center gap-2">
          <div className={`w-1.5 h-1.5 rounded-full ${dotColors[dotColor]}`}></div>
          {children}
        </div>
      ) : children}
    </Component>
  );
};

TableCell.propTypes = {
  children: PropTypes.node.isRequired,
  isHeader: PropTypes.bool,
  align: PropTypes.oneOf(['left', 'center', 'right']),
  className: PropTypes.string,
  showDot: PropTypes.bool,
  dotColor: PropTypes.oneOf(['primary', 'success', 'error', 'warning', 'info'])
};

/**
 * Componente de cabeçalho com ícone e texto
 */
const TableHeaderCell = ({ 
  icon, 
  children, 
  align = 'left', 
  className = '', 
  ...props 
}) => {
  return (
    <TableCell isHeader align={align} className={className} {...props}>
      <div className="flex items-center gap-2">
        {icon && <div className="text-text-500 dark:text-text-400">{icon}</div>}
        {typeof children === 'string' ? (
          <Text variant="subtitle2" className="text-text-600 dark:text-text-300 font-medium">
            {children}
          </Text>
        ) : (
          children
        )}
      </div>
    </TableCell>
  );
};

TableHeaderCell.propTypes = {
  icon: PropTypes.node,
  children: PropTypes.node.isRequired,
  align: PropTypes.oneOf(['left', 'center', 'right']),
  className: PropTypes.string
};

/**
 * Componente principal da tabela.
 */
const Table = ({ 
  children, 
  hover = true, 
  striped = false, 
  shadow = true, 
  className = '', 
  ...props 
}) => {
  // Clone children para passar propriedades
  const childrenWithProps = React.Children.map(children, child => {
    if (React.isValidElement(child)) {
      // Passar hover para TableBody
      if (child.type === TableBody) {
        const bodyChildrenWithProps = React.Children.map(child.props.children, (bodyChild, index) => {
          if (React.isValidElement(bodyChild) && bodyChild.type === TableRow) {
            return React.cloneElement(bodyChild, { 
              hover: hover,
              striped: striped,
              index: index
            });
          }
          return bodyChild;
        });
        
        return React.cloneElement(child, {}, bodyChildrenWithProps);
      }
      return child;
    }
    return child;
  });

  return (
    <div className={`
      overflow-hidden 
      rounded-lg 
      bg-card
      ${shadow ? 'shadow-sm' : ''}
      ${className}
    `}>
      <table className="w-full" {...props}>
        {childrenWithProps}
      </table>
    </div>
  );
};

Table.propTypes = {
  children: PropTypes.node.isRequired,
  hover: PropTypes.bool,
  striped: PropTypes.bool,
  shadow: PropTypes.bool,
  className: PropTypes.string
};

// Atribuir subcomponentes ao componente Table
Table.Head = TableHead;
Table.Body = TableBody;
Table.Row = TableRow;
Table.Cell = TableCell;
Table.HeaderCell = TableHeaderCell;

export default Table;
