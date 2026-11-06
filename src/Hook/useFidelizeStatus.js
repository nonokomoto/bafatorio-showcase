import { useState, useEffect, useCallback, useRef } from 'react';
import { getClient } from '../Api/amplifyClient.js';

// Simple in-memory cache to avoid querying on every mount
const statusCache = new Map();
const CACHE_TTL_MS = 5 * 60 * 1000; // 5 minutes

/**
 * Hook to check Fidelize integration status for the current user.
 * Uses Amplify model client to query FidelizeIntegration directly.
 * Caches results for 5 minutes to avoid redundant queries on remount.
 */
export function useFidelizeStatus(userId) {
  const [isConnected, setIsConnected] = useState(false);
  const [lastSyncAt, setLastSyncAt] = useState(null);
  const [isLoading, setIsLoading] = useState(true);
  const fetchedRef = useRef(false);

  useEffect(() => {
    let cancelled = false;
    fetchedRef.current = false;

    const doFetch = async () => {
      if (!userId) {
        setIsLoading(false);
        return;
      }

      // Check cache first
      const cached = statusCache.get(userId);
      if (cached && Date.now() - cached.timestamp < CACHE_TTL_MS) {
        setIsConnected(cached.isConnected);
        setLastSyncAt(cached.lastSyncAt);
        setIsLoading(false);
        fetchedRef.current = true;
        return;
      }

      setIsLoading(true);
      try {
        const { data } = await getClient().models.FidelizeIntegration.get(
          { id: userId },
          { selectionSet: ['id', 'isActive', 'lastSyncAt'] }
        );
        if (!cancelled) {
          const connected = !!data?.isActive;
          const sync = data?.lastSyncAt || null;
          setIsConnected(connected);
          setLastSyncAt(sync);
          statusCache.set(userId, { isConnected: connected, lastSyncAt: sync, timestamp: Date.now() });
          fetchedRef.current = true;
        }
      } catch {
        if (!cancelled) {
          setIsConnected(false);
          setLastSyncAt(null);
        }
      } finally {
        if (!cancelled) setIsLoading(false);
      }
    };

    doFetch();
    return () => { cancelled = true; };
  }, [userId]);

  const disconnect = useCallback(async () => {
    if (!userId) return;
    try {
      await getClient().models.FidelizeIntegration.delete({ id: userId });
      setIsConnected(false);
      setLastSyncAt(null);
      // Clear cache on disconnect
      statusCache.delete(userId);
    } catch (error) {
      console.error('[useFidelizeStatus] Disconnect error:', error);
      throw error;
    }
  }, [userId]);

  const refetch = useCallback(async () => {
    if (!userId) return;
    setIsLoading(true);
    try {
      const { data } = await getClient().models.FidelizeIntegration.get(
        { id: userId },
        { selectionSet: ['id', 'isActive', 'lastSyncAt'] }
      );
      const connected = !!data?.isActive;
      const sync = data?.lastSyncAt || null;
      setIsConnected(connected);
      setLastSyncAt(sync);
      // Update cache
      statusCache.set(userId, { isConnected: connected, lastSyncAt: sync, timestamp: Date.now() });
    } catch {
      setIsConnected(false);
      setLastSyncAt(null);
    } finally {
      setIsLoading(false);
    }
  }, [userId]);

  return { isConnected, lastSyncAt, isLoading, disconnect, refetch };
}
