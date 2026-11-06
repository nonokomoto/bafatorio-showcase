import { memo } from 'react';
import PropTypes from 'prop-types';
import { motion, useReducedMotion } from 'framer-motion';

const DOT_COLOR = {
  approval: 'bg-warning-500',
  invite: 'bg-primary-400',
};

/**
 * Pill-style tab with icon, badge count and pending dot. The active pill
 * background is a shared-layout indicator (layoutId) that slides between tabs.
 * Follows WAI-ARIA tabs pattern with proper keyboard semantics.
 */
const EventTab = memo(({
  label,
  tabKey,
  isActive,
  icon: Icon,
  count,
  hasPending = false,
  pendingType = 'approval',
  pendingLabel = '',
  onClick,
}) => {
  const reduceMotion = useReducedMotion();

  const ariaLabel = [
    label,
    count > 0 ? `(${count})` : '',
    hasPending && pendingLabel ? `- ${pendingLabel}` : '',
  ].filter(Boolean).join(' ');

  return (
    <button
      type="button"
      role="tab"
      id={`tab-${tabKey}`}
      aria-selected={isActive}
      aria-controls={`tabpanel-${tabKey}`}
      aria-label={ariaLabel}
      tabIndex={isActive ? 0 : -1}
      onClick={onClick}
      className={`
        relative whitespace-nowrap py-2 px-3.5 rounded-lg
        font-medium text-sm
        focus:outline-none focus-visible:ring-2 focus-visible:ring-primary-500
        transition-colors duration-200 ease-in-out cursor-pointer
        ${isActive
          ? 'text-primary-600 dark:text-primary-400'
          : 'text-neutral-500 dark:text-neutral-400 hover:text-neutral-700 dark:hover:text-neutral-200'
        }
      `}
    >
      {/* Pill ativa — desliza entre tabs (shared layout). */}
      {isActive && (
        <motion.span
          layoutId="event-tab-indicator"
          className="absolute inset-0 rounded-lg bg-card shadow-sm"
          transition={reduceMotion ? { duration: 0 } : { type: 'spring', stiffness: 500, damping: 40 }}
          aria-hidden="true"
        />
      )}

      <span className="relative z-10 inline-flex items-center gap-2">
        {Icon && <Icon className="w-5 h-5 flex-shrink-0" aria-hidden="true" />}
        <span>{label}</span>

        {count > 0 && (
          <span
            className={`inline-flex items-center justify-center min-w-[1.25rem] h-5 px-1.5 rounded-full text-xs font-semibold ${
              isActive
                ? 'bg-primary-100 text-primary-700 dark:bg-primary-900/40 dark:text-primary-300'
                : 'bg-neutral-200 text-neutral-600 dark:bg-neutral-700 dark:text-neutral-300'
            }`}
            aria-hidden="true"
          >
            {count}
          </span>
        )}

        {hasPending && (
          <span
            className={`absolute -top-1 -right-2 w-2 h-2 rounded-full ring-2 ring-white dark:ring-background-800 ${
              DOT_COLOR[pendingType] || DOT_COLOR.approval
            }`}
            aria-hidden="true"
            title={pendingLabel}
          />
        )}
      </span>
    </button>
  );
});

EventTab.displayName = 'EventTab';

EventTab.propTypes = {
  label: PropTypes.string.isRequired,
  tabKey: PropTypes.string.isRequired,
  isActive: PropTypes.bool.isRequired,
  icon: PropTypes.elementType,
  count: PropTypes.number,
  hasPending: PropTypes.bool,
  pendingType: PropTypes.oneOf(['approval', 'invite']),
  pendingLabel: PropTypes.string,
  onClick: PropTypes.func.isRequired,
};

export default EventTab;
