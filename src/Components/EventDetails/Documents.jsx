// Import necessary dependencies and components
import { useState, useEffect, useCallback, useMemo, useRef } from 'react';
import PropTypes from 'prop-types';
import { useSelector, useDispatch } from 'react-redux';
import { remove, list } from 'aws-amplify/storage';
import { FaSearch, FaPlus, FaEdit, FaTrash, FaFolderPlus, FaFolder, FaCheck } from 'react-icons/fa';
import { FiX, FiUpload, FiLoader, FiFile, FiFilePlus, FiList, FiGrid, FiDownload, FiRefreshCw, FiAlertTriangle } from 'react-icons/fi';
import noDataImage from '../../assets/NoData.svg';
import 'animate.css';
import { useTranslation } from 'react-i18next';
import { useDocumentsCache } from './hooks/useDocumentsCache';
import { useAuthz, billingGateErrorKey } from '../../Hook/useAuthz';
import { Card, Text, Button, Badge } from '../UI';
import AlertPopup from '../Layout/AlertPopUp';
import {
  useListFoldersByEventIdQuery,
  useCreateFolderMutation,
  useUpdateFolderMutation,
  useDeleteFolderMutation
} from '../../Api/services/folderApi';
import { useListEventCollaboratorsQuery } from '../../Api/services/collaboratorApi';
import DocumentFolderList from './DocumentFolderList';
import DocumentFolderForm from './DocumentFolderForm';
import DocumentBreadcrumb from './DocumentBreadcrumb';
import NotionImportModal from './NotionImportModal';
import DocumentPreviewModal from './DocumentPreviewModal';
import { useNotionStatus } from '../../Hook/useNotionStatus';
import NotionSyncModal from './NotionSyncModal';
import { getFileIcon, getFileExtension, getFileTypeIcon, FILE_TYPE_COLORS, DEFAULT_FILE_COLOR } from './utils/fileUtils';
import { showToast } from '../../Redux/UI/toastSlice';

const NoDocumentsMessage = ({ currentFolderId, t, canManageDocuments, onAddDocument }) => (
  <div className="flex flex-col items-center justify-center py-12 px-4 animate__animated animate__fadeIn">
    <div className="relative">
      <img src={noDataImage} alt={t('eventDetails.documents.noDocuments.altText')} className="mx-auto w-32 opacity-90" />
      <div className="absolute -bottom-2 -right-2">
        <div className="bg-background-light dark:bg-neutral-700 p-2 rounded-full shadow-md">
          <FiFilePlus className="text-primary-500 text-xl" />
        </div>
      </div>
    </div>

    <Text
      variant="h5"
      className="mt-6 mb-2 text-center font-medium"
    >
      {currentFolderId
        ? t('eventDetails.documents.folders.emptyFolder')
        : t('eventDetails.documents.noDocuments.title')
      }
    </Text>

    <Text
      variant="body2"
      className="mb-6 text-center max-w-md text-muted-foreground"
    >
      {currentFolderId
        ? t('eventDetails.documents.folders.emptyFolderMessage')
        : t('eventDetails.documents.noDocuments.message')
      }
    </Text>

    {canManageDocuments && (
      <Button
        variant="soft"
        color="primary"
        size="sm"
        onClick={onAddDocument}
      >
        <span className="flex items-center">
          <FaPlus className="mr-1.5" />
          {t('eventDetails.documents.buttons.add')}
        </span>
      </Button>
    )}
  </div>
);

NoDocumentsMessage.propTypes = {
  currentFolderId: PropTypes.string,
  t: PropTypes.func.isRequired,
  canManageDocuments: PropTypes.bool.isRequired,
  onAddDocument: PropTypes.func.isRequired,
};

// Um list() falhado (credenciais expiradas, AccessDenied) não pode partilhar o
// ecrã de "pasta vazia" — são estados opostos e o utilizador não os distinguia.
const DocumentsErrorMessage = ({ t, onRetry }) => (
  <div className="flex flex-col items-center justify-center py-12 px-4">
    <div className="p-3 rounded-full bg-error-50 dark:bg-error-900/20 mb-4">
      <FiAlertTriangle className="text-error-500 text-2xl" />
    </div>
    <Text variant="body1" className="mb-4 text-center text-foreground font-medium">
      {t('eventDetails.documents.fetchError')}
    </Text>
    <Button variant="soft" color="primary" size="sm" onClick={onRetry}>
      <span className="flex items-center">
        <FiRefreshCw className="mr-1.5" />
        {t('eventDetails.documents.retry')}
      </span>
    </Button>
  </div>
);

DocumentsErrorMessage.propTypes = {
  t: PropTypes.func.isRequired,
  onRetry: PropTypes.func.isRequired,
};

const DocumentsSkeleton = () => (
  <div className="rounded-xl border border-border overflow-hidden">
    {[1, 2, 3].map((i) => (
      <div key={i} className="flex items-center gap-3 px-5 py-3.5 border-b border-border last:border-b-0">
        <div className="w-8 h-8 rounded-lg bg-muted animate-pulse flex-shrink-0" />
        <div className="h-3.5 w-1/3 rounded bg-muted animate-pulse" />
      </div>
    ))}
  </div>
);

// Maximum number of documents that can be uploaded at once
const MAX_DOCUMENTS = 5;
// Maximum file size in bytes (25 MB)
const MAX_FILE_SIZE_BYTES = 25 * 1024 * 1024;
const MAX_FILE_SIZE_LABEL = `${MAX_FILE_SIZE_BYTES / (1024 * 1024)} MB`;
// Allowed file extensions
const ALLOWED_EXTENSIONS = new Set([
  'pdf', 'doc', 'docx', 'xls', 'xlsx', 'ppt', 'pptx',
  'txt', 'csv', 'md', 'jpg', 'jpeg', 'png', 'gif',
  'pages', 'numbers', 'key',
]);

// Cache key prefix
const CACHE_KEY_PREFIX = 'event_docs_';

const invalidateCache = (eventId, folderId = null) => {
  const suffix = folderId ? `_${folderId}` : '_root';
  localStorage.removeItem(`${CACHE_KEY_PREFIX}${eventId}${suffix}`);
};

