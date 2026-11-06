import { SESClient } from "@aws-sdk/client-ses";

/**
 * Supported email types for the application
 * These types correspond to different email templates used in the system
 */
export type EmailType =
  | 'welcome'
  | 'participantInvitation'
  | 'participantConfirmation'
  | 'eventCreation'
  | 'saveTheDate'
  | 'eventReminder'
  | 'eventUpdate'
  | 'loginAlert'
  | 'collaboratorInvitation';

/**
 * Mapping of email types to their corresponding template names in AWS SES
 * This ensures consistent template naming across the application
 */
const templateNames = {
  welcome: 'WelcomeTemplate',
  participantInvitation: 'ParticipantInvitationTemplate',
  participantConfirmation: 'ParticipantConfirmationTemplate',
  eventCreation: 'EventCreationNotificationTemplate',
  saveTheDate: 'SaveTheDateTemplate',
  eventReminder: 'EventReminderNotificationTemplate',
  eventUpdate: 'EventUpdateNotificationTemplate',
  loginAlert: 'LoginAlertNotificationTemplate',
  collaboratorInvitation: 'CollaboratorInvitationTemplate',
} as const;

// Track initialization state of templates
let initialized = false;

// Configure AWS SES client with region from environment variables
const REGION = process.env.BAFATORIO_APP_REGION || "eu-west-1";
const sesClient = new SESClient({ region: REGION });

/**
 * Initializes all email templates in AWS SES
 * This function should be called during the application startup
 * @returns Promise<boolean> - True if all templates are initialized successfully
 */
export async function initializeTemplate(emailType: EmailType, language: 'pt' | 'en' | 'fr' = 'pt'): Promise<boolean> {
    try {
        console.log(`Inicializando template para ${emailType} no idioma ${language}...`);
        
        let result: boolean;
        switch (emailType) {
  case 'welcome':
    result = await (await import('./templates/logic/welcome')).verifyAndCreateWelcomeTemplate(language);
    break;
  case 'participantInvitation':
    result = await (await import('./templates/logic/invitation')).verifyAndCreateInvitationTemplate(language);
    break;
  case 'participantConfirmation':
    result = await (await import('./templates/logic/confirmation')).verifyAndCreateConfirmationTemplate(language);
    break;
  case 'eventCreation':
    result = await (await import('./templates/logic/eventCreation')).verifyAndCreateEventCreationTemplate(language);
    break;
  case 'saveTheDate':
    result = await (await import('./templates/logic/saveTheDate')).verifyAndCreateSaveTheDateTemplate(language);
    break;
  case 'eventReminder':
    result = await (await import('./templates/logic/eventReminder')).verifyAndCreateEventReminderTemplate(language);
    break;
  case 'eventUpdate':
    result = await (await import('./templates/logic/eventUpdate')).verifyAndCreateEventUpdateTemplate(language);
    break;
  case 'loginAlert':
    result = await (await import('./templates/logic/loginAlert')).verifyAndCreateLoginAlertTemplate(language);
    break;
  case 'collaboratorInvitation':
    result = await (await import('./templates/logic/collaboratorInvitation')).verifyAndCreateCollaboratorInvitationTemplate(language);
    break;
  default:
    throw new Error(`Tipo de email desconhecido: ${emailType}`);
}
        
        if (result) {
            console.log(`Template ${emailType} inicializado com sucesso`);
            initialized = true; // Add this line
            return true;
        }
        
        console.error(`Erro ao inicializar template ${emailType}`);
        return false;
    } catch (error) {
        console.error(`Erro durante a inicialização do template ${emailType}:`, error);
        return false;
    }
}

/**
 * Retrieves the template name for a given email type and language
 * @param emailType - Type of email to send
 * @param language - Language code (pt, en, fr)
 * @throws Error if email type is not supported
 * @returns The corresponding template name in AWS SES with language suffix
 */
export function getTemplateName(emailType: EmailType, language: 'pt' | 'en' | 'fr' = 'pt'): string {
    const templateName = templateNames[emailType];
    if (!templateName) {
        throw new Error(`Tipo de email não suportado: ${emailType}`);
    }
    
    // Sempre adiciona sufixo de idioma para manter consisência com os templates criados
    return `${templateName}_${language}`;
}

/**
 * Checks if templates have been initialized
 * @returns boolean indicating initialization status
 */
export function isInitialized(): boolean {
    return initialized;
}

/**
 * Resets the initialization state
 * Useful for testing scenarios or when templates need to be reinitialized
 */
export function reset(): void {
    initialized = false;
}