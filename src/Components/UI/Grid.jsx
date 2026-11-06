import PropTypes from 'prop-types';

const Grid = ({
  children,
  cols = 1,
  gap = 'md',
  className = '',
  as = 'div',
  ...props
}) => {
  const Component = as;

  const gridCols = {
    1: 'grid-cols-1',
    2: 'grid-cols-1 md:grid-cols-2',
    3: 'grid-cols-1 md:grid-cols-2 lg:grid-cols-3',
    4: 'grid-cols-1 sm:grid-cols-2 lg:grid-cols-4',
    auto: 'grid-cols-auto-fill',
  };

  const gridGaps = {
    none: 'gap-0',
    xs: 'gap-1',
    sm: 'gap-2',
    md: 'gap-4',
    lg: 'gap-6',
    xl: 'gap-8',
  };

  return (
    <Component
      className={`grid ${gridCols[cols]} ${gridGaps[gap] || gridGaps.md} ${className}`}
      {...props}
    >
      {children}
    </Component>
  );
};

Grid.propTypes = {
  children: PropTypes.node,
  cols: PropTypes.oneOf([1, 2, 3, 4, 'auto']),
  gap: PropTypes.oneOf(['none', 'xs', 'sm', 'md', 'lg', 'xl']),
  className: PropTypes.string,
  as: PropTypes.elementType
};

export default Grid;
