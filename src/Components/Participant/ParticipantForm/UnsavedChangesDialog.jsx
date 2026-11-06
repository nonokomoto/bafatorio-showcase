import PropTypes from 'prop-types';
import { useTranslation } from 'react-i18next';
import { FiAlertCircle } from 'react-icons/fi';

const UnsavedChangesDialog = ({ onDiscard, onCancel }) => {
  const { t } = useTranslation('participant');

  return (
    <div
      className="fixed inset-0 z-[100] flex items-center justify-center bg-black/50 backdrop-blur-sm"
      onClick={onCancel}
    >
      <div
        className="max-w-[400px] w-full bg-card rounded-2xl p-7 mx-4 flex flex-col items-center text-center gap-4"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Icon */}
        <div className="w-12 h-12 rounded-full bg-warning-100 dark:bg-warning-900/30 flex items-center justify-center shrink-0">
          <FiAlertCircle size={24} className="text-warning-500" />
        </div>

        {/* Title */}
        <h3 className="text-base font-semibold text-text-900 dark:text-text-100 m-0">
          {t('participantsV2.formModal.unsavedChanges.title', 'Alterações não guardadas')}
        </h3>

        {/* Message */}
        <p className="text-[13px] text-text-500 dark:text-text-400 m-0 leading-relaxed">
          {t(
            'participantsV2.formModal.unsavedChanges.message',
            'Tem alterações por guardar. Se sair agora, as alterações serão perdidas.'
          )}
        </p>

        {/* Buttons */}
        <div className="flex gap-3 w-full mt-1">
          <button
            type="button"
            onClick={onCancel}
            className="flex-1 py-2.5 px-4 rounded-[10px] border border-border bg-card text-foreground text-sm font-medium cursor-pointer hover:bg-accent transition-colors"
          >
            {t('participantsV2.formModal.unsavedChanges.cancel', 'Continuar a editar')}
          </button>

          <button
            type="button"
            onClick={onDiscard}
            className="flex-1 py-2.5 px-4 rounded-[10px] border-none bg-error-500 hover:bg-error-600 text-white text-sm font-medium cursor-pointer transition-colors"
          >
            {t('participantsV2.formModal.unsavedChanges.discard', 'Descartar')}
          </button>
        </div>
      </div>
    </div>
  );
};

UnsavedChangesDialog.propTypes = {
  onDiscard: PropTypes.func.isRequired,
  onCancel: PropTypes.func.isRequired,
};

export default UnsavedChangesDialog;
