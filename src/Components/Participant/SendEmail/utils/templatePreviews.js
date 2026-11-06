import i18next from 'i18next';
import { TEMPLATE_TYPES } from './constants';

// Os .hbs abaixo são exactamente o que a Lambda envia (o repo sincroniza para o
// bucket via `npm run templates:sync`). Importá-los em vez de manter uma cópia
// do HTML garante que o preview não diverge do email que o participante recebe.
import ptInvitation from '../../../../../amplify/function/send-email/templates/content/pt/invitation.html.hbs?raw';
import ptConfirmation from '../../../../../amplify/function/send-email/templates/content/pt/confirmation.html.hbs?raw';
import ptSaveTheDate from '../../../../../amplify/function/send-email/templates/content/pt/saveTheDate.html.hbs?raw';
import enInvitation from '../../../../../amplify/function/send-email/templates/content/en/invitation.html.hbs?raw';
import enConfirmation from '../../../../../amplify/function/send-email/templates/content/en/confirmation.html.hbs?raw';
import enSaveTheDate from '../../../../../amplify/function/send-email/templates/content/en/saveTheDate.html.hbs?raw';
import frInvitation from '../../../../../amplify/function/send-email/templates/content/fr/invitation.html.hbs?raw';
import frConfirmation from '../../../../../amplify/function/send-email/templates/content/fr/confirmation.html.hbs?raw';
import frSaveTheDate from '../../../../../amplify/function/send-email/templates/content/fr/saveTheDate.html.hbs?raw';

const TEMPLATES = {
  pt: {
    [TEMPLATE_TYPES.PARTICIPANT_INVITATION]: ptInvitation,
    [TEMPLATE_TYPES.PARTICIPANT_CONFIRMATION]: ptConfirmation,
    [TEMPLATE_TYPES.SAVE_THE_DATE]: ptSaveTheDate,
  },
  en: {
    [TEMPLATE_TYPES.PARTICIPANT_INVITATION]: enInvitation,
    [TEMPLATE_TYPES.PARTICIPANT_CONFIRMATION]: enConfirmation,
    [TEMPLATE_TYPES.SAVE_THE_DATE]: enSaveTheDate,
  },
  fr: {
    [TEMPLATE_TYPES.PARTICIPANT_INVITATION]: frInvitation,
    [TEMPLATE_TYPES.PARTICIPANT_CONFIRMATION]: frConfirmation,
    [TEMPLATE_TYPES.SAVE_THE_DATE]: frSaveTheDate,
  },
};

// Mesmo fallback que a Lambda aplica ao escolher o template (ver useTemplates).
const resolveLanguage = () => {
  const lang = (i18next.language || '').slice(0, 2);
  return TEMPLATES[lang] ? lang : 'pt';
};

export const getEmailTemplate = (templateType) => TEMPLATES[resolveLanguage()][templateType] || '';
