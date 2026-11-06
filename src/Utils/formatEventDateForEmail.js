import { format } from 'date-fns';
import { pt, enUS, fr } from 'date-fns/locale';
import { parseIsoDate } from './eventDateConversion';

const LOCALES = { pt: pt, en: enUS, fr: fr };

// keep in sync cross-tier with amplify/function/shared/formatEventDate.ts
const PHRASES = {
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

const formatDayMonth = (date, lang) => format(date, 'd MMMM', { locale: LOCALES[lang] });
const formatFull = (date, lang) => format(date, 'd MMMM yyyy', { locale: LOCALES[lang] });
const sameMonth = (a, b) => a.getFullYear() === b.getFullYear() && a.getMonth() === b.getMonth();

const formatRange = (from, to, lang) => {
  const phrases = PHRASES[lang];
  if (sameMonth(from, to)) {
    return phrases.range(String(from.getDate()), formatDayMonth(to, lang));
  }
  const sameYear = from.getFullYear() === to.getFullYear();
  const fromText = sameYear ? formatDayMonth(from, lang) : formatFull(from, lang);
  const toText = sameYear ? formatDayMonth(to, lang) : formatFull(to, lang);
  return phrases.range(fromText, toText);
};

const formatSpecificList = (dates, lang) => {
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
  const head = formatted.slice(0, -1).join(', ');
  const last = formatted[formatted.length - 1];
  return phrases.specificFull(`${head} ${phrases.joiner} ${last}`);
};

export function formatEventDateForEmail(event, language = 'pt') {
  if (!event) return '';
  const lang = LOCALES[language] ? language : 'pt';
  const phrases = PHRASES[lang];

  if (event.eventDateType === 'range' && event.eventStartDate) {
    const from = parseIsoDate(event.eventStartDate);
    const to = parseIsoDate(event.eventEndDate) ?? from;
    if (!from || !to) return '';
    if (from.getTime() === to.getTime()) return phrases.single(formatDayMonth(from, lang));
    return formatRange(from, to, lang);
  }

  if (event.eventDateType === 'specific' && event.eventSpecificDates?.length) {
    const dates = event.eventSpecificDates.map(parseIsoDate).filter(Boolean);
    if (dates.length === 0) return '';
    return formatSpecificList(dates, lang);
  }

  return '';
}
