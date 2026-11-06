import { eventTimeToHHMM, formatEventDateForEmail } from './formatEventDate';

describe('formatEventDateForEmail', () => {
  describe('empty / invalid input', () => {
    it('returns empty string for null event', () => {
      expect(formatEventDateForEmail(null as never)).toBe('');
    });

    it('returns empty string for empty event', () => {
      expect(formatEventDateForEmail({})).toBe('');
    });

    it('returns empty string when no multi-date fields are present', () => {
      expect(formatEventDateForEmail({})).toBe('');
    });
  });

  describe('range mode (pt)', () => {
    it('same start and end → single-day phrasing', () => {
      const out = formatEventDateForEmail(
        { eventDateType: 'range', eventStartDate: '2025-05-02', eventEndDate: '2025-05-02' },
        'pt',
      );
      expect(out).toMatch(/no dia 2 de maio/i);
    });

    it('range within the same month → compact "entre {a} a {b} de {month}"', () => {
      const out = formatEventDateForEmail(
        { eventDateType: 'range', eventStartDate: '2025-05-02', eventEndDate: '2025-05-10' },
        'pt',
      );
      expect(out).toMatch(/entre 2 a 10 de maio/i);
    });

    it('range across months → full date on each side', () => {
      const out = formatEventDateForEmail(
        { eventDateType: 'range', eventStartDate: '2025-04-30', eventEndDate: '2025-05-05' },
        'pt',
      );
      expect(out).toContain('30');
      expect(out).toContain('5');
      expect(out.toLowerCase()).toContain('abril');
      expect(out.toLowerCase()).toContain('maio');
    });

    it('range across years → includes both years', () => {
      const out = formatEventDateForEmail(
        { eventDateType: 'range', eventStartDate: '2025-12-28', eventEndDate: '2026-01-03' },
        'pt',
      );
      expect(out).toContain('2025');
      expect(out).toContain('2026');
    });

    it('range without end date treats as single day', () => {
      const out = formatEventDateForEmail(
        { eventDateType: 'range', eventStartDate: '2025-05-15' },
        'pt',
      );
      expect(out).toMatch(/no dia 15 de maio/i);
    });
  });

  describe('specific mode (pt)', () => {
    it('single date → "no dia {d} de {month}"', () => {
      const out = formatEventDateForEmail(
        { eventDateType: 'specific', eventSpecificDates: ['2025-05-08'] },
        'pt',
      );
      expect(out).toMatch(/no dia 8 de maio/i);
    });

    it('multiple dates same month → "nos dias 1, 8 e 15 de {month}"', () => {
      const out = formatEventDateForEmail(
        { eventDateType: 'specific', eventSpecificDates: ['2025-05-01', '2025-05-08', '2025-05-15'] },
        'pt',
      );
      expect(out).toMatch(/nos dias 1, 8 e 15 de maio/i);
    });

    it('two dates same month → "nos dias 1 e 8 de {month}"', () => {
      const out = formatEventDateForEmail(
        { eventDateType: 'specific', eventSpecificDates: ['2025-05-01', '2025-05-08'] },
        'pt',
      );
      expect(out).toMatch(/nos dias 1 e 8 de maio/i);
    });

    it('cross-month dates → full date for each item', () => {
      const out = formatEventDateForEmail(
        { eventDateType: 'specific', eventSpecificDates: ['2025-05-01', '2025-06-08'] },
        'pt',
      );
      expect(out.toLowerCase()).toContain('maio');
      expect(out.toLowerCase()).toContain('junho');
    });

    it('empty array returns empty string', () => {
      expect(formatEventDateForEmail({ eventDateType: 'specific', eventSpecificDates: [] }, 'pt')).toBe('');
    });
  });

  describe('language variants', () => {
    it('en range same month', () => {
      const out = formatEventDateForEmail(
        { eventDateType: 'range', eventStartDate: '2025-05-02', eventEndDate: '2025-05-10' },
        'en',
      );
      expect(out.toLowerCase()).toContain('may');
      expect(out).toContain('2');
      expect(out).toContain('10');
    });

    it('fr range same month', () => {
      const out = formatEventDateForEmail(
        { eventDateType: 'range', eventStartDate: '2025-05-02', eventEndDate: '2025-05-10' },
        'fr',
      );
      expect(out.toLowerCase()).toContain('mai');
      expect(out).toContain('2');
      expect(out).toContain('10');
    });

    it('en specific multiple', () => {
      const out = formatEventDateForEmail(
        { eventDateType: 'specific', eventSpecificDates: ['2025-05-01', '2025-05-08'] },
        'en',
      );
      expect(out.toLowerCase()).toContain('may');
      expect(out).toContain('1');
      expect(out).toContain('8');
    });
  });

  it('defaults to pt when language is omitted', () => {
    const out = formatEventDateForEmail({ eventDateType: 'range', eventStartDate: '2025-05-02', eventEndDate: '2025-05-10' });
    expect(out.toLowerCase()).toContain('maio');
  });
});

describe('eventTimeToHHMM', () => {
  it('returns empty string for missing eventTime', () => {
    expect(eventTimeToHHMM(null)).toBe('');
    expect(eventTimeToHHMM(undefined)).toBe('');
  });

  it('normalizes Amplify time values to HH:mm', () => {
    expect(eventTimeToHHMM('14:30:00.000')).toBe('14:30');
    expect(eventTimeToHHMM('09:15')).toBe('09:15');
  });
});
