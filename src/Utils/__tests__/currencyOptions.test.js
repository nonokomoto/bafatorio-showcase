import { getSafeCurrency, DEFAULT_CURRENCY, CURRENCY_CODES } from '../currencyOptions';

describe('getSafeCurrency', () => {
    test('returns DEFAULT_CURRENCY for null/undefined/empty', () => {
        expect(getSafeCurrency(null)).toBe(DEFAULT_CURRENCY);
        expect(getSafeCurrency(undefined)).toBe(DEFAULT_CURRENCY);
        expect(getSafeCurrency('')).toBe(DEFAULT_CURRENCY);
    });

    test('accepts every code in the canonical allowlist', () => {
        CURRENCY_CODES.forEach((code) => {
            expect(getSafeCurrency(code)).toBe(code);
        });
    });

    test('falls back to DEFAULT_CURRENCY for codes outside the allowlist', () => {
        // getSafeCurrency is allowlist-based, not Intl.NumberFormat-based.
        // Avoid "XXX" here: it is a real ISO 4217 code ("no currency") that
        // Intl.NumberFormat accepts, so a test named around Intl validity
        // would be ambiguous. These examples are clearly outside any allowlist.
        expect(getSafeCurrency('12$')).toBe(DEFAULT_CURRENCY);
        expect(getSafeCurrency('123')).toBe(DEFAULT_CURRENCY);
        expect(getSafeCurrency('AB')).toBe(DEFAULT_CURRENCY);
    });

    test('falls back for tampered / attacker-controlled strings', () => {
        expect(getSafeCurrency('<script>')).toBe(DEFAULT_CURRENCY);
        expect(getSafeCurrency(' '.repeat(5))).toBe(DEFAULT_CURRENCY);
        expect(getSafeCurrency('a'.repeat(200))).toBe(DEFAULT_CURRENCY);
    });
});
