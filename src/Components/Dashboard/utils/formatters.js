export const formatCurrency = (value, currency = 'EUR', locale = 'pt-PT') => {
  return new Intl.NumberFormat(locale, {
    style: 'currency',
    currency: currency,
    minimumFractionDigits: 0,
    maximumFractionDigits: 0
  }).format(value);
};

export const formatPercentage = (value, decimals = 1) => {
  return new Intl.NumberFormat('pt-PT', {
    style: 'percent',
    minimumFractionDigits: decimals,
    maximumFractionDigits: decimals
  }).format(value / 100);
};

export const formatDate = (date, format = 'short') => {
  // Retorna 'N/A' se a data for null, undefined ou inválida
  if (!date || date === 'Invalid Date' || date === null) {
    return 'N/A';
  }
  
  try {
    const dateObj = new Date(date);
    
    // Verifica se a data é válida após a conversão
    if (isNaN(dateObj.getTime())) {
      return 'N/A';
    }
    
    const options = format === 'short' 
      ? { month: 'short', year: 'numeric' }
      : { day: 'numeric', month: 'long', year: 'numeric' };

    return new Intl.DateTimeFormat('pt-PT', options).format(dateObj);
  } catch (error) {
    console.warn('Error formatting date:', date, error);
    return 'N/A';
  }
};

export const formatNumber = (value, decimals = 0) => {
  return new Intl.NumberFormat('pt-PT', {
    minimumFractionDigits: decimals,
    maximumFractionDigits: decimals
  }).format(value);
}; 