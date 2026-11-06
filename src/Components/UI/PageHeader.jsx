import PropTypes from 'prop-types';
import 'animate.css';

/**
 * A flexible page header component that provides context about the page's purpose.
 * Creates a clear visual separation between header and content with subtle divider.
 */
const PageHeader = ({
  title,
  description,
  features = [],
  action = null,
  animationClass = 'animate__animated animate__fadeIn animate__faster',
  className = '',
}) => {
  return (
    <div className={`${animationClass} ${className} pb-6 mb-8 border-b border-border`}>
      {/* Header with optimized typography for clear hierarchy */}
      <div className="max-w-3xl">
        {/* Title - larger, bolder, darker */}
        <h1 className="text-2xl font-medium text-foreground">
          {title}
        </h1>
        
        {/* Description - smaller, lighter color, proper spacing */}
        {description && (
          <p className="mt-2 text-base text-muted-foreground">
            {description}
          </p>
        )}
      </div>
      
      {/* Action positioned appropriately */}
      {action && (
        <div className="mt-4">
          {action}
        </div>
      )}
      
      {/* Features Section - clean and minimal */}
      {features.length > 0 && (
        <div className="grid grid-cols-1 md:grid-cols-3 gap-8 mt-6">
          {features.map((feature, index) => (
            <FeatureItem 
              key={index} 
              title={feature.title} 
              description={feature.description}
            />
          ))}
        </div>
      )}
    </div>
  );
};

// Feature item with clean, focused design
const FeatureItem = ({ title, description }) => {
  return (
    <div className="flex flex-col">
      <div className="flex items-center mb-1">
        <span className="text-primary-500 dark:text-primary-400 mr-2">→</span>
        <h3 className="font-medium text-foreground">
          {title}
        </h3>
      </div>
      
      <p className="text-sm text-muted-foreground pl-5">
        {description}
      </p>
    </div>
  );
};

FeatureItem.propTypes = {
  title: PropTypes.string.isRequired,
  description: PropTypes.string.isRequired
};

PageHeader.propTypes = {
  /** The title of the page */
  title: PropTypes.string.isRequired,
  
  /** Optional description of the page */
  description: PropTypes.string,
  
  /** Optional array of feature items to display below the description */
  features: PropTypes.arrayOf(
    PropTypes.shape({
      title: PropTypes.string.isRequired,
      description: PropTypes.string.isRequired
    })
  ),
  
  /** Optional action component (button, select, etc.) */
  action: PropTypes.node,
  
  /** CSS animation class for the header */
  animationClass: PropTypes.string,
  
  /** Additional CSS classes for the container */
  className: PropTypes.string
};

export default PageHeader;
