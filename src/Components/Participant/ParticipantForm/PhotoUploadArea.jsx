import { useState, useRef, useCallback, useEffect } from 'react';
import PropTypes from 'prop-types';
import { useTranslation } from 'react-i18next';
import { FiCamera } from 'react-icons/fi';
import ParticipantAvatar from '../ParticipantAvatar';

const ACCEPTED_TYPES = ['image/jpeg', 'image/png', 'image/gif'];
const MAX_FILE_SIZE = 2 * 1024 * 1024; // 2MB

const PhotoUploadArea = ({
  currentPhotoUrl = null,
  participantName = '',
  participantEmail = '',
  onFileSelect,
  disabled = false,
}) => {
  const { t } = useTranslation('participant');
  const fileInputRef = useRef(null);
  const [previewUrl, setPreviewUrl] = useState(null);
  const [error, setError] = useState(null);

  // Revoke previous blob URL on change or unmount to prevent memory leaks
  useEffect(() => {
    return () => {
      if (previewUrl && previewUrl.startsWith('blob:')) {
        URL.revokeObjectURL(previewUrl);
      }
    };
  }, [previewUrl]);

  const handleButtonClick = useCallback(() => {
    if (!disabled && fileInputRef.current) {
      fileInputRef.current.click();
    }
  }, [disabled]);

  const handleFileChange = useCallback(
    (e) => {
      const file = e.target.files?.[0];
      if (!file) return;

      setError(null);

      // Validate type
      if (!ACCEPTED_TYPES.includes(file.type)) {
        setError(
          t(
            'participantsV2.formModal.photoUpload.invalidType',
            'Formato não suportado. Use JPG, PNG ou GIF.'
          )
        );
        if (fileInputRef.current) fileInputRef.current.value = '';
        return;
      }

      // Validate size
      if (file.size > MAX_FILE_SIZE) {
        setError(
          t(
            'participantsV2.formModal.photoUpload.tooLarge',
            'O ficheiro excede o tamanho máximo de 2MB.'
          )
        );
        if (fileInputRef.current) fileInputRef.current.value = '';
        return;
      }

      // Create local preview
      const objectUrl = URL.createObjectURL(file);
      setPreviewUrl(objectUrl);

      // Notify parent
      onFileSelect(file);
    },
    [onFileSelect, t]
  );

  const displayUrl = previewUrl || currentPhotoUrl;

  return (
    <div className="bg-muted border border-dashed border-border rounded-xl p-5 flex items-center gap-5">
      {/* Avatar */}
      <ParticipantAvatar
        participant={{
          participantName: participantName,
          participantEmail: participantEmail,
          photoUrl: displayUrl,
        }}
        size="xl"
      />

      {/* Right side */}
      <div className="flex flex-col gap-1.5 flex-1">
        <span className="text-sm font-semibold text-text-900 dark:text-text-100">
          {t('participantsV2.formModal.photoUpload.title', 'Foto de Perfil')}
        </span>

        <span className="text-xs text-text-400 dark:text-text-500">
          {t('participantsV2.formModal.photoUpload.hint', 'JPG, PNG ou GIF. Máximo 2MB.')}
        </span>

        <button
          type="button"
          onClick={handleButtonClick}
          disabled={disabled}
          className={`inline-flex items-center gap-1.5 px-3.5 py-1.5 rounded-lg border border-border bg-card text-foreground text-[13px] font-medium self-start mt-1 transition-colors ${
            disabled
              ? 'cursor-not-allowed opacity-50'
              : 'cursor-pointer hover:bg-accent'
          }`}
        >
          <FiCamera size={14} />
          {t('participantsV2.formModal.photoUpload.button', 'Carregar Foto')}
        </button>

        {error && (
          <span className="text-xs text-error-500 mt-0.5">
            {error}
          </span>
        )}
      </div>

      {/* Hidden file input */}
      <input
        ref={fileInputRef}
        type="file"
        accept="image/jpeg,image/png,image/gif"
        onChange={handleFileChange}
        className="hidden"
      />
    </div>
  );
};

PhotoUploadArea.propTypes = {
  currentPhotoUrl: PropTypes.string,
  participantName: PropTypes.string,
  participantEmail: PropTypes.string,
  onFileSelect: PropTypes.func.isRequired,
  disabled: PropTypes.bool,
};

export default PhotoUploadArea;
