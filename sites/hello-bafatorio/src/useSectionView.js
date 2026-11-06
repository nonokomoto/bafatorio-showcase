import { useCallback, useEffect, useState } from 'react';

import { track } from './analytics.js';

// A section counts as seen once it reaches the middle half of the viewport.
// Deliberately not a fractional threshold: that measures the fraction of the
// *element*, so a section taller than the screen never reaches it (on mobile
// the features section is 2163px against a 687px viewport — 0.32 at best).
// Also separate from useReveal: that one skips observation under reduced
// motion, which would report every section at once.
const VIEW_MARGIN = '-25% 0px -25% 0px';

/**
 * Reports a `section_view` the first time the element enters the viewport.
 * @param {string} section name recorded in the event payload
 * @param {import('react').MutableRefObject<HTMLElement | null>} [forwardRef]
 *   ref the section already uses (e.g. useReveal), filled with the same node
 * @returns {(node: HTMLElement | null) => void} ref callback for the section
 */
export default function useSectionView(section, forwardRef) {
  const [node, setNode] = useState(null);

  const setRef = useCallback((element) => {
    setNode(element);
    if (forwardRef) forwardRef.current = element;
  }, [forwardRef]);

  useEffect(() => {
    if (!node) return undefined;

    const observer = new IntersectionObserver(
      ([entry]) => {
        if (!entry.isIntersecting) return;
        observer.disconnect();
        track('section_view', { section });
      },
      { threshold: 0, rootMargin: VIEW_MARGIN }
    );

    observer.observe(node);
    return () => observer.disconnect();
  }, [node, section]);

  return setRef;
}
