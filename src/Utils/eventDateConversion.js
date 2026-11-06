export const parseIsoDate = (iso) => {
  if (!iso) return null;
  const match = iso.match(/^(\d{4})-(\d{2})-(\d{2})/);
  if (!match) return null;
  const [, y, m, d] = match;
  return new Date(Number(y), Number(m) - 1, Number(d));
};

export const toIsoDate = (date) => {
  if (!date) return null;
  const y = date.getFullYear();
  const m = String(date.getMonth() + 1).padStart(2, '0');
  const d = String(date.getDate()).padStart(2, '0');
  return `${y}-${m}-${d}`;
};

export const toIsoTime = (hhmm) => {
  if (!hhmm) return null;
  const [hh, mm] = hhmm.split(':');
  if (!hh || !mm) return null;
  return `${hh}:${mm}:00.000`;
};

export const fromIsoTimeToInput = (isoTime) => (isoTime ? isoTime.slice(0, 5) : '');

export const datePickerValueToEventFields = (datePickerValue) => {
  if (datePickerValue?.type === 'range' && datePickerValue.from) {
    return {
      eventDateType: 'range',
      eventStartDate: toIsoDate(datePickerValue.from),
      eventEndDate: toIsoDate(datePickerValue.to ?? datePickerValue.from),
      eventSpecificDates: null,
    };
  }
  if (datePickerValue?.type === 'specific' && datePickerValue.dates?.length) {
    return {
      eventDateType: 'specific',
      eventStartDate: null,
      eventEndDate: null,
      eventSpecificDates: datePickerValue.dates.map(toIsoDate),
    };
  }
  return { eventDateType: null, eventStartDate: null, eventEndDate: null, eventSpecificDates: null };
};

export const initialDatePickerValue = (existingEvent) => {
  if (!existingEvent) return null;
  if (existingEvent.eventDateType === 'range' && existingEvent.eventStartDate) {
    return {
      type: 'range',
      from: parseIsoDate(existingEvent.eventStartDate),
      to: parseIsoDate(existingEvent.eventEndDate),
    };
  }
  if (existingEvent.eventDateType === 'specific' && existingEvent.eventSpecificDates?.length) {
    return {
      type: 'specific',
      dates: existingEvent.eventSpecificDates.map(parseIsoDate).filter(Boolean),
    };
  }
  return null;
};

export const initialEventTimeInput = (existingEvent) => {
  if (!existingEvent) return '';
  if (existingEvent.eventTime) return fromIsoTimeToInput(existingEvent.eventTime);
  return '';
};

export const getEventPrimaryDate = (event) => {
  if (!event) return null;

  if (event.eventDateType === 'range' && event.eventStartDate) {
    return parseIsoDate(event.eventStartDate);
  }

  if (event.eventDateType === 'specific' && event.eventSpecificDates?.length) {
    return event.eventSpecificDates
      .map(parseIsoDate)
      .filter(Boolean)
      .sort((a, b) => a.getTime() - b.getTime())[0] ?? null;
  }

  return null;
};

export const getEventPrimaryTimestamp = (event) => {
  const date = getEventPrimaryDate(event);
  return date ? date.getTime() : 0;
};

// Espelho frontend de deriveEventEndDate (resolveEventEntitlements.ts):
// range → eventEndDate; specific → a última data.
export const getEventEndDate = (event) => {
  if (!event) return null;

  if (event.eventDateType === 'specific' && event.eventSpecificDates?.length) {
    return event.eventSpecificDates
      .map(parseIsoDate)
      .filter(Boolean)
      .sort((a, b) => b.getTime() - a.getTime())[0] ?? null;
  }

  return parseIsoDate(event.eventEndDate);
};

/**
 * O evento já aconteceu? Derivado das datas (facto), não do eventStatus
 * (escrita manual que fecha com a janela de edição) — o relatório é uma
 * leitura e não pode depender de uma escrita bloqueável. COMPLETED manual
 * continua a contar; CANCELLED nunca conta. Sem data derivável, só o
 * caminho manual decide.
 */
export const eventHasEnded = (event, now) => {
  if (!event || event.eventStatus === 'CANCELLED') return false;
  if (event.eventStatus === 'COMPLETED') return true;

  const endDate = getEventEndDate(event);
  if (!endDate) return false;

  // Fim inclusivo: no próprio dia o evento ainda decorre.
  const dayAfterEnd = new Date(endDate);
  dayAfterEnd.setDate(dayAfterEnd.getDate() + 1);
  return now >= dayAfterEnd;
};
