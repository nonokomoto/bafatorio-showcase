import PropTypes from 'prop-types';
import clsx from 'clsx';

// Define standard sizes
const sizeClasses = {
    xs: 'w-6 h-6 text-xs',
    sm: 'w-8 h-8 text-sm',
    md: 'w-10 h-10 text-base',
    lg: 'w-12 h-12 text-lg',
    xl: 'w-16 h-16 text-xl',
};

// Define color variants (adjust Tailwind colors as needed)
const colorClasses = {
    gray: 'bg-muted text-muted-foreground',
    primary: 'bg-primary-100 dark:bg-primary-800 text-primary-700 dark:text-primary-200',
    secondary: 'bg-secondary-100 dark:bg-secondary-800 text-secondary-700 dark:text-secondary-200',
    success: 'bg-success-100 dark:bg-success-800 text-success-700 dark:text-success-200',
    warning: 'bg-warning-100 dark:bg-warning-800 text-warning-700 dark:text-warning-200',
    error: 'bg-error-100 dark:bg-error-800 text-error-700 dark:text-error-200',
    info: 'bg-info-100 dark:bg-info-800 text-info-700 dark:text-info-200',
};

const Avatar = ({ initials, src, alt, size = 'md', color = 'gray', className, ...props }) => {
    const avatarSizeClass = sizeClasses[size] || sizeClasses.md;
    const avatarColorClass = colorClasses[color] || colorClasses.gray;

    return (
        <div
            className={clsx(
                'relative inline-flex items-center justify-center rounded-full font-semibold',
                avatarSizeClass,
                !src && avatarColorClass, // Apply color background only if no image src
                className
            )}
            {...props}
        >
            {src ? (
                <img
                    className="w-full h-full object-cover rounded-full"
                    src={src}
                    alt={alt || initials || 'Avatar'}
                />
            ) : (
                <span className="leading-none">{initials}</span>
            )}
        </div>
    );
};

Avatar.propTypes = {
    initials: PropTypes.string, // Initials to display if no src
    src: PropTypes.string,      // Image source URL
    alt: PropTypes.string,      // Alt text for image
    size: PropTypes.oneOf(Object.keys(sizeClasses)), // Size variant
    color: PropTypes.oneOf(Object.keys(colorClasses)), // Color variant for initial background
    className: PropTypes.string, // Additional Tailwind classes
};

export default Avatar; 