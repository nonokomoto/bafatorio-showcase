import { useState, useEffect, memo } from 'react';
import PropTypes from 'prop-types';
import { FiX, FiFolder, FiLoader } from 'react-icons/fi';
import { Text, Button } from '../UI';
import { useTranslation } from 'react-i18next';
import 'animate.css';

// Predefined folder colors
const FOLDER_COLORS = [
  { name: 'blue', value: '#3B82F6' },
  { name: 'green', value: '#10B981' },
  { name: 'amber', value: '#F59E0B' },
  { name: 'red', value: '#EF4444' },
  { name: 'violet', value: '#8B5CF6' },
  { name: 'pink', value: '#EC4899' },
  { name: 'cyan', value: '#06B6D4' },
  { name: 'orange', value: '#F97316' },
  { name: 'neutral', value: '#6B7280' },
  { name: 'indigo', value: '#6366F1' },
];

const DocumentFolderForm = memo(({
  isOpen,
  onClose,
  onSubmit,
  folder = null,
  isLoading = false,
  error = null
}) => {
  const { t } = useTranslation('event');
  const isEditing = !!folder;

  const [formData, setFormData] = useState({
    name: '',
    description: '',
    color: FOLDER_COLORS[0].value,
  });

  const [validationError, setValidationError] = useState('');

  // Reset form when folder changes or modal opens
  useEffect(() => {
    if (folder) {
      setFormData({
        name: folder.name || '',
        description: folder.description || '',
        color: folder.color || FOLDER_COLORS[0].value,
      });
    } else {
      setFormData({
        name: '',
        description: '',
        color: FOLDER_COLORS[0].value,
      });
    }
    setValidationError('');
  }, [folder, isOpen]);

  const handleChange = (field, value) => {
    setFormData(prev => ({ ...prev, [field]: value }));
    if (field === 'name' && validationError) {
      setValidationError('');
    }
  };

  const handleSubmit = (e) => {
    e.preventDefault();

    // Validate name
    if (!formData.name.trim()) {
      setValidationError(t('eventDetails.documents.folders.validation.nameRequired'));
      return;
    }

    if (formData.name.trim().length < 2) {
      setValidationError(t('eventDetails.documents.folders.validation.nameMinLength'));
      return;
    }

    onSubmit({
      ...(folder && { id: folder.id }),
      name: formData.name.trim(),
      description: formData.description.trim() || null,
      color: formData.color,
    });
  };

  const handleClose = () => {
    setFormData({
      name: '',
      description: '',
      color: FOLDER_COLORS[0].value,
    });
    setValidationError('');
    onClose();
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4 animate__animated animate__fadeIn">
      <div className="w-full max-w-md bg-card rounded-xl shadow-2xl overflow-hidden transform transition-all">
        <form onSubmit={handleSubmit}>
          <div className="p-6">
            {/* Header */}
            <div className="flex justify-between items-center mb-5">
              <Text variant="h5" className="text-primary-600 dark:text-primary-400 font-medium">
                {isEditing
                  ? t('eventDetails.documents.folders.editTitle')
                  : t('eventDetails.documents.folders.createTitle')
                }
              </Text>
              <button
                type="button"
                onClick={handleClose}
                className="text-muted-foreground hover:text-foreground transition-colors duration-200"
                aria-label={t('eventDetails.documents.buttons.closeAria')}
              >
                <FiX size={24} />
              </button>
            </div>

            {/* Preview */}
            <div className="flex justify-center mb-6">
              <div
                className="p-4 rounded-xl bg-muted"
                style={{ color: formData.color }}
              >
                <FiFolder className="w-16 h-16" />
              </div>
            </div>

            {/* Name field */}
            <div className="mb-4">
              <label
                htmlFor="folder-name"
                className="block mb-2 text-sm font-medium text-foreground"
              >
                {t('eventDetails.documents.folders.form.name')} *
              </label>
              <input
                id="folder-name"
                type="text"
                value={formData.name}
                onChange={(e) => handleChange('name', e.target.value)}
                placeholder={t('eventDetails.documents.folders.form.namePlaceholder')}
                maxLength={50}
                className="w-full p-2.5 bg-background dark:bg-neutral-800 border border-border rounded-lg
                  focus:ring-2 focus:ring-primary/40 focus:border-primary
                  focus:outline-none transition-all duration-200
                  font-sans text-base text-foreground"
                autoFocus
              />
              {validationError && (
                <Text variant="caption" className="text-error-500 mt-1">
                  {validationError}
                </Text>
              )}
            </div>

            {/* Description field */}
            <div className="mb-4">
              <label
                htmlFor="folder-description"
                className="block mb-2 text-sm font-medium text-foreground"
              >
                {t('eventDetails.documents.folders.form.description')}
              </label>
              <textarea
                id="folder-description"
                value={formData.description}
                onChange={(e) => handleChange('description', e.target.value)}
                placeholder={t('eventDetails.documents.folders.form.descriptionPlaceholder')}
                maxLength={200}
                rows={2}
                className="w-full p-2.5 bg-background dark:bg-neutral-800 border border-border rounded-lg
                  focus:ring-2 focus:ring-primary/40 focus:border-primary
                  focus:outline-none transition-all duration-200
                  font-sans text-base text-foreground resize-none"
              />
            </div>

            {/* Color picker */}
            <div className="mb-6">
              <label className="block mb-2 text-sm font-medium text-foreground">
                {t('eventDetails.documents.folders.form.color')}
              </label>
              <div className="flex flex-wrap gap-2">
                {FOLDER_COLORS.map((color) => (
                  <button
                    key={color.name}
                    type="button"
                    onClick={() => handleChange('color', color.value)}
                    className={`w-8 h-8 rounded-full transition-all duration-200 ${
                      formData.color === color.value
                        ? 'ring-2 ring-offset-2 ring-primary-500 dark:ring-offset-neutral-800 scale-110'
                        : 'hover:scale-110'
                    }`}
                    style={{ backgroundColor: color.value }}
                    aria-label={color.name}
                  />
                ))}
              </div>
            </div>

            {/* Error message */}
            {error && (
              <div className="mb-4 p-3 bg-error-50 dark:bg-error-900/20 rounded-lg">
                <Text variant="body2" className="text-error-600 dark:text-error-400">
                  {error}
                </Text>
              </div>
            )}

            {/* Action buttons */}
            <div className="flex justify-end gap-3">
              <Button
                type="button"
                variant="ghost"
                onClick={handleClose}
                size="sm"
                disabled={isLoading}
              >
                {t('eventDetails.documents.buttons.cancel')}
              </Button>

              <Button
                type="submit"
                variant="primary"
                size="sm"
                disabled={isLoading}
              >
                <span className="flex items-center">
                  {isLoading && <FiLoader className="animate-spin mr-1.5" />}
                  {isEditing
                    ? t('eventDetails.documents.buttons.save')
                    : t('eventDetails.documents.folders.form.createButton')
                  }
                </span>
              </Button>
            </div>
          </div>
        </form>
      </div>
    </div>
  );
});

DocumentFolderForm.displayName = 'DocumentFolderForm';

DocumentFolderForm.propTypes = {
  isOpen: PropTypes.bool.isRequired,
  onClose: PropTypes.func.isRequired,
  onSubmit: PropTypes.func.isRequired,
  folder: PropTypes.shape({
    id: PropTypes.string,
    name: PropTypes.string,
    description: PropTypes.string,
    color: PropTypes.string,
  }),
  isLoading: PropTypes.bool,
  error: PropTypes.string,
};

export default DocumentFolderForm;
