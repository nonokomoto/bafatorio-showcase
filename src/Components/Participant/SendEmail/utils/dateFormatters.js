import i18next from 'i18next';

/**
 * Formats a date according to the current application locale
 * @param {Date|string} date Date to format
 * @param {string} style DateTimeFormat style (short, medium, long, full)
 * @returns {string} Formatted date
 */
export const formatDate = (date, style = 'medium') => {
  if (!date) return '';
  
  const dateObj = new Date(date);
  const locale = i18next.language || 'pt-PT';
  
  try {
    return new Intl.DateTimeFormat(locale, {
      dateStyle: style
    }).format(dateObj);
  } catch (error) {
    console.error('Error formatting date:', error);
    return date.toString();
  }
};

/**
 * Formats a time string according to the current application locale
 * @param {string} time Time string (HH:MM:SS)
 * @returns {string} Formatted time
 */
export const formatTime = (time) => {
  if (!time) return '';
  const locale = i18next.language || 'pt-PT';
  
  try {
    return new Intl.DateTimeFormat(locale, {
      hour: '2-digit',
      minute: '2-digit'
    }).format(new Date(`2000-01-01T${time}`));
  } catch (error) {
    console.error('Error formatting time:', error);
    return time;
  }
};