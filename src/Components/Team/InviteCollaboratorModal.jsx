/**
 * @file InviteCollaboratorModal.jsx
 * @description Modal for inviting collaborators to an event
 * Implements invitation flow per ACCESS_LEVELS_STRATEGY.md
 *
 * - OWNER can invite CO_MANAGER, STAFF_CHECKIN, STAFF_LOGISTICS
 * - CO_MANAGER can only invite STAFF_CHECKIN, STAFF_LOGISTICS
 */

import { useState, useCallback, useEffect, useMemo, memo } from 'react';
import PropTypes from 'prop-types';
import { useTranslation } from 'react-i18next';
import { FiMail, FiUserPlus, FiInfo, FiFolder, FiPackage, FiAlertTriangle } from 'react-icons/fi';
import Modal from '../UI/Modal';
import { Card, Text, Button, Badge } from '../UI';
import { useInviteCollaboratorMutation } from '../../Api/services/collaboratorApi';
import { useListFoldersByEventIdQuery } from '../../Api/services/folderApi';
import { useListSuppliersEnhancedQuery } from '../../Api/services/supplierApi';
import { useListEventSuppliersByEventEnhancedQuery } from '../../Api/services/eventSupplierApi';
import {
  EVENT_ROLES,
  ROLE_DISPLAY_NAMES,
  ROLE_DESCRIPTIONS,
  ROLE_DOT_COLORS,
  ROLE_BG_TINTS,
  getInvitableRoles,
} from '../../Utils/eventRolesConfig';
import RolePermissionsInfo from './RolePermissionsInfo';

/**
 * Role selection card — matches RoleSection header visual language
 */
const RoleOption = memo(({ role, selected, onSelect, disabled }) => {
  const roleName = ROLE_DISPLAY_NAMES[role];
  const roleDescription = ROLE_DESCRIPTIONS[role];
  const dotColor = ROLE_DOT_COLORS[role] || 'bg-gray-400';
  const bgTint = ROLE_BG_TINTS[role] || 'bg-muted';

  return (
    <button
      type="button"
      role="radio"
      aria-checked={selected}
      onClick={() => onSelect(role)}
      disabled={disabled}
      className={`
        w-full rounded-lg text-left transition-all duration-150
        focus:outline-none focus-visible:ring-2 focus-visible:ring-primary-500 focus-visible:ring-offset-2
        dark:focus-visible:ring-offset-background-900
        ${disabled ? 'opacity-50 cursor-not-allowed' : 'cursor-pointer'}
        ${selected
          ? `ring-2 ring-primary-500 ${bgTint}`
          : 'border border-border hover:bg-accent'
        }
      `}
    >
      <div className="flex items-center gap-2.5 px-3.5 py-2.5">
        {/* Colored dot */}
        <span className={`w-2 h-2 rounded-full ${dotColor} flex-shrink-0`} />

        {/* Role name */}
        <span className="text-xs font-semibold uppercase tracking-wider text-foreground flex-1">
          {roleName}
        </span>

        {/* Selection indicator */}
        <div className={`
          w-4 h-4 rounded-full border-2 flex items-center justify-center transition-colors flex-shrink-0
          ${selected
            ? 'border-primary-500 bg-primary-500'
            : 'border-border'
          }
        `}>
          {selected && (
            <svg className="w-2.5 h-2.5 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="3" d="M5 13l4 4L19 7" />
            </svg>
          )}
        </div>
      </div>

      {/* Description */}
      <div className="px-3.5 pb-2.5">
        <Text variant="caption" className={selected ? 'text-foreground' : 'text-muted-foreground'}>
          {roleDescription}
        </Text>
      </div>
    </button>
  );
});

RoleOption.displayName = 'RoleOption';

RoleOption.propTypes = {
  role: PropTypes.string.isRequired,
  selected: PropTypes.bool,
  onSelect: PropTypes.func.isRequired,
  disabled: PropTypes.bool,
};

/**
 * InviteCollaboratorModal Component
 */
