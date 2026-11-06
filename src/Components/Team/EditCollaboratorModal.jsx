/**
 * @file EditCollaboratorModal.jsx
 * @description Modal for editing a collaborator's role and shared folders
 * Only OWNER can change roles per ACCESS_LEVELS_STRATEGY.md
 */

import { useState, useCallback, useEffect, useMemo, useRef, memo } from 'react';
import PropTypes from 'prop-types';
import { useTranslation } from 'react-i18next';
import { FiEdit2, FiInfo, FiFolder, FiPackage, FiCalendar } from 'react-icons/fi';
import Modal from '../UI/Modal';
import { Card, Text, Button, Badge } from '../UI';
import {
  useUpdateCollaboratorRoleMutation,
  useUpdateCollaboratorFoldersMutation,
  useUpdateCollaboratorSuppliersMutation,
  useUpdateCollaboratorScheduleAccessMutation,
} from '../../Api/services/collaboratorApi';
import { useListFoldersByEventIdQuery } from '../../Api/services/folderApi';
import { useListSuppliersEnhancedQuery } from '../../Api/services/supplierApi';
import { useListEventSuppliersByEventEnhancedQuery } from '../../Api/services/eventSupplierApi';
import {
  EVENT_ROLES,
  ROLE_DISPLAY_NAMES,
  ROLE_DESCRIPTIONS,
  ROLE_DOT_COLORS,
  ROLE_BG_TINTS,
  ROLE_I18N_MAP,
} from '../../Utils/eventRolesConfig';

/**
 * Role selection card
 */
const RoleOption = memo(({ role, selected, onSelect }) => {
  const { t } = useTranslation(['team']);
  const roleName = t(`team:roles.${ROLE_I18N_MAP[role]}.name`, ROLE_DISPLAY_NAMES[role]);
  const roleDescription = t(`team:roles.${ROLE_I18N_MAP[role]}.description`, ROLE_DESCRIPTIONS[role]);
  const dotColor = ROLE_DOT_COLORS[role] || 'bg-gray-400';
  const bgTint = ROLE_BG_TINTS[role] || 'bg-muted';

  return (
    <button
      type="button"
      onClick={() => onSelect(role)}
      className={`
        w-full flex items-center gap-3 px-3 py-2.5 rounded-lg border-2 text-left transition-all duration-150
        ${selected
          ? `${bgTint} border-primary-400 dark:border-primary-500 ring-1 ring-primary-200 dark:ring-primary-800`
          : 'border-border hover:border-gray-300 dark:hover:border-gray-600'
        }
      `}
    >
      <span className={`w-2.5 h-2.5 rounded-full ${dotColor} flex-shrink-0`} />
      <div className="min-w-0 flex-1">
        <Text variant="body2" className="font-medium text-foreground">
          {roleName}
        </Text>
        <Text variant="caption" className="text-muted-foreground">
          {roleDescription}
        </Text>
      </div>
      {selected && (
        <div className="w-5 h-5 rounded-full bg-primary-500 flex items-center justify-center flex-shrink-0">
          <svg className="w-3 h-3 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="3" d="M5 13l4 4L19 7" />
          </svg>
        </div>
      )}
    </button>
  );
});

RoleOption.displayName = 'RoleOption';

RoleOption.propTypes = {
  role: PropTypes.string.isRequired,
  selected: PropTypes.bool,
  onSelect: PropTypes.func.isRequired,
};

const EDITABLE_ROLES = [EVENT_ROLES.CO_MANAGER, EVENT_ROLES.STAFF_LOGISTICS, EVENT_ROLES.STAFF_CHECKIN];

/**
 * EditCollaboratorModal — Edit a collaborator's role and shared folders
 */
