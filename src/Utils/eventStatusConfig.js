/**
 * Single source of truth for event status presentation.
 *
 * Consumed by EventCard (badge + card header), EventControls (filter) and
 * EventForm (status select). Keeps the five states from drifting across files.
 */

// Semantic definition — treatment-independent (color intent + i18n label).
export const EVENT_STATUS = {
  SCHEDULED: { variant: 'primary', labelKey: 'eventCard.status.scheduled' },
  ONGOING:   { variant: 'warning', labelKey: 'eventCard.status.ongoing' },
  COMPLETED: { variant: 'success', labelKey: 'eventCard.status.completed' },
  CANCELLED: { variant: 'error',   labelKey: 'eventCard.status.cancelled' },
  UNKNOWN:   { variant: 'neutral', labelKey: 'eventCard.status.unknown' },
};

/** Selectable statuses, in lifecycle order. UNKNOWN is a display-only fallback. */
export const EVENT_STATUS_KEYS = ['SCHEDULED', 'ONGOING', 'COMPLETED', 'CANCELLED'];

/**
 * Presentation presets — how the status reads on the card.
 * Flip EVENT_STATUS_STYLE to restyle every event card from one place.
 *
 * - `tone` is the Badge tone.
 * - `headerBg` is either a single class (same for all statuses) or a per-variant
 *   map. The `solidHeader` shades are picked so the white on-solid label meets
 *   WCAG AA (>= 4.5:1): primary-600 6.28, warning-700 5.02, success-700 5.48,
 *   error-600 4.83, neutral-600 7.56.
 */
const STYLE_PRESETS = {
  // Solid colored banner + white label.
  solidHeader: {
    tone: 'onSolid',
    headerBg: {
      primary: 'bg-primary-600',
      warning: 'bg-warning-700',
      success: 'bg-success-700',
      error: 'bg-error-600',
      neutral: 'bg-neutral-600',
    },
  },
  // Soft tinted header (-50) with an outline pill (border + colored text) so it reads as a distinct element.
  // Dark mode uses a translucent tint so the colored strip doesn't glow on the dark card.
  softBadge: { 
    tone: 'outline', 
    headerBg: {
      primary: 'bg-primary-50 dark:bg-primary-900/20',
      warning: 'bg-warning-50 dark:bg-warning-900/20',
      success: 'bg-success-50 dark:bg-success-900/20',
      error: 'bg-error-50 dark:bg-error-900/20',
      neutral: 'bg-neutral-50 dark:bg-neutral-900/20',
    } },
  // Transparent header, filled colored pill (white text).
  solidBadge: { tone: 'solid', headerBg: 'bg-transparent' },
};

/** Available card looks — pass one to resolveEventStatus. */
export const EVENT_STATUS_STYLES = Object.keys(STYLE_PRESETS);

/**
 * Resolve everything a card needs for a status under the chosen style:
 * `{ variant, labelKey, tone, headerBg }`. Falls back to SCHEDULED / softBadge.
 */
export const resolveEventStatus = (status, style = 'softBadge') => {
  const base = EVENT_STATUS[status] || EVENT_STATUS.SCHEDULED;
  const preset = STYLE_PRESETS[style] || STYLE_PRESETS.softBadge;
  const headerBg = typeof preset.headerBg === 'string'
    ? preset.headerBg
    : preset.headerBg[base.variant];
  return { ...base, tone: preset.tone, headerBg };
};
