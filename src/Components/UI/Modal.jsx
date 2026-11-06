import { useState, useEffect, useRef, createContext} from 'react';
import { createPortal } from 'react-dom';
import PropTypes from 'prop-types';
import Button from './Button';
import DevOverlay from './DevOverlay';

// Contexto para compartilhar métodos entre componentes do Modal
const ModalContext = createContext();

const Modal = ({
  children,
  isOpen = false,
  onClose,
  size = 'md',
  fullWidth = false,
  centered = false,
  hideBackdrop = false,
  disableBackdropClick = false,
  disableEscapeKeyDown = false,
  closeOnBackdropClick = true,
  scrollLock = true,
  showCloseButton = true,
  backdrop = 'default', // 'default', 'transparent', 'blur'
  animation = 'fade', // 'fade', 'scale', 'slide-up', 'slide-down'
  className = '',
  backdropClassName = '',
  contentClassName = '',
  ariaLabelledby,
  ariaDescribedby,
  closeButtonLabel = 'Close modal',
  wip = false,
  ...props
}) => {
  const [mounted, setMounted] = useState(false);
  const contentRef = useRef(null);
  
  // Ensure component is mounted on client-side before attempting portal
  useEffect(() => {
      setMounted(true);
      return () => setMounted(false); // Cleanup mount status
  }, []);
  
  // Controle de scroll lock
  useEffect(() => {
    if (scrollLock && isOpen) {
      document.body.style.overflow = 'hidden';
      return () => {
        document.body.style.overflow = '';
      };
    }
  }, [isOpen, scrollLock]);
  
  // Listener para tecla ESC
  useEffect(() => {
    const handleEscapeKey = (e) => {
      if (!disableEscapeKeyDown && e.key === 'Escape' && isOpen) {
        onClose();
      }
    };
    
    if (isOpen) {
      document.addEventListener('keydown', handleEscapeKey);
      return () => {
        document.removeEventListener('keydown', handleEscapeKey);
      };
    }
  }, [isOpen, disableEscapeKeyDown, onClose]);
  
  // Fechar modal ao clicar no backdrop
  const handleBackdropClick = (e) => {
    if (
      !disableBackdropClick &&
      closeOnBackdropClick &&
      e.target === e.currentTarget
    ) {
      onClose();
    }
  };
  
  // Tamanhos do modal
  const sizes = {
    xs: 'max-w-xs',
    sm: 'max-w-sm',
    md: 'max-w-md',
    lg: 'max-w-lg',
    xl: 'max-w-xl',
    '2xl': 'max-w-2xl',
    '3xl': 'max-w-3xl',
    '4xl': 'max-w-4xl',
    '5xl': 'max-w-5xl',
    '6xl': 'max-w-6xl',
    '7xl': 'max-w-7xl',
    full: 'max-w-full'
  };
  
  // Estilos do backdrop
  const backdropStyles = {
    default: 'bg-black/50 backdrop-blur-sm',
    transparent: 'bg-transparent',
    blur: 'bg-black/30 dark:bg-black/40 backdrop-blur-sm'
  };
  
  // Animações
  const animations = {
    fade: 'animate-modal-fade',
    scale: 'animate-modal-scale',
    'slide-up': 'animate-modal-slide-up',
    'slide-down': 'animate-modal-slide-down'
  };
  
  // Valores para o contexto do modal
  const modalContextValue = {
    isOpen,
    onClose,
    contentRef
  };
  
  // Ensure mounted and that modal-root exists before portal attempt
  if (!mounted) return null;
  const modalRootElement = document.getElementById('modal-root');
  if (!modalRootElement) {
      console.error("Modal root element (#modal-root) not found in the DOM.");
      return null; // Or handle appropriately
  }
  
  return createPortal(
    <ModalContext.Provider value={modalContextValue}>
      {isOpen && (
        <div
          role="presentation"
          className={`
            fixed inset-0 z-50 flex
            ${centered ? 'items-center' : 'items-start pt-16 md:items-center md:pt-0'}
            overflow-y-auto overflow-x-hidden
            p-2 sm:p-4
            ${hideBackdrop ? '' : backdropStyles[backdrop]}
            ${backdropClassName}
          `}
          onClick={handleBackdropClick}
        >
          <div
            ref={contentRef}
            className={`
              relative my-auto mx-auto 
              ${sizes[size]} 
              ${fullWidth ? 'w-full' : ''} 
              ${animations[animation]}
              ${className}
            `}
            role="dialog"
            aria-modal="true"
            aria-labelledby={ariaLabelledby}
            aria-describedby={ariaDescribedby}
            {...props}
          >
            <div className={`relative bg-card rounded-2xl shadow-2xl overflow-hidden ${contentClassName}`}>
              {/* Botão de fechar — z-30 quando wip para ficar acima do DevOverlay */}
              {showCloseButton && (
                <button
                  type="button"
                  className={`absolute right-2 top-2 ${wip ? 'z-30' : 'z-10'} p-2 rounded-full text-muted-foreground hover:text-foreground hover:bg-accent transition-colors`}
                  onClick={onClose}
                  aria-label={closeButtonLabel}
                >
                  <svg
                    xmlns="http://www.w3.org/2000/svg"
                    className="h-5 w-5"
                    fill="none"
                    viewBox="0 0 24 24"
                    stroke="currentColor"
                  >
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth={2}
                      d="M6 18L18 6M6 6l12 12"
                    />
                  </svg>
                </button>
              )}
              {children}
              {wip && <DevOverlay className="absolute inset-0 z-20 rounded-xl overflow-hidden" />}
            </div>
          </div>
        </div>
      )}
    </ModalContext.Provider>,
    modalRootElement // Portal directly to the root element
  );
};