const EditCollaboratorModal = ({ isOpen, onClose, collaborator, eventId }) => {
  const { t } = useTranslation(['team', 'common']);

  const [selectedRole, setSelectedRole] = useState(null);
  const [selectedFolderIds, setSelectedFolderIds] = useState([]);
  const [selectedSupplierIds, setSelectedSupplierIds] = useState([]);
  const [canViewSchedule, setCanViewSchedule] = useState(false);
  const [error, setError] = useState(null);
  const [success, setSuccess] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const collaboratorRef = useRef(null);

  const [updateRole, { isLoading: isUpdatingRole }] = useUpdateCollaboratorRoleMutation();
  const [updateFolders, { isLoading: isUpdatingFolders }] = useUpdateCollaboratorFoldersMutation();
  const [updateSuppliers, { isLoading: isUpdatingSuppliers }] = useUpdateCollaboratorSuppliersMutation();
  const [updateScheduleAccess, { isLoading: isUpdatingSchedule }] = useUpdateCollaboratorScheduleAccessMutation();

  const isLoading = isUpdatingRole || isUpdatingFolders || isUpdatingSuppliers || isUpdatingSchedule;

  // A flag da agenda só se aplica ao STAFF_LOGISTICS: o CO_MANAGER vê sempre tudo
  // e o STAFF_CHECKIN não tem acesso à agenda (ADR-029, 2026-07-16).
  const scheduleAccessApplies = selectedRole === EVENT_ROLES.STAFF_LOGISTICS;

  // Roles that support folder sharing
  const roleSupportsSharing = selectedRole === EVENT_ROLES.CO_MANAGER || selectedRole === EVENT_ROLES.STAFF_LOGISTICS;

  // Fetch folders for sharing
  const { data: foldersData, isLoading: isFoldersLoading } = useListFoldersByEventIdQuery(
    { eventId },
    { skip: !eventId || !roleSupportsSharing || !isOpen }
  );
  const folders = useMemo(() => foldersData?.items || [], [foldersData]);

  // Fetch suppliers for sharing
  const { data: suppliersData, isLoading: isSuppliersLoading } = useListSuppliersEnhancedQuery(
    undefined,
    { skip: !roleSupportsSharing || !isOpen }
  );

  // Fetch event suppliers to filter out those already in the event
  // (sharing those is a no-op — collaborators see them automatically via EventSupplier)
  const { data: eventSuppliersData } = useListEventSuppliersByEventEnhancedQuery(
    { eventId },
    { skip: !roleSupportsSharing || !isOpen || !eventId }
  );

  const eventSupplierIds = useMemo(() => {
    const ids = new Set();
    (eventSuppliersData?.items || []).forEach(es => {
      if (es.supplierId) ids.add(es.supplierId);
    });
    return ids;
  }, [eventSuppliersData]);

  const suppliers = useMemo(() => {
    const all = suppliersData?.items || [];
    if (eventSupplierIds.size === 0) return all;
    return all.filter(s => !eventSupplierIds.has(s.id));
  }, [suppliersData, eventSupplierIds]);

  // Reset state when modal opens with a new collaborator
  useEffect(() => {
    if (isOpen && collaborator) {
      collaboratorRef.current = collaborator;
      setSelectedRole(collaborator.role);
      setSelectedFolderIds(collaborator.sharedFolderIds || []);
      setSelectedSupplierIds(collaborator.sharedSupplierIds || []);
      setCanViewSchedule(!!collaborator.canViewTeamSchedule);
      setError(null);
      setSuccess(false);
    }
  }, [isOpen, collaborator]);

  const handleClose = useCallback(() => {
    setError(null);
    setSuccess(false);
    setIsSubmitting(false);
    onClose();
  }, [onClose]);

  // Auto-close on success
  useEffect(() => {
    if (success) {
      const timer = setTimeout(handleClose, 2000);
      return () => clearTimeout(timer);
    }
  }, [success, handleClose]);

  // Handle role change — clear folders if switching to STAFF_CHECKIN
  const handleRoleSelect = useCallback((role) => {
    setSelectedRole(role);
    const newRoleSupportsSharing = role === EVENT_ROLES.CO_MANAGER || role === EVENT_ROLES.STAFF_LOGISTICS;
    if (!newRoleSupportsSharing) {
      setSelectedFolderIds([]);
      setSelectedSupplierIds([]);
    }
  }, []);

  // Folder toggle
  const handleToggleFolder = useCallback((folderId) => {
    setSelectedFolderIds(prev =>
      prev.includes(folderId)
        ? prev.filter(id => id !== folderId)
        : [...prev, folderId]
    );
  }, []);

  // Select/deselect all folders
  const handleToggleAllFolders = useCallback(() => {
    if (selectedFolderIds.length === folders.length) {
      setSelectedFolderIds([]);
    } else {
      setSelectedFolderIds(folders.map(f => f.id));
    }
  }, [selectedFolderIds, folders]);

  // Supplier toggle
  const handleToggleSupplier = useCallback((supplierId) => {
    setSelectedSupplierIds(prev =>
      prev.includes(supplierId)
        ? prev.filter(id => id !== supplierId)
        : [...prev, supplierId]
    );
  }, []);

  // Visible-list selection metrics (suppliers already in the event are filtered out
  // from the UI but may still exist in selectedSupplierIds from past shares — preserve them)
  const visibleSelectedCount = useMemo(
    () => suppliers.reduce((acc, s) => acc + (selectedSupplierIds.includes(s.id) ? 1 : 0), 0),
    [suppliers, selectedSupplierIds]
  );

  // Select/deselect all VISIBLE suppliers (preserves hidden entries)
  const handleToggleAllSuppliers = useCallback(() => {
    const visibleIds = suppliers.map(s => s.id);
    const allVisibleSelected = visibleIds.every(id => selectedSupplierIds.includes(id));
    setSelectedSupplierIds(prev => {
      const visibleSet = new Set(visibleIds);
      const preserved = prev.filter(id => !visibleSet.has(id));
      return allVisibleSelected ? preserved : [...preserved, ...visibleIds];
    });
  }, [selectedSupplierIds, suppliers]);

  // Check if folders changed (use ref to avoid race condition during submission)
  const originalFolderIds = useMemo(() => {
    const ids = collaboratorRef.current?.sharedFolderIds || [];
    return [...ids].sort();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [collaboratorRef.current]);

  const currentFolderIds = useMemo(() => [...selectedFolderIds].sort(), [selectedFolderIds]);

  const hasFoldersChanged = JSON.stringify(originalFolderIds) !== JSON.stringify(currentFolderIds);

  // Check if suppliers changed
  const originalSupplierIds = useMemo(() => {
    const ids = collaboratorRef.current?.sharedSupplierIds || [];
    return [...ids].sort();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [collaboratorRef.current]);

  const currentSupplierIds = useMemo(() => [...selectedSupplierIds].sort(), [selectedSupplierIds]);

  const hasSuppliersChanged = JSON.stringify(originalSupplierIds) !== JSON.stringify(currentSupplierIds);

  // Só conta como mudança quando o role final é STAFF_LOGISTICS — nos outros a
  // flag é inerte e o backend recusa-a.
  const originalScheduleAccess = !!collaboratorRef.current?.canViewTeamSchedule;
  const hasScheduleAccessChanged = scheduleAccessApplies && canViewSchedule !== originalScheduleAccess;

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (isSubmitting) return;
    setIsSubmitting(true);
    setError(null);

    // Use ref snapshot to avoid race condition from cache invalidation mid-submission
    const collab = collaboratorRef.current;
    if (!collab) {
      setIsSubmitting(false);
      return;
    }

    if (!selectedRole) {
      setError(t('team:invite.errors.roleRequired', 'Selecione um role'));
      setIsSubmitting(false);
      return;
    }

    const hasRoleChanged = selectedRole !== collab.role;

    // Nothing changed
    if (!hasRoleChanged && !hasFoldersChanged && !hasSuppliersChanged && !hasScheduleAccessChanged) {
      handleClose();
      return;
    }

    try {
      // Update role if changed
      if (hasRoleChanged) {
        await updateRole({
          collaboratorId: collab.id,
          newRole: selectedRole,
        }).unwrap();
      }

      // Update folders if changed (and role supports sharing)
      if (hasFoldersChanged && roleSupportsSharing) {
        await updateFolders({
          collaboratorId: collab.id,
          sharedFolderIds: selectedFolderIds,
        }).unwrap();
      }

      // Update suppliers if changed (and role supports sharing)
      if (hasSuppliersChanged && roleSupportsSharing) {
        await updateSuppliers({
          collaboratorId: collab.id,
          sharedSupplierIds: selectedSupplierIds,
        }).unwrap();
      }

      // Schedule visibility — depois do role, para o backend já encontrar
      // STAFF_LOGISTICS caso o role tenha acabado de mudar para isso.
      if (hasScheduleAccessChanged) {
        await updateScheduleAccess({
          collaboratorId: collab.id,
          canViewTeamSchedule: canViewSchedule,
        }).unwrap();
      }

      setSuccess(true);
    } catch (err) {
      const message = err?.data?.message || err?.message || '';
      setError(message || t('team:edit.errors.generic', 'Erro ao atualizar role'));
      setIsSubmitting(false);
    }
  };

  if (!collaborator) return null;

  const displayName = collaborator.userName || collaborator.userEmail;
  const snapshotDisplayName = collaboratorRef.current?.userName || collaboratorRef.current?.userEmail;
  const hasRoleChanged = selectedRole !== (collaboratorRef.current?.role ?? collaborator.role);
  const hasAnyChange = hasRoleChanged || hasFoldersChanged || hasSuppliersChanged || hasScheduleAccessChanged;

  // Success view
  if (success) {
    return (
      <Modal isOpen={isOpen} onClose={handleClose} size="sm" centered>
        <Card variant="default" className="shadow-none rounded-none sm:rounded-lg overflow-hidden">
          <Modal.Body className="flex flex-col items-center justify-center px-6 py-10 text-center">
            <div className="relative mb-5">
              <div className="absolute inset-0 w-16 h-16 rounded-full bg-success-100 dark:bg-success-900/30 animate-ping opacity-20" />
              <div className="relative w-16 h-16 bg-success-100 dark:bg-success-900/30 rounded-full flex items-center justify-center">
                <svg className="w-8 h-8 text-success-500 dark:text-success-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.5" d="M5 13l4 4L19 7" />
                </svg>
              </div>
            </div>
            <Text variant="h4" className="font-semibold text-foreground mb-1.5">
              {t('team:edit.successTitle', 'Role Atualizado!')}
            </Text>
            <Text variant="body2" className="text-muted-foreground max-w-xs">
              {hasRoleChanged
                ? t('team:edit.successMessage', '{{name}} é agora {{role}}.', {
                    name: snapshotDisplayName || displayName,
                    role: t(`team:roles.${ROLE_I18N_MAP[selectedRole]}.name`, ROLE_DISPLAY_NAMES[selectedRole]),
                  })
                : hasScheduleAccessChanged && !hasFoldersChanged && !hasSuppliersChanged
                  ? t('team:edit.successMessageScheduleAccess', 'O acesso à agenda de {{name}} foi atualizado.', {
                      name: snapshotDisplayName || displayName,
                    })
                  : hasSuppliersChanged && !hasFoldersChanged
                    ? t('team:edit.successMessageSuppliers', 'Os fornecedores partilhados de {{name}} foram atualizados.', {
                        name: snapshotDisplayName || displayName,
                      })
                    : t('team:edit.successMessageFolders', 'As pastas partilhadas de {{name}} foram atualizadas.', {
                        name: snapshotDisplayName || displayName,
                      })
              }
            </Text>
          </Modal.Body>
        </Card>
      </Modal>
    );
  }

  return (
    <Modal isOpen={isOpen} onClose={handleClose} size="lg" centered>
      <Card variant="default" className="shadow-none rounded-none sm:rounded-lg">
        <Modal.Header>
          <div className="flex items-center gap-2">
            <FiEdit2 className="h-5 w-5 text-primary-500" />
            {t('team:edit.title', 'Editar Colaborador')}
          </div>
        </Modal.Header>

        <form onSubmit={handleSubmit}>
          <Modal.Body className="space-y-4 max-h-[70vh] overflow-y-auto">
            {/* Collaborator info */}
            <div className="flex items-center gap-3 p-3 bg-background-50 dark:bg-background-800/30 rounded-lg">
              <div className="flex-1 min-w-0">
                <Text variant="body2" className="font-medium text-foreground truncate">
                  {displayName}
                </Text>
                {collaborator.userName && (
                  <Text variant="caption" className="text-muted-foreground truncate">
                    {collaborator.userEmail}
                  </Text>
                )}
              </div>
            </div>

            {/* Role selection */}
            <div>
              <Text variant="body2" className="font-medium text-foreground mb-2">
                {t('team:edit.roleLabel', 'Role')}
              </Text>
              <div className="space-y-2">
                {EDITABLE_ROLES.map((role) => (
                  <RoleOption
                    key={role}
                    role={role}
                    selected={selectedRole === role}
                    onSelect={handleRoleSelect}
                  />
                ))}
              </div>
            </div>

            {/* Warning when downgrading to STAFF_CHECKIN */}
            {selectedRole === EVENT_ROLES.STAFF_CHECKIN && collaborator.role !== EVENT_ROLES.STAFF_CHECKIN && (
              <div className="flex items-start gap-2 p-3 bg-warning-50 dark:bg-warning-900/15 rounded-lg border border-warning-200 dark:border-warning-800/30">
                <FiInfo className="h-4 w-4 text-warning-500 flex-shrink-0 mt-0.5" />
                <Text variant="caption" className="text-warning-700 dark:text-warning-300">
                  {t('team:edit.checkinWarning', 'Staff Check-in só pode fazer check-in de participantes. As pastas partilhadas serão removidas.')}
                </Text>
              </div>
            )}

            {/* Schedule visibility — só STAFF_LOGISTICS. O CO_MANAGER vê sempre
                tudo; o STAFF_CHECKIN não acede à agenda (ADR-029, 2026-07-16). */}
            {scheduleAccessApplies && (
              <div className="flex items-start gap-3 px-3.5 py-3 bg-background-50 dark:bg-background-800/30 rounded-lg">
                <FiCalendar className="w-4 h-4 text-muted-foreground flex-shrink-0 mt-0.5" />
                <div className="min-w-0 flex-1">
                  <Text variant="body2" className="font-medium text-foreground">
                    {t('team:edit.scheduleAccess.label', 'Ver a agenda da equipa')}
                  </Text>
                  <Text variant="caption" className="text-muted-foreground">
                    {canViewSchedule
                      ? t('team:edit.scheduleAccess.onDescription', 'Vê todas as entradas da agenda deste evento.')
                      : t('team:edit.scheduleAccess.offDescription', 'Vê apenas as entradas que criou.')}
                  </Text>
                </div>
                <button
                  type="button"
                  role="switch"
                  aria-checked={canViewSchedule}
                  aria-label={t('team:edit.scheduleAccess.label', 'Ver a agenda da equipa')}
                  onClick={() => setCanViewSchedule((v) => !v)}
                  className={`
                    relative inline-flex h-6 w-11 flex-shrink-0 items-center rounded-full transition-colors
                    ${canViewSchedule ? 'bg-primary-500' : 'bg-background-300 dark:bg-background-600'}
                  `}
                >
                  <span
                    className={`
                      inline-block h-4 w-4 transform rounded-full bg-white transition-transform
                      ${canViewSchedule ? 'translate-x-6' : 'translate-x-1'}
                    `}
                  />
                </button>
              </div>
            )}

            {/* Folder sharing section */}
            {roleSupportsSharing && (
              <div className="space-y-3">
                {/* Section header bar */}
                <div className="flex items-center gap-2.5 px-3.5 py-2 bg-background-50 dark:bg-background-800/30 rounded-lg">
                  <FiFolder className="w-3.5 h-3.5 text-muted-foreground" />
                  <span className="text-xs font-semibold uppercase tracking-wider text-muted-foreground flex-1">
                    {t('team:invite.shareFolders', 'Partilhar Pastas')}
                  </span>
                  {folders.length > 0 && (
                    <Badge variant="neutral" tone="soft" size="xs">
                      {selectedFolderIds.length}/{folders.length}
                    </Badge>
                  )}
                  {folders.length > 0 && (
                    <button
                      type="button"
                      onClick={handleToggleAllFolders}
                      className="text-xs font-medium text-primary-600 dark:text-primary-400 hover:text-primary-700 dark:hover:text-primary-300 transition-colors"
                    >
                      {selectedFolderIds.length === folders.length
                        ? t('team:invite.deselectAll', 'Desmarcar')
                        : t('team:invite.selectAll', 'Marcar todas')}
                    </button>
                  )}
                </div>

                <Text variant="caption" className="text-muted-foreground -mt-1 px-1">
                  {t('team:invite.shareFoldersDescription', 'Selecione as pastas que o colaborador pode aceder')}
                </Text>

                {/* Folder list */}
                {isFoldersLoading ? (
                  <div className="space-y-2">
                    {[1, 2, 3].map((i) => (
                      <div key={i} className="flex items-center gap-3 px-3.5 py-2.5">
                        <div className="w-4 h-4 bg-muted rounded animate-pulse" />
                        <div className="w-3 h-3 bg-muted rounded-full animate-pulse" />
                        <div className="flex-1 h-4 bg-muted rounded animate-pulse" />
                      </div>
                    ))}
                  </div>
                ) : folders.length === 0 ? (
                  <div className="flex flex-col items-center py-6 text-center">
                    <FiFolder className="h-6 w-6 text-muted-foreground mb-2" />
                    <Text variant="caption" className="text-muted-foreground">
                      {t('team:invite.noFoldersAvailable', 'Nenhuma pasta disponível')}
                    </Text>
                  </div>
                ) : (
                  <div className="max-h-44 overflow-y-auto rounded-lg divide-y divide-border">
                    {folders.map((folder) => {
                      const isSelected = selectedFolderIds.includes(folder.id);
                      return (
                        <button
                          key={folder.id}
                          type="button"
                          role="checkbox"
                          aria-checked={isSelected}
                          aria-label={folder.name}
                          onClick={() => handleToggleFolder(folder.id)}
                          className={`
                            w-full flex items-center gap-3 px-3.5 py-2.5 text-left cursor-pointer transition-colors
                            ${isSelected
                              ? 'bg-primary-50/50 dark:bg-primary-900/10'
                              : 'hover:bg-accent'
                            }
                          `}
                        >
                          <div className={`
                            w-4 h-4 rounded border-2 flex items-center justify-center flex-shrink-0 transition-colors
                            ${isSelected
                              ? 'bg-primary-500 border-primary-500'
                              : 'border-border'
                            }
                          `}>
                            {isSelected && (
                              <svg className="w-3 h-3 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="3" d="M5 13l4 4L19 7" />
                              </svg>
                            )}
                          </div>
                          <div
                            className="w-2.5 h-2.5 rounded-full flex-shrink-0"
                            style={{ backgroundColor: folder.color || '#3B82F6' }}
                          />
                          <Text variant="body2" className={`truncate flex-1 ${isSelected ? 'font-medium' : ''}`}>
                            {folder.name}
                          </Text>
                        </button>
                      );
                    })}
                  </div>
                )}
              </div>
            )}

            {/* Supplier sharing section */}
            {roleSupportsSharing && (
              <div className="space-y-3">
                <div className="flex items-center gap-2.5 px-3.5 py-2 bg-background-50 dark:bg-background-800/30 rounded-lg">
                  <FiPackage className="w-3.5 h-3.5 text-muted-foreground" />
                  <span className="text-xs font-semibold uppercase tracking-wider text-muted-foreground flex-1">
                    {t('team:invite.shareSuppliers', 'Partilhar Fornecedores')}
                  </span>
                  {suppliers.length > 0 && (
                    <Badge variant="neutral" tone="soft" size="xs">
                      {visibleSelectedCount}/{suppliers.length}
                    </Badge>
                  )}
                  {suppliers.length > 0 && (
                    <button
                      type="button"
                      onClick={handleToggleAllSuppliers}
                      className="text-xs font-medium text-primary-600 dark:text-primary-400 hover:text-primary-700 dark:hover:text-primary-300 transition-colors"
                    >
                      {visibleSelectedCount === suppliers.length
                        ? t('team:invite.deselectAll', 'Desmarcar')
                        : t('team:invite.selectAll', 'Marcar todas')}
                    </button>
                  )}
                </div>

                <Text variant="caption" className="text-muted-foreground -mt-1 px-1">
                  {t('team:invite.shareSuppliersDescription', 'Fornecedores da tua lista que o colaborador pode adicionar a este evento. Os que já estão no evento são acessíveis automaticamente.')}
                </Text>

                {isSuppliersLoading ? (
                  <div className="space-y-2">
                    {[1, 2, 3].map((i) => (
                      <div key={i} className="flex items-center gap-3 px-3.5 py-2.5">
                        <div className="w-4 h-4 bg-muted rounded animate-pulse" />
                        <div className="flex-1 h-4 bg-muted rounded animate-pulse" />
                      </div>
                    ))}
                  </div>
                ) : suppliers.length === 0 ? (
                  <div className="flex flex-col items-center py-6 text-center">
                    <FiPackage className="h-6 w-6 text-muted-foreground mb-2" />
                    <Text variant="caption" className="text-muted-foreground">
                      {t('team:invite.noSuppliersAvailable', 'Nenhum fornecedor disponível')}
                    </Text>
                  </div>
                ) : (
                  <div className="max-h-44 overflow-y-auto rounded-lg divide-y divide-border">
                    {suppliers.map((supplier) => {
                      const isSelected = selectedSupplierIds.includes(supplier.id);
                      return (
                        <button
                          key={supplier.id}
                          type="button"
                          role="checkbox"
                          aria-checked={isSelected}
                          aria-label={supplier.name}
                          onClick={() => handleToggleSupplier(supplier.id)}
                          className={`
                            w-full flex items-center gap-3 px-3.5 py-2.5 text-left cursor-pointer transition-colors
                            ${isSelected
                              ? 'bg-primary-50/50 dark:bg-primary-900/10'
                              : 'hover:bg-accent'
                            }
                          `}
                        >
                          <div className={`
                            w-4 h-4 rounded border-2 flex items-center justify-center flex-shrink-0 transition-colors
                            ${isSelected
                              ? 'bg-primary-500 border-primary-500'
                              : 'border-border'
                            }
                          `}>
                            {isSelected && (
                              <svg className="w-3 h-3 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="3" d="M5 13l4 4L19 7" />
                              </svg>
                            )}
                          </div>
                          <div className="flex-1 min-w-0">
                            <Text variant="body2" className={`truncate ${isSelected ? 'font-medium' : ''}`}>
                              {supplier.name}
                            </Text>
                            {supplier.category && (
                              <Text variant="caption" className="text-muted-foreground truncate">
                                {supplier.category}
                              </Text>
                            )}
                          </div>
                        </button>
                      );
                    })}
                  </div>
                )}
              </div>
            )}

            {/* Error */}
            {error && (
              <div className="p-3 bg-error-50 dark:bg-error-900/20 rounded-lg">
                <Text variant="caption" className="text-error-600 dark:text-error-400">
                  {error}
                </Text>
              </div>
            )}
          </Modal.Body>

          <Modal.Footer className="flex justify-end gap-2">
            <Button variant="ghost" size="sm" onClick={handleClose} type="button">
              {t('common:actions.cancel', 'Cancelar')}
            </Button>
            <Button
              variant="primary"
              size="sm"
              type="submit"
              disabled={isLoading || isSubmitting || !hasAnyChange}
            >
              {isLoading
                ? t('common:actions.saving', 'A guardar...')
                : t('team:edit.submit', 'Guardar Alterações')
              }
            </Button>
          </Modal.Footer>
        </form>
      </Card>
    </Modal>
  );
};

EditCollaboratorModal.propTypes = {
  isOpen: PropTypes.bool.isRequired,
  onClose: PropTypes.func.isRequired,
  eventId: PropTypes.string,
  collaborator: PropTypes.shape({
    id: PropTypes.string.isRequired,
    userEmail: PropTypes.string.isRequired,
    userName: PropTypes.string,
    role: PropTypes.string.isRequired,
    sharedFolderIds: PropTypes.arrayOf(PropTypes.string),
    sharedSupplierIds: PropTypes.arrayOf(PropTypes.string),
    canViewTeamSchedule: PropTypes.bool,
  }),
};

export default memo(EditCollaboratorModal);
