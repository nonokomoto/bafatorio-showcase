import i18next from 'i18next';

const CURRENCIES = [
    { code: 'EUR', fallback: '🇪🇺 EUR (Euro)' },
    { code: 'USD', fallback: '🇺🇸 USD (US Dollar)' },
    { code: 'GBP', fallback: '🇬🇧 GBP (British Pound)' },
    { code: 'BRL', fallback: '🇧🇷 BRL (Brazilian Real)' },
    { code: 'AOA', fallback: '🇦🇴 AOA (Kwanza Angolano)' },
    { code: 'CVE', fallback: '🇨🇻 CVE (Escudo Cabo-Verdiano)' },
    { code: 'MZN', fallback: '🇲🇿 MZN (Metical Moçambicano)' },
    { code: 'STN', fallback: '🇸🇹 STN (Dobra São-Tomense)' },
    { code: 'XOF', fallback: '🇬🇼 XOF (Franco CFA - BCEAO)' },
    { code: 'XAF', fallback: '🇬🇶 XAF (Franco CFA - BEAC)' },
    { code: 'CAD', fallback: '🇨🇦 CAD (Canadian Dollar)' },
    { code: 'AUD', fallback: '🇦🇺 AUD (Australian Dollar)' },
    { code: 'JPY', fallback: '🇯🇵 JPY (Japanese Yen)' },
    { code: 'CHF', fallback: '🇨🇭 CHF (Swiss Franc)' },
];

export const CURRENCY_CODES = CURRENCIES.map(({ code }) => code);

export const DEFAULT_CURRENCY = 'EUR';

/**
 * Returns `code` only when it is part of the app's canonical currency
 * allowlist; otherwise falls back to `DEFAULT_CURRENCY`.
 *
 * This keeps persisted/legacy server values aligned with the currencies the
 * UI actually supports, even if `Intl` would accept a broader ISO 4217 code.
 */
export const getSafeCurrency = (code) => {
    if (!code) return DEFAULT_CURRENCY;
    return CURRENCY_CODES.includes(code) ? code : DEFAULT_CURRENCY;
};

/**
 * Returns a list of currency options for a select field.
 * Labels resolve against the `supplier` i18n namespace (where the
 * canonical `currencies.*` keys live), with inline fallbacks when the
 * translation is missing.
 *
 * Accepting an optional `t` keeps the signature compatible with the
 * previous supplier-scoped helper; when omitted, the global i18next
 * instance is used.
 */
export const getCurrencyOptions = (t) =>
    CURRENCIES.map(({ code, fallback }) => ({
        value: code,
        label: t
            ? t(`currencies.${code}`, fallback)
            : i18next.t(`currencies.${code}`, { ns: 'supplier', defaultValue: fallback }),
    }));
