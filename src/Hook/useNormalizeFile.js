import { useState, useCallback } from 'react';
import { postFile } from '../Api/clients/bafatorioApiClient';

const ENDPOINT_BY_TYPE = {
  supplier: '/normalize/suppliers',
  participant: '/normalize/participants',
  'event-supplier': '/normalize/event-suppliers',
};

/**
 * Hook to normalize an Excel file via the api-bafatorio normalize endpoint.
 * Sends the file as multipart/form-data, returns normalized data with LLM column mapping.
 *
 * @param {'supplier' | 'participant' | 'event-supplier'} type - The schema type to normalize against
 * @returns {{ normalize, reset, data, errors, summary, columnMapping, isNormalizing, normalizeError }}
 */
export function useNormalizeFile(type) {
  const [result, setResult] = useState(null);
  const [isNormalizing, setIsNormalizing] = useState(false);
  const [normalizeError, setNormalizeError] = useState(null);

  const endpoint = ENDPOINT_BY_TYPE[type] ?? ENDPOINT_BY_TYPE.supplier;

  const normalize = useCallback(async (file) => {
    setIsNormalizing(true);
    setNormalizeError(null);
    setResult(null);

    try {
      const response = await postFile(endpoint, file);
      setResult(response);
      return response;
    } catch (err) {
      const message = err.message || 'Failed to normalize file';
      setNormalizeError(message);
      throw err;
    } finally {
      setIsNormalizing(false);
    }
  }, [endpoint]);

  const reset = useCallback(() => {
    setResult(null);
    setIsNormalizing(false);
    setNormalizeError(null);
  }, []);

  return {
    normalize,
    reset,
    data: result?.data ?? [],
    errors: result?.errors ?? [],
    summary: result?.summary ?? null,
    columnMapping: result?.columnMapping ?? null,
    isNormalizing,
    normalizeError,
  };
}
