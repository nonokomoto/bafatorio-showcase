// Display-only mirror of the public catalogue in src/Utils/plans.js.
// The landing is an isolated bundle and must not import application modules.
// Keep these values aligned with PLANS and LAUNCH_DISCOUNT when billing changes.
export const PAY_PER_EVENT_TIERS = [
  { key: 'PPE_100', participantLimit: 100, amount: 999 },
  { key: 'PPE_200', participantLimit: 200, amount: 1999 },
  { key: 'PPE_UNLIMITED', participantLimit: null, amount: 3499 },
];

export const PRO_PRICES = {
  listMonthly: 2999,
  currentMonthly: 1499,
  currentAnnual: 17994,
};

export function formatEur(amountInCents, locale) {
  return new Intl.NumberFormat(locale, {
    style: 'currency',
    currency: 'EUR',
    minimumFractionDigits: 2,
  }).format(amountInCents / 100);
}
