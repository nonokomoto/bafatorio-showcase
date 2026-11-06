/**
 * @file PullToRefresh.jsx
 * @description Lightweight pull-to-refresh wrapper for mobile touch devices.
 * Shows a spinner when the user pulls down from the top of the container.
 */

import { useState, useRef, useCallback, memo } from 'react';
import PropTypes from 'prop-types';
import { FiRefreshCw } from 'react-icons/fi';

const PULL_THRESHOLD = 60; // px to trigger refresh
const MAX_PULL = 100; // max visual pull distance
const RESISTANCE = 0.4; // drag resistance factor

const PullToRefresh = ({ onRefresh, children, className = '' }) => {
  const [pullDistance, setPullDistance] = useState(0);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const touchStartY = useRef(0);
  const containerRef = useRef(null);
  const isPulling = useRef(false);

  const handleTouchStart = useCallback((e) => {
    if (isRefreshing) return;
    // Only start pull if at top of scroll
    const container = containerRef.current;
    if (!container || container.scrollTop > 0) return;
    touchStartY.current = e.touches[0].clientY;
    isPulling.current = true;
  }, [isRefreshing]);

  const handleTouchMove = useCallback((e) => {
    if (!isPulling.current || isRefreshing) return;

    const container = containerRef.current;
    if (!container || container.scrollTop > 0) {
      isPulling.current = false;
      setPullDistance(0);
      return;
    }

    const deltaY = e.touches[0].clientY - touchStartY.current;
    if (deltaY > 0) {
      const distance = Math.min(deltaY * RESISTANCE, MAX_PULL);
      setPullDistance(distance);
    } else {
      setPullDistance(0);
    }
  }, [isRefreshing]);

  const handleTouchEnd = useCallback(async () => {
    if (!isPulling.current) return;
    isPulling.current = false;

    if (pullDistance >= PULL_THRESHOLD && !isRefreshing && onRefresh) {
      setIsRefreshing(true);
      setPullDistance(PULL_THRESHOLD); // Hold at threshold during refresh
      try {
        await onRefresh();
      } catch {
        // Refresh error handled by caller
      } finally {
        setIsRefreshing(false);
        setPullDistance(0);
      }
    } else {
      setPullDistance(0);
    }
  }, [pullDistance, isRefreshing, onRefresh]);

  const showIndicator = pullDistance > 5 || isRefreshing;
  const indicatorProgress = Math.min(pullDistance / PULL_THRESHOLD, 1);
  const rotation = pullDistance * 3; // Rotate icon as user pulls

  return (
    <div
      ref={containerRef}
      className={`relative ${className}`}
      onTouchStart={handleTouchStart}
      onTouchMove={handleTouchMove}
      onTouchEnd={handleTouchEnd}
      style={{ overscrollBehavior: 'contain' }}
    >
      {/* Pull indicator */}
      <div
        className="flex items-center justify-center overflow-hidden transition-[height] duration-200 ease-out"
        style={{ height: showIndicator ? `${Math.max(pullDistance, isRefreshing ? 40 : 0)}px` : 0 }}
        aria-hidden="true"
      >
        <FiRefreshCw
          className={`w-5 h-5 text-primary-500 dark:text-primary-400 ${isRefreshing ? 'animate-spin' : ''}`}
          style={{
            opacity: indicatorProgress,
            transform: isRefreshing ? undefined : `rotate(${rotation}deg)`,
          }}
        />
      </div>

      {children}
    </div>
  );
};

PullToRefresh.propTypes = {
  onRefresh: PropTypes.func.isRequired,
  children: PropTypes.node.isRequired,
  className: PropTypes.string,
};

export default memo(PullToRefresh);
