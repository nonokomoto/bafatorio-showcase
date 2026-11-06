/**
 * @file formatDate.js
 * @description Locale-aware date formatting utilities.
 * Uses the i18n language to format dates consistently across the app.
 */

import i18n from '../i18n/config';
import { parseIsoDate } from './eventDateConversion';

/**
 * Get the current i18n locale (e.g. 'pt-PT', 'en-US', 'fr-FR')
 */
const getLocale = () => i18n.language || 'pt-PT';
const getEventDisplayLocale = () => {
  const language = (i18n.language || 'pt').slice(0, 2);
  return {
    pt: 'pt',
    en: 'en-US',
    fr: 'fr-FR',
  }[language] || 'pt';
};

/**
 * Format a date for short display (e.g. "25 Dez 2024")
 * Used in: event headers, card subtitles
 * @param {string|Date} date
 * @returns {string}
 */
export const formatDateShort = (date) => {
  return new Date(date).toLocaleDateString(getLocale(), {
    day: '2-digit',
    month: 'short',
    year: 'numeric',
  });
};

/**
 * Format a date with time (e.g. "25/12/2024, 14:30")
 * Used in: event details card
 * @param {string|Date} date
 * @returns {string}
 */
export const formatDateTime = (date) => {
  return new Date(date).toLocaleDateString(getLocale(), {
    day: '2-digit',
    month: '2-digit',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  });
};

/**
 * Format a date for compact display (e.g. "25/12/2024")
 * Used in: event cards in the list
 * @param {string|Date} date
 * @returns {string}
 */
export const formatDateCompact = (date) => {
  return new Date(date).toLocaleDateString(getLocale(), {
    day: '2-digit',
    month: '2-digit',
    year: 'numeric',
  });
};

const getDateParts = (date) => {
  const parts = new Intl.DateTimeFormat(getEventDisplayLocale(), {
    day: 'numeric',
    month: 'short',
    year: 'numeric',
  }).formatToParts(date);

  return {
    day: parts.find((part) => part.type === 'day')?.value || '',
    month: (parts.find((part) => part.type === 'month')?.value || '').replace('.', ''),
    year: parts.find((part) => part.type === 'year')?.value || '',
  };
};

const formatDayMonthYear = (date) => {
  const { day, month, year } = getDateParts(date);
  return [day, month, year].filter(Boolean).join(' ');
};

const formatDayMonth = (date) => {
  const { day, month } = getDateParts(date);
  return [day, month].filter(Boolean).join(' ');
};

/**
 * Format the event's date(s) for display using the multi-date fields.
 *
 * Range:    "2 Mai – 10 Mai 2025"  ·  single day → "2 Mai 2025"
 * Specific: "1 Mai 2025, 8 Mai 2025, 15 Mai 2025"
 */
export const formatEventDateDisplay = (event) => {
  if (!event) return '';

  if (event.eventDateType === 'range' && event.eventStartDate) {
    const from = parseIsoDate(event.eventStartDate);
    const to = parseIsoDate(event.eventEndDate) ?? from;
    if (!from) return '';
    if (from.getTime() === to.getTime()) return formatDayMonthYear(from);
    const sameMonthAndYear = from.getFullYear() === to.getFullYear() && from.getMonth() === to.getMonth();
    if (sameMonthAndYear) return `${from.getDate()}–${formatDayMonthYear(to)}`;
    const sameYear = from.getFullYear() === to.getFullYear();
    return sameYear
      ? `${formatDayMonth(from)} – ${formatDayMonthYear(to)}`
      : `${formatDayMonthYear(from)} – ${formatDayMonthYear(to)}`;
  }

  if (event.eventDateType === 'specific' && event.eventSpecificDates?.length) {
    const dates = event.eventSpecificDates.map(parseIsoDate).filter(Boolean);
    if (dates.length === 0) return '';
    if (dates.length === 1) return formatDayMonthYear(dates[0]);
    const allSameMonthAndYear = dates.every(
      (d) => d.getFullYear() === dates[0].getFullYear() && d.getMonth() === dates[0].getMonth(),
    );
    if (allSameMonthAndYear) {
      const days = dates.slice(0, -1).map((d) => String(d.getDate())).join(', ');
      return `${days}, ${formatDayMonthYear(dates[dates.length - 1])}`;
    }
    return dates.map(formatDayMonthYear).join(', ');
  }

  return '';
};

/**
 * Format eventTime (ISO 8601 "hh:mm:ss.sss") for display as "HH:mm".
 */
export const formatEventTime = (eventTime) => {
  if (!eventTime) return '';
  return eventTime.slice(0, 5);
};
