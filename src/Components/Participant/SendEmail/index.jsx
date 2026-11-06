import { useState, useCallback, useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import PropTypes from 'prop-types';
import { FiSend } from 'react-icons/fi';
import { useEmailSender } from './hooks/useEmailSender';
import { useTemplates } from './hooks/useTemplates';
import EmailPreview from './components/EmailPreview';
import AttachmentHandler from './AttachmentHandler';
import { validateEmailData } from './utils/validation';
import { TEMPLATE_TYPES, ERROR_MESSAGES, SIZE_LIMITS } from './utils/constants';
import { WIP_COMPONENTS } from '../../../Utils/devStages';
import SuccessModal from '../../Layout/hook/SuccessModal';

// Componentes UI padronizados
import { Modal, Button, Card, Text } from '../../UI';
import Spinner from '../../UI/spinner';

/**
 * SendEmail component for managing email sending workflow
 * @param {Object} props Component properties
 * @param {boolean} props.isOpen Modal open state
 * @param {Function} props.onClose Modal close handler
 * @param {Array} props.selectedParticipants Selected participants list
 * @param {Object} props.selectedEvent Event data
 * @param {Function} props.clearSelectedParticipants Clear selection handler
 */
const SendEmail = ({ 
  isOpen, 
  onClose, 
  selectedParticipants, 
  selectedEvent, 
  clearSelectedParticipants 
}) => {
  // Load both 'participant' and 'common' namespaces
  const { t, i18n } = useTranslation(['participant', 'common']);
  
  // State management
  const [showPreview, setShowPreview] = useState(false);
  const [attachment, setAttachment] = useState(null);
  const [previewData, setPreviewData] = useState(null);

  // Custom hooks for email and template management
  const { 
    sendEmails, 
    status, 
    errorMessage, 
    successCount,
    totalEmails,
    setStatus, 
    setErrorMessage,
    setSuccessCount,
    setTotalEmails
  } = useEmailSender();

  const { 
    selectedTemplate, 
    setSelectedTemplate, 
    prepareTemplateData 
  } = useTemplates();
  
  /**
   * Handles template selection (toggle)
   */
  const handleTemplateSelect = useCallback((template) => {
    setSelectedTemplate(prev => prev === template ? null : template);
  }, [setSelectedTemplate]);

  /**
   * Handles error modal closure
   */
  const handleCloseError = useCallback(() => {
    setStatus('idle');
    setErrorMessage('');
  }, [setStatus, setErrorMessage]);

  /**
   * Handles success modal closure
   */
  const cleanup = useCallback(() => {
    setStatus('idle');
    setShowPreview(false);
    setAttachment(null);
    setPreviewData(null);
    setSelectedTemplate(null);
    clearSelectedParticipants();
    setSuccessCount(0);
    setTotalEmails(0);
  }, [clearSelectedParticipants, setSelectedTemplate, setSuccessCount, setTotalEmails, setStatus, setShowPreview, setAttachment, setPreviewData]);
  
  const handleCloseSuccess = useCallback(() => {
    cleanup();
    onClose();
  }, [cleanup, onClose]);
  
  // Add effect to handle auto-close on success
  useEffect(() => {
    if (status === 'success') {
      const timer = setTimeout(() => {
        handleCloseSuccess();
      }, 2000);
  
      return () => clearTimeout(timer);
    }
  }, [status, handleCloseSuccess]);

  // Efeito para limpar seleção quando há erro de template
  useEffect(() => {
    if (status === 'error' && errorMessage.includes('template')) {
      setSelectedTemplate(null);
    }
  }, [status, errorMessage, setSelectedTemplate]);

  /**
   * Prepares email data for preview
   */
  const handleSendPreparation = async () => {
    try {
      if (!selectedParticipants.length) {
        throw new Error(t(ERROR_MESSAGES.VALIDATION.NO_PARTICIPANTS));
      }
      
      const templateData = await prepareTemplateData(selectedParticipants, selectedEvent, attachment, true);
      validateEmailData(selectedParticipants[0], selectedTemplate, templateData, attachment, t);
      
      // Adiciona a contagem de destinatários ao previewData
      templateData.recipientCount = selectedParticipants.length;
      
      setPreviewData(templateData);
      setShowPreview(true);
    } catch (error) {
      setStatus('error');
      console.log('error', error);
      setErrorMessage(error.message);
    }
  };

  /**
   * Handles email sending confirmation
   */
  const handleSendConfirm = async () => {
    try {
      if (!selectedTemplate || !selectedParticipants.length) {
        throw new Error(t(ERROR_MESSAGES.VALIDATION.MISSING_DATA));
      }

      const emailData = await prepareTemplateData(selectedParticipants, selectedEvent, attachment, false);
      validateEmailData(selectedParticipants[0], selectedTemplate, emailData, attachment, t);
      
      let attachmentData = {};
      if (attachment) {
        try {
          const reader = new FileReader();
          const base64Content = await new Promise((resolve, reject) => {
            reader.onload = () => {
              const result = reader.result;
              const base64 = result.includes('base64,') ? result.split('base64,')[1] : result;
              resolve(base64);
            };
            reader.onerror = (error) => {
              console.error('Erro na leitura do arquivo:', error);
              reject(error);
            };
            reader.readAsDataURL(attachment);
          });
          
          // Base64 adds ~33% to file size
          const encodedSize = base64Content.length;
          const estimatedTotalSize = encodedSize + SIZE_LIMITS.ESTIMATED_HTML_SIZE;
          
          if (estimatedTotalSize > SIZE_LIMITS.MAX_EMAIL_SIZE) {
            throw new Error(t(ERROR_MESSAGES.VALIDATION.FILE_TOO_LARGE));
          }

          attachmentData = {
            attachmentContent: base64Content,
            attachmentContentType: attachment.type,
            attachmentFilename: attachment.name
          };
        } catch (attachmentError) {
          console.error('Erro processando anexo:', attachmentError);
          setStatus('error');
          setErrorMessage(attachmentError.message);
          throw attachmentError;
        }
      }
      
      // get current language
      const currentLanguage = i18n.language.substring(0, 2);

      
      
      await sendEmails({
        variables: {
          ...emailData,
          emailType: selectedTemplate,
          language: currentLanguage,
          attachmentContent: attachment ? attachmentData.attachmentContent : null,
          attachmentContentType: attachment ? attachmentData.attachmentContentType : null,
          attachmentFilename: attachment ? attachmentData.attachmentFilename : null
        }
      }, selectedParticipants);

    } catch (error) {
      console.error('Erro ao enviar emails:', error);
      setStatus('error');
      setErrorMessage(error.message);
    }
  };

  if (!isOpen) return null;
  
  return (
      <>
        {/* Loading spinner */}
        <Modal
          isOpen={status === 'loading'}
          onClose={() => {}}
          showCloseButton={false}
          size="sm"
          centered
        >
          <Card className="w-full">
            <Modal.Body className="p-8 flex items-center justify-center">
              <Spinner 
                status="loadingWithMessage"
                loadingMessage={t('email.status.sending', { count: totalEmails })}
              />
            </Modal.Body>
          </Card>
        </Modal>

        {/* Success modal - Render conditionally based on status */}
        {status === 'success' && (
          <SuccessModal
            title={t('email.status.success.title')}
            message={t('email.status.success.message', { sent: successCount, total: totalEmails })}
            showProgress={true}
            progress={(successCount / totalEmails) * 100}
            showIcon={true}
          />
        )}

        {/* Error modal */}
        <Modal
          isOpen={status === 'error'}
          onClose={handleCloseError}
          showCloseButton={false}
          size="md"
          centered
        >
          <Card className="w-full">
            <Modal.Header>
              <Text variant="h5" weight="medium" className="text-error-600 dark:text-error-400">{t('email.errors.title')}</Text>
            </Modal.Header>
            <Modal.Body className="py-6">
              <Text className="mb-4">{errorMessage}</Text>
              <Text color="muted">{t('email.errors.support')}</Text>
            </Modal.Body>
            <Modal.Footer>
              <Button variant="primary" onClick={handleCloseError}>
                {t('alert.ok', { ns: 'common' })}
              </Button>
            </Modal.Footer>
          </Card>
        </Modal>

        {/* Main email modal */}
        <Modal
          isOpen={status === 'idle'}
          onClose={onClose}
          // 3xl para o preview caber os 600px de largura do template sem scroll horizontal
          size="3xl"
          showCloseButton={true}
          centered
          wip={WIP_COMPONENTS.SEND_EMAIL}
        >
          <Card className="w-full">
            {!showPreview ? (
              <>
                <Modal.Header>
                  <Text variant="h5" weight="medium">{t('email.selection.title')}</Text>
                </Modal.Header>
                <Modal.Body className="py-6">
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
                    {Object.entries(TEMPLATE_TYPES).map(([key, value]) => (
                      <Card
                        key={key}
                        variant={selectedTemplate === value ? 'primary' : 'outline'}
                        className={`p-4 cursor-pointer transition-all duration-200 h-full ${
                          selectedTemplate === value
                            ? 'bg-primary-50 dark:bg-primary-900/20 border-primary-500'
                            : 'hover:bg-accent'
                        }`}
                        onClick={() => handleTemplateSelect(value)}
                      >
                        <div className="text-center">
                          <Text
                            variant="subtitle2"
                            weight="medium"
                            className={`mb-2 ${selectedTemplate === value ? 'text-primary-600 dark:text-primary-400' : ''}`}
                          >
                            {t(`email.selection.templates.${value}.title`)}
                          </Text>
                          <Text
                            variant="body2"
                            color={selectedTemplate === value ? "default" : "muted"}
                            className="text-sm"
                          >
                            {t(`email.selection.templates.${value}.description`)}
                          </Text>
                        </div>
                      </Card>
                    ))}
                  </div>

                  <AttachmentHandler
                    attachment={attachment}
                    onAttachmentChange={setAttachment}
                  />
                </Modal.Body>

                <Modal.Footer>
                  <Button 
                    variant="ghost" 
                    onClick={onClose}
                  >
                    {t('email.buttons.cancel')}
                  </Button>
                  <Button
                    variant="primary"
                    onClick={handleSendPreparation}
                    disabled={!selectedTemplate}
                    startIcon={<FiSend />}
                  >
                    {t('email.buttons.preview')}
                  </Button>
                </Modal.Footer>
              </>
            ) : (
              <EmailPreview
                template={selectedTemplate}
                emailData={previewData}
                onConfirm={handleSendConfirm}
                onCancel={() => setShowPreview(false)}
                attachment={attachment}
                setStatus={setStatus}
                setErrorMessage={setErrorMessage}
              />
            )}
          </Card>
        </Modal>

      </>
  );
};

SendEmail.propTypes = {
  isOpen: PropTypes.bool.isRequired,
  onClose: PropTypes.func.isRequired,
  selectedParticipants: PropTypes.array.isRequired,
  selectedEvent: PropTypes.object,
  clearSelectedParticipants: PropTypes.func.isRequired
};

export default SendEmail;