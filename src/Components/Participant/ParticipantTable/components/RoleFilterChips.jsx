import { useRef, useState, useEffect, useCallback } from 'react';
import PropTypes from 'prop-types';
import { useTranslation } from 'react-i18next';
import { FiChevronLeft, FiChevronRight } from 'react-icons/fi';
import { getRoleStyle } from '../../roleBadgeConfig';

const RoleFilterChips = ({ roles, roleCounts, activeFilter, onFilterChange }) => {
  const { t } = useTranslation('participant');
  const scrollRef = useRef(null);
  const [canScrollLeft, setCanScrollLeft] = useState(false);
  const [canScrollRight, setCanScrollRight] = useState(false);

  const total = Object.values(roleCounts).reduce((sum, count) => sum + count, 0);

  const updateScrollState = useCallback(() => {
    const el = scrollRef.current;
    if (!el) return;
    const { scrollLeft, scrollWidth, clientWidth } = el;
    setCanScrollLeft(scrollLeft > 1);
    setCanScrollRight(scrollLeft + clientWidth < scrollWidth - 1);
  }, []);

  // Track overflow on mount, on scroll, and when the container is resized.
  useEffect(() => {
    const el = scrollRef.current;
    if (!el) return undefined;
    updateScrollState();
    el.addEventListener('scroll', updateScrollState, { passive: true });
    const observer = new ResizeObserver(updateScrollState);
    observer.observe(el);
    return () => {
      el.removeEventListener('scroll', updateScrollState);
      observer.disconnect();
    };
  }, [updateScrollState]);

  // Re-check when the set of roles/counts changes.
  useEffect(() => {
    updateScrollState();
  }, [roles, roleCounts, updateScrollState]);

  // Vertical wheel → horizontal scroll while hovering the chips (mouse users),
  // yielding back to the page once an edge is reached.
  useEffect(() => {
    const el = scrollRef.current;
    if (!el) return undefined;
    const onWheel = (e) => {
      if (el.scrollWidth <= el.clientWidth) return;
      if (Math.abs(e.deltaY) <= Math.abs(e.deltaX)) return;
      const atStart = el.scrollLeft <= 0;
      const atEnd = el.scrollLeft + el.clientWidth >= el.scrollWidth - 1;
      if ((e.deltaY < 0 && atStart) || (e.deltaY > 0 && atEnd)) return;
      e.preventDefault();
      el.scrollLeft += e.deltaY;
    };
    el.addEventListener('wheel', onWheel, { passive: false });
    return () => el.removeEventListener('wheel', onWheel);
  }, []);

  const scrollByAmount = (direction) => {
    const el = scrollRef.current;
    if (!el) return;
    el.scrollBy({ left: direction * Math.max(el.clientWidth * 0.7, 160), behavior: 'smooth' });
  };

  return (
    <div className="relative border-b border-border">
      {/* Left scroll affordance */}
      {canScrollLeft && (
        <>
          <div className="pointer-events-none absolute inset-y-0 left-0 z-[1] w-10 bg-gradient-to-r from-card to-transparent" />
          <button
            type="button"
            onClick={() => scrollByAmount(-1)}
            aria-label={t('participantsV2.roleFilter.scrollLeft', 'Ver roles anteriores')}
            className="absolute left-1 top-1/2 z-[2] flex h-6 w-6 -translate-y-1/2 items-center justify-center rounded-full border border-border bg-card text-muted-foreground shadow-sm transition-colors hover:text-foreground"
          >
            <FiChevronLeft className="h-4 w-4" />
          </button>
        </>
      )}

      <div
        ref={scrollRef}
        className="flex items-center gap-1.5 overflow-x-auto scrollbar-hide px-6 py-2.5"
      >
        {/* "Todos" chip */}
        <button
          onClick={() => onFilterChange(null)}
          className={`inline-flex items-center gap-1.5 px-3.5 py-1 rounded-full text-xs font-medium whitespace-nowrap flex-shrink-0 transition-colors ${
            activeFilter === null
              ? 'bg-primary text-primary-foreground'
              : 'bg-muted text-muted-foreground'
          }`}
        >
          {t('participantsV2.roleFilter.all', { count: total })}
        </button>

        {/* Role chips */}
        {roles
          .filter(role => (roleCounts[role.name] || 0) > 0)
          .map(role => {
            const isActive = activeFilter === role.name;
            const style = getRoleStyle(role.name, role.style ? { [role.name]: role.style } : undefined, role.color);
            const count = roleCounts[role.name] || 0;

            return (
              <button
                key={role.name}
                onClick={() => onFilterChange(isActive ? null : role.name)}
                aria-pressed={isActive}
                className={`inline-flex items-center gap-1.5 px-3.5 py-1 rounded-full border-2 text-xs font-semibold whitespace-nowrap flex-shrink-0 transition-colors ${
                  isActive ? '' : 'bg-card text-foreground'
                }`}
                style={
                  isActive
                    ? { backgroundColor: style.bg, borderColor: style.bg, color: style.text }
                    : { borderColor: style.bg }
                }
              >
                {role.name} ({count})
              </button>
            );
          })}
      </div>

      {/* Right scroll affordance */}
      {canScrollRight && (
        <>
          <div className="pointer-events-none absolute inset-y-0 right-0 z-[1] w-10 bg-gradient-to-l from-card to-transparent" />
          <button
            type="button"
            onClick={() => scrollByAmount(1)}
            aria-label={t('participantsV2.roleFilter.scrollRight', 'Ver mais roles')}
            className="absolute right-1 top-1/2 z-[2] flex h-6 w-6 -translate-y-1/2 items-center justify-center rounded-full border border-border bg-card text-muted-foreground shadow-sm transition-colors hover:text-foreground"
          >
            <FiChevronRight className="h-4 w-4" />
          </button>
        </>
      )}
    </div>
  );
};

RoleFilterChips.propTypes = {
  roles: PropTypes.arrayOf(
    PropTypes.shape({
      name: PropTypes.string.isRequired,
      style: PropTypes.object,
      color: PropTypes.string,
    })
  ).isRequired,
  roleCounts: PropTypes.object.isRequired,
  activeFilter: PropTypes.string,
  onFilterChange: PropTypes.func.isRequired,
};

export default RoleFilterChips;
