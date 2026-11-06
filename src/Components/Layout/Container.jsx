import PropTypes from 'prop-types';

const Container = ({ children, className = "", fluid = false, as = 'div', ...props }) => {
  const Component = as;
  
  return (
    <Component 
      className={`${fluid ? 'w-full' : 'container mx-auto px-4 sm:px-6 md:px-8 lg:px-12'} ${className}`}
      {...props}
    >
      {children}
    </Component>
  );
};

Container.propTypes = {
  children: PropTypes.node,
  className: PropTypes.string,
  fluid: PropTypes.bool,
  as: PropTypes.elementType
};

export default Container;
