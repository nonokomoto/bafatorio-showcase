export const getStatusInfo = (status, t) => {
  const baseClasses = {
    registered: 'bg-primary dark:bg-primary-dark text-white rounded-full px-2 py-1 text-xs font-medium',
    confirmed: 'bg-confirmed text-white rounded-full px-2 py-1 text-xs font-medium',
    cancelled: 'bg-error text-white rounded-full px-2 py-1 text-xs font-medium',
    attended: 'bg-success text-white rounded-full px-2 py-1 text-xs font-medium',
    default: 'bg-neutral text-white rounded-full px-2 py-1 text-xs font-medium'
  };

  switch (status) {
    case 'REGISTERED':
      return { 
        label: t ? t('statuses.registered') : 'Inscrito', 
        color: baseClasses.registered
      };
    case 'CONFIRMED':
      return { 
        label: t ? t('statuses.confirmed') : 'Confirmado', 
        color: baseClasses.confirmed
      };
    case 'CANCELLED':
      return { 
        label: t ? t('statuses.cancelled') : 'Cancelado', 
        color: baseClasses.cancelled
      };
    case 'ATTENDED':
      return { 
        label: t ? t('statuses.attended') : 'Presente', 
        color: baseClasses.attended
      };
    default:
      return { 
        label: t ? t('statuses.unknown') : 'Desconhecido', 
        color: baseClasses.default
      };
  }
};

export const formatDate = (date, t) => {
  if (!date) return t ? t('states.unavailable') : '-';
  return new Date(date).toLocaleDateString('pt-PT', {
    day: '2-digit',
    month: '2-digit',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit'
  });
};