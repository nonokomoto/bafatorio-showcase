import {
  FiUser,
  FiCreditCard,
  FiNavigation,
  FiHome,
  FiUsers,
} from 'react-icons/fi';

export const TABS = [
  { key: 'basic', Icon: FiUser, iconCls: 'text-info-500', bgCls: 'bg-info-100 dark:bg-info-900/30', labelKey: 'participantsV2.formModal.tabs.basic', fallback: 'Dados Básicos' },
  { key: 'identification', Icon: FiCreditCard, iconCls: 'text-warning-500', bgCls: 'bg-warning-100 dark:bg-warning-900/30', labelKey: 'participantsV2.formModal.tabs.identification', fallback: 'Identificação' },
  { key: 'travel', Icon: FiNavigation, iconCls: 'text-success-500', bgCls: 'bg-success-100 dark:bg-success-900/30', labelKey: 'participantsV2.formModal.tabs.travel', fallback: 'Viagem' },
  { key: 'accommodation', Icon: FiHome, iconCls: 'text-secondary-500', bgCls: 'bg-secondary-100 dark:bg-secondary-900/30', labelKey: 'participantsV2.formModal.tabs.accommodation', fallback: 'Alojamento' },
  { key: 'dependents', Icon: FiUsers, iconCls: 'text-error-400', bgCls: 'bg-error-100 dark:bg-error-900/30', labelKey: 'participantsV2.formModal.tabs.dependents', fallback: 'Acompanhantes' },
];

export const TAB_KEYS = TABS.map(t => t.key);
