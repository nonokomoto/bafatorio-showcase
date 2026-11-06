export { getCurrencyOptions, CURRENCY_CODES, DEFAULT_CURRENCY } from '../../../Utils/currencyOptions';

/**
 * Generates estimate unit options for a form select.
 * @param {Function} t - The translation function from i18next.
 * @returns {Array<{value: string, label: string}>} Array of options.
 */
export const getEstimateUnitOptions = (t) => [
    { value: 'FIXED', label: t('units.FIXED', 'Fixed') },
    { value: 'PER_EVENT', label: t('units.PER_EVENT', 'Per Event') },
    { value: 'PER_HOUR', label: t('units.PER_HOUR', 'Per Hour') },
    { value: 'PER_DAY', label: t('units.PER_DAY', 'Per Day') },
    { value: 'PER_ITEM', label: t('units.PER_ITEM', 'Per Item') },
    { value: 'PER_GUEST', label: t('units.PER_GUEST', 'Per Guest') },
];

/**
 * Generates category options for a form select.
 * @param {Function} t - The translation function from i18next.
 * @returns {Array<{value: string, label: string}>} Array of options.
 */
export const getCategoryOptions = (t) => [
    { value: 'CATERING', label: t('categories.CATERING', 'Catering') },
    { value: 'AV', label: t('categories.AV', 'Audiovisual (AV)') },
    { value: 'VENUE', label: t('categories.VENUE', 'Venue') },
    { value: 'DECORATION', label: t('categories.DECORATION', 'Decoração') },
    { value: 'ENTERTAINMENT', label: t('categories.ENTERTAINMENT', 'Entretenimento') },
    { value: 'PHOTOGRAPHY', label: t('categories.PHOTOGRAPHY', 'Fotografia') },
    { value: 'VIDEOGRAPHY', label: t('categories.VIDEOGRAPHY', 'Videografia') },
    { value: 'TRANSPORTATION', label: t('categories.TRANSPORTATION', 'Transporte') },
    { value: 'FLOWERS', label: t('categories.FLOWERS', 'Flores') },
    { value: 'CAKE', label: t('categories.CAKE', 'Bolo') },
    { value: 'WINE', label: t('categories.WINE', 'Vinhos') },
    { value: 'FOOD', label: t('categories.FOOD', 'Food') },
    { value: 'SERVICES', label: t('categories.SERVICES', 'Serviços') },
    // Add more common categories here if needed
]; 