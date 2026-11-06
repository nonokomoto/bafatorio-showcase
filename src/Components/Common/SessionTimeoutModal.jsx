import PropTypes from 'prop-types';
import { useTranslation } from 'react-i18next';
import Modal from '../UI/Modal';
import Card from '../UI/Card';
import Button from '../UI/Button';

const SessionTimeoutModal = ({ isWarning, remainingSeconds, onContinue, onLogout }) => {
  const { t } = useTranslation('common');

  return (
    <Modal
      isOpen={isWarning}
      onClose={onContinue}
      size="sm"
      centered
      animation="scale"
      disableEscapeKeyDown
      disableBackdropClick
      showCloseButton={false}
    >
      <Card variant="default" className="shadow-none rounded-none sm:rounded-lg">
        <Modal.Header>
          <span className="flex items-center gap-2">
            <svg
              xmlns="http://www.w3.org/2000/svg"
              className="h-5 w-5 text-warning-500"
              fill="none"
              viewBox="0 0 24 24"
              stroke="currentColor"
              strokeWidth={2}
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z"
              />
            </svg>
            {t('sessionTimeout.title')}
          </span>
        </Modal.Header>

        <Modal.Body>
          <p className="text-text-700 dark:text-text-300">
            {t('sessionTimeout.message', { seconds: remainingSeconds })}
          </p>
        </Modal.Body>

        <Modal.Footer>
          <Button variant="ghost" onClick={onLogout}>
            {t('sessionTimeout.logout')}
          </Button>
          <Button variant="primary" onClick={onContinue}>
            {t('sessionTimeout.continue')}
          </Button>
        </Modal.Footer>
      </Card>
    </Modal>
  );
};

SessionTimeoutModal.propTypes = {
  isWarning: PropTypes.bool.isRequired,
  remainingSeconds: PropTypes.number.isRequired,
  onContinue: PropTypes.func.isRequired,
  onLogout: PropTypes.func.isRequired,
};

export default SessionTimeoutModal;
