import i18next from 'i18next';

/**
 * Formata uma data usando o idioma atual da aplicação
 */
export const formatDate = (date) => {
  if (!date) return '';

  const currentLanguage = i18next.language || 'pt-PT';

  const options = {
    day: 'numeric',
    month: 'long',
    year: 'numeric'
  };

  return new Date(date).toLocaleDateString(currentLanguage, options);
};

/**
 * Formata um número para moeda com base no idioma atual
 */
export const formatCurrency = (value, currency = 'EUR') => {
  if (!value && value !== 0) {
    const t = i18next.getFixedT(null, 'report');
    return t('eventReport.formatters.notAvailable');
  }

  const currentLanguage = i18next.language || 'pt-PT';

  return new Intl.NumberFormat(currentLanguage, {
    style: 'currency',
    currency
  }).format(value);
};

/**
 * Formata uma porcentagem
 */
export const formatPercentage = (value) => {
  if (value === undefined || value === null) return '0%';
  return `${Number(value).toFixed(1)}%`;
};
