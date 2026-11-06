import { formatEventDateDisplay, formatEventTime } from '../formatDate';

jest.mock('../../i18n/config', () => ({
  __esModule: true,
  default: { language: 'pt-PT' },
}));

describe('formatEventDateDisplay', () => {
  it('returns empty string for null event', () => {
    expect(formatEventDateDisplay(null)).toBe('');
  });

  it('returns empty string for event with no date fields', () => {
    expect(formatEventDateDisplay({})).toBe('');
  });

  it('range mode same day formats as single date (no separator)', () => {
    const out = formatEventDateDisplay({
      eventDateType: 'range',
      eventStartDate: '2025-05-02',
      eventEndDate: '2025-05-02',
    });
    expect(out).toBe('2 mai 2025');
  });

  it('range mode within the same month formats compactly', () => {
    const out = formatEventDateDisplay({
      eventDateType: 'range',
      eventStartDate: '2025-05-02',
      eventEndDate: '2025-05-10',
    });
    expect(out).toBe('2–10 mai 2025');
  });

  it('range mode across months keeps both month names', () => {
    const out = formatEventDateDisplay({
      eventDateType: 'range',
      eventStartDate: '2025-04-30',
      eventEndDate: '2025-05-02',
    });
    expect(out).toBe('30 abr – 2 mai 2025');
  });

  it('range mode without eventEndDate falls back to start = end', () => {
    const out = formatEventDateDisplay({
      eventDateType: 'range',
      eventStartDate: '2025-05-15',
    });
    expect(out).not.toContain('–');
    expect(out).toContain('2025');
  });

  it('specific mode single date shows full date without comma', () => {
    const out = formatEventDateDisplay({
      eventDateType: 'specific',
      eventSpecificDates: ['2025-05-08'],
    });
    expect(out).toContain('2025');
    expect(out).not.toContain(',');
  });

  it('specific mode same month → compact "D1, D2, D3 Mmm YYYY" (month appears once)', () => {
    const out = formatEventDateDisplay({
      eventDateType: 'specific',
      eventSpecificDates: ['2025-05-01', '2025-05-08', '2025-05-15'],
    });
    expect(out).toContain('1');
    expect(out).toContain('8');
    expect(out).toContain('15');
    expect(out).toContain('2025');
    expect((out.match(/mai/gi) || []).length).toBe(1);
  });

  it('specific mode two dates same month → "D1, D2 Mmm YYYY"', () => {
    const out = formatEventDateDisplay({
      eventDateType: 'specific',
      eventSpecificDates: ['2025-05-01', '2025-05-08'],
    });
    expect(out).toContain('1');
    expect(out).toContain('8');
    expect((out.match(/mai/gi) || []).length).toBe(1);
  });

  it('specific mode cross-month shows full date for each', () => {
    const out = formatEventDateDisplay({
      eventDateType: 'specific',
      eventSpecificDates: ['2025-05-01', '2025-06-08'],
    });
    expect(out.toLowerCase()).toContain('mai');
    expect(out.toLowerCase()).toContain('jun');
  });

  it('returns empty string for specific mode with empty array', () => {
    expect(formatEventDateDisplay({
      eventDateType: 'specific',
      eventSpecificDates: [],
    })).toBe('');
  });
});

describe('formatEventTime', () => {
  it('returns empty for null/undefined', () => {
    expect(formatEventTime(null)).toBe('');
    expect(formatEventTime(undefined)).toBe('');
    expect(formatEventTime('')).toBe('');
  });

  it('extracts HH:mm from ISO time', () => {
    expect(formatEventTime('14:30:00.000')).toBe('14:30');
    expect(formatEventTime('09:05:00.000')).toBe('09:05');
  });
});
