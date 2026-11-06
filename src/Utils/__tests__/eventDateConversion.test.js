import {
  eventHasEnded,
  getEventPrimaryTimestamp,
  datePickerValueToEventFields,
} from '../eventDateConversion';

describe('datePickerValueToEventFields', () => {
  it('returns null fields for null input', () => {
    expect(datePickerValueToEventFields(null)).toEqual({
      eventDateType: null,
      eventStartDate: null,
      eventEndDate: null,
      eventSpecificDates: null,
    });
  });

  it('specific mode → produces eventDateType specific and ISO date strings', () => {
    const result = datePickerValueToEventFields({
      type: 'specific',
      dates: [new Date(2025, 4, 1), new Date(2025, 4, 8), new Date(2025, 4, 15)],
    });
    expect(result).toEqual({
      eventDateType: 'specific',
      eventStartDate: null,
      eventEndDate: null,
      eventSpecificDates: ['2025-05-01', '2025-05-08', '2025-05-15'],
    });
  });

  it('specific mode with empty dates returns null fields', () => {
    expect(datePickerValueToEventFields({ type: 'specific', dates: [] })).toEqual({
      eventDateType: null,
      eventStartDate: null,
      eventEndDate: null,
      eventSpecificDates: null,
    });
  });

  it('range mode → produces eventDateType range with ISO date strings', () => {
    const result = datePickerValueToEventFields({
      type: 'range',
      from: new Date(2025, 4, 2),
      to: new Date(2025, 4, 10),
    });
    expect(result).toEqual({
      eventDateType: 'range',
      eventStartDate: '2025-05-02',
      eventEndDate: '2025-05-10',
      eventSpecificDates: null,
    });
  });
});

describe('getEventPrimaryTimestamp', () => {
  it('uses eventStartDate for range events', () => {
    expect(getEventPrimaryTimestamp({
      eventDateType: 'range',
      eventStartDate: '2025-05-02',
    })).toBe(new Date(2025, 4, 2).getTime());
  });

  it('uses the earliest date for specific events', () => {
    expect(getEventPrimaryTimestamp({
      eventDateType: 'specific',
      eventSpecificDates: ['2025-05-10', '2025-05-02'],
    })).toBe(new Date(2025, 4, 2).getTime());
  });

  it('returns 0 when no multi-date fields exist', () => {
    expect(getEventPrimaryTimestamp({})).toBe(0);
  });
});

describe('eventHasEnded', () => {
  const now = new Date(2026, 6, 14); // 14 jul 2026

  it('range: true quando eventEndDate já passou', () => {
    const event = { eventDateType: 'range', eventStatus: 'SCHEDULED', eventEndDate: '2026-06-05' };
    expect(eventHasEnded(event, now)).toBe(true);
  });

  it('range: false quando eventEndDate é hoje (o evento ainda decorre)', () => {
    const event = { eventDateType: 'range', eventStatus: 'ONGOING', eventEndDate: '2026-07-14' };
    expect(eventHasEnded(event, now)).toBe(false);
  });

  it('range: false quando eventEndDate é no futuro', () => {
    const event = { eventDateType: 'range', eventStatus: 'SCHEDULED', eventEndDate: '2026-08-01' };
    expect(eventHasEnded(event, now)).toBe(false);
  });

  it('specific: usa a última data', () => {
    const past = { eventDateType: 'specific', eventStatus: 'SCHEDULED', eventSpecificDates: ['2026-05-01', '2026-06-10'] };
    const future = { eventDateType: 'specific', eventStatus: 'SCHEDULED', eventSpecificDates: ['2026-05-01', '2026-09-10'] };
    expect(eventHasEnded(past, now)).toBe(true);
    expect(eventHasEnded(future, now)).toBe(false);
  });

  it('COMPLETED manual: true mesmo sem data derivável', () => {
    const event = { eventDateType: 'specific', eventStatus: 'COMPLETED', eventSpecificDates: [] };
    expect(eventHasEnded(event, now)).toBe(true);
  });

  it('CANCELLED: false mesmo com data no passado', () => {
    const event = { eventDateType: 'range', eventStatus: 'CANCELLED', eventEndDate: '2026-01-01' };
    expect(eventHasEnded(event, now)).toBe(false);
  });

  it('sem data derivável e sem COMPLETED: false (só o caminho manual conta)', () => {
    const event = { eventDateType: 'specific', eventStatus: 'SCHEDULED', eventSpecificDates: [] };
    expect(eventHasEnded(event, now)).toBe(false);
    expect(eventHasEnded(null, now)).toBe(false);
  });
});
