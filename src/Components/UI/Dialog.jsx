import { useEffect, useRef } from 'react';
import PropTypes from 'prop-types';
import { createPortal } from 'react-dom';

const Dialog = ({
  children,
  isOpen,
  onClose,
  className = '',
  size = 'md',
  closeOnOutsideClick = true,
  closeOnEsc = true,
  ...props
}) => {
  const dialogRef = useRef(null);

  useEffect(() => {
    const handleKeyDown = (e) => {
      if (closeOnEsc && e.key === 'Escape') {
        onClose();
      }
    };

    if (isOpen) {
      document.body.style.overflow = 'hidden';
      document.addEventListener('keydown', handleKeyDown);
    }

    return () => {
      document.body.style.overflow = '';
      document.removeEventListener('keydown', handleKeyDown);
    };
  }, [isOpen, onClose, closeOnEsc]);

  const handleOutsideClick = (e) => {
    if (closeOnOutsideClick && dialogRef.current && !dialogRef.current.contains(e.target)) {
      onClose();
    }
  };

  const sizes = {
    sm: 'max-w-sm',
    md: 'max-w-md',
    lg: 'max-w-lg',
    xl: 'max-w-xl',
    '2xl': 'max-w-2xl',
    '3xl': 'max-w-3xl',
    '4xl': 'max-w-4xl',
    '5xl': 'max-w-5xl',
    full: 'max-w-full'
  };

  if (!isOpen) return null;

  return createPortal(
    <div 
      className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black bg-opacity-50 backdrop-blur-sm animate-fade-in"
      onClick={handleOutsideClick}
      aria-modal="true"
      role="dialog"
      {...props}
    >
      <div
        ref={dialogRef}
        className={`w-full ${sizes[size]} bg-card rounded-2xl shadow-xl dark:shadow-dark-elevated border border-border overflow-hidden transform transition-all duration-200 ease-in-out animate-slide-up ${className}`}
      >
        {children}
      </div>
    </div>,
    document.body
  );
};

Dialog.Header = ({ children, className = '', ...props }) => (
  <div className={`px-6 py-4 border-b border-border ${className}`} {...props}>
    {children}
  </div>
);

Dialog.Body = ({ children, className = '', ...props }) => (
  <div className={`p-6 overflow-y-auto ${className}`} {...props}>
    {children}
  </div>
);

Dialog.Footer = ({ children, className = '', ...props }) => (
  <div className={`px-6 py-4 border-t border-border flex justify-end space-x-3 ${className}`} {...props}>
    {children}
  </div>
);

Dialog.propTypes = {
  children: PropTypes.node.isRequired,
  isOpen: PropTypes.bool.isRequired,
  onClose: PropTypes.func.isRequired,
  className: PropTypes.string,
  size: PropTypes.oneOf(['sm', 'md', 'lg', 'xl', '2xl', '3xl', '4xl', '5xl', 'full']),
  closeOnOutsideClick: PropTypes.bool,
  closeOnEsc: PropTypes.bool
};

Dialog.Header.propTypes = {
  children: PropTypes.node,
  className: PropTypes.string
};

Dialog.Body.propTypes = {
  children: PropTypes.node,
  className: PropTypes.string
};

Dialog.Footer.propTypes = {
  children: PropTypes.node,
  className: PropTypes.string
};

Dialog.Header.displayName = 'Dialog.Header';
Dialog.Body.displayName = 'Dialog.Body';
Dialog.Footer.displayName = 'Dialog.Footer';

export default Dialog;
