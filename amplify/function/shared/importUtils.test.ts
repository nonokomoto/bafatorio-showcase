import { parseDateToISO } from './importUtils';

describe('parseDateToISO', () => {
  it('returns undefined for empty/undefined input', () => {
    expect(parseDateToISO(undefined)).toBeUndefined();
    expect(parseDateToISO('')).toBeUndefined();
    expect(parseDateToISO('   ')).toBeUndefined();
  });

  it('parses dd/MM/yyyy (the format our own export writes) into ISO', () => {
    expect(parseDateToISO('03/08/2026')).toBe('2026-08-03T00:00:00.000Z');
    expect(parseDateToISO('1/1/2026')).toBe('2026-01-01T00:00:00.000Z');
  });

  it('passes through values already in ISO/AWSDateTime format', () => {
    expect(parseDateToISO('2026-08-03T10:53:56.000Z')).toBe('2026-08-03T10:53:56.000Z');
  });

  it('returns undefined for unparseable text', () => {
    expect(parseDateToISO('not a date')).toBeUndefined();
    expect(parseDateToISO('32/13/2026')).toBeUndefined();
  });
});
