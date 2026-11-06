import { useEffect, useCallback, useRef } from 'react';

const useOutsideClick = (ref, onClickOutside) => {
  // Store the callback in a ref to prevent unnecessary re-renders
  const callbackRef = useRef(onClickOutside);

  // Update the callback ref when the callback changes
  useEffect(() => {
    callbackRef.current = onClickOutside;
  }, [onClickOutside]);

  // Memoize the event handler to prevent unnecessary re-creation
  const handleClickOutside = useCallback((event) => {
    if (ref.current && !ref.current.contains(event.target)) {
      callbackRef.current();
    }
  }, [ref]);

  useEffect(() => {
    // Add event listener with passive option for better performance
    document.addEventListener('mousedown', handleClickOutside, { passive: true });
    document.addEventListener('touchend', handleClickOutside, { passive: true });

    // Cleanup function to remove event listeners
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
      document.removeEventListener('touchend', handleClickOutside);
    };
  }, [handleClickOutside]);
};

export default useOutsideClick;
