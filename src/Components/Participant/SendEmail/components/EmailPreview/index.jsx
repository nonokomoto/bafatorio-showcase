import { useMemo } from 'react';
import { useTranslation } from 'react-i18next';
import PropTypes from 'prop-types';
import { FiArrowLeft, FiSend, FiPaperclip } from 'react-icons/fi';
import Handlebars from 'handlebars';
import { getEmailTemplate } from '../../utils/templatePreviews';
import { Modal, Button, Card, Text } from '../../../../UI';

// O mesmo motor que a Lambda usa. Uma substituição por regex não interpreta
// blocos ({{#if}}), que apareceriam em texto cru no preview.
const renderTemplate = (htmlContent, data) => {
  try {
    return Handlebars.compile(htmlContent)(data);
  } catch (error) {
    console.error('Template render error:', error);
    return htmlContent;
  }
};

const sanitizeHtml = (html) => {
  const doc = new DOMParser().parseFromString(html, 'text/html');
  // Remove all script elements
  doc.querySelectorAll('script').forEach(el => el.remove());
  // Remove all event handler attributes (onclick, onerror, onload, etc.)
  doc.querySelectorAll('*').forEach(el => {
    for (const attr of [...el.attributes]) {
      if (attr.name.startsWith('on') || (attr.name === 'href' && attr.value.trim().toLowerCase().startsWith('javascript:'))) {
        el.removeAttribute(attr.name);
      }
    }
  });
  // Remove dangerous elements
  doc.querySelectorAll('iframe, object, embed, form').forEach(el => el.remove());
  // Documento completo (não só o body): o CSS do email vive no <style> do <head>.
  // O DOCTYPE é irmão do documentElement e perdia-se no outerHTML — sem ele o
  // iframe renderiza em quirks mode e diverge do que o cliente de email mostra.
  return '<!DOCTYPE html>' + doc.documentElement.outerHTML;
};

const EmailPreview = ({ template, emailData, onConfirm, onCancel, attachment, setStatus, setErrorMessage }) => {
  const { t } = useTranslation('participant');

  const handleConfirm = () => {
    try {
      onConfirm();
    } catch (error) {
      setStatus?.('error');
      setErrorMessage?.(error.message);
    }
  };

  // Handlebars.compile + o parse/serialização do DOMParser no sanitizeHtml
  // não são baratos (o welcome.html.hbs é uma tabela grande) — sem isto
  // corriam em todo o render do modal (ex.: mudar o attachment), não só
  // quando o template ou os dados do email mudam.
  const previewContent = useMemo(() => {
    const templateContent = getEmailTemplate(template);
    return templateContent
      ? sanitizeHtml(renderTemplate(templateContent, emailData))
      : `<p>${t('email.preview.templateNotFound')}</p>`;
  }, [template, emailData, t]);

  return (
    <>
      <Modal.Header>
        <div className="flex items-center">
          <Text variant="h5" weight="medium">{t('email.preview.title')}</Text>
        </div>
      </Modal.Header>
      
      <Modal.Body>
        <div className="mb-4">
          <Text variant="body2" className="mb-2">
            {t('email.preview.recipientCount', { count: emailData.recipientCount || 0 })}
          </Text>
        </div>
        
        <Card variant="outline" className="overflow-hidden mb-6">
          {/* Email content — iframe isola o CSS do email do CSS da app e impede
              que o HTML do template execute no contexto da página */}
          <iframe
            title={t('email.preview.title')}
            srcDoc={previewContent}
            sandbox=""
            className="border-0 bg-white"
            // 600px é a largura do .container dos templates; largura intrínseca
            // (não w-full) porque o painel do modal encolhe ao conteúdo
            style={{ width: 600, maxWidth: '100%', height: '50vh' }}
          />

          {/* Attachment indicator if present */}
          {attachment && (
            <div className="border-t border-border p-3 flex items-center text-sm">
              <FiPaperclip size={16} className="mr-2 text-muted-foreground" />
              <Text variant="body2">{attachment.name} ({Math.round(attachment.size / 1024)} {t('email.attachment.fileSize')})</Text>
            </div>
          )}
        </Card>
      </Modal.Body>

      <Modal.Footer>
        <Button
          variant="ghost"
          onClick={onCancel}
          startIcon={<FiArrowLeft />}
        >
          {t('email.buttons.back')}
        </Button>
        <Button
          variant="primary"
          onClick={handleConfirm}
          startIcon={<FiSend />}
        >
          {t('email.buttons.send')}
        </Button>
      </Modal.Footer>
    </>
  );
};

EmailPreview.propTypes = {
  template: PropTypes.string,
  emailData: PropTypes.object,
  onConfirm: PropTypes.func.isRequired,
  onCancel: PropTypes.func.isRequired,
  attachment: PropTypes.object,
  setStatus: PropTypes.func,
  setErrorMessage: PropTypes.func
};

export default EmailPreview;