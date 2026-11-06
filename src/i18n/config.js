import i18n from 'i18next';
import { initReactI18next } from 'react-i18next';

// Import Portuguese translations
import commonPT from './locales/pt-PT/common.json';
import billingPT from './locales/pt-PT/billing.json';
import dashboardPT from './locales/pt-PT/dashboard.json';
import eventPT from './locales/pt-PT/event.json';
import landingPageAltPT from './locales/pt-PT/landingPageAlt.json';
import layoutPT from './locales/pt-PT/layout.json';
import loginPT from './locales/pt-PT/login.json';
import participantPT from './locales/pt-PT/participant.json';
import reportPT from './locales/pt-PT/report.json';
import settingsPT from './locales/pt-PT/settings.json';
import supplierPT from './locales/pt-PT/supplier.json';
import teamPT from './locales/pt-PT/team.json';
import schedulePT from './locales/pt-PT/schedule.json';
import legalPT from './locales/pt-PT/legal.json';

// Import English translations
import commonEN from './locales/en-US/common.json';
import billingEN from './locales/en-US/billing.json';
import dashboardEN from './locales/en-US/dashboard.json';
import eventEN from './locales/en-US/event.json';
import landingPageAltEN from './locales/en-US/landingPageAlt.json';
import layoutEN from './locales/en-US/layout.json';
import loginEN from './locales/en-US/login.json';
import participantEN from './locales/en-US/participant.json';
import reportEN from './locales/en-US/report.json';
import settingsEN from './locales/en-US/settings.json';
import supplierEN from './locales/en-US/supplier.json';
import teamEN from './locales/en-US/team.json';
import scheduleEN from './locales/en-US/schedule.json';
import legalEN from './locales/en-US/legal.json';

// Import French translations
import commonFR from './locales/fr-FR/common.json';
import billingFR from './locales/fr-FR/billing.json';
import dashboardFR from './locales/fr-FR/dashboard.json';
import eventFR from './locales/fr-FR/event.json';
import landingPageAltFR from './locales/fr-FR/landingPageAlt.json';
import layoutFR from './locales/fr-FR/layout.json';
import loginFR from './locales/fr-FR/login.json';
import participantFR from './locales/fr-FR/participant.json';
import reportFR from './locales/fr-FR/report.json';
import settingsFR from './locales/fr-FR/settings.json';
import supplierFR from './locales/fr-FR/supplier.json';
import teamFR from './locales/fr-FR/team.json';
import scheduleFR from './locales/fr-FR/schedule.json';
import legalFR from './locales/fr-FR/legal.json';

i18n.use(initReactI18next).init({
    resources: {
        'pt-PT': {
            common: commonPT,
            billing: billingPT,
            dashboard: dashboardPT,
            event: eventPT,
            landingPageAlt: landingPageAltPT,
            layout: layoutPT,
            login: loginPT,
            participant: participantPT,
            report: reportPT,
            settings: settingsPT,
            supplier: supplierPT,
            team: teamPT,
            schedule: schedulePT,
            legal: legalPT
        },
        'en-US': {
            common: commonEN,
            billing: billingEN,
            dashboard: dashboardEN,
            event: eventEN,
            landingPageAlt: landingPageAltEN,
            layout: layoutEN,
            login: loginEN,
            participant: participantEN,
            report: reportEN,
            settings: settingsEN,
            supplier: supplierEN,
            team: teamEN,
            schedule: scheduleEN,
            legal: legalEN
        },
        'fr-FR': {
            common: commonFR,
            billing: billingFR,
            dashboard: dashboardFR,
            event: eventFR,
            landingPageAlt: landingPageAltFR,
            layout: layoutFR,
            login: loginFR,
            participant: participantFR,
            report: reportFR,
            settings: settingsFR,
            supplier: supplierFR,
            team: teamFR,
            schedule: scheduleFR,
            legal: legalFR
        }
    },
    lng: localStorage.getItem('preferredLanguage') || 'pt-PT', 
    fallbackLng: 'pt-PT',
    interpolation: {
        escapeValue: false
    },
    ns: [
        'common',
        'billing',
        'dashboard',
        'event',
        'landingPageAlt',
        'layout',
        'login',
        'participant',
        'report',
        'sendEmail',
        'settings',
        'supplier',
        'team',
        'schedule',
        'legal'
    ],
    defaultNS: 'common',
    detection: {
        order: ['localStorage', 'navigator'],
        caches: ['localStorage'],
    }
})

export default i18n;