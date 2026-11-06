/**
 * Template types available for email sending
 */
export const TEMPLATE_TYPES = {
  PARTICIPANT_INVITATION: 'participantInvitation',
  PARTICIPANT_CONFIRMATION: 'participantConfirmation',
  SAVE_THE_DATE: 'saveTheDate'
};

/**
 * Campos sem os quais o envio não pode acontecer.
 *
 * Só entram aqui os que o template usa e sem os quais a mensagem deixa de
 * fazer sentido, mais os identificadores que o envio precisa. Detalhes que o
 * evento pode legitimamente não ter (hora, local) são condicionais no .hbs
 * — exigi-los aqui bloqueava o envio a eventos válidos.
 */
export const TEMPLATE_REQUIRED_FIELDS = {
  participantInvitation: [
    'to',
    'participantName',
    'participantEmail',
    'eventName',
    'eventId',
    'participantId',
    'eventDate',
    'eventManagerName',
    'eventManagerContact',
    'confirmationLink',
  ],
  participantConfirmation: [
    'to',
    'participantName',
    'participantEmail',
    'eventName',
    'eventId',
    'participantId',
    'eventManagerName',
    'eventManagerContact',
  ],
  saveTheDate: [
    'to',
    'participantName',
    'participantEmail',
    'eventName',
    'eventId',
    'participantId',
    'eventDate',
    'eventManagerName',
  ]
};

/**
 * Error message keys for translations
 * These are used with the t() function from useTranslation
 */
export const ERROR_MESSAGES = {
  VALIDATION: {
    NO_PARTICIPANTS: 'email.validation.errors.noParticipants',
    NO_TEMPLATE: 'email.validation.errors.noTemplate',
    INVALID_EMAIL: 'email.validation.errors.invalidEmail',
    MISSING_DATA: 'email.validation.errors.missingData',
    REQUIRED_FIELD: 'email.validation.errors.requiredField',
    FILE_TOO_LARGE: 'email.validation.errors.fileTooLarge'
  },
  SENDING: {
    FAILED: 'email.errors.sending',
    NETWORK: 'email.errors.network',
    PREPARATION: 'email.errors.preparation'
  },
  TEMPLATE: {
    NOT_ALLOWED: 'email.templateAccess'
  }
};

/**
 * Constantes para limites de tamanho (em bytes)
 */
export const SIZE_LIMITS = {
  // Amazon SES limita mensagens a 262.144 bytes (256 KB)
  MAX_EMAIL_SIZE: 262144,
  // Estimativa de tamanho do corpo HTML do email (~30 KB)
  ESTIMATED_HTML_SIZE: 30720,
  // Tamanho máximo seguro para anexos (256 KB - 30 KB = 226 KB)
  MAX_ATTACHMENT_SIZE: 226000
};