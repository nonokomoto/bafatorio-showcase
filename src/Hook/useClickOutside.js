import { useEffect } from 'react';

// Calls handler when a mousedown occurs outside of ref.current.
// Stable across re-renders as long as ref and handler refs don't change.
export function useClickOutside(ref, handler) {
  useEffect(() => {
    const listener = (e) => {
      if (!ref.current || ref.current.contains(e.target)) return;
      handler(e);
    };
    document.addEventListener('mousedown', listener);
    return () => document.removeEventListener('mousedown', listener);
  }, [ref, handler]);
}
