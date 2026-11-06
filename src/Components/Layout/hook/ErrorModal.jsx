
import { FiAlertTriangle } from 'react-icons/fi';
import { useTranslation } from 'react-i18next';
import PropTypes from 'prop-types';

const ErrorModal = ({ 
  title = "Erro",
  errorMessage = "Ocorreu um erro inesperado. Por favor, tente novamente.",
  errorMessage2 = "Verifique os detalhes do seu cartão e tente novamente. Se o problema persistir, tente usar outro método de pagamento.",
  onClose
}) => {
  const { t } = useTranslation('common');
  
  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 backdrop-blur-sm flex justify-center items-center z-50 p-4 animate-fade-in">
      <div className="w-full max-w-md bg-card rounded-xl shadow-lg overflow-hidden transform transition-all">
        <div className="p-6 sm:p-8">
          <div className="flex flex-col items-center justify-center space-y-4">
            <div className="p-3 rounded-full bg-error-50 dark:bg-error-900/20">
              <FiAlertTriangle className="text-error text-3xl" />
            </div>
            <h2 className="text-xl sm:text-2xl font-bold text-center text-error dark:text-error-400 font-display mt-2">
              {title}
            </h2>
            <p className="text-sm sm:text-base text-center text-text-600 dark:text-text-300 mt-2">
              {errorMessage}
            </p>
            {errorMessage2 && (
              <p className="text-sm text-center text-text-500 dark:text-text-400 mt-1">
                {errorMessage2}
              </p>
            )}
          </div>
        </div>
        <div className="bg-muted p-4 flex justify-center">
          <button
            onClick={onClose}
            className="bg-error hover:bg-error-600 text-white py-2 px-6 rounded-md focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-error transition duration-150 ease-in-out text-sm font-medium"
          >
            {t('common.ok', 'OK')}
          </button>
        </div>
      </div>
    </div>
  );
};

ErrorModal.propTypes = {
  title: PropTypes.string,
  errorMessage: PropTypes.string,
  errorMessage2: PropTypes.string,
  onClose: PropTypes.func.isRequired
};

export default ErrorModal;