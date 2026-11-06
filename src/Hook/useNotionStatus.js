import { useState, useEffect, useCallback } from 'react';
import { getClient } from '../Api/amplifyClient.js';

/**
 * Hook to check Notion integration status for the current user.
 * Uses Amplify model client to query NotionIntegration directly.
 */
export function useNotionStatus(userId) {
  const [isConnected, setIsConnected] = useState(false);
  const [workspaceName, setWorkspaceName] = useState(null);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    let cancelled = false;

    const doFetch = async () => {
      if (!userId) {
        setIsLoading(false);
        return;
      }
      setIsLoading(true);
      try {
        const { data } = await getClient().models.NotionIntegration.get(
          { id: userId },
          { selectionSet: ['id', 'workspaceName', 'workspaceId'] }
        );
        if (!cancelled) {
          setIsConnected(!!data);
          setWorkspaceName(data?.workspaceName || null);
        }
      } catch {
        if (!cancelled) {
          setIsConnected(false);
          setWorkspaceName(null);
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
      await getClient().models.NotionIntegration.delete({ id: userId });
      setIsConnected(false);
      setWorkspaceName(null);
    } catch (error) {
      console.error('[useNotionStatus] Disconnect error:', error);
      throw error;
    }
  }, [userId]);

  const refetch = useCallback(async () => {
    if (!userId) return;
    setIsLoading(true);
    try {
      const { data } = await getClient().models.NotionIntegration.get(
        { id: userId },
        { selectionSet: ['id', 'workspaceName', 'workspaceId'] }
      );
      setIsConnected(!!data);
      setWorkspaceName(data?.workspaceName || null);
    } catch {
      setIsConnected(false);
      setWorkspaceName(null);
    } finally {
      setIsLoading(false);
    }
  }, [userId]);

  return { isConnected, workspaceName, isLoading, disconnect, refetch };
}
