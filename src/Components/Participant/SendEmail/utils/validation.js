import { ERROR_MESSAGES, TEMPLATE_REQUIRED_FIELDS } from './constants';

/**
 * Validates email data before sending
 * @param {Object} participant Participant data
 * @param {string} template Selected template
 * @param {File} attachment Optional attachment
 * @throws {Error} Validation error
 */
export const validateEmailData = (participant, template, templateData, attachment, t) => {
  const requiredFields = TEMPLATE_REQUIRED_FIELDS[template];

  for (const field of requiredFields) {
    if (!templateData[field]) {
      // A mensagem chega ao utilizador tal e qual — sem t() mostrava a chave crua.
      // O campo em falta fica no console, que é onde serve para diagnóstico.
      console.error('Email validation failed — missing field:', field);
      throw new Error(t(ERROR_MESSAGES.VALIDATION.MISSING_DATA));
    }
  }
  if (attachment) {
    validateAttachment(attachment);
  }
};



/**
 * Validates file attachment
 * @param {File} file File to validate
 * @throws {Error} Validation error
 */
const validateAttachment = (file) => {
  const MAX_SIZE = 2 * 1024 * 1024; // 2MB
  const ALLOWED_TYPES = {
    'application/pdf': '.pdf',
    'image/jpeg': '.jpg, .jpeg',
    'image/png': '.png'
  };

  if (file.size > MAX_SIZE) {
    const sizeMB = (file.size / (1024 * 1024)).toFixed(1);
    throw new Error(
      `O arquivo é muito grande (${sizeMB}MB). O tamanho máximo permitido é 2MB.`
    );
  }

  if (!ALLOWED_TYPES[file.type]) {
    const allowedExtensions = Object.values(ALLOWED_TYPES).join(', ');
    throw new Error(
      `Tipo de arquivo não permitido. Extensões aceitas: ${allowedExtensions}`
    );
  }
};