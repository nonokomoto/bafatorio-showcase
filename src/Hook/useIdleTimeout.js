import { useState, useEffect, useCallback, useRef } from 'react';
import { useSelector } from 'react-redux';
import { SESSION_CONFIG } from '../config/sessionConfig';

const {
  IDLE_TIMEOUT_MS,
  WARNING_DURATION_MS,
  ACTIVITY_EVENTS,
  THROTTLE_MS,
} = SESSION_CONFIG;

const useIdleTimeout = ({ onTimeout }) => {
  const isAuthenticated = useSelector((state) => state.user.isAuthenticated);
  const [isWarning, setIsWarning] = useState(false);
  const [remainingSeconds, setRemainingSeconds] = useState(
    Math.floor(WARNING_DURATION_MS / 1000)
  );

  const idleTimerRef = useRef(null);
  const countdownTimerRef = useRef(null);
  const isWarningRef = useRef(false);
  const hasTimedOutRef = useRef(false);
  const endTimeRef = useRef(null);

  const clearAllTimers = useCallback(() => {
    if (idleTimerRef.current) {
      clearTimeout(idleTimerRef.current);
      idleTimerRef.current = null;
    }
    if (countdownTimerRef.current) {
      clearInterval(countdownTimerRef.current);
      countdownTimerRef.current = null;
    }
  }, []);

  const startCountdown = useCallback(() => {
    const endTime = Date.now() + WARNING_DURATION_MS;
    endTimeRef.current = endTime;
    isWarningRef.current = true;
    hasTimedOutRef.current = false;
    setRemainingSeconds(Math.ceil(WARNING_DURATION_MS / 1000));
    setIsWarning(true);

    countdownTimerRef.current = setInterval(() => {
      const secondsLeft = Math.ceil((endTimeRef.current - Date.now()) / 1000);
      setRemainingSeconds(Math.max(0, secondsLeft));

      if (secondsLeft <= 0) {
        clearInterval(countdownTimerRef.current);
        countdownTimerRef.current = null;
        if (!hasTimedOutRef.current) {
          hasTimedOutRef.current = true;
          isWarningRef.current = false;
          setIsWarning(false);
          onTimeout();
        }
      }
    }, 500);
  }, [onTimeout]);

  const resetTimer = useCallback(() => {
    clearAllTimers();
    isWarningRef.current = false;
    hasTimedOutRef.current = false;
    setIsWarning(false);
    setRemainingSeconds(Math.floor(WARNING_DURATION_MS / 1000));

    idleTimerRef.current = setTimeout(() => {
      startCountdown();
    }, IDLE_TIMEOUT_MS);
  }, [clearAllTimers, startCountdown]);

  useEffect(() => {
    if (!isAuthenticated) {
      clearAllTimers();
      isWarningRef.current = false;
      setIsWarning(false);
      return;
    }

    resetTimer();

    let lastThrottledTime = 0;

    const handleActivity = () => {
      const now = Date.now();
      if (now - lastThrottledTime < THROTTLE_MS) return;
      lastThrottledTime = now;

      if (!isWarningRef.current) {
        resetTimer();
      }
    };

    ACTIVITY_EVENTS.forEach((event) => {
      document.addEventListener(event, handleActivity, { passive: true });
    });

    return () => {
      clearAllTimers();
      ACTIVITY_EVENTS.forEach((event) => {
        document.removeEventListener(event, handleActivity);
      });
    };
  }, [isAuthenticated, resetTimer, clearAllTimers]);

  return { isWarning, remainingSeconds, resetTimer };
};

export default useIdleTimeout;
