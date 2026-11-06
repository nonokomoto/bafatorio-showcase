import { useState, useEffect } from 'react';
import { FiCheck, FiAlertTriangle, FiLoader, FiAlertCircle } from 'react-icons/fi';
import { useTranslation } from 'react-i18next';
import PropTypes from 'prop-types';

const Spinner = ({ 
  status, 
  successMessage = '', 
  loadingMessage = '', 
  errorMessage = '',
  progress = 0,
  total = 0
}) => {
  const { t } = useTranslation('common');
  const [showError, setShowError] = useState(false);

  useEffect(() => {
    setShowError(status === 'error' || status === 'partial-failure');
  }, [status]);

  let icon;
  let message;
  let title;

  switch (status) {
    case 'loading':
    case 'loadingWithMessage':
      icon = <FiLoader className="text-primary animate-spin" size={48} />;
      message = status === 'loadingWithMessage' ? loadingMessage : t('spinner.loading.default');
      break;
    case 'loadingProgress':
      icon = <FiLoader className="text-primary animate-spin" size={48} />;
      title = t('spinner.loading.participants');
      message = t('spinner.loading.processing', { current: progress, total });
      break;
    case 'success':
      icon = <FiCheck className="text-success" size={48} />;
      title = t('spinner.success.title');
      message = successMessage || t('spinner.success.default');
      break;
    case 'partial-failure':
      icon = <FiAlertCircle className="text-warning" size={48} />;
      title = t('spinner.partialFailure.title');
      message = showError ? (errorMessage || t('spinner.partialFailure.default')) : '';
      break;
    case 'error':
      icon = <FiAlertTriangle className="text-error" size={48} />;
      title = t('spinner.error.title');
      message = showError ? (errorMessage || t('spinner.error.default')) : '';
      break;
    default:
      return null;
  }

  const progressPercentage = progress && total ? (progress / total) * 100 : 0;

  // Different background colors for different states
  const getBackgroundClasses = () => {
    switch (status) {
      case 'partial-failure':
        return 'bg-yellow-50 dark:bg-yellow-900/20';
      case 'error':
        return 'bg-red-50 dark:bg-red-900/20';
      case 'success':
        return 'bg-green-50 dark:bg-green-900/20';
      default:
        return 'bg-card';
    }
  };

  const getBorderClasses = () => {
    switch (status) {
      case 'partial-failure':
        return 'border-t-4 border-warning';
      case 'error':
        return 'border-t-4 border-error';
      case 'success':
        return 'border-t-4 border-success';
      default:
        return '';
    }
  };

  return (
    <div className="fixed inset-0 bg-black/60 dark:bg-black/70 flex items-center justify-center z-50 p-4 animate-fade-in backdrop-blur-sm">
      <div className={`w-full max-w-md ${getBackgroundClasses()} ${getBorderClasses()} rounded-xl shadow-lg overflow-hidden transform transition-all`}>
        <div className="p-6 sm:p-8">
          <div className="flex flex-col items-center justify-center space-y-5">
            <div className="relative">
              {icon}
              {status === 'loadingProgress' && (
                <div className="absolute -inset-2">
                  <svg className="w-full h-full rotate-90">
                    <circle
                      className="text-primary/20"
                      strokeWidth="4"
                      stroke="currentColor"
                      fill="transparent"
                      r="30"
                      cx="50%"
                      cy="50%"
                    />
                    <circle
                      className="text-primary transition-all duration-300 ease-out"
                      strokeWidth="4"
                      strokeDasharray={189}
                      strokeDashoffset={189 - (189 * progressPercentage) / 100}
                      strokeLinecap="round"
                      stroke="currentColor"
                      fill="transparent"
                      r="30"
                      cx="50%"
                      cy="50%"
                    />
                  </svg>
                </div>
              )}
            </div>

            {title && (
              <h2 className="text-xl sm:text-2xl font-bold text-center text-neutral-800 dark:text-white font-display">
                {title}
              </h2>
            )}

            {message && (
              <p className="text-sm sm:text-base text-center text-neutral-600 dark:text-neutral-300 font-sans">
                {message}
              </p>
            )}
            
            {/* Enhanced button for critical states */}
            {(status === 'error' || status === 'partial-failure') && (
              <div className="space-y-2 w-full">
                {status === 'partial-failure' && (
                  <div className="p-3 bg-warning/10 border border-warning/20 rounded-lg">
                    <p className="text-xs text-warning-dark dark:text-warning-light font-medium">
                      {t('spinner.partialFailure.contactSupport')}
                    </p>
                  </div>
                )}
                <button 
                  className={`w-full px-4 py-2 ${
                    status === 'partial-failure' 
                      ? 'bg-warning hover:bg-warning-dark text-white' 
                      : 'bg-primary hover:bg-primary-dark text-white'
                  } font-medium rounded-md transition-colors duration-200`}
                  onClick={() => setShowError(false)}
                >
                  {status === 'partial-failure' ? t('spinner.partialFailure.understood') : 'OK'}
                </button>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};

Spinner.propTypes = {
  status: PropTypes.oneOf(['loading', 'loadingWithMessage', 'loadingProgress', 'success', 'error', 'partial-failure']).isRequired,
  successMessage: PropTypes.string,
  loadingMessage: PropTypes.string,
  errorMessage: PropTypes.string,
  progress: PropTypes.number,
  total: PropTypes.number
};

Spinner.displayName = 'Spinner';

export default Spinner;