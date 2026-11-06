import { useState, useMemo } from 'react';
import PropTypes from 'prop-types';
import { useTranslation } from 'react-i18next';
import { FiEdit2, FiX, FiLoader, FiTag, FiTrash2 } from 'react-icons/fi';
import { useUpdateEventRoleMutation, useDeleteEventRoleValidatedMutation } from '../../../Api/services/roleApi';
import { useAuthz, billingGateReasonFromError, billingGateMessageKey } from '../../../Hook/useAuthz';
import { ROLE_COLORS, ROLE_COLOR_KEYS } from '../roleBadgeConfig';
import RoleBadge from '../RoleBadge';

const RoleManagerPanel = ({ eventId, roles, participantCounts = {}, onClose }) => {
  const { t } = useTranslation('participant');
  const [editingId, setEditingId] = useState(null);
  const [editingName, setEditingName] = useState('');
  // '' = automatic color (derived from the name)
  const [editingColor, setEditingColor] = useState('');
  const [savingId, setSavingId] = useState(null);
  const [deletingId, setDeletingId] = useState(null);
  const [rowError, setRowError] = useState({});
  const [pendingDeleteRole, setPendingDeleteRole] = useState(null);

  // Bulk selection: apenas roles sem participantes associados podem ser
  // selecionadas — uma role bloqueada nunca pode entrar num lote de eliminação.
  const [selectedIds, setSelectedIds] = useState(new Set());
  const [pendingBulkDelete, setPendingBulkDelete] = useState(false);
  const [bulkDeleting, setBulkDeleting] = useState(false);
  const [bulkSummary, setBulkSummary] = useState(null);

  const [updateEventRole] = useUpdateEventRoleMutation();
  const [deleteEventRoleValidated] = useDeleteEventRoleValidatedMutation();

  // Evento read-only (billing, §4b): desativa editar/apagar; a recusa real
  // (BILLING_GATE:*) vem da Lambda e é mapeada nos catch abaixo.
  const { writable } = useAuthz(eventId);

  const gateOrFallbackMessage = (error, fallback) => {
    const gateReason = billingGateReasonFromError(error);
    if (gateReason) return t(`common:${billingGateMessageKey(gateReason)}`);
    return (
      error?.data?.message ||
      error?.data?.data?.message ||
      error?.message ||
      fallback
    );
  };

  const handleEditStart = (role) => {
    setEditingId(role.id);
    setEditingName(role.name);
    setEditingColor(role.color || '');
    setRowError({});
  };

  const handleEditCancel = () => {
    setEditingId(null);
    setEditingName('');
    setEditingColor('');
    setRowError({});
  };

  const handleEditSave = async (role) => {
    const trimmed = editingName.trim();

    if (!trimmed) {
      setRowError({ id: role.id, message: t('participantsV2.formModal.roleManager.errorEmptyName', 'Name cannot be empty') });
      return;
    }

    // A case-only rename is not a change; nothing changed → cancel silently
    const nameChanged = trimmed.toLowerCase() !== role.name.toLowerCase();
    const colorChanged = editingColor !== (role.color || '');
    if (!nameChanged && !colorChanged) {
      handleEditCancel();
      return;
    }

    setSavingId(role.id);
    try {
      await updateEventRole({
        eventId,
        roleId: role.id,
        name: nameChanged ? trimmed : role.name,
        // undefined keeps the stored color; '' resets it to automatic
        color: colorChanged ? editingColor : undefined,
      }).unwrap();

      handleEditCancel();
    } catch (error) {
      setRowError({
        id: role.id,
        message: gateOrFallbackMessage(error, t('participantsV2.formModal.roleManager.errorSave', 'Error saving')),
      });
    } finally {
      setSavingId(null);
    }
  };

  const handleDeleteClick = (role) => {
    const count = participantCounts[role.name] || 0;
    if (count > 0) {
      return; // Blocked
    }
    setPendingDeleteRole(role);
  };

  const handleConfirmDelete = async () => {
    if (!pendingDeleteRole) return;

    const role = pendingDeleteRole;
    setDeletingId(role.id);
    setPendingDeleteRole(null);

    try {
      const result = await deleteEventRoleValidated({
        eventId,
        roleId: role.id,
      }).unwrap();

      if (result?.success === false) {
        const errorMsg = t('participantsV2.formModal.roleManager.errorHasParticipants', 'Cannot delete: {{count}} participant(s)', {
          count: result.participantCount,
        });
        setRowError({
          id: role.id,
          message: errorMsg,
        });
      } else {
        setRowError({});
      }
    } catch (error) {
      setRowError({
        id: role.id,
        message: gateOrFallbackMessage(error, t('participantsV2.formModal.roleManager.errorDelete', 'Error deleting')),
      });
    } finally {
      setDeletingId(null);
    }
  };

  const handleCancelDelete = () => {
    setPendingDeleteRole(null);
  };

  // Roles com participantes associados nunca podem entrar num lote de
  // eliminação — ficam de fora da seleção, tal como o botão de apagar individual.
  const selectableRoles = useMemo(
    () => roles.filter((role) => (participantCounts[role.name] || 0) === 0),
    [roles, participantCounts]
  );
  const allSelectableSelected =
    selectableRoles.length > 0 && selectableRoles.every((role) => selectedIds.has(role.id));

  const toggleSelectRole = (roleId) => {
    setSelectedIds((prev) => {
      const next = new Set(prev);
      if (next.has(roleId)) {
        next.delete(roleId);
      } else {
        next.add(roleId);
      }
      return next;
    });
  };

  const toggleSelectAll = () => {
    setSelectedIds(allSelectableSelected ? new Set() : new Set(selectableRoles.map((role) => role.id)));
  };

  const handleBulkDeleteClick = () => {
    if (selectedIds.size === 0) return;
    setBulkSummary(null);
    setPendingBulkDelete(true);
  };

  const handleCancelBulkDelete = () => {
    setPendingBulkDelete(false);
  };

  const handleConfirmBulkDelete = async () => {
    const targetIds = Array.from(selectedIds);
    setPendingBulkDelete(false);
    setBulkDeleting(true);

    const outcomes = await Promise.all(
      targetIds.map(async (roleId) => {
        const role = roles.find((r) => r.id === roleId);
        const name = role?.name || roleId;
        try {
          const result = await deleteEventRoleValidated({ eventId, roleId }).unwrap();
          if (result?.success) {
            return { status: 'deleted', name };
          }
          return { status: 'blocked', name, count: result?.participantCount || 0 };
        } catch (error) {
          return {
            status: 'error',
            name,
            message: gateOrFallbackMessage(error, t('participantsV2.formModal.roleManager.errorDelete', 'Error deleting')),
          };
        }
      })
    );

    setBulkSummary({
      deleted: outcomes.filter((o) => o.status === 'deleted'),
      blocked: outcomes.filter((o) => o.status === 'blocked'),
      errors: outcomes.filter((o) => o.status === 'error'),
    });
    setSelectedIds(new Set());
    setBulkDeleting(false);
  };

  const dismissBulkSummary = () => setBulkSummary(null);

  if (!roles || roles.length === 0) {
    return (
      <div className="mt-3 p-4 bg-neutral-50 dark:bg-neutral-900/30 rounded-lg border border-neutral-200 dark:border-neutral-700 text-sm text-text-600 dark:text-text-300">
        {t('participantsV2.formModal.roleManager.noRoles', 'No roles created')}
      </div>
    );
  }

  return (
    <div className="mt-3 bg-neutral-50 dark:bg-neutral-900/30 rounded-lg border border-neutral-200 dark:border-neutral-700 overflow-hidden">
      {/* Header */}
      <div className="flex items-center justify-between px-4 py-3 border-b border-neutral-200 dark:border-neutral-700">
        <div className="flex items-center gap-2">
          <span className="w-5 h-5 rounded flex items-center justify-center bg-primary-100 dark:bg-primary-900/30 shrink-0">
            <FiTag size={14} className="text-primary-600 dark:text-primary-400" />
          </span>
          <h5 className="text-sm font-medium text-text-900 dark:text-text-50">
            {t('participantsV2.formModal.roleManager.title', 'Manage Roles')}
          </h5>
        </div>
        <button
          type="button"
          onClick={onClose}
          className="p-1 text-text-500 hover:text-text-700 dark:hover:text-text-300 transition-colors"
          title={t('participantsV2.formModal.roleManager.close', 'Close panel')}
        >
          <FiX size={18} />
        </button>
      </div>

      {/* Bulk selection toolbar */}
      {selectableRoles.length > 0 && (
        <div className="flex items-center justify-between px-4 py-2 bg-neutral-100 dark:bg-neutral-800/40 border-b border-neutral-200 dark:border-neutral-700">
          <label className="flex items-center gap-2 text-xs text-text-600 dark:text-text-400 cursor-pointer">
            <input
              type="checkbox"
              checked={allSelectableSelected}
              onChange={toggleSelectAll}
              disabled={bulkDeleting || !writable}
              className="h-3.5 w-3.5 rounded border-neutral-300 dark:border-neutral-600 text-primary-500 focus:ring-2 focus:ring-primary-500/30 cursor-pointer disabled:cursor-not-allowed disabled:opacity-40"
            />
            {selectedIds.size > 0
              ? t('participantsV2.formModal.roleManager.selectedCount', '{{count}} selected', { count: selectedIds.size })
              : t('participantsV2.formModal.roleManager.selectAll', 'Select all')}
          </label>
          <button
            type="button"
            onClick={handleBulkDeleteClick}
            disabled={selectedIds.size === 0 || bulkDeleting || !writable}
            className="flex items-center gap-1.5 px-2.5 py-1 text-xs font-medium rounded text-error-600 dark:text-error-400 hover:bg-error-50 dark:hover:bg-error-900/20 disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
          >
            {bulkDeleting ? <FiLoader size={14} className="animate-spin" /> : <FiTrash2 size={14} />}
            {t('participantsV2.formModal.roleManager.deleteSelected', 'Delete selected ({{count}})', { count: selectedIds.size })}
          </button>
        </div>
      )}

      {/* Bulk delete summary */}
      {bulkSummary && (
        <div className="px-4 py-3 bg-neutral-100 dark:bg-neutral-800/40 border-b border-neutral-200 dark:border-neutral-700 text-xs space-y-1">
          <div className="flex items-start justify-between gap-2">
            <div className="space-y-1">
              {bulkSummary.deleted.length > 0 && (
                <p className="text-success-600 dark:text-success-400">
                  {t('participantsV2.formModal.roleManager.bulkDeleteSuccess', '{{count}} role(s) deleted', { count: bulkSummary.deleted.length })}
                </p>
              )}
              {bulkSummary.blocked.map((item) => (
                <p key={item.name} className="text-error-600 dark:text-error-400">
                  {t('participantsV2.formModal.roleManager.bulkDeleteBlocked', '{{name}}: cannot delete, {{count}} participant(s)', {
                    name: item.name,
                    count: item.count,
                  })}
                </p>
              ))}
              {bulkSummary.errors.map((item) => (
                <p key={item.name} className="text-error-600 dark:text-error-400">
                  {t('participantsV2.formModal.roleManager.bulkDeleteError', '{{name}}: {{message}}', { name: item.name, message: item.message })}
                </p>
              ))}
            </div>
            <button
              type="button"
              onClick={dismissBulkSummary}
              className="p-0.5 text-text-500 hover:text-text-700 dark:hover:text-text-300 shrink-0"
              title={t('participantsV2.formModal.roleManager.close', 'Close panel')}
            >
              <FiX size={14} />
            </button>
          </div>
        </div>
      )}

      {/* Role list */}
      <div className="divide-y divide-neutral-200 dark:divide-neutral-700">
        {roles.map((role) => {
          const isEditing = editingId === role.id;
          const isSaving = savingId === role.id;
          const isDeleting = deletingId === role.id;
          const count = participantCounts[role.name] || 0;
          const isBlocked = count > 0;
          const error = rowError.id === role.id ? rowError.message : null;

          return (
            <div key={role.id} className="px-4 py-3">
              {isEditing ? (
                // Edit mode
                <div className="space-y-2.5">
                <div className="flex items-center gap-2">
                  <input
                    type="text"
                    value={editingName}
                    onChange={(e) => setEditingName(e.target.value)}
                    placeholder={t('participantsV2.formModal.roleManager.editNameLabel', 'New name')}
                    className="flex-1 px-2.5 py-1.5 text-sm bg-white dark:bg-neutral-800 border border-primary-300 dark:border-primary-600 rounded text-text-900 dark:text-text-50 placeholder-text-400 dark:placeholder-text-500 focus:outline-none focus:ring-2 focus:ring-primary-500 dark:focus:ring-primary-400"
                  />
                  <button
                    type="button"
                    onClick={() => handleEditSave(role)}
                    disabled={isSaving}
                    className="p-1.5 rounded bg-primary-500 hover:bg-primary-600 disabled:bg-primary-400 text-white transition-colors"
                    title={t('participantsV2.formModal.roleManager.save', 'Save')}
                  >
                    <span className="text-sm font-medium">✓</span>
                  </button>
                  <button
                    type="button"
                    onClick={handleEditCancel}
                    disabled={isSaving}
                    className="p-1.5 rounded bg-neutral-300 dark:bg-neutral-700 hover:bg-neutral-400 dark:hover:bg-neutral-600 disabled:opacity-50 text-text-900 dark:text-text-50 transition-colors"
                    title={t('participantsV2.formModal.roleManager.cancelEdit', 'Cancel')}
                  >
                    <span className="text-sm font-medium">✗</span>
                  </button>
                </div>

                {/* Highlight color (used at the check-in door) */}
                <div>
                  <span id={`role-color-${role.id}`} className="block text-xs text-text-600 dark:text-text-400 mb-1.5">
                    {t('participantsV2.formModal.roleManager.colorLabel', 'Highlight color')}
                  </span>
                  <div
                    role="group"
                    aria-labelledby={`role-color-${role.id}`}
                    className="flex flex-wrap items-center gap-2"
                  >
                    <button
                      type="button"
                      onClick={() => setEditingColor('')}
                      disabled={isSaving}
                      aria-pressed={editingColor === ''}
                      title={t('participantsV2.formModal.roleManager.colorAuto', 'Automatic')}
                      className={`h-6 px-2 rounded-full border border-dashed border-neutral-400 dark:border-neutral-500 text-xs text-text-600 dark:text-text-300 transition-shadow focus:outline-none focus-visible:ring-2 focus-visible:ring-primary-500/50 ${
                        editingColor === '' ? 'ring-2 ring-primary-500 ring-offset-1 ring-offset-neutral-50 dark:ring-offset-neutral-900' : ''
                      }`}
                    >
                      {t('participantsV2.formModal.roleManager.colorAuto', 'Automatic')}
                    </button>
                    {ROLE_COLOR_KEYS.map((key) => (
                      <button
                        key={key}
                        type="button"
                        onClick={() => setEditingColor(key)}
                        disabled={isSaving}
                        aria-pressed={editingColor === key}
                        aria-label={t(`participantsV2.formModal.roleManager.colors.${key}`, key)}
                        title={t(`participantsV2.formModal.roleManager.colors.${key}`, key)}
                        className={`w-6 h-6 rounded-full transition-shadow focus:outline-none focus-visible:ring-2 focus-visible:ring-primary-500/50 ${
                          editingColor === key ? 'ring-2 ring-primary-500 ring-offset-2 ring-offset-neutral-50 dark:ring-offset-neutral-900' : ''
                        }`}
                        style={{ backgroundColor: ROLE_COLORS[key].bg }}
                      />
                    ))}
                  </div>
                </div>
                </div>
              ) : (
                // Display mode
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2 min-w-0">
                    <input
                      type="checkbox"
                      checked={selectedIds.has(role.id)}
                      onChange={() => toggleSelectRole(role.id)}
                      disabled={isBlocked || isEditing || isSaving || isDeleting || bulkDeleting || !writable}
                      className="h-3.5 w-3.5 rounded border-neutral-300 dark:border-neutral-600 text-primary-500 focus:ring-2 focus:ring-primary-500/30 cursor-pointer disabled:cursor-not-allowed disabled:opacity-40 shrink-0"
                      title={
                        isBlocked
                          ? t('participantsV2.formModal.roleManager.deleteBlocked', 'Cannot delete: {{count}} participant(s)', { count })
                          : t('participantsV2.formModal.roleManager.selectRole', 'Select role {{name}}', { name: role.name })
                      }
                    />
                    <RoleBadge roleName={role.name} colorKey={role.color} className="min-w-0" />
                    <span className="text-xs text-text-500 dark:text-text-400 shrink-0">
                      {count}
                    </span>
                  </div>

                  <div className="flex items-center gap-1.5 ml-2 shrink-0">
                    {/* Edit button */}
                    <button
                      type="button"
                      onClick={() => handleEditStart(role)}
                      disabled={isSaving || isDeleting || bulkDeleting || !writable}
                      className="p-1 rounded hover:bg-neutral-200 dark:hover:bg-neutral-700 disabled:opacity-50 text-text-600 dark:text-text-400 hover:text-text-900 dark:hover:text-text-50 transition-colors"
                      title={t('participantsV2.formModal.roleManager.edit', 'Edit role {{name}}', { name: role.name })}
                    >
                      <FiEdit2 size={16} />
                    </button>

                    {/* Delete button */}
                    <button
                      type="button"
                      onClick={() => handleDeleteClick(role)}
                      disabled={isBlocked || isSaving || isDeleting || bulkDeleting || !writable}
                      aria-disabled={isBlocked}
                      className={`p-1 rounded transition-colors ${
                        isBlocked
                          ? 'cursor-not-allowed opacity-50 text-text-400 dark:text-text-600'
                          : 'hover:bg-error-50 dark:hover:bg-error-900/20 text-error-600 dark:text-error-400 hover:text-error-700 dark:hover:text-error-300'
                      }`}
                      title={
                        isBlocked
                          ? t('participantsV2.formModal.roleManager.deleteBlocked', 'Cannot delete: {{count}} participant(s)', {
                              count,
                            })
                          : t('participantsV2.formModal.roleManager.delete', 'Delete {{name}}', { name: role.name })
                      }
                    >
                      {isDeleting ? (
                        <FiLoader size={16} className="animate-spin" />
                      ) : (
                        <FiX size={16} />
                      )}
                    </button>
                  </div>
                </div>
              )}

              {/* Error message */}
              {error && (
                <div className="mt-1.5 text-xs text-error-600 dark:text-error-400">
                  {error}
                </div>
              )}
            </div>
          );
        })}
      </div>

      {/* Delete confirmation modal */}
      {pendingDeleteRole && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
          <div className="bg-card rounded-lg shadow-lg max-w-sm w-full p-6">
            <h3 className="text-lg font-semibold text-text-900 dark:text-text-50 mb-2">
              {t('participantsV2.formModal.roleManager.confirmDelete', 'Confirm deletion')}
            </h3>
            <p className="text-sm text-text-600 dark:text-text-400 mb-6">
              {t('participantsV2.formModal.roleManager.confirmDeleteMessage', 'Are you sure you want to delete the role {{name}}? This action cannot be undone.', {
                name: pendingDeleteRole.name,
              })}
            </p>
            <div className="flex gap-3 justify-end">
              <button
                type="button"
                onClick={handleCancelDelete}
                className="px-4 py-2 text-sm font-medium text-text-700 dark:text-text-300 bg-neutral-100 dark:bg-neutral-700 hover:bg-neutral-200 dark:hover:bg-neutral-600 rounded transition-colors"
              >
                {t('participantsV2.formModal.roleManager.confirmCancelButton', 'Cancel')}
              </button>
              <button
                type="button"
                onClick={handleConfirmDelete}
                className="px-4 py-2 text-sm font-medium text-white bg-error-500 hover:bg-error-600 rounded transition-colors"
              >
                {t('participantsV2.formModal.roleManager.confirmDeleteButton', 'Delete')}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Bulk delete confirmation modal */}
      {pendingBulkDelete && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
          <div className="bg-card rounded-lg shadow-lg max-w-sm w-full p-6">
            <h3 className="text-lg font-semibold text-text-900 dark:text-text-50 mb-2">
              {t('participantsV2.formModal.roleManager.confirmBulkDelete', 'Confirm bulk deletion')}
            </h3>
            <p className="text-sm text-text-600 dark:text-text-400 mb-2">
              {t('participantsV2.formModal.roleManager.confirmBulkDeleteMessage', 'Are you sure you want to delete {{count}} role(s)? This action cannot be undone.', {
                count: selectedIds.size,
              })}
            </p>
            <ul className="text-sm text-text-700 dark:text-text-300 mb-6 max-h-32 overflow-y-auto list-disc pl-5 space-y-0.5">
              {roles
                .filter((role) => selectedIds.has(role.id))
                .map((role) => (
                  <li key={role.id} className="truncate">{role.name}</li>
                ))}
            </ul>
            <div className="flex gap-3 justify-end">
              <button
                type="button"
                onClick={handleCancelBulkDelete}
                className="px-4 py-2 text-sm font-medium text-text-700 dark:text-text-300 bg-neutral-100 dark:bg-neutral-700 hover:bg-neutral-200 dark:hover:bg-neutral-600 rounded transition-colors"
              >
                {t('participantsV2.formModal.roleManager.confirmCancelButton', 'Cancel')}
              </button>
              <button
                type="button"
                onClick={handleConfirmBulkDelete}
                className="px-4 py-2 text-sm font-medium text-white bg-error-500 hover:bg-error-600 rounded transition-colors"
              >
                {t('participantsV2.formModal.roleManager.confirmDeleteButton', 'Delete')}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

RoleManagerPanel.propTypes = {
  eventId: PropTypes.string.isRequired,
  roles: PropTypes.arrayOf(
    PropTypes.shape({
      id: PropTypes.string.isRequired,
      name: PropTypes.string.isRequired,
    })
  ).isRequired,
  participantCounts: PropTypes.objectOf(PropTypes.number),
  onClose: PropTypes.func.isRequired,
};

RoleManagerPanel.defaultProps = {
  participantCounts: {},
};

export default RoleManagerPanel;
