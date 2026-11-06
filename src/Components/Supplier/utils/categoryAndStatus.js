/**
 * Determines the badge color for a supplier category.
 *
 * Known canonical categories (English uppercase schema keys) get a curated
 * Badge variant. Everything else — free-form or imported categories — gets a
 * stable HSL background color derived from the category name via a djb2 hash.
 * This gives every distinct string a unique hue across the full 360° spectrum
 * with no palette size limit, so no two categories should look the same.
 *
 * Usage:
 *   <Badge variant={getCategoryBadgeColor(cat)} style={getCategoryBadgeStyle(cat)} ...>
 */

// Resolves Badge variant name → hex color for inline-style contexts (e.g. calendar chips).
// Values match the 500-shade of each token in tailwind.config.js.
const VARIANT_HEX = {
    primary:   '#4069FF',
    info:      '#0ea5e9',
    purple:    '#a855f7',
    secondary: '#6366F1',
    success:   '#10B981',
    gray:      '#718096',
    neutral:   '#737373',
    teal:      '#14b8a6',
    pink:      '#ec4899',
};

const KNOWN_CATEGORIES = {
    CATERING: 'primary',
    AV: 'info',
    VENUE: 'purple',
    DECORATION: 'secondary',
    ENTERTAINMENT: 'success',
    PHOTOGRAPHY: 'gray',
    VIDEOGRAPHY: 'neutral',
    TRANSPORTATION: 'teal',
    FLOWERS: 'success',
    CAKE: 'secondary',
    WINE: 'pink',
    FOOD: 'success',
    SERVICES: 'primary',
};

// djb2 + MurmurHash3 fmix32 finalizer — deterministic and stable. The fmix
// avalanche is important because djb2 alone produces numerically close outputs
// for similar inputs (e.g. "TECNOLOGIA" vs "TRANSPORTE"), which then collapse
// to close hues after `% 360`.
const hashString = (str) => {
    let h = 5381;
    for (let i = 0; i < str.length; i += 1) {
        h = ((h << 5) + h + str.charCodeAt(i)) | 0;
    }
    h >>>= 0;
    h ^= h >>> 16;
    h = Math.imul(h, 0x85ebca6b);
    h ^= h >>> 13;
    h = Math.imul(h, 0xc2b2ae35);
    h ^= h >>> 16;
    return h >>> 0;
};

const normalize = (category) => String(category).trim().toUpperCase();

const isKnown = (category) =>
    Boolean(KNOWN_CATEGORIES[category] || KNOWN_CATEGORIES[normalize(category)]);

// Derives hue/saturation/lightness from a hash value.
// 55–74% saturation, 38–49% lightness — readable with white text.
const hashToHsl = (h) => {
    const hue = h % 360;
    const saturation = 55 + ((h >>> 8) % 20);
    const lightness = 38 + ((h >>> 16) % 12);
    return { hue, saturation, lightness };
};

/**
 * Returns the Badge `variant` prop.
 * For unknown categories this is always 'neutral' — the real color comes from
 * `getCategoryBadgeStyle` which overrides the background via inline style.
 */
export const getCategoryBadgeColor = (category) => {
    if (!category) return 'neutral';
    return KNOWN_CATEGORIES[category]
        || KNOWN_CATEGORIES[normalize(category)]
        || 'neutral';
};

/**
 * Returns an inline `style` object to pass to Badge alongside `variant`.
 * For known categories returns undefined (no override needed).
 * For unknown categories derives a unique hue from the category name so every
 * distinct category gets its own colour across the full HSL spectrum.
 */
export const getCategoryBadgeStyle = (category) => {
    if (!category || isKnown(category)) return undefined;
    const { hue, saturation, lightness } = hashToHsl(hashString(normalize(category)));
    return { backgroundColor: `hsl(${hue}, ${saturation}%, ${lightness}%)` };
};

/**
 * Returns a single hex/hsl color string for inline styles in non-Badge contexts
 * (e.g. calendar event chips). Returns null when category is absent.
 */
export const getCategoryEventColor = (category) => {
    if (!category) return null;
    const variant = KNOWN_CATEGORIES[category] || KNOWN_CATEGORIES[normalize(category)];
    if (variant) return VARIANT_HEX[variant] || null;
    const { hue, saturation, lightness } = hashToHsl(hashString(normalize(category)));
    return `hsl(${hue}, ${saturation}%, ${lightness}%)`;
};