Modal.displayName = 'Modal';

Modal.propTypes = {
  children: PropTypes.node.isRequired,
  isOpen: PropTypes.bool,
  onClose: PropTypes.func.isRequired,
  size: PropTypes.oneOf(['xs', 'sm', 'md', 'lg', 'xl', '2xl', '3xl', '4xl', '5xl', '6xl', '7xl', 'full']),
  fullWidth: PropTypes.bool,
  centered: PropTypes.bool,
  hideBackdrop: PropTypes.bool,
  disableBackdropClick: PropTypes.bool,
  disableEscapeKeyDown: PropTypes.bool,
  closeOnBackdropClick: PropTypes.bool,
  scrollLock: PropTypes.bool,
  showCloseButton: PropTypes.bool,
  backdrop: PropTypes.oneOf(['default', 'transparent', 'blur']),
  animation: PropTypes.oneOf(['fade', 'scale', 'slide-up', 'slide-down']),
  className: PropTypes.string,
  backdropClassName: PropTypes.string,
  contentClassName: PropTypes.string,
  ariaLabelledby: PropTypes.string,
  ariaDescribedby: PropTypes.string,
  closeButtonLabel: PropTypes.string,
  wip: PropTypes.bool,
};

// Componentes auxiliares para o Modal
const ModalHeader = ({ children, className = '', ...props }) => {
  return (
    <div
      className={`px-6 py-4 border-b border-border ${className}`}
      {...props}
    >
      <h3 className="text-lg font-medium text-foreground">
        {children}
      </h3>
    </div>
  );
};

ModalHeader.propTypes = {
  children: PropTypes.node,
  className: PropTypes.string
};

const ModalBody = ({ children, className = '', ...props }) => {
  return (
    <div
      className={`px-4 py-4 sm:px-6 overflow-y-auto ${className}`}
      {...props}
    >
      {children}
    </div>
  );
};

ModalBody.propTypes = {
  children: PropTypes.node,
  className: PropTypes.string
};

const ModalFooter = ({ children, className = '', ...props }) => {
  return (
    <div
      className={`
        px-6 py-4 border-t border-border
        flex justify-end gap-2 flex-wrap
        ${className}
      `}
      {...props}
    >
      {children}
    </div>
  );
};

ModalFooter.propTypes = {
  children: PropTypes.node,
  className: PropTypes.string
};

// Modal de confirmação predefinido
const ConfirmationModal = ({
  isOpen,
  onClose,
  onConfirm,
  title = 'Confirmação',
  message = 'Tem certeza que deseja continuar?',
  confirmText = 'Confirmar',
  cancelText = 'Cancelar',
  confirmVariant = 'primary',
  confirmColor,
  confirmLoading = false,
  confirmDisabled = false,
  size = 'sm',
  ...props
}) => {
  return (
    <Modal isOpen={isOpen} onClose={onClose} size={size} {...props}>
      <div>
        {title && <ModalHeader>{title}</ModalHeader>}
        <ModalBody>
          <p className="text-foreground">{message}</p>
        </ModalBody>
        <ModalFooter>
          <Button variant="ghost" onClick={onClose}>
            {cancelText}
          </Button>
          <Button 
            variant={confirmVariant} 
            color={confirmColor} 
            onClick={onConfirm} 
            loading={confirmLoading}
            disabled={confirmDisabled}
          >
            {confirmText}
          </Button>
        </ModalFooter>
      </div>
    </Modal>
  );
};

ConfirmationModal.propTypes = {
  isOpen: PropTypes.bool.isRequired,
  onClose: PropTypes.func.isRequired,
  onConfirm: PropTypes.func.isRequired,
  title: PropTypes.node,
  message: PropTypes.node,
  confirmText: PropTypes.string,
  cancelText: PropTypes.string,
  confirmVariant: PropTypes.string,
  confirmColor: PropTypes.string,
  confirmLoading: PropTypes.bool,
  confirmDisabled: PropTypes.bool,
  size: PropTypes.string
};

// Hook para usar modal programaticamente
const useModal = (initialOpen = false) => {
  const [isOpen, setIsOpen] = useState(initialOpen);
  
  const openModal = () => setIsOpen(true);
  const closeModal = () => setIsOpen(false);
  const toggleModal = () => setIsOpen(prev => !prev);
  
  return {
    isOpen,
    openModal,
    closeModal,
    toggleModal
  };
};

// Exportar componentes e hook
Modal.Header = ModalHeader;
Modal.Body = ModalBody;
Modal.Footer = ModalFooter;
Modal.Confirmation = ConfirmationModal;
Modal.useModal = useModal;

export default Modal;