const InviteCollaboratorModal = ({
  isOpen,
  onClose,
  eventId,
  currentUserRole,
  defaultRole = null,
}) => {
  const { t, i18n } = useTranslation(['team', 'common']);

  // Form state
  const [email, setEmail] = useState('');
  const [selectedRole, setSelectedRole] = useState(null);
  const [selectedFolderIds, setSelectedFolderIds] = useState([]);
  const [selectedSupplierIds, setSelectedSupplierIds] = useState([]);
  const [error, setError] = useState(null);
  const [success, setSuccess] = useState(false);
  const [showPermissionsInfo, setShowPermissionsInfo] = useState(false);

  // Pre-select role when defaultRole is provided
  useEffect(() => {
    if (isOpen && defaultRole) {
      setSelectedRole(defaultRole);
    }
  }, [isOpen, defaultRole]);

  // API mutation
  const [inviteCollaborator, { isLoading }] = useInviteCollaboratorMutation();

  // Roles that support folder sharing (ACCESS_LEVELS_STRATEGY.md)
  const roleSupportsSharing = selectedRole === EVENT_ROLES.CO_MANAGER || selectedRole === EVENT_ROLES.STAFF_LOGISTICS;

  // Fetch folders for sharing (CO_MANAGER and STAFF_LOGISTICS)
  const { data: foldersData, isLoading: isFoldersLoading } = useListFoldersByEventIdQuery(
    { eventId },
    { skip: !eventId || !roleSupportsSharing }
  );
  const folders = useMemo(() => foldersData?.items || [], [foldersData]);

  // Fetch suppliers for sharing (CO_MANAGER and STAFF_LOGISTICS)
  const { data: suppliersData, isLoading: isSuppliersLoading } = useListSuppliersEnhancedQuery(
    undefined,
    { skip: !roleSupportsSharing }
  );

  // Fetch event suppliers to filter out those already in the event
  // (sharing those is a no-op — collaborators see them automatically via EventSupplier)
  const { data: eventSuppliersData } = useListEventSuppliersByEventEnhancedQuery(
    { eventId },
    { skip: !roleSupportsSharing || !eventId }
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

  // Get roles that current user can invite
  const invitableRoles = getInvitableRoles(currentUserRole);

  // Email validation
  const validateEmail = (email) => {
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    return emailRegex.test(email);
  };

  // Handle folder selection toggle
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
  }, [selectedFolderIds.length, folders]);

  // Handle supplier selection toggle
  const handleToggleSupplier = useCallback((supplierId) => {
    setSelectedSupplierIds(prev =>
      prev.includes(supplierId)
        ? prev.filter(id => id !== supplierId)
        : [...prev, supplierId]
    );
  }, []);

  // Select/deselect all suppliers
  const handleToggleAllSuppliers = useCallback(() => {
    if (selectedSupplierIds.length === suppliers.length) {
      setSelectedSupplierIds([]);
    } else {
      setSelectedSupplierIds(suppliers.map(s => s.id));
    }
  }, [selectedSupplierIds.length, suppliers]);

  // Reset folder selection when role changes
  const handleRoleSelect = useCallback((role) => {
    setSelectedRole(role);
    const newRoleSupportsSharing = role === EVENT_ROLES.CO_MANAGER || role === EVENT_ROLES.STAFF_LOGISTICS;
    if (!newRoleSupportsSharing) {
      setSelectedFolderIds([]);
      setSelectedSupplierIds([]);
    }
  }, []);

  // Reset form
  const resetForm = useCallback(() => {
    setEmail('');
    setSelectedRole(null);
    setSelectedFolderIds([]);
    setSelectedSupplierIds([]);
    setError(null);
    setSuccess(false);
  }, []);

  // Handle close
  const handleClose = useCallback(() => {
    resetForm();
    onClose();
  }, [onClose, resetForm]);

  // Auto-close after success
  useEffect(() => {
    if (success) {
      const timer = setTimeout(handleClose, 4000);
      return () => clearTimeout(timer);
    }
  }, [success, handleClose]);

  // Handle submit
  const handleSubmit = async (e) => {
    e.preventDefault();
    setError(null);

    if (!email.trim()) {
      setError(t('team:invite.errors.emailRequired', 'Email é obrigatório'));
      return;
    }

    if (!validateEmail(email)) {
      setError(t('team:invite.errors.emailInvalid', 'Email inválido'));
      return;
    }

    if (!selectedRole) {
      setError(t('team:invite.errors.roleRequired', 'Selecione um role'));
      return;
    }

    try {
      const langCode = i18n.language?.split('-')[0] || 'pt';
      await inviteCollaborator({
        eventId,
        email: email.trim().toLowerCase(),
        role: selectedRole,
        sharedFolderIds: roleSupportsSharing ? selectedFolderIds : undefined,
        sharedSupplierIds: roleSupportsSharing ? selectedSupplierIds : undefined,
        language: ['pt', 'en', 'fr'].includes(langCode) ? langCode : 'pt',
      }).unwrap();

      setSuccess(true);
    } catch (err) {
      if (err?.data?.message?.includes('already exists')) {
        setError(t('team:invite.errors.alreadyInvited', 'Este email já foi convidado'));
      } else {
        setError(
          err?.data?.message ||
          t('team:invite.errors.generic', 'Erro ao enviar convite')
        );
      }
    }
  };

  // Success View
  if (success) {
    return (
      <Modal isOpen={isOpen} onClose={handleClose} size="sm" centered>
        <Card variant="default" className="shadow-none rounded-none sm:rounded-lg overflow-hidden">
          <Modal.Body className="flex flex-col items-center justify-center px-6 py-10 text-center">
            {/* Animated checkmark */}
            <div className="relative mb-5">
              <div className="absolute inset-0 w-16 h-16 rounded-full bg-success-100 dark:bg-success-900/30 animate-ping opacity-20" />
              <div className="relative w-16 h-16 bg-success-100 dark:bg-success-900/30 rounded-full flex items-center justify-center">
                <svg
                  className="w-8 h-8 text-success-500 dark:text-success-400"
                  fill="none"
                  stroke="currentColor"
                  viewBox="0 0 24 24"
                  aria-hidden="true"
                >
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.5" d="M5 13l4 4L19 7" />
                </svg>
              </div>
            </div>

            <Text variant="h4" className="font-semibold text-foreground mb-1.5">
              {t('team:invite.successTitle', 'Convite Enviado!')}
            </Text>
            <Text variant="body2" className="text-muted-foreground mb-2 max-w-xs">
              {t('team:invite.successMessage', 'Um email foi enviado para {{email}} com as instruções de acesso.', { email })}
            </Text>

            {/* Email chip */}
            <div className="inline-flex items-center gap-2 px-3 py-1.5 bg-background-50 dark:bg-background-800/50 rounded-full mb-6">
              <FiMail className="w-3.5 h-3.5 text-muted-foreground" aria-hidden="true" />
              <Text variant="caption" className="text-foreground font-medium">
                {email}
              </Text>
            </div>

            {/* Auto-close progress bar */}
            <div className="w-full max-w-[200px] h-1 bg-muted rounded-full overflow-hidden mb-5">
              <div
                className="h-full bg-success-400 dark:bg-success-500 rounded-full transition-all"
                style={{ animation: 'shrink-bar 4s linear forwards' }}
              />
            </div>

            <Button variant="ghost" size="sm" onClick={handleClose}>
              {t('common:actions.close', 'Fechar')}
            </Button>
          </Modal.Body>
        </Card>

        {/* Auto-close keyframes */}
        <style>{`@keyframes shrink-bar { from { width: 100%; } to { width: 0%; } }`}</style>
      </Modal>
    );
  }

  return (
    <Modal
      isOpen={isOpen}
      onClose={handleClose}
      size="lg"
      centered
    >
      <Card variant="default" className="shadow-none rounded-none sm:rounded-lg">
        <Modal.Header>
          <div className="flex items-center gap-2" id="invite-modal-title">
            <FiUserPlus className="h-5 w-5 text-primary-500" aria-hidden="true" />
            {t('team:invite.title', 'Convidar Colaborador')}
          </div>
        </Modal.Header>

        <form onSubmit={handleSubmit}>
          <Modal.Body className="space-y-5 max-h-[70vh] overflow-y-auto">
            {/* Info banner */}
            <div className="flex items-start gap-2.5 p-3 bg-primary-50/60 dark:bg-primary-900/15 rounded-lg border border-primary-100 dark:border-primary-800/30">
              <FiInfo className="h-4 w-4 text-primary-500 dark:text-primary-400 flex-shrink-0 mt-0.5" aria-hidden="true" />
              <Text variant="caption" className="text-primary-700 dark:text-primary-300">
                {t(
                  'team:invite.info',
                  'O colaborador receberá um email com o convite. Após aceitar, terá acesso ao evento com as permissões do role selecionado.'
                )}
              </Text>
            </div>

            {/* Email input */}
            <div>
              <label
                htmlFor="invite-email"
                className="block text-sm font-medium text-foreground mb-1"
              >
                {t('team:invite.emailLabel', 'Email do colaborador')}
              </label>
              <div className="relative">
                <FiMail className="absolute left-3 top-1/2 -translate-y-1/2 h-5 w-5 text-muted-foreground" aria-hidden="true" />
                <input
                  id="invite-email"
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="colaborador@exemplo.com"
                  className={`
                    w-full pl-10 pr-4 py-2.5 rounded-lg border
                    bg-card
                    focus:ring-2 focus:ring-primary-500 focus:border-primary-500
                    ${error ? 'border-error-500' : 'border-border'}
                  `}
                  disabled={isLoading}
                />
              </div>
            </div>

            {/* Role selection */}
            <div>
              <div className="flex items-center justify-between mb-2">
                <label className="block text-sm font-medium text-foreground">
                  {t('team:invite.roleLabel', 'Selecionar Role')}
                </label>
                <button
                  type="button"
                  onClick={() => setShowPermissionsInfo(true)}
                  className="inline-flex items-center gap-1 text-xs text-primary-600 dark:text-primary-400 hover:text-primary-700 dark:hover:text-primary-300 transition-colors"
                >
                  <FiInfo className="h-3.5 w-3.5" aria-hidden="true" />
                  <span>Ver permissões</span>
                </button>
              </div>
              <div role="radiogroup" aria-label={t('team:invite.roleLabel', 'Selecionar Role')} className="space-y-2">
                {invitableRoles.map((role) => (
                  <RoleOption
                    key={role}
                    role={role}
                    selected={selectedRole === role}
                    onSelect={handleRoleSelect}
                    disabled={isLoading}
                  />
                ))}
              </div>
            </div>

            {/* Folder sharing section */}
            {roleSupportsSharing && (
              <div className="space-y-3">
                {/* Section header bar */}
                <div className="flex items-center gap-2.5 px-3.5 py-2 bg-background-50 dark:bg-background-800/30 rounded-lg">
                  <FiFolder className="w-3.5 h-3.5 text-muted-foreground" aria-hidden="true" />
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
                    <FiFolder className="h-6 w-6 text-muted-foreground mb-2" aria-hidden="true" />
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
                          {/* Custom checkbox */}
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

                          {/* Folder color dot */}
                          <div
                            className="w-2.5 h-2.5 rounded-full flex-shrink-0"
                            style={{ backgroundColor: folder.color || '#3B82F6' }}
                          />

                          {/* Folder name */}
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
                {/* Section header bar */}
                <div className="flex items-center gap-2.5 px-3.5 py-2 bg-background-50 dark:bg-background-800/30 rounded-lg">
                  <FiPackage className="w-3.5 h-3.5 text-muted-foreground" aria-hidden="true" />
                  <span className="text-xs font-semibold uppercase tracking-wider text-muted-foreground flex-1">
                    {t('team:invite.shareSuppliers', 'Partilhar Fornecedores')}
                  </span>
                  {suppliers.length > 0 && (
                    <Badge variant="neutral" tone="soft" size="xs">
                      {selectedSupplierIds.length}/{suppliers.length}
                    </Badge>
                  )}
                  {suppliers.length > 0 && (
                    <button
                      type="button"
                      onClick={handleToggleAllSuppliers}
                      className="text-xs font-medium text-primary-600 dark:text-primary-400 hover:text-primary-700 dark:hover:text-primary-300 transition-colors"
                    >
                      {selectedSupplierIds.length === suppliers.length
                        ? t('team:invite.deselectAll', 'Desmarcar')
                        : t('team:invite.selectAll', 'Marcar todas')}
                    </button>
                  )}
                </div>

                <Text variant="caption" className="text-muted-foreground -mt-1 px-1">
                  {t('team:invite.shareSuppliersDescription', 'Fornecedores da tua lista que o colaborador pode adicionar a este evento. Os que já estão no evento são acessíveis automaticamente.')}
                </Text>

                {/* Supplier list */}
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
                    <FiPackage className="h-6 w-6 text-muted-foreground mb-2" aria-hidden="true" />
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
                          {/* Custom checkbox */}
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

                          {/* Supplier name + category */}
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

            {/* Error message */}
            {error && (
              <div role="alert" className="p-3 bg-error-50 dark:bg-error-900/20 rounded-lg flex items-start gap-2.5">
                <FiAlertTriangle className="w-4 h-4 text-error-500 flex-shrink-0 mt-0.5" aria-hidden="true" />
                <Text variant="body2" className="text-error-600 dark:text-error-400">
                  {error}
                </Text>
              </div>
            )}
          </Modal.Body>

          <Modal.Footer>
            <div className="flex flex-col-reverse xs:flex-row xs:justify-end gap-2 w-full">
              <Button
                variant="ghost"
                onClick={handleClose}
                disabled={isLoading}
                className="w-full xs:w-auto"
              >
                {t('common:actions.cancel', 'Cancelar')}
              </Button>
              <Button
                type="submit"
                variant="primary"
                loading={isLoading}
                disabled={!email || !selectedRole}
                className="w-full xs:w-auto"
              >
                {t('team:invite.submit', 'Enviar Convite')}
              </Button>
            </div>
          </Modal.Footer>
        </form>
      </Card>

      {/* Role Permissions Info Modal */}
      <RolePermissionsInfo
        isOpen={showPermissionsInfo}
        onClose={() => setShowPermissionsInfo(false)}
        roles={invitableRoles}
      />
    </Modal>
  );
};

InviteCollaboratorModal.propTypes = {
  isOpen: PropTypes.bool.isRequired,
  onClose: PropTypes.func.isRequired,
  eventId: PropTypes.string.isRequired,
  currentUserRole: PropTypes.oneOf(Object.values(EVENT_ROLES)).isRequired,
  defaultRole: PropTypes.oneOf(Object.values(EVENT_ROLES)),
};

export default memo(InviteCollaboratorModal);