// EventDocuments component for managing event-related documents
const EventDocuments = ({ eventId, isOwner, isCoManager, isStaffLogistics, canManageDocuments: canManageDocumentsRole, sharedFolderIds }) => {
  // Gate cosmético do plano (§4b). Documentos e pastas saíram do gate no
  // ADR-038 — são Infinity nos três planos, portanto os contadores e o disable
  // abaixo não disparam hoje; ficam porque degradam sozinhos (Number.isFinite)
  // e voltam a valer se o teto regressar. Docs são S3 puro (sem mutation), logo
  // este é o único ponto de imposição do limite de docs E da janela para
  // upload/delete; o limite de pastas tem autoridade na Lambda createEventFolder.
  const { entitlements, writable, limit: authzLimit } = useAuthz(eventId);
  // RBAC ∧ entitlement: em evento read-only toda a UI de mutação sai
  // (botões, drag&drop, ações por item, edição inline no preview) — o
  // ReadOnlyBanner da página explica o motivo.
  const canManageDocuments = canManageDocumentsRole && writable;
  const { t } = useTranslation('event');

  // Get current user info for folder filtering + creator display
  const userId = useSelector((state) => state.user?.user?.sub);
  const currentUserName = useSelector((state) => state.user?.user?.name);
  const currentUserEmail = useSelector((state) => state.user?.user?.email);

  // Folder navigation state
  const [currentFolderId, setCurrentFolderId] = useState(null);
  const [folderPath, setFolderPath] = useState([]);

  // Ref to track if we're fetching counts to prevent loop
  const isFetchingCountsRef = useRef(false);

  const dispatch = useDispatch();

  // Modal states
  const [uploadError, setUploadError] = useState(null);
  const [isAddModalOpen, setIsAddModalOpen] = useState(false);
  const [isFolderModalOpen, setIsFolderModalOpen] = useState(false);
  const [editingFolder, setEditingFolder] = useState(null);
  const [files, setFiles] = useState([]);
  const [uploading, setUploading] = useState(false);
  const [uploadProgress, setUploadProgress] = useState(0);
  const [dragActive, setDragActive] = useState(false);
  const [showAlert, setShowAlert] = useState(false);
  const [alertConfig, setAlertConfig] = useState({});

  // Notion import state
  const [isNotionImportOpen, setIsNotionImportOpen] = useState(false);
  const { isConnected: isNotionConnected } = useNotionStatus(userId);

  // Document preview state
  const [previewDoc, setPreviewDoc] = useState(null);

  // View mode state (grid/list)
  const [viewMode, setViewMode] = useState(() => localStorage.getItem('docs_view_mode') || 'list');

  // Document editing state
  const [searchTerm, setSearchTerm] = useState('');
  const [newDocumentNames, setNewDocumentNames] = useState({});
  const [editingDocument, setEditingDocument] = useState(null);

  // Upload folder picker state
  const [selectedUploadFolderId, setSelectedUploadFolderId] = useState(null);

  // Folder confirmation state
  const [folderToDelete, setFolderToDelete] = useState(null);
  const [showDeleteFolderAlert, setShowDeleteFolderAlert] = useState(false);
  const [isDeletingFolderFull, setIsDeletingFolderFull] = useState(false);
  const [deletingDocId, setDeletingDocId] = useState(null);

  // Documents cache hook with current folder
  const {
    documents,
    isLoading: isDocumentsLoading,
    error: documentsError,
    fetchDocuments,
    uploadDocument,
    renameDocument,
    invalidateAllFolderCaches
  } = useDocumentsCache(eventId, currentFolderId);

  // RTK Query hooks for folders
  const {
    data: foldersData,
    isLoading: isFoldersLoading,
    refetch: refetchFolders
  } = useListFoldersByEventIdQuery(
    { eventId },
    { skip: !eventId }
  );

  const [createFolder, { isLoading: isCreatingFolder }] = useCreateFolderMutation();
  const [updateFolder, { isLoading: isUpdatingFolder }] = useUpdateFolderMutation();
  const [deleteFolder] = useDeleteFolderMutation();

  const folders = useMemo(() => foldersData?.items || [], [foldersData]);
  // Contador do limite de pastas (a default do sistema não consome slot —
  // mesma regra da Lambda createEventFolder). Fiável SÓ para o owner: a lista
  // vem filtrada por visibilidade para colaboradores, mas a Lambda conta TODAS
  // as pastas do evento — um co-manager veria "1/2" com o evento cheio. Para
  // não-owners, fail-open (§4b): sem contador nem disable; o servidor decide.
  const nonDefaultFolderCount = folders.filter((f) => !f.isDefault).length;
  const folderLimit = isOwner
    ? authzLimit('folders', nonDefaultFolderCount)
    : { max: Infinity, remaining: Infinity, reached: false };

  // Fetch collaborators to build folder sharing info (only for Owner/Co-Manager)
  const { data: collaborators = [] } = useListEventCollaboratorsQuery(
    { eventId },
    { skip: !eventId || (!isOwner && !isCoManager) }
  );

  // Build a map: folderId -> [{ userEmail, userName }] of people with access
  const folderSharingMap = useMemo(() => {
    if (!collaborators.length) return {};
    const map = {};
    collaborators.forEach((collab) => {
      if (!collab.sharedFolderIds?.length) return;
      collab.sharedFolderIds.forEach((folderId) => {
        if (!map[folderId]) map[folderId] = [];
        map[folderId].push({
          userEmail: collab.userEmail,
          userName: collab.userName,
        });
      });
    });
    return map;
  }, [collaborators]);

  // Build a map: userId -> { userName, userEmail } for folder creator display
  const folderOwnerMap = useMemo(() => {
    const map = {};
    // Include current user (event owner may not be in collaborators list)
    if (userId) {
      map[userId] = { userName: currentUserName, userEmail: currentUserEmail };
    }
    collaborators.forEach((collab) => {
      if (collab.userId) {
        map[collab.userId] = {
          userName: collab.userName,
          userEmail: collab.userEmail,
        };
      }
    });
    return map;
  }, [collaborators, userId, currentUserName, currentUserEmail]);

  // Get current folder object
  const currentFolder = useMemo(() => {
    if (!currentFolderId) return null;
    return folders.find(f => f.id === currentFolderId) || null;
  }, [currentFolderId, folders]);

  // Filter folders for current level based on role permissions (ACCESS_LEVELS_STRATEGY.md)
  // - OWNER: sees ALL folders
  // - CO_MANAGER: sees own folders + shared folders (defense-in-depth, Lambda also filters)
  // - STAFF_LOGISTICS: sees own folders + shared folders
  // - STAFF_CHECKIN: no folder access (handled at route level)
  // NOTE: The Lambda already filters by role, so frontend filtering is a second layer of defense.
  const currentLevelFolders = useMemo(() => {
    const rootFolders = folders.filter(f => !f.parentFolderId);

    // Owner sees all folders
    if (isOwner) {
      return rootFolders;
    }

    // Co-Manager sees own folders + shared folders (same filter as Staff Logistics)
    if (isCoManager && userId) {
      return rootFolders.filter(folder => {
        const normalizedOwner = folder.owner ? folder.owner.split('::')[0] : '';
        const isOwnFolder = normalizedOwner === userId;
        const isSharedFolder = sharedFolderIds?.includes(folder.id);
        return isOwnFolder || isSharedFolder;
      });
    }

    // Staff Logistics sees own folders + shared folders
    if (isStaffLogistics && userId) {
      return rootFolders.filter(folder => {
        const normalizedOwner = folder.owner ? folder.owner.split('::')[0] : '';
        const isOwnFolder = normalizedOwner === userId;
        const isSharedFolder = sharedFolderIds?.includes(folder.id);
        return isOwnFolder || isSharedFolder;
      });
    }

    // Default: return empty (no access)
    return [];
  }, [folders, isOwner, isCoManager, isStaffLogistics, userId, sharedFolderIds]);

  // Document counts per folder - cached in localStorage to avoid flash on tab switch
  const countsKey = `folder_counts_${eventId}`;
  const [documentCounts, setDocumentCounts] = useState(() => {
    try {
      const cached = localStorage.getItem(countsKey);
      return cached ? JSON.parse(cached) : {};
    } catch {
      return {};
    }
  });

  // Function to fetch document counts for all folders
  const fetchFolderDocumentCounts = useCallback(async (foldersToCount) => {
    if (!eventId || foldersToCount.length === 0) {
      // Only update if counts are not already empty (prevents infinite loop)
      setDocumentCounts(prev => Object.keys(prev).length === 0 ? prev : {});
      return;
    }

    // Prevent concurrent fetches
    if (isFetchingCountsRef.current) {
      return;
    }

    isFetchingCountsRef.current = true;

    try {
      const counts = {};

      // Fetch document count for each folder in parallel
      await Promise.all(
        foldersToCount.map(async (folder) => {
          try {
            const result = await list({
              path: `event-documents/${eventId}/${folder.id}/`,
            });

            // Count only files at this level (depth 4: event-documents/event/folder/file)
            const fileCount = result.items.filter(item => {
              const pathParts = item.path.split('/');
              return pathParts.length === 4 && !item.path.endsWith('/');
            }).length;

            counts[folder.id] = fileCount;
          } catch (err) {
            console.error(`Error fetching count for folder ${folder.id}:`, err);
            counts[folder.id] = 0;
          }
        })
      );

      setDocumentCounts(counts);
      try { localStorage.setItem(countsKey, JSON.stringify(counts)); } catch { /* localStorage unavailable (e.g. private mode) — counts caching is best-effort */ }
    } catch (err) {
      console.error('Error fetching folder document counts:', err);
    } finally {
      isFetchingCountsRef.current = false;
    }
  }, [eventId, countsKey]);

  // Fetch folder document counts when folders change (using folder IDs to prevent unnecessary reruns)
  const folderIds = useMemo(() => currentLevelFolders.map(f => f.id).join(','), [currentLevelFolders]);

  useEffect(() => {
    if (currentLevelFolders.length > 0) {
      fetchFolderDocumentCounts(currentLevelFolders);
    }
  }, [folderIds, fetchFolderDocumentCounts, currentLevelFolders]); // folderIds dedupes reruns; currentLevelFolders is memoized (see line 236) so this doesn't loop

  // Fetch documents when the component mounts or folder changes
  // Force fetch (skip cache) so users always see fresh data on folder entry
  useEffect(() => {
    fetchDocuments(true);
  }, [eventId, currentFolderId, fetchDocuments]);

  // Navigate to folder
  const handleOpenFolder = useCallback((folder) => {
    setCurrentFolderId(folder.id);
    setFolderPath(prev => [...prev, folder]);
    setSearchTerm('');
  }, []);

  // Navigate via breadcrumb
  const handleBreadcrumbNavigate = useCallback((folderId) => {
    if (folderId === null) {
      // Go to root
      setCurrentFolderId(null);
      setFolderPath([]);
    } else {
      // Find folder in path and truncate
      const folderIndex = folderPath.findIndex(f => f.id === folderId);
      if (folderIndex !== -1) {
        setCurrentFolderId(folderId);
        setFolderPath(folderPath.slice(0, folderIndex + 1));
      }
    }
    setSearchTerm('');
  }, [folderPath]);

  // Create folder handler (Lambda-backed — no id/createdAt/updatedAt needed)
  const handleCreateFolder = useCallback(async (folderData) => {
    try {
      const createdFolder = await createFolder({
        eventId,
        name: folderData.name,
        description: folderData.description,
        color: folderData.color,
        order: folders.length,
        parentFolderId: currentFolderId,
      }).unwrap();

      dispatch(showToast({ message: t('eventDetails.documents.folders.createSuccess'), variant: 'success' }));
      setIsFolderModalOpen(false);
      refetchFolders();

      // Auto-select the newly created folder if upload modal is open
      if (isAddModalOpen && createdFolder?.id) {
        setSelectedUploadFolderId(createdFolder.id);
      }
    } catch (err) {
      console.error('Error creating folder:', err);
      dispatch(showToast({ message: t(billingGateErrorKey(err, 'eventDetails.documents.folders.createError')), variant: 'error' }));
    }
  }, [createFolder, eventId, currentFolderId, folders.length, refetchFolders, isAddModalOpen, dispatch, t]);

  // Update folder handler (Lambda-backed — no updatedAt needed)
  const handleUpdateFolder = useCallback(async (folderData) => {
    try {
      await updateFolder({
        id: folderData.id,
        eventId,
        name: folderData.name,
        description: folderData.description,
        color: folderData.color,
      }).unwrap();

      dispatch(showToast({ message: t('eventDetails.documents.folders.updateSuccess'), variant: 'success' }));
      setIsFolderModalOpen(false);
      setEditingFolder(null);
      refetchFolders();
    } catch (err) {
      console.error('Error updating folder:', err);
      dispatch(showToast({ message: t(billingGateErrorKey(err, 'eventDetails.documents.folders.updateError')), variant: 'error' }));
    }
  }, [updateFolder, eventId, refetchFolders, dispatch, t]);

  // Delete folder handler
  const handleDeleteFolder = useCallback(async (folder) => {
    setFolderToDelete(folder);
    setShowDeleteFolderAlert(true);
  }, []);

  const confirmDeleteFolder = useCallback(async () => {
    if (!folderToDelete) return;
    setIsDeletingFolderFull(true);

    try {
      // 1. A Lambda decide primeiro: valida papel, pasta default e janela de
      // billing, e só depois apaga o registo. Apagar o S3 antes disto destruía
      // os documentos mesmo quando a Lambda rejeitava — a pasta sobrevivia
      // vazia e os ficheiros já não existiam.
      await deleteFolder({
        id: folderToDelete.id,
        eventId
      }).unwrap();

      // 2. Só agora o S3, que a Lambda não toca. O registo já não existe, por
      // isso uma falha aqui deixa ficheiros órfãos (invisíveis, mas contam para
      // o limite de documentos do plano) — daí o aviso em vez de silêncio.
      let cleanupFailed = false;
      try {
        const folderFiles = await list({
          path: `event-documents/${eventId}/${folderToDelete.id}/`,
        });
        if (folderFiles.items?.length > 0) {
          await Promise.all(
            folderFiles.items.map((file) => remove({ path: file.path }))
          );
        }
      } catch (cleanupErr) {
        cleanupFailed = true;
        console.error('Error deleting folder files from S3:', cleanupErr);
      }

      // If we're inside the deleted folder, go back to root
      if (currentFolderId === folderToDelete.id) {
        setCurrentFolderId(null);
        setFolderPath([]);
      }

      invalidateAllFolderCaches();
      await refetchFolders();
      setShowDeleteFolderAlert(false);
      setFolderToDelete(null);
      dispatch(showToast(
        cleanupFailed
          ? { message: t('eventDetails.documents.folders.deletePartial'), variant: 'warning' }
          : { message: t('eventDetails.documents.folders.deleteSuccess'), variant: 'success' }
      ));
    } catch (err) {
      console.error('Error deleting folder:', err);
      dispatch(showToast({ message: t(billingGateErrorKey(err, 'eventDetails.documents.folders.deleteError')), variant: 'error' }));
    } finally {
      setIsDeletingFolderFull(false);
    }
  }, [folderToDelete, deleteFolder, eventId, currentFolderId, invalidateAllFolderCaches, refetchFolders, dispatch, t]);

  // Edit folder handler
  const handleEditFolder = useCallback((folder) => {
    setEditingFolder(folder);
    setIsFolderModalOpen(true);
  }, []);

  // Folder form submit handler
  const handleFolderFormSubmit = useCallback((folderData) => {
    if (editingFolder) {
      handleUpdateFolder(folderData);
    } else {
      handleCreateFolder(folderData);
    }
  }, [editingFolder, handleUpdateFolder, handleCreateFolder]);

  // Close folder modal
  const handleCloseFolderModal = useCallback(() => {
    setIsFolderModalOpen(false);
    setEditingFolder(null);
  }, []);

  // Function to handle adding new documents
  const handleAddDocuments = async () => {
    if (!canManageDocuments) return;
    if (!writable) return;
    if (Number.isFinite(entitlements.documents)) {
      // Contagem fresca e completa no momento da decisão — documentCounts só
      // cobre as pastas do nível navegado e nunca a raiz, portanto subcontava
      // e deixava passar do limite. Docs = raiz (depth 3) e pastas (depth 4);
      // fora ficam participant-photos e os assets de imagem do Notion (depth 5).
      try {
        const { items } = await list({
          path: `event-documents/${eventId}/`,
          options: { listAll: true },
        });
        const totalDocs = items.filter((item) => {
          if (item.path.endsWith('/')) return false;
          const parts = item.path.split('/');
          if (parts[2] === 'participant-photos') return false;
          return parts.length === 3 || parts.length === 4;
        }).length;
        if (totalDocs + files.length > entitlements.documents) {
          setUploadError(t('eventDetails.documents.add.planLimitMessage', { max: entitlements.documents }));
          return;
        }
      } catch (err) {
        // Gate cosmético fail-open (§4b): um LIST falhado não bloqueia o upload.
        console.error('Doc limit count failed:', err);
      }
    }
    if (files.length > 0 && files.length <= MAX_DOCUMENTS) {
      setUploading(true);
      setUploadProgress(0);

      try {
        // Use selected folder from picker, fall back to current folder or default
        const targetFolderId = selectedUploadFolderId || currentFolderId;
        if (!targetFolderId) {
          dispatch(showToast({ message: t('eventDetails.documents.folders.createError'), variant: 'error' }));
          setUploading(false);
          return;
        }
        // uploadDocument apanha os próprios erros e devolve false — sem contar
        // as falhas, um upload falhado saía daqui com toast de sucesso.
        const failed = [];
        for (let i = 0; i < files.length; i++) {
          const uploaded = await uploadDocument(files[i], targetFolderId);
          if (!uploaded) failed.push(files[i].name);
          setUploadProgress(((i + 1) / files.length) * 100);
        }

        if (failed.length > 0) {
          // Modal fica aberto: o utilizador vê o que falhou e pode repetir.
          dispatch(showToast({
            message: t('eventDetails.documents.add.partialError', { files: failed.join(', ') }),
            variant: 'error'
          }));
        } else {
          dispatch(showToast({ message: t('eventDetails.documents.add.success', { count: files.length }), variant: 'success' }));
          setIsAddModalOpen(false);
          setFiles([]);
        }
        invalidateCache(eventId, targetFolderId);
        fetchDocuments();
        // Update folder document counts after upload
        fetchFolderDocumentCounts(currentLevelFolders);
      } catch (err) {
        dispatch(showToast({ message: t('eventDetails.documents.add.error'), variant: 'error' }));
      } finally {
        setUploading(false);
        setUploadProgress(0);
      }
    }
  };

  // Function to handle file selection
  const handleFileSelection = (e) => {
    const selectedFiles = Array.from(e.target.files || e.dataTransfer?.files || []);
    console.log('[Documents] handleFileSelection — source:', e.target.files ? 'input' : 'drop');
    console.log('[Documents] selectedFiles count:', selectedFiles.length);
    selectedFiles.forEach((f, i) => {
      const ext = f.name.split('.').pop()?.toLowerCase();
      console.log(`[Documents] file[${i}]:`, { name: f.name, ext, type: f.type, size: f.size, allowed: ALLOWED_EXTENSIONS.has(ext) });
    });

    if (selectedFiles.length > MAX_DOCUMENTS) {
      setUploadError(t('eventDetails.documents.add.maxMessage', { max: MAX_DOCUMENTS }));
      setFiles([]);
      return;
    }

    // Validate file size and type
    const oversized = selectedFiles.filter(f => f.size > MAX_FILE_SIZE_BYTES);
    if (oversized.length > 0) {
      setUploadError(t('eventDetails.documents.add.fileTooLarge', {
        maxFileSize: MAX_FILE_SIZE_LABEL,
        name: oversized[0].name,
      }));
      setFiles([]);
      return;
    }

    const invalidType = selectedFiles.filter(f => {
      const ext = f.name.split('.').pop()?.toLowerCase();
      return !ext || !ALLOWED_EXTENSIONS.has(ext);
    });
    if (invalidType.length > 0) {
      console.warn('[Documents] REJECTED file:', invalidType[0].name, '— ext:', invalidType[0].name.split('.').pop()?.toLowerCase());
      setUploadError(t('eventDetails.documents.add.invalidType', { name: invalidType[0].name }));
      setFiles([]);
      return;
    }

    setFiles(selectedFiles);
    setUploadError(null);
  };

  // Drag & Drop handlers
  const handleDrag = (e) => {
    e.preventDefault();
    e.stopPropagation();

    if (e.type === "dragenter" || e.type === "dragover") {
      setDragActive(true);
    } else if (e.type === "dragleave") {
      setDragActive(false);
    }
  };

  const handleDrop = (e) => {
    e.preventDefault();
    e.stopPropagation();
    setDragActive(false);
    handleFileSelection(e);
  };

  const handleViewModeChange = useCallback((mode) => {
    setViewMode(mode);
    localStorage.setItem('docs_view_mode', mode);
  }, []);

  // Function to handle editing a document
  const handleEditDocument = (doc) => {
    if (!canManageDocumentsInFolder) return;
    setEditingDocument(doc);
    setNewDocumentNames({ [doc.name]: doc.name });
    setIsAddModalOpen(true);
  };

  // Function to save edited document
  const handleSaveEdit = async () => {
    if (!canManageDocumentsInFolder) return;
    if (!editingDocument) return;

    const newName = newDocumentNames[editingDocument.name]?.trim();

    if (!newName || newName === editingDocument.name) {
      dispatch(showToast({ message: t('eventDetails.documents.edit.noChange'), variant: 'info' }));
      setEditingDocument(null);
      setNewDocumentNames({});
      setIsAddModalOpen(false);
      return;
    }

    setUploading(true);
    // O rename (copy + remove no S3) já invalida a cache e refaz a listagem.
    const renamed = await renameDocument(editingDocument.id, newName);
    setUploading(false);

    dispatch(showToast(
      renamed
        ? { message: t('eventDetails.documents.edit.success'), variant: 'success' }
        : { message: t('eventDetails.documents.edit.error'), variant: 'error' }
    ));

    if (renamed) {
      setEditingDocument(null);
      setNewDocumentNames({});
      setIsAddModalOpen(false);
    }
  };

  // Function to delete a document
  const handleDeleteDocument = async (path) => {
    if (!canManageDocumentsInFolder) return;
    setDeletingDocId(path);
    try {
      await remove({ path });
      invalidateCache(eventId, currentFolderId);
      fetchDocuments();
      dispatch(showToast({ message: t('eventDetails.documents.delete.success'), variant: 'success' }));
      if (currentFolderId) {
        fetchFolderDocumentCounts(currentLevelFolders);
      }
    } catch (err) {
      dispatch(showToast({ message: t('eventDetails.documents.delete.error'), variant: 'error' }));
    } finally {
      setDeletingDocId(null);
    }
  };

  // Notion sync modal state
  const [isNotionSyncOpen, setIsNotionSyncOpen] = useState(false);

  const handleSyncComplete = useCallback(() => {
    invalidateAllFolderCaches();
    fetchDocuments(true);
  }, [invalidateAllFolderCaches, fetchDocuments]);

  const handleOpenAddModal = useCallback(() => {
    // Require at least one folder before uploading documents
    if (currentLevelFolders.length === 0 && !currentFolderId) {
      setAlertConfig({
        title: t('eventDetails.documents.folders.noFoldersTitle'),
        message: t('eventDetails.documents.folders.noFoldersMessage'),
        confirmText: t('eventDetails.documents.folders.addFolder'),
        cancelText: t('eventDetails.documents.buttons.cancel'),
        isConfirmation: true
      });
      setShowAlert(true);
      return;
    }

    setIsAddModalOpen(true);
    setEditingDocument(null);
    setSelectedUploadFolderId(currentFolderId || null);
    setUploadError(null);
  }, [currentLevelFolders.length, currentFolderId, t]);

  const handleAddOrSave = () => {
    if (editingDocument) {
      handleSaveEdit();
      return;
    }

    handleAddDocuments();
  };

  const handleAlertClose = (confirmed) => {
    setShowAlert(false);
    if (confirmed) {
      setEditingFolder(null);
      setIsFolderModalOpen(true);
    }
  };

  // Determine if the user can edit/delete documents inside the current folder.
  // OWNER can always manage. CO_MANAGER / STAFF_LOGISTICS can only manage docs
  // in folders they own — not in shared folders belonging to other users.
  const canManageDocumentsInFolder = useMemo(() => {
    if (!canManageDocuments) return false;
    if (isOwner) return true;
    if (!currentFolder) return isOwner; // root level — only owner manages loose docs
    const normalizedOwner = currentFolder.owner ? currentFolder.owner.split('::')[0] : '';
    return normalizedOwner === userId;
  }, [canManageDocuments, isOwner, currentFolder, userId]);

  // Filter documents based on search term
  const filteredDocuments = documents.filter(doc =>
    doc.name.toLowerCase().includes(searchTerm.toLowerCase())
  );


  // Calculate totals for display
  const totalItems = documents.length + (currentFolderId ? 0 : currentLevelFolders.length);

  return (
    <>
      <Card
        variant="default"
        padded="lg"
        className={`w-full animate-fade-in relative ${
          dragActive ? 'ring-2 ring-primary-500/40 ring-offset-2 dark:ring-offset-neutral-900' : ''
        }`}
        elevated
        onDragEnter={(e) => { e.preventDefault(); e.stopPropagation(); if (canManageDocuments) handleDrag(e); }}
        onDragOver={(e) => { e.preventDefault(); e.stopPropagation(); if (canManageDocuments) handleDrag(e); }}
        onDragLeave={(e) => { e.preventDefault(); e.stopPropagation(); if (canManageDocuments) handleDrag(e); }}
        onDrop={(e) => {
          e.preventDefault();
          e.stopPropagation();
          if (!canManageDocuments) return;
          handleDrop(e);
          if (!isAddModalOpen) {
            handleOpenAddModal();
          }
        }}
      >
        {/* Drag overlay */}
        {dragActive && (
          <div
            className="absolute inset-0 z-10 flex flex-col items-center justify-center
              bg-primary-50/80 dark:bg-primary-950/80 backdrop-blur-sm
              border-2 border-dashed border-primary-400 dark:border-primary-500
              rounded-xl pointer-events-none"
            aria-hidden="true"
          >
            <FiUpload className="w-10 h-10 text-primary-500 dark:text-primary-400 mb-3" />
            <Text variant="body1" className="font-medium text-primary-700 dark:text-primary-300">
              {t('eventDetails.documents.upload.dropHere', 'Drop files here')}
            </Text>
            <Text variant="caption" className="text-primary-500 dark:text-primary-400 mt-1">
              {t('eventDetails.documents.upload.limits', {
                maxDocuments: MAX_DOCUMENTS,
                maxFileSize: MAX_FILE_SIZE_LABEL,
              })}
            </Text>
          </div>
        )}

        {/* Header with title and buttons */}
        <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 mb-7">
          <div className="flex items-center">
            <Text
              variant="h5"
              className="font-medium"
            >
              {t('eventDetails.documents.title')}
            </Text>

            {totalItems > 0 && (
              <Badge color="primary" tone="light" className="ml-3">
                {totalItems}
              </Badge>
            )}
          </div>

          {/* Only show action buttons if user can manage documents */}
          {canManageDocuments && (
            <div className="flex gap-2">
              {/* Add folder button - only show at root level */}
              {!currentFolderId && (
                <Button
                  variant="ghost"
                  color="primary"
                  size="sm"
                  disabled={folderLimit.reached}
                  onClick={() => {
                    setEditingFolder(null);
                    setIsFolderModalOpen(true);
                  }}
                >
                  <span className="flex items-center">
                    <FaFolderPlus className="text-sm mr-1.5" />
                    {t('eventDetails.documents.folders.addFolder')}
                    {Number.isFinite(folderLimit.max) && (
                      <span className="ml-1.5 text-[11px] opacity-80">
                        {nonDefaultFolderCount}/{folderLimit.max}
                      </span>
                    )}
                  </span>
                </Button>
              )}

              {isNotionConnected && entitlements.integrations && (
                <Button
                  variant="ghost"
                  color="primary"
                  size="sm"
                  onClick={() => setIsNotionImportOpen(true)}
                >
                  <span className="flex items-center">
                    <FiDownload className="text-sm mr-1.5" />
                    {t('eventDetails.notion.importFromNotion')}
                  </span>
                </Button>
              )}

              <Button
                id="fab-action-documents"
                variant="primary"
                size="sm"
                onClick={() => handleOpenAddModal()}
              >
                <span className="flex items-center">
                  <FaPlus className="text-sm mr-1.5" />
                  {t('eventDetails.documents.buttons.add')}
                </span>
              </Button>
            </div>
          )}
        </div>

        {/* Breadcrumb navigation */}
        <DocumentBreadcrumb
          folderPath={folderPath}
          currentFolder={currentFolder}
          onNavigate={handleBreadcrumbNavigate}
        />

        {/* Search bar + view toggle */}
        {(currentFolderId || documents.length > 0 || currentLevelFolders.length > 0) && (
          <div className="flex items-center gap-3 mb-7">
            {/* Search input */}
            <div className="relative flex-1 max-w-md">
              <input
                type="text"
                placeholder={t('eventDetails.documents.search.placeholder')}
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="w-full pl-10 pr-4 py-2.5 bg-background dark:bg-neutral-800 border border-border rounded-lg
                  focus:ring-2 focus:ring-primary/40 focus:border-primary
                  focus:outline-none transition-all duration-200
                  font-sans text-base text-foreground placeholder:text-text-400"
              />
              <FaSearch className="absolute left-3 top-1/2 transform -translate-y-1/2 text-text-400" />
            </div>

            {/* View mode toggle */}
            <div
              className="flex items-center bg-muted rounded-lg p-0.5"
              role="radiogroup"
              aria-label={t('eventDetails.documents.viewMode.label', 'View mode')}
            >
              <button
                type="button"
                role="radio"
                aria-checked={viewMode === 'list'}
                aria-label={t('eventDetails.documents.viewMode.list', 'List view')}
                onClick={() => handleViewModeChange('list')}
                className={`p-2 rounded-md transition-all duration-150 ${
                  viewMode === 'list'
                    ? 'bg-card text-primary-600 dark:text-primary-400 shadow-sm'
                    : 'text-muted-foreground hover:text-foreground'
                }`}
              >
                <FiList className="w-4 h-4" />
              </button>
              <button
                type="button"
                role="radio"
                aria-checked={viewMode === 'grid'}
                aria-label={t('eventDetails.documents.viewMode.grid', 'Grid view')}
                onClick={() => handleViewModeChange('grid')}
                className={`p-2 rounded-md transition-all duration-150 ${
                  viewMode === 'grid'
                    ? 'bg-card text-primary-600 dark:text-primary-400 shadow-sm'
                    : 'text-muted-foreground hover:text-foreground'
                }`}
              >
                <FiGrid className="w-4 h-4" />
              </button>
            </div>
          </div>
        )}

        {/* Folder list - only at root level and without search */}
        {!currentFolderId && !searchTerm && (
          isFoldersLoading ? (
            // Skeleton loading state for folders
            <div className="mb-6 min-h-[140px]">
              <div className="h-4 w-32 bg-muted rounded mb-3 animate-pulse"></div>
              <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-4">
                {[1, 2, 3, 4, 5].map((i) => (
                  <div
                    key={i}
                    className="animate-pulse flex flex-col items-center justify-center p-4
                      bg-muted rounded-xl
                      min-w-[120px] min-h-[120px]"
                  >
                    <div className="w-12 h-12 bg-muted rounded-lg mb-2" />
                    <div className="w-16 h-4 bg-muted rounded" />
                  </div>
                ))}
              </div>
            </div>
          ) : currentLevelFolders.length > 0 ? (
            <DocumentFolderList
              folders={currentLevelFolders}
              documentCounts={documentCounts}
              folderSharingMap={folderSharingMap}
              folderOwnerMap={folderOwnerMap}
              isOwner={isOwner}
              onOpenFolder={handleOpenFolder}
              onEditFolder={handleEditFolder}
              onDeleteFolder={handleDeleteFolder}
              isLoading={false}
              canEdit={canManageDocuments}
              canDelete={canManageDocuments}
              isCoManager={isCoManager}
              isStaffLogistics={isStaffLogistics}
              currentUserId={userId}
            />
          ) : null
        )}

        {/* Documents list/grid */}
        {documentsError ? (
          <DocumentsErrorMessage t={t} onRetry={() => fetchDocuments(true)} />
        ) : isDocumentsLoading && documents.length === 0 ? (
          <DocumentsSkeleton />
        ) : documents.length === 0 && (!currentLevelFolders.length || currentFolderId) && !isFoldersLoading ? (
          <NoDocumentsMessage
            currentFolderId={currentFolderId}
            t={t}
            canManageDocuments={canManageDocuments}
            onAddDocument={handleOpenAddModal}
          />
        ) : documents.length > 0 ? (
          <div className="overflow-hidden">
            {!currentFolderId && currentLevelFolders.length > 0 && (
              <Text variant="subtitle2" className="text-muted-foreground mb-3">
                {t('eventDetails.documents.folders.filesTitle')}
              </Text>
            )}

            {viewMode === 'list' ? (
              /* ---- LIST VIEW (table) ---- */
              <div role="table" className="rounded-xl border border-neutral-200 dark:border-neutral-700 overflow-hidden">
                {/* Table header */}
                <div className={`grid gap-4 px-5 py-2.5 bg-neutral-50 dark:bg-background-800/50 border-b border-neutral-200 dark:border-neutral-700 text-xs font-semibold text-text-400 dark:text-text-500 uppercase tracking-wider ${currentFolderId ? (canManageDocumentsInFolder ? 'grid-cols-[1fr_80px_70px] md:grid-cols-[1fr_90px_110px_70px_130px_90px_70px]' : 'grid-cols-[1fr_80px] md:grid-cols-[1fr_90px_110px_70px_130px_90px]') : (canManageDocumentsInFolder ? 'grid-cols-[1fr_80px_70px] md:grid-cols-[1fr_90px_110px_70px_70px]' : 'grid-cols-[1fr_80px] md:grid-cols-[1fr_90px_110px_70px]')}`}>
                  <div role="columnheader">{t('eventDetails.documents.table.name')}</div>
                  <div role="columnheader">{t('eventDetails.documents.table.size')}</div>
                  <div role="columnheader" className="hidden md:block">{t('eventDetails.documents.table.modified')}</div>
                  <div role="columnheader" className="hidden md:block">{t('eventDetails.documents.table.type')}</div>
                  {currentFolderId && <div role="columnheader" className="hidden md:block">{t('eventDetails.documents.table.creator')}</div>}
                  {currentFolderId && <div role="columnheader" className="hidden md:block">{t('eventDetails.documents.table.access')}</div>}
                  {canManageDocumentsInFolder && (
                    <div role="columnheader" className="flex justify-end">
                      {currentFolderId && isNotionConnected && (
                        <button
                          onClick={() => setIsNotionSyncOpen(true)}
                          className="flex items-center gap-1 text-xs font-medium text-primary-500 hover:text-primary-600 dark:text-primary-400 dark:hover:text-primary-300 transition-colors normal-case tracking-normal"
                          title={t('eventDetails.notion.sync.check')}
                        >
                          <FiRefreshCw className="w-3 h-3" />
                          {t('eventDetails.notion.sync.check')}
                        </button>
                      )}
                    </div>
                  )}
                </div>

                {/* Table rows */}
                {(() => {
                  const ownerUserId = currentFolder?.owner?.split('::')[0];
                  const ownerInfo = ownerUserId ? folderOwnerMap[ownerUserId] : null;
                  const ownerInitials = ownerInfo?.userName?.split(' ').map(n => n[0]).join('').slice(0, 2).toUpperCase() || '?';
                  const sharedWith = currentFolderId ? (folderSharingMap[currentFolderId] || []) : [];

                  return filteredDocuments.map((doc) => {
                  const ext = getFileExtension(doc.name);
                  const typeColor = FILE_TYPE_COLORS[ext] || DEFAULT_FILE_COLOR;
                  const displayName = ext ? doc.name.slice(0, -(ext.length + 1)) : doc.name;

                  return (
                    <div
                      key={doc.id}
                      role="row"
                      tabIndex={0}
                      className={`group grid gap-4 px-5 py-3 border-b border-border last:border-b-0 hover:bg-accent focus-visible:bg-accent focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-primary-500 transition-colors duration-150 cursor-pointer items-center ${currentFolderId ? (canManageDocumentsInFolder ? 'grid-cols-[1fr_80px_70px] md:grid-cols-[1fr_90px_110px_70px_130px_90px_70px]' : 'grid-cols-[1fr_80px] md:grid-cols-[1fr_90px_110px_70px_130px_90px]') : (canManageDocumentsInFolder ? 'grid-cols-[1fr_80px_70px] md:grid-cols-[1fr_90px_110px_70px_70px]' : 'grid-cols-[1fr_80px] md:grid-cols-[1fr_90px_110px_70px]')}`}
                      onClick={() => setPreviewDoc(doc)}
                      onKeyDown={(e) => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); setPreviewDoc(doc); } }}
                    >
                      {/* Name + icon */}
                      <div className="flex items-center gap-3 min-w-0">
                        <span
                          className="flex items-center justify-center flex-shrink-0 rounded-lg"
                          style={{ width: 32, height: 32, backgroundColor: typeColor + '18' }}
                        >
                          {getFileTypeIcon(ext, 16)}
                        </span>
                        <Text variant="body2" weight="medium" className="truncate text-foreground">
                          {displayName}
                        </Text>
                      </div>

                      {/* Size */}
                      <Text variant="caption" className="text-muted-foreground">
                        {doc.size || '—'}
                      </Text>

                      {/* Modified */}
                      <Text variant="caption" className="hidden md:block text-muted-foreground">
                        {doc.lastModified
                          ? new Date(doc.lastModified).toLocaleDateString(undefined, { day: 'numeric', month: 'short', year: 'numeric' })
                          : '—'}
                      </Text>

                      {/* Type */}
                      <Text variant="caption" className="hidden md:block text-muted-foreground uppercase font-medium text-xs">
                        {ext || '—'}
                      </Text>

                      {/* Creator (only inside folder) */}
                      {currentFolderId && (
                        <div className="hidden md:flex items-center gap-2 min-w-0">
                          <div
                            className="w-6 h-6 rounded-full flex items-center justify-center text-white text-[10px] font-semibold flex-shrink-0 bg-primary-500"
                          >
                            {ownerInitials}
                          </div>
                          <Text variant="caption" className="text-muted-foreground truncate">
                            {ownerInfo?.userName?.split(' ')[0] || ownerInfo?.userEmail?.split('@')[0] || '—'}
                          </Text>
                        </div>
                      )}

                      {/* Access (only inside folder) */}
                      {currentFolderId && (
                        <div className="hidden md:flex items-center">
                          {sharedWith.length > 0 ? (
                            <div className="flex items-center">
                              {sharedWith.slice(0, 3).map((user, i) => {
                                const initials = user.userName?.split(' ').map(n => n[0]).join('').slice(0, 2).toUpperCase() || user.userEmail?.[0]?.toUpperCase() || '?';
                                const colors = ['bg-success-500', 'bg-secondary-500', 'bg-warning-500'];
                                return (
                                  <div
                                    key={user.userEmail || i}
                                    className={`w-5 h-5 rounded-full flex items-center justify-center text-white text-[9px] font-semibold ${colors[i % colors.length]} ${i > 0 ? '-ml-1.5 ring-2 ring-white dark:ring-background-900' : ''}`}
                                    title={user.userName || user.userEmail}
                                  >
                                    {initials}
                                  </div>
                                );
                              })}
                              {sharedWith.length > 3 && (
                                <span className="text-xs text-muted-foreground ml-1">+{sharedWith.length - 3}</span>
                              )}
                            </div>
                          ) : (
                            <Text variant="caption" className="text-muted-foreground">—</Text>
                          )}
                        </div>
                      )}

                      {/* Actions */}
                      {canManageDocumentsInFolder && (
                        <div className="flex gap-1 justify-end opacity-0 group-hover:opacity-100 transition-opacity duration-200" onClick={(e) => e.stopPropagation()}>
                          <button
                            onClick={() => handleEditDocument(doc)}
                            aria-label={t('eventDetails.documents.buttons.editAria')}
                            className="p-1.5 rounded-lg bg-muted
                              hover:bg-primary-100 dark:hover:bg-primary-900/30
                              text-muted-foreground hover:text-primary-600 dark:hover:text-primary-400
                              transition-colors duration-200"
                          >
                            <FaEdit className="w-3 h-3" />
                          </button>
                          <button
                            onClick={() => handleDeleteDocument(doc.id)}
                            disabled={deletingDocId === doc.id}
                            aria-label={t('eventDetails.documents.buttons.deleteAria')}
                            className="p-1.5 rounded-lg bg-muted
                              hover:bg-error-100 dark:hover:bg-error-900/30
                              text-muted-foreground hover:text-error-600 dark:hover:text-error-400
                              transition-colors duration-200 disabled:opacity-50 disabled:cursor-not-allowed"
                          >
                            {deletingDocId === doc.id ? <FiLoader className="w-3 h-3 animate-spin" /> : <FaTrash className="w-3 h-3" />}
                          </button>
                        </div>
                      )}
                    </div>
                  );
                });
                })()}
              </div>
            ) : (
              /* ---- GRID VIEW ---- */
              <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-3">
                {filteredDocuments.map((doc) => (
                  <div
                    key={doc.id}
                    className="group relative flex flex-col items-center p-4
                      bg-card rounded-xl border border-border
                      hover:border-primary-300 dark:hover:border-primary-600
                      hover:shadow-md transition-[color,background-color,border-color,box-shadow] duration-200"
                  >
                    {/* Hover action buttons */}
                    {canManageDocumentsInFolder && (
                      <div className="absolute top-2 right-2 flex gap-1 opacity-0 group-hover:opacity-100 transition-opacity duration-200">
                        <button
                          onClick={() => handleEditDocument(doc)}
                          aria-label={t('eventDetails.documents.buttons.editAria')}
                          className="p-1.5 rounded-lg bg-muted
                            hover:bg-primary-100 dark:hover:bg-primary-900/30
                            text-muted-foreground hover:text-primary-600 dark:hover:text-primary-400
                            transition-colors duration-200"
                        >
                          <FaEdit className="w-3 h-3" />
                        </button>
                        <button
                          onClick={() => handleDeleteDocument(doc.id)}
                          disabled={deletingDocId === doc.id}
                          aria-label={t('eventDetails.documents.buttons.deleteAria')}
                          className="p-1.5 rounded-lg bg-muted
                            hover:bg-error-100 dark:hover:bg-error-900/30
                            text-muted-foreground hover:text-error-600 dark:hover:text-error-400
                            transition-colors duration-200 disabled:opacity-50 disabled:cursor-not-allowed"
                        >
                          {deletingDocId === doc.id ? <FiLoader className="w-3 h-3 animate-spin" /> : <FaTrash className="w-3 h-3" />}
                        </button>
                      </div>
                    )}

                    {/* File icon + name + size (linked) */}
                    <button
                      onClick={() => setPreviewDoc(doc)}
                      className="flex flex-col items-center w-full focus:outline-none focus-visible:ring-2 focus-visible:ring-primary-500 rounded-lg"
                    >
                      <div className="w-10 h-10 flex items-center justify-center mb-3">
                        {getFileIcon(doc.name, 'lg')}
                      </div>
                      <Text
                        variant="caption"
                        className="text-center font-medium text-foreground
                          line-clamp-2 w-full break-words leading-tight mb-1"
                      >
                        {doc.name}
                      </Text>
                      <Text
                        variant="caption"
                        className="text-muted-foreground text-center"
                      >
                        {doc.size}
                      </Text>
                    </button>
                  </div>
                ))}
              </div>
            )}
          </div>
        ) : null}

        {/* Add/Edit Document Modal */}
        {isAddModalOpen && (
          <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4 animate__animated animate__fadeIn">
            <div className="w-full max-w-xl bg-card rounded-xl shadow-2xl overflow-hidden transform transition-all">
              <div className="p-6">
                <div className="flex justify-between items-center mb-5">
                  <Text variant="h5" className="text-primary-600 dark:text-primary-400 font-medium">
                    {editingDocument ? t('eventDetails.documents.edit.title') : t('eventDetails.documents.add.title')}
                  </Text>
                  <button
                    onClick={() => {
                      setIsAddModalOpen(false);
                      setNewDocumentNames({});
                      setFiles([]);
                      setEditingDocument(null);
                      setSelectedUploadFolderId(null);
                      setUploadError(null);
                    }}
                    className="text-muted-foreground hover:text-foreground transition-colors duration-200"
                    aria-label={t('eventDetails.documents.buttons.closeAria')}
                  >
                    <FiX size={24} />
                  </button>
                </div>

                {/* Folder picker — shown when adding documents (not editing) */}
                {!editingDocument && (
                  <div className="mb-4">
                    <Text variant="subtitle2" className="block mb-2 text-foreground">
                      {t('eventDetails.documents.folders.selectFolder')}
                    </Text>
                    <div className="flex flex-wrap gap-2">
                      {currentLevelFolders.map((folder) => {
                        const isSelected = selectedUploadFolderId === folder.id;
                        const folderColor = folder.color || '#3B82F6';
                        return (
                          <button
                            key={folder.id}
                            type="button"
                            onClick={() => setSelectedUploadFolderId(folder.id)}
                            className={`
                              flex items-center gap-2 px-3 py-2 rounded-lg border-2 transition-colors duration-150
                              ${isSelected
                                ? 'border-primary-500 bg-primary-50 dark:bg-primary-950/40'
                                : 'border-border bg-card hover:border-neutral-300 dark:hover:border-neutral-600'
                              }
                            `}
                          >
                            <FaFolder className="w-4 h-4 flex-shrink-0" style={{ color: folderColor }} />
                            <Text
                              variant="caption"
                              className={`font-medium truncate max-w-[120px] ${
                                isSelected
                                  ? 'text-primary-700 dark:text-primary-300'
                                  : 'text-foreground'
                              }`}
                            >
                              {folder.name}
                            </Text>
                            {isSelected && (
                              <FaCheck className="w-3 h-3 text-primary-500 flex-shrink-0" />
                            )}
                          </button>
                        );
                      })}
                      {/* New folder button inside picker — only at root level */}
                      {!currentFolderId && (
                        <button
                          type="button"
                          onClick={() => {
                            setEditingFolder(null);
                            setIsFolderModalOpen(true);
                          }}
                          className="flex items-center gap-2 px-3 py-2 rounded-lg border-2 border-dashed
                            border-border bg-card
                            hover:border-primary-400 dark:hover:border-primary-500
                            hover:bg-primary-50 dark:hover:bg-primary-950/20
                            transition-colors duration-150"
                        >
                          <FaFolderPlus className="w-4 h-4 flex-shrink-0 text-primary-500 dark:text-primary-400" />
                          <Text variant="caption" className="font-medium text-primary-600 dark:text-primary-400">
                            {t('eventDetails.documents.folders.newFolder')}
                          </Text>
                        </button>
                      )}
                    </div>
                  </div>
                )}

                {!editingDocument ? (
                  <>
                    <div className="mb-6">
                      <Text variant="subtitle2" className="block mb-2 text-foreground">
                        {t('eventDetails.documents.upload.select')}
                      </Text>
                      <div
                        className={`border-2 border-dashed rounded-lg p-6 bg-muted text-center transition-colors duration-200 ${
                          dragActive
                            ? "border-primary-500 bg-primary-50 dark:bg-primary-900/10"
                            : "border-border hover:border-primary-400 dark:hover:border-primary-500"
                        }`}
                        onDragEnter={handleDrag}
                        onDragOver={handleDrag}
                        onDragLeave={handleDrag}
                        onDrop={handleDrop}
                      >
                        <input
                          id="file-upload"
                          type="file"
                          multiple
                          onChange={handleFileSelection}
                          className="hidden"
                        />
                        <div className="flex flex-col items-center">
                          <FiUpload className={`text-3xl mb-2 ${
                            dragActive
                              ? "text-primary-500 dark:text-primary-400"
                              : "text-muted-foreground"
                          }`}
                          />
                          <Text variant="body2" className="text-foreground font-medium mb-1">
                            {t('eventDetails.documents.upload.dragDropOr')}
                          </Text>
                          <Text variant="body2" className="text-muted-foreground mb-3">
                            {t('eventDetails.documents.upload.limits', {
                              maxDocuments: MAX_DOCUMENTS,
                              maxFileSize: MAX_FILE_SIZE_LABEL,
                            })}
                          </Text>
                          <Button
                            variant="soft"
                            color="primary"
                            size="sm"
                            type="button"
                            onClick={() => document.getElementById('file-upload').click()}
                          >
                            {t('eventDetails.documents.buttons.browse')}
                          </Button>
                        </div>
                      </div>

                      {uploadError && (
                        <div className="mt-3 p-3 bg-error-50 dark:bg-error-900/20 rounded-lg">
                          <Text variant="body2" className="text-error-600 dark:text-error-400">
                            {uploadError}
                          </Text>
                        </div>
                      )}

                      {files.length > 0 && (
                        <div className="mt-4 p-3 bg-muted rounded-lg">
                          <div className="flex items-center">
                            <div className="flex-shrink-0 mr-3">
                              <FiFile className="text-primary-500 text-xl" />
                            </div>
                            <div className="min-w-0 flex-1">
                              <Text variant="subtitle2" className="text-foreground mb-0.5">
                                {t('eventDetails.documents.upload.selected', { count: files.length })}
                              </Text>
                              <Text variant="body2" className="text-muted-foreground truncate">
                                {files.map(f => f.name).join(', ')}
                              </Text>
                            </div>
                            <Button
                              variant="ghost"
                              size="xs"
                              color="error"
                              onClick={() => setFiles([])}
                              className="ml-2"
                            >
                              {t('eventDetails.documents.buttons.clear')}
                            </Button>
                          </div>
                        </div>
                      )}
                    </div>
                  </>
                ) : (
                  <div className="mb-6">
                    <Text variant="subtitle2" className="block mb-2 text-foreground">
                      {t('eventDetails.documents.edit.name')}
                    </Text>
                    <div className="flex items-center gap-3 mb-3">
                      {getFileIcon(editingDocument.name)}
                      <Text variant="body2" className="text-muted-foreground">
                        {t('eventDetails.documents.edit.currentName')}: <span className="font-medium text-foreground">{editingDocument.name}</span>
                      </Text>
                    </div>
                    <input
                      id="document-name"
                      type="text"
                      value={newDocumentNames[editingDocument.name] || ''}
                      onChange={(e) => setNewDocumentNames({...newDocumentNames, [editingDocument.name]: e.target.value})}
                      placeholder={t('eventDetails.documents.edit.namePlaceholder')}
                      className="w-full p-2.5 bg-background dark:bg-neutral-800 border border-border rounded-lg
                        focus:ring-2 focus:ring-primary/40 focus:border-primary
                        focus:outline-none transition-all duration-200
                        font-sans text-base text-foreground"
                    />
                  </div>
                )}

                {uploading && (
                  <div className="mb-6">
                    <div className="w-full bg-muted rounded-full h-2.5 overflow-hidden">
                      <div
                        className="bg-primary-500 h-2.5 rounded-full transition-all duration-500 ease-out"
                        style={{ width: `${uploadProgress}%` }}
                      ></div>
                    </div>
                    <Text variant="body2" className="text-center mt-2 text-muted-foreground">
                      {t('eventDetails.documents.upload.progress', { value: Math.round(uploadProgress) })}
                    </Text>
                  </div>
                )}

                <div className="flex justify-end gap-3 mt-6">
                  <Button
                    variant="ghost"
                    onClick={() => {
                      setIsAddModalOpen(false);
                      setNewDocumentNames({});
                      setFiles([]);
                      setEditingDocument(null);
                      setSelectedUploadFolderId(null);
                      setUploadError(null);
                    }}
                    size="sm"
                  >
                    {t('eventDetails.documents.buttons.cancel')}
                  </Button>

                  <Button
                    variant="primary"
                    onClick={handleAddOrSave}
                    disabled={uploading || (!editingDocument && (files.length === 0 || !selectedUploadFolderId))}
                    size="sm"
                  >
                    <span className="flex items-center">
                      {uploading ? <FiLoader className="animate-spin mr-1.5" /> : <FiUpload className="mr-1.5" />}
                      {uploading
                        ? t('eventDetails.documents.buttons.uploading')
                        : editingDocument
                          ? t('eventDetails.documents.buttons.save')
                          : t('eventDetails.documents.buttons.add2')
                      }
                    </span>
                  </Button>
                </div>
              </div>
            </div>
          </div>
        )}
      </Card>

      {/* Folder create/edit modal */}
      <DocumentFolderForm
        isOpen={isFolderModalOpen}
        onClose={handleCloseFolderModal}
        onSubmit={handleFolderFormSubmit}
        folder={editingFolder}
        isLoading={isCreatingFolder || isUpdatingFolder}
        error={null}
      />

      {/* Plan upgrade alert */}
      {showAlert && (
        <AlertPopup
          {...alertConfig}
          isOpen={showAlert}
          onClose={handleAlertClose}
        />
      )}

      {/* Delete folder confirmation */}
      {showDeleteFolderAlert && (
        <AlertPopup
          title={t('eventDetails.documents.folders.deleteConfirmTitle')}
          message={t('eventDetails.documents.folders.deleteConfirmMessage', { name: folderToDelete?.name })}
          confirmText={t('eventDetails.documents.folders.deleteConfirmButton')}
          cancelText={t('eventDetails.documents.buttons.cancel')}
          isConfirmation={true}
          isDeleting={isDeletingFolderFull}
          isOpen={showDeleteFolderAlert}
          onClose={(confirmed) => {
            if (confirmed) {
              confirmDeleteFolder();
            } else {
              setShowDeleteFolderAlert(false);
              setFolderToDelete(null);
            }
          }}
        />
      )}

      {/* Notion import modal */}
      <NotionImportModal
        isOpen={isNotionImportOpen}
        onClose={() => setIsNotionImportOpen(false)}
        eventId={eventId}
        folderId={currentFolderId}
        onImportComplete={async (result) => {
          invalidateAllFolderCaches();
          fetchDocuments(true);
          const { data: freshFolders } = await refetchFolders();
          const folders = (freshFolders?.items || freshFolders || []).filter(f => !f.parentFolderId);
          // Optimistic count: immediately set imported count on the target folder
          const targetFolder = currentFolderId || folders.find(f => f.name === 'Notion')?.id;
          if (targetFolder && result?.imported > 0) {
            setDocumentCounts(prev => ({
              ...prev,
              [targetFolder]: (prev[targetFolder] || 0) + result.imported,
            }));
          }
          // Then reconcile with real S3 count
          if (folders.length > 0) {
            setTimeout(() => {
              isFetchingCountsRef.current = false;
              fetchFolderDocumentCounts(folders);
            }, 800);
          }
        }}
      />

      {/* Notion sync modal */}
      {currentFolderId && (
        <NotionSyncModal
          isOpen={isNotionSyncOpen}
          onClose={() => setIsNotionSyncOpen(false)}
          eventId={eventId}
          folderId={currentFolderId}
          onSyncComplete={handleSyncComplete}
        />
      )}

      {/* Document preview with edit mode support */}
      <DocumentPreviewModal
        isOpen={!!previewDoc}
        onClose={() => setPreviewDoc(null)}
        document={previewDoc}
        // Permission props for inline editing
        eventId={eventId}
        canManageDocuments={canManageDocuments}
        isOwner={isOwner}
        currentFolder={currentFolder}
        userId={userId}
        sharedFolderIds={sharedFolderIds}
        // Callbacks for document save
        onDocumentSaved={() => {
          // Refresh documents list after successful save
          fetchDocuments(true);
        }}
        invalidateDocumentCache={() => {
          // Invalidate cache for current folder
          invalidateCache(eventId, currentFolderId);
        }}
      />
    </>
  );
};

EventDocuments.propTypes = {
  eventId: PropTypes.string.isRequired,
  isOwner: PropTypes.bool,
  isCoManager: PropTypes.bool,
  isStaffLogistics: PropTypes.bool,
  canManageDocuments: PropTypes.bool,
  sharedFolderIds: PropTypes.arrayOf(PropTypes.string),
};

export default EventDocuments;
