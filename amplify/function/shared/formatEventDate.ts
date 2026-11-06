/**
 * Formats an event's date(s) into a localized human phrase suitable for emails.
 *
 * Range:    "entre 2 a 10 de maio" / "entre 30 de abril a 5 de maio" (cross-month)
 * Specific: "no dia 8 de maio" / "nos dias 1, 8 e 15 de maio"
 *
 * Languages: pt (default), en, fr.
 */

export type EventDateLanguage = 'pt' | 'en' | 'fr';

export interface EventDateInput {
  eventDateType?: string | null;
  eventStartDate?: string | null;
  eventEndDate?: string | null;
  eventSpecificDates?: (string | null | undefined)[] | null;
}

export const eventTimeToHHMM = (eventTime?: string | null): string => {
  if (!eventTime) return '';
  return eventTime.slice(0, 5);
};

const LOCALE: Record<EventDateLanguage, string> = {
  pt: 'pt-PT',
  en: 'en-US',
  fr: 'fr-FR',
};

const PHRASES: Record<EventDateLanguage, {
  range: (from: string, to: string) => string;
  single: (date: string) => string;
  specificSameMonth: (dayList: string, lastWithMonth: string) => string;
  specificFull: (list: string) => string;
  joiner: string;
}> = {
  pt: {
    range: (a, b) => `entre ${a} a ${b}`,
    single: (d) => `no dia ${d}`,
    specificSameMonth: (head, last) => `nos dias ${head} e ${last}`,
    specificFull: (list) => `nos dias ${list}`,
    joiner: 'e',
  },
  en: {
    range: (a, b) => `from ${a} to ${b}`,
    single: (d) => `on ${d}`,
    specificSameMonth: (head, last) => `on ${head} and ${last}`,
    specificFull: (list) => `on ${list}`,
    joiner: 'and',
  },
  fr: {
    range: (a, b) => `du ${a} au ${b}`,
    single: (d) => `le ${d}`,
    specificSameMonth: (head, last) => `les ${head} et ${last}`,
    specificFull: (list) => `les ${list}`,
    joiner: 'et',
  },
};

// keep in sync cross-tier with src/Utils/formatEventDateForEmail.js
const parseIsoDate = (iso?: string | null): Date | null => {
  if (!iso) return null;
  const match = iso.match(/^(\d{4})-(\d{2})-(\d{2})/);
  if (!match) return null;
  const [, y, m, d] = match;
  return new Date(Number(y), Number(m) - 1, Number(d));
};

const formatDayMonth = (date: Date, lang: EventDateLanguage): string =>
  new Intl.DateTimeFormat(LOCALE[lang], { day: 'numeric', month: 'long' }).format(date);

const formatFullDate = (date: Date, lang: EventDateLanguage): string =>
  new Intl.DateTimeFormat(LOCALE[lang], { day: 'numeric', month: 'long', year: 'numeric' }).format(date);

const sameMonth = (a: Date, b: Date) =>
  a.getFullYear() === b.getFullYear() && a.getMonth() === b.getMonth();

const formatRange = (from: Date, to: Date, lang: EventDateLanguage): string => {
  const phrases = PHRASES[lang];
  if (sameMonth(from, to)) {
    const dayFrom = String(from.getDate());
    const dayTo = formatDayMonth(to, lang);
    return phrases.range(dayFrom, dayTo);
  }
  const sameYear = from.getFullYear() === to.getFullYear();
  const fromText = sameYear ? formatDayMonth(from, lang) : formatFullDate(from, lang);
  const toText = sameYear ? formatDayMonth(to, lang) : formatFullDate(to, lang);
  return phrases.range(fromText, toText);
};

const formatSpecificList = (dates: Date[], lang: EventDateLanguage): string => {
  const phrases = PHRASES[lang];
  if (dates.length === 1) return phrases.single(formatDayMonth(dates[0], lang));

  const allSameMonth = dates.every((d) => sameMonth(d, dates[0]));
  if (allSameMonth) {
    const lastWithMonth = formatDayMonth(dates[dates.length - 1], lang);
    if (dates.length === 2) {
      return phrases.specificSameMonth(String(dates[0].getDate()), lastWithMonth);
    }
    const head = dates.slice(0, -1).map((d) => String(d.getDate())).join(', ');
    return phrases.specificSameMonth(head, lastWithMonth);
  }

  const formatted = dates.map((d) => formatDayMonth(d, lang));
  if (formatted.length === 2) {
    return phrases.specificFull(`${formatted[0]} ${phrases.joiner} ${formatted[1]}`);
  }
  const head = formatted.slice(0, -1).join(', ');
  const last = formatted[formatted.length - 1];
  return phrases.specificFull(`${head} ${phrases.joiner} ${last}`);
};

export function formatEventDateForEmail(
  event: EventDateInput,
  language: EventDateLanguage = 'pt',
): string {
  if (!event) return '';
  const phrases = PHRASES[language];

  if (event.eventDateType === 'range' && event.eventStartDate) {
    const from = parseIsoDate(event.eventStartDate);
    const to = parseIsoDate(event.eventEndDate) ?? from;
    if (!from || !to) return '';
    if (from.getTime() === to.getTime()) {
      return phrases.single(formatDayMonth(from, language));
    }
    return formatRange(from, to, language);
  }

  if (event.eventDateType === 'specific' && event.eventSpecificDates?.length) {
    const dates = event.eventSpecificDates
      .map(parseIsoDate)
      .filter((d): d is Date => d !== null);
    if (dates.length === 0) return '';
    return formatSpecificList(dates, language);
  }

  return '';
}
