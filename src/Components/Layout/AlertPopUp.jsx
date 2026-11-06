import { FiAlertCircle } from 'react-icons/fi';
import { useTranslation } from 'react-i18next';
import PropTypes from 'prop-types';

const AlertPopup = ({
  message,
  onClose,
  isConfirmation = false,
  title,
  isDeleting = false,
  confirmText,
  cancelText,
  confirmColor = "primary",
  cancelColor = "secondary",
  messagePosition = "center",
}) => {
  const { t } = useTranslation('common');
  
  const messageClasses = {
    center: 'text-center',
    left: 'text-left',
    right: 'text-right',
  };

  return (
    <div 
      className="fixed inset-0 bg-black/50 backdrop-blur-sm flex justify-center items-center z-[100] p-4 animate-fade-in"
      role="dialog"
      aria-modal="true"
      aria-labelledby="alert-title"
      aria-describedby="alert-message"
    >
      <div
        className="w-full max-w-md bg-card rounded-xl shadow-lg border border-border
                  overflow-hidden transform transition-all animate-scale-up"
      >
        <div className="p-6 sm:p-8">
          <div className="flex flex-col items-center justify-center space-y-4">
            <div className="p-3 rounded-full bg-primary-50 dark:bg-primary-900/20">
              <FiAlertCircle 
                className="text-primary-500 text-3xl" 
                aria-hidden="true" 
              />
            </div>
            
            <h2
              id="alert-title"
              className="text-xl font-bold text-center text-foreground font-display mt-2"
            >
              {title || (isConfirmation ? t('alert.confirmation') : t('alert.alert'))}
            </h2>
            
            <p
              id="alert-message"
              className={`text-base ${messageClasses[messagePosition]} text-muted-foreground mt-2`}
            >
              {message}
            </p>
            
            <div className="flex space-x-4 mt-6">
              {isConfirmation ? (
                <>
                  <button
                    onClick={() => onClose(true)}
                    disabled={isDeleting}
                    className={`px-5 py-2 rounded-md text-white font-medium text-sm
                      bg-${confirmColor} hover:bg-${confirmColor}-600 
                      disabled:opacity-70 disabled:cursor-not-allowed
                      focus:outline-none focus:ring-2 focus:ring-${confirmColor}-500 focus:ring-offset-2 
                      transition-colors duration-150`}
                  >
                    {isDeleting ? (
                      <span className="flex items-center">
                        <svg className="animate-spin -ml-1 mr-2 h-4 w-4 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                          <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                          <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                        </svg>
                        {t('alert.generating')}
                      </span>
                    ) : (
                      confirmText || t('alert.confirm')
                    )}
                  </button>
                  <button
                    onClick={() => onClose(false)}
                    disabled={isDeleting}
                    className={`px-5 py-2 rounded-md font-medium text-sm
                      bg-transparent border border-${cancelColor}-500
                      text-${cancelColor}-700 dark:text-${cancelColor}-300
                      hover:bg-${cancelColor}-50 dark:hover:bg-${cancelColor}-900/20
                      disabled:opacity-70 disabled:cursor-not-allowed
                      focus:outline-none focus:ring-2 focus:ring-${cancelColor}-500 focus:ring-offset-2
                      transition-colors duration-150`}
                  >
                    {cancelText || t('alert.cancel')}
                  </button>
                </>
              ) : (
                <button
                  onClick={() => onClose(false)}
                  className={`px-5 py-2 rounded-md text-white font-medium text-sm
                    bg-${confirmColor} hover:bg-${confirmColor}-600 
                    focus:outline-none focus:ring-2 focus:ring-${confirmColor}-500 focus:ring-offset-2
                    transition-colors duration-150`}
                >
                  {confirmText || t('alert.ok')}
                </button>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

AlertPopup.propTypes = {
  message: PropTypes.string.isRequired,
  onClose: PropTypes.func.isRequired,
  isConfirmation: PropTypes.bool,
  title: PropTypes.string,
  isDeleting: PropTypes.bool,
  confirmText: PropTypes.string,
  cancelText: PropTypes.string,
  confirmColor: PropTypes.string,
  cancelColor: PropTypes.string,
  messagePosition: PropTypes.oneOf(['center', 'left', 'right'])
};

export default AlertPopup;