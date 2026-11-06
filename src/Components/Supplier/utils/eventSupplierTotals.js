import { getSafeCurrency } from '../../../Utils/currencyOptions';
import { normalizeString } from '../../../Utils/stringUtils';

export const EVENT_SUPPLIER_STATUSES = ['PENDING', 'COUNTING_ON', 'APPROVED', 'PAID', 'REJECTED'];
const COMMITTED_STATUSES = ['APPROVED', 'PAID'];

// Filter key for suppliers without a category.
export const NO_CATEGORY = '__NO_CATEGORY__';

const categoryOf = (es) => {
    const category = es?.supplier?.category;
    return typeof category === 'string' && category.trim() ? category.trim() : NO_CATEGORY;
};

const addAmount = (byCurrency, currency, amount) => {
    byCurrency.set(currency, (byCurrency.get(currency) || 0) + amount);
};

const formatMoney = (amount, currency) => new Intl.NumberFormat('pt-PT', {
    style: 'currency',
    currency,
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
}).format(amount);

// Several currencies → per-currency breakdown joined by " · ".
export const formatCurrencyEntries = (entries) => entries.map(([cur, amt]) => formatMoney(amt, cur)).join(' · ');

// One entry → single total (the normal case). Several → per-currency breakdown.
// Empty → zero in the event currency.
const toEntries = (byCurrency, eventCurrency) => (
    byCurrency.size ? [...byCurrency.entries()] : [[getSafeCurrency(eventCurrency), 0]]
);

/**
 * Counts and quote totals per status for an event's suppliers.
 *
 * Amounts are grouped by each quote's own currency: under the single-currency
 * model they should all match the event currency, but a mixed-currency import
 * would make a cross-currency sum meaningless.
 *
 * @returns {{
 *   counts: Record<string, number>,
 *   totalsByStatus: Record<string, Array<[string, number]>>,
 *   committed: Array<[string, number]>,
 *   total: Array<[string, number]>,
 * }}
 */
export const summarizeEventSupplierTotals = (eventSuppliers, eventCurrency) => {
    const counts = Object.fromEntries(EVENT_SUPPLIER_STATUSES.map((s) => [s, 0]));
    const byStatus = Object.fromEntries(EVENT_SUPPLIER_STATUSES.map((s) => [s, new Map()]));
    const committed = new Map();
    const total = new Map();

    (eventSuppliers || []).forEach((es) => {
        if (counts[es.status] === undefined) return;
        counts[es.status]++;

        const amount = Number(es.quoteAmount) || 0;
        if (!amount) return;
        const currency = getSafeCurrency(es.currency || eventCurrency);
        addAmount(byStatus[es.status], currency, amount);
        addAmount(total, currency, amount);
        if (COMMITTED_STATUSES.includes(es.status)) addAmount(committed, currency, amount);
    });

    return {
        counts,
        totalsByStatus: Object.fromEntries(
            EVENT_SUPPLIER_STATUSES.map((s) => [s, toEntries(byStatus[s], eventCurrency)]),
        ),
        committed: toEntries(committed, eventCurrency),
        total: toEntries(total, eventCurrency),
    };
};

/**
 * Applies the list filters. All are optional and combine (AND). `search`
 * matches the supplier name, ignoring case and accents.
 * @param {{ status?: string|null, category?: string|null, search?: string }} filters
 */
export const filterEventSuppliers = (eventSuppliers, { status, category, search } = {}) => {
    const term = normalizeString((search || '').trim());
    return (eventSuppliers || []).filter((es) => (
        (!status || es.status === status)
        && (!category || categoryOf(es) === category)
        && (!term || normalizeString(es.supplier?.name).includes(term))
    ));
};

/**
 * Count, quote total (all statuses) and committed total (APPROVED + PAID) per
 * supplier category, sorted by name with the suppliers without category last.
 * @returns {Array<{
 *   category: string,
 *   count: number,
 *   totals: Array<[string, number]>,
 *   committed: Array<[string, number]>,
 * }>}
 */
export const summarizeByCategory = (eventSuppliers, eventCurrency) => {
    const groups = new Map();
    (eventSuppliers || []).forEach((es) => {
        const category = categoryOf(es);
        if (!groups.has(category)) groups.set(category, { count: 0, byCurrency: new Map(), committed: new Map() });
        const group = groups.get(category);
        group.count++;
        const amount = Number(es.quoteAmount) || 0;
        if (!amount) return;
        const currency = getSafeCurrency(es.currency || eventCurrency);
        addAmount(group.byCurrency, currency, amount);
        if (COMMITTED_STATUSES.includes(es.status)) addAmount(group.committed, currency, amount);
    });

    return [...groups.entries()]
        .sort(([a], [b]) => {
            if (a === NO_CATEGORY) return 1;
            if (b === NO_CATEGORY) return -1;
            return a.localeCompare(b);
        })
        .map(([category, { count, byCurrency, committed }]) => ({
            category,
            count,
            totals: toEntries(byCurrency, eventCurrency),
            committed: toEntries(committed, eventCurrency),
        }));
};
