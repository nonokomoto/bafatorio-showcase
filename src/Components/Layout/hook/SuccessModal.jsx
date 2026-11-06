import { useEffect, useState } from 'react';
import { FiCheck } from 'react-icons/fi';
import { useNavigate } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import PropTypes from 'prop-types';

const SuccessModal = ({ 
  title = "Operação Concluída com Sucesso!",
  message = "A sua ação foi processada com sucesso.",
  redirectPath = null,
  redirectDelay = 5000,
  showProgress = false,
  progress = 0,
  showIcon = true 
}) => {
  const navigate = useNavigate();
  const [countdown, setCountdown] = useState(redirectDelay / 1000);
  const { t } = useTranslation();

  // Effect to handle redirection and countdown
  useEffect(() => {
    let timer;
    if (redirectPath && !showProgress) {
      timer = setInterval(() => {
        setCountdown((prevCount) => {
          if (prevCount <= 1) {
            clearInterval(timer);
            navigate(redirectPath);
            return 0;
          }
          return prevCount - 1;
        });
      }, 1000);
    }
    return () => clearInterval(timer);
  }, [navigate, redirectPath, redirectDelay, showProgress]);

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 backdrop-blur-sm flex justify-center items-center z-50 p-4 animate-fade-in">
      <div className="w-full max-w-md bg-card rounded-xl shadow-lg overflow-hidden transform transition-all">
        <div className="p-6 sm:p-8">
          <div className="flex flex-col items-center justify-center space-y-4">
            {showIcon && (
              <div className="p-3 rounded-full bg-success-50 dark:bg-success-900/20">
                <FiCheck className="text-success-500 dark:text-success-400 text-3xl" />
              </div>
            )}
            
            <h2 className="text-xl sm:text-2xl font-bold text-center text-success-700 dark:text-success-400 font-display mt-2">
              {title}
            </h2>
            
            <p className="text-sm sm:text-base text-center text-text-600 dark:text-text-300 mt-2">
              {message}
            </p>
            
            {showProgress && (
              <div className="w-full mt-4">
                <div className="bg-muted rounded-full h-2 mb-2">
                  <div 
                    className="bg-success-500 rounded-full h-2 transition-all duration-1000 ease-linear"
                    style={{ width: `${progress}%` }}
                  ></div>
                </div>
                <p className="text-xs text-center text-success-600 dark:text-success-400 font-medium">
                  {t('common.processing', 'A processar')} ... {Math.round(progress)}%
                </p>
              </div>
            )}
            
            {redirectPath && !showProgress && (
              <div className="w-full mt-4">
                <p className="text-xs text-center text-text-500 dark:text-text-400 font-medium">
                  {t('common.redirect', 'Será redirecionado em')} {countdown} {t('common.seconds', 'segundos')}...
                </p>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};

SuccessModal.propTypes = {
  title: PropTypes.string,
  message: PropTypes.string,
  redirectPath: PropTypes.string,
  redirectDelay: PropTypes.number,
  showProgress: PropTypes.bool,
  progress: PropTypes.number,
  showIcon: PropTypes.bool
};

export default SuccessModal;