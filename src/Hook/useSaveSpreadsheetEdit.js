import { useState, useCallback } from 'react';
import { getClient } from '../Api/amplifyClient.js';

const SAVE_DOCUMENT_EDIT = /* GraphQL */ `
  mutation SaveDocumentEdit(
    $eventId: String!
    $folderId: String!
    $documentPath: String!
  ) {
    saveDocumentEdit(
      eventId: $eventId
      folderId: $folderId
      documentPath: $documentPath
    ) {
      presignedUrl
      expiresIn
    }
  }
`;

/**
 * Hook to save an edited document (xlsx or csv) to S3 via the save-document-edit Lambda.
 *
 * Flow (ADR-021):
 *   1. Call `saveDocumentEdit` GraphQL mutation with (eventId, folderId, documentPath).
 *   2. Lambda verifies the user's role/folder ownership, then returns a short-lived
 *      pre-signed S3 PUT URL scoped to the exact documentPath.
 *   3. Frontend PUTs the payload blob to that URL.
 */
export const useSaveSpreadsheetEdit = () => {
  const [isSaving, setIsSaving] = useState(false);
  const [progress, setProgress] = useState(0);
  const [error, setError] = useState(null);

  /**
   * Save edited content to S3.
   * @param {Blob} blob - The payload to upload (xlsx buffer blob or csv text blob).
   * @param {string} contentType - Matching MIME type for the PUT Content-Type header.
   * @param {object} target - { eventId, folderId, documentPath }
   * @returns {Promise<boolean>}
   */
  const saveEdit = useCallback(async (blob, contentType, target) => {
    if (!blob) {
      throw new Error('Blob is required');
    }
    if (!contentType) {
      throw new Error('Content type is required');
    }
    const { eventId, folderId, documentPath } = target || {};
    if (!eventId || !folderId || !documentPath) {
      throw new Error('eventId, folderId and documentPath are required');
    }

    setIsSaving(true);
    setProgress(0);
    setError(null);

    try {
      setProgress(20);

      const response = await getClient().graphql({
        query: SAVE_DOCUMENT_EDIT,
        variables: { eventId, folderId, documentPath },
      });

      const result = response?.data?.saveDocumentEdit;
      const presignedUrl = result?.presignedUrl;
      if (!presignedUrl) {
        throw new Error('Server did not return a valid upload URL');
      }
      setProgress(40);

      const putResponse = await fetch(presignedUrl, {
        method: 'PUT',
        headers: { 'Content-Type': contentType },
        body: blob,
      });

      if (!putResponse.ok) {
        throw new Error(`S3 upload failed (${putResponse.status})`);
      }

      setProgress(100);
      return true;
    } catch (err) {
      console.error('[useSaveSpreadsheetEdit] Save error:', err);
      const message = err?.errors?.[0]?.message || err?.message || 'Failed to save document';
      setError(message);
      throw err;
    } finally {
      setIsSaving(false);
      setProgress(0);
    }
  }, []);

  const reset = useCallback(() => {
    setIsSaving(false);
    setProgress(0);
    setError(null);
  }, []);

  return {
    isSaving,
    progress,
    error,
    saveEdit,
    reset,
  };
};

export default useSaveSpreadsheetEdit;
