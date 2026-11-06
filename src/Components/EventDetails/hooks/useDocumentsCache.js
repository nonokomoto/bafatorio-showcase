import { useState, useCallback } from 'react';
import { differenceInMinutes } from 'date-fns';
import { uploadData, getUrl, remove, list, copy } from 'aws-amplify/storage';

const CACHE_KEY_PREFIX = 'event_docs_';
const CACHE_DURATION_MINUTES = 5;

// Helper to extract folder ID from document path
const extractFolderIdFromPath = (path, eventId) => {
  // Path format: event-documents/{eventId}/{folderId}/{fileName}
  // or: event-documents/{eventId}/{fileName} (root)
  const parts = path.split('/');
  const eventIdIndex = parts.findIndex(p => p === eventId);
  if (eventIdIndex !== -1 && parts.length > eventIdIndex + 2) {
    // Has folder
    return parts[eventIdIndex + 1];
  }
  return null; // Root level
};

export const useDocumentsCache = (eventId, currentFolderId = null) => {
  const [documents, setDocuments] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState(null);

  const getCacheKey = useCallback(() => {
    const folderSuffix = currentFolderId ? `_${currentFolderId}` : '_root';
    return `${CACHE_KEY_PREFIX}${eventId}${folderSuffix}`;
  }, [eventId, currentFolderId]);

  const getContentType = useCallback((extension) => {
    const contentTypes = {
      'pdf': 'application/pdf',
      'doc': 'application/msword',
      'docx': 'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
      'xls': 'application/vnd.ms-excel',
      'xlsx': 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
      'ppt': 'application/vnd.ms-powerpoint',
      'pptx': 'application/vnd.openxmlformats-officedocument.presentationml.presentation',
      'jpg': 'image/jpeg',
      'jpeg': 'image/jpeg',
      'png': 'image/png',
      'gif': 'image/gif',
      'txt': 'text/plain'
    };
    return contentTypes[extension] || 'application/octet-stream';
  }, []);

  const getFromCache = useCallback(() => {
    try {
      const cachedData = localStorage.getItem(getCacheKey());
      if (!cachedData) return null;

      const { documents, timestamp } = JSON.parse(cachedData);
      const minutesSinceCache = differenceInMinutes(new Date(), new Date(timestamp));

      if (minutesSinceCache >= CACHE_DURATION_MINUTES) return null;

      // Safety check: invalidate if any pre-signed URL has expired
      const now = new Date();
      const hasExpiredUrl = documents.some(doc => doc.expiresAt && new Date(doc.expiresAt) <= now);
      if (hasExpiredUrl) return null;

      return documents;
    } catch (error) {
      console.error('Cache reading error:', error);
      return null;
    }
  }, [getCacheKey]);

  const saveToCache = useCallback((documents) => {
    try {
      const cacheData = {
        documents,
        timestamp: new Date().toISOString()
      };
      localStorage.setItem(getCacheKey(), JSON.stringify(cacheData));
    } catch (error) {
      console.error('Cache writing error:', error);
    }
  }, [getCacheKey]);

  const invalidateCache = useCallback(() => {
    localStorage.removeItem(getCacheKey());
  }, [getCacheKey]);

  const fetchDocuments = useCallback(async (forceFetch = false) => {
    setIsLoading(true);
    setError(null);

    try {
      // Check cache first if not forcing fetch
      if (!forceFetch) {
        const cachedDocs = getFromCache();
        if (cachedDocs) {
          setDocuments(cachedDocs);
          setIsLoading(false);
          return;
        }
      }

      // Fetch from S3 - shared event-documents path (no identityId)
      const s3Path = currentFolderId
        ? `event-documents/${eventId}/${currentFolderId}/`
        : `event-documents/${eventId}/`;
      const result = await list({ path: s3Path });

      // Filter to only include files at the current level (not in subfolders)
      const filteredItems = result.items.filter(item => {
        const pathParts = item.path.split('/');
        const expectedDepth = currentFolderId ? 4 : 3; // event-documents/event/folder/file vs event-documents/event/file
        return pathParts.length === expectedDepth && !item.path.endsWith('/');
      });

      const documentsWithUrls = await Promise.all(filteredItems.map(async (item) => {
        const urlResult = await getUrl({ path: item.path });
        const fileExtension = item.path.split('.').pop().toLowerCase();
        const folderId = extractFolderIdFromPath(item.path, eventId);
        return {
          id: item.path,
          path: item.path,
          name: item.path.split('/').pop(),
          size: (item.size / 1024).toFixed(2) + ' KB',
          lastModified: new Date(item.lastModified).toISOString().split('T')[0],
          url: urlResult.url.toString(),
          expiresAt: urlResult.expiresAt,
          contentType: getContentType(fileExtension),
          folderId: folderId
        };
      }));

      saveToCache(documentsWithUrls);
      setDocuments(documentsWithUrls);
    } catch (err) {
      // O erro fica cru — a mensagem é do componente, que tem o t(). Uma string
      // PT hardcoded aqui não traduzia e não distinguia falha de pasta vazia.
      setError(err);
      setDocuments([]);
      console.error(err);
    } finally {
      setIsLoading(false);
    }
  }, [eventId, currentFolderId, getContentType, getFromCache, saveToCache]);

  const uploadDocument = useCallback(async (file, folderId = null) => {
    try {
      const fileExtension = file.name.split('.').pop().toLowerCase();
      const contentType = getContentType(fileExtension);
      const targetFolderId = folderId || currentFolderId;

      const uploadPath = targetFolderId
        ? `event-documents/${eventId}/${targetFolderId}/${file.name}`
        : `event-documents/${eventId}/${file.name}`;

      await uploadData({
        path: uploadPath,
        data: file,
        contentType: contentType
      }).result;

      invalidateCache();
      await fetchDocuments(true);
      return true;
    } catch (error) {
      console.error('Upload error:', error);
      return false;
    }
  }, [eventId, currentFolderId, getContentType, invalidateCache, fetchDocuments]);

  // Move document to a different folder
  const moveDocument = useCallback(async (documentPath, targetFolderId) => {
    try {
      const fileName = documentPath.split('/').pop();

      const newPath = targetFolderId
        ? `event-documents/${eventId}/${targetFolderId}/${fileName}`
        : `event-documents/${eventId}/${fileName}`;

      // Copy to new location
      await copy({
        source: { path: documentPath },
        destination: { path: newPath }
      });

      // Remove from old location
      await remove({ path: documentPath });

      invalidateCache();
      await fetchDocuments(true);
      return true;
    } catch (error) {
      console.error('Move error:', error);
      return false;
    }
  }, [eventId, invalidateCache, fetchDocuments]);

  // Renomear é um move dentro da mesma pasta: copy + remove no S3, como o
  // moveDocument. Nunca reescrever o ficheiro a partir de doc.url — essa URL é
  // assinada por 900s e um fetch a uma expirada devolve 403 com XML sem lançar,
  // pelo que o XML acabava gravado por cima e o original apagado a seguir.
  // O path novo constrói-se por segmentos: um replace() do nome antigo podia
  // acertar noutro segmento do path e interpreta $& no nome novo.
  const renameDocument = useCallback(async (oldPath, newName) => {
    try {
      const segments = oldPath.split('/');
      segments[segments.length - 1] = newName;
      const newPath = segments.join('/');
      if (newPath === oldPath) return true;

      await copy({
        source: { path: oldPath },
        destination: { path: newPath }
      });
      await remove({ path: oldPath });

      invalidateCache();
      await fetchDocuments(true);
      return true;
    } catch (error) {
      console.error('Rename error:', error);
      return false;
    }
  }, [invalidateCache, fetchDocuments]);

  const deleteDocument = useCallback(async (path) => {
    try {
      await remove({ path });
      invalidateCache();
      await fetchDocuments(true);
      return true;
    } catch (error) {
      console.error('Delete error:', error);
      return false;
    }
  }, [invalidateCache, fetchDocuments]);

  // Invalidate all folder caches for this event
  const invalidateAllFolderCaches = useCallback(() => {
    // Clear all cached folders for this event
    const keysToRemove = [];
    for (let i = 0; i < localStorage.length; i++) {
      const key = localStorage.key(i);
      if (key && key.startsWith(`${CACHE_KEY_PREFIX}${eventId}`)) {
        keysToRemove.push(key);
      }
    }
    keysToRemove.forEach(key => localStorage.removeItem(key));
  }, [eventId]);

  return {
    documents,
    isLoading,
    error,
    fetchDocuments,
    uploadDocument,
    deleteDocument,
    moveDocument,
    renameDocument,
    invalidateCache,
    invalidateAllFolderCaches,
    currentFolderId
  };
};