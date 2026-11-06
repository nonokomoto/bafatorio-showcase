import { useCallback } from 'react';
import { useTranslation } from 'react-i18next';
import PropTypes from 'prop-types';
import { FiPaperclip, FiX } from 'react-icons/fi';

/**
 * Component for handling file attachments in emails
 * @param {Object} props Component properties
 * @param {File} props.attachment Current attachment file
 * @param {Function} props.onAttachmentChange Callback for attachment changes
 */
const AttachmentHandler = ({ attachment, onAttachmentChange }) => {
  const { t } = useTranslation('participant');

  /**
   * Handles file selection
   * @param {Event} event File input change event
   */
  const handleFileSelect = useCallback((event) => {
    const file = event.target.files?.[0];
    if (!file) return;

    // Validação de tamanho (máximo 10MB)
    if (file.size > 10 * 1024 * 1024) {
      alert(t('email.attachment.validation.size'));
      return;
    }

    // Validação de tipo de ficheiro
    const allowedTypes = ['application/pdf', 'image/jpeg', 'image/png'];
    if (!allowedTypes.includes(file.type)) {
      alert(t('email.attachment.validation.type'));
      return;
    }

    onAttachmentChange(file);
  }, [onAttachmentChange, t]);

  /**
   * Removes current attachment
   */
  const handleRemoveAttachment = useCallback(() => {
    onAttachmentChange(null);
  }, [onAttachmentChange]);

  return (
    <div className="border rounded-lg p-4">
      <div className="flex items-center justify-between">
        <span className="text-sm font-medium text-foreground">{t('email.attachment.title')}</span>
        
        {!attachment && (
          <label className="cursor-pointer flex items-center space-x-2 text-primary hover:text-primary-dark">
            <FiPaperclip className="w-5 h-5" />
            <span>{t('email.buttons.attachment.add')}</span>
            <input
              type="file"
              className="hidden"
              accept=".pdf,.jpg,.jpeg,.png"
              onChange={handleFileSelect}
            />
          </label>
        )}
      </div>

      {attachment && (
        <div className="mt-2 flex items-center justify-between bg-muted p-2 rounded">
          <div className="flex items-center space-x-2">
            <FiPaperclip className="w-4 h-4 text-muted-foreground" />
            <span className="text-sm text-muted-foreground">{attachment.name}</span>
            <span className="text-xs text-muted-foreground">
              ({Math.round(attachment.size / 1024)} {t('email.attachment.fileSize')})
            </span>
          </div>
          
          <button
            onClick={handleRemoveAttachment}
            className="p-1 hover:bg-accent rounded-full"
            title={t('email.buttons.attachment.remove')}
          >
            <FiX className="w-4 h-4 text-muted-foreground" />
          </button>
        </div>
      )}

      <p className="mt-2 text-xs text-muted-foreground">
        {t('email.attachment.restrictions.full')}
      </p>
    </div>
  );
};

AttachmentHandler.propTypes = {
  attachment: PropTypes.object,
  onAttachmentChange: PropTypes.func.isRequired
};

export default AttachmentHandler;