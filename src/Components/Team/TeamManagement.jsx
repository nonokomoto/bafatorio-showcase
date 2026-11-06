/**
 * @file TeamManagement.jsx
 * @description Main component for managing event team/collaborators
 * Implements the team management UI per ACCESS_LEVELS_STRATEGY.md
 *
 * Hierarchy:
 * OWNER (Organizador) → Full control, can invite anyone
 * CO_MANAGER (Co-Organizador) → Can invite Staff only
 * STAFF → Cannot invite anyone
 */

import { useState, useCallback, memo } from 'react';
import PropTypes from 'prop-types';
import { useTranslation } from 'react-i18next';
import { FiUserPlus, FiUsers, FiShield, FiInfo, FiAlertTriangle } from 'react-icons/fi';
import { Card, Text, Button, Badge } from '../UI';
import CollaboratorList from './CollaboratorList';
import InviteCollaboratorModal from './InviteCollaboratorModal';
import EditCollaboratorModal from './EditCollaboratorModal';
import RolePermissionsInfo from './RolePermissionsInfo';
import {
  useListEventCollaboratorsQuery,
  useRevokeCollaboratorMutation,
} from '../../Api/services/collaboratorApi';
import {
  getInvitableRoles,
} from '../../Utils/eventRolesConfig';

/**
 * Empty state component
 */
const EmptyStateWithCTA = memo(() => {
  const { t } = useTranslation(['team']);

  return (
    <div className="flex flex-col items-center justify-center py-8 px-4">
      {/* Minimal illustration */}
      <div className="w-12 h-12 rounded-full bg-muted flex items-center justify-center mb-4">
        <FiUsers className="h-5 w-5 text-muted-foreground" />
      </div>

      {/* Text */}
      <Text variant="body2" className="text-foreground mb-1 text-center">
        {t('team:empty.title', 'A sua equipa começa aqui')}
      </Text>
      <Text variant="caption" className="text-muted-foreground text-center max-w-xs">
        {t('team:empty.description', 'Convide colaboradores para ajudar na gestão do evento. Defina permissões específicas para cada membro.')}
      </Text>
    </div>
  );
});

EmptyStateWithCTA.displayName = 'EmptyStateWithCTA';


/**
 * Error state component
 */
const ErrorState = memo(({ message, onRetry }) => {
  const { t } = useTranslation(['team', 'common']);

  return (
    <div className="flex flex-col items-center justify-center py-8 px-4">
      <div className="w-12 h-12 rounded-full bg-error-50 dark:bg-error-900/20 flex items-center justify-center mb-4">
        <FiAlertTriangle className="h-5 w-5 text-error-500 dark:text-error-400" />
      </div>
      <Text variant="body2" className="text-foreground mb-1 text-center">
        {message || t('team:error.loadFailed', 'Erro ao carregar a equipa')}
      </Text>
      {onRetry && (
        <button
          onClick={onRetry}
          className="mt-3 text-sm text-primary-600 dark:text-primary-400 hover:text-primary-700 dark:hover:text-primary-300 transition-colors"
        >
          {t('common:actions.retry', 'Tentar novamente')}
        </button>
      )}
    </div>
  );
});

ErrorState.displayName = 'ErrorState';

ErrorState.propTypes = {
  message: PropTypes.string,
  onRetry: PropTypes.func,
};

/**
 * No permission banner component
 */
const NoPermissionBanner = memo(() => {
  const { t } = useTranslation(['team']);

  return (
    <div className="flex flex-col items-center justify-center py-12 px-4">
      <div className="w-16 h-16 rounded-full bg-muted flex items-center justify-center mb-4">
        <FiShield className="h-8 w-8 text-muted-foreground" />
      </div>
      <Text variant="body2" className="text-muted-foreground text-center">
        {t('team:noPermission', 'Não tem permissão para gerir a equipa deste evento')}
      </Text>
    </div>
  );
});

NoPermissionBanner.displayName = 'NoPermissionBanner';

/**
 * Loading skeleton that mirrors the final layout
 */
const TeamSkeleton = memo(() => {
  const shimmer = "bg-muted animate-pulse rounded";

  return (
    <Card variant="default" padded="lg" elevated className="animate-fade-in">
      {/* Header skeleton */}
      <div className="flex flex-col sm:flex-row sm:items-start sm:justify-between gap-4 mb-6">
        <div className="flex-1">
          <div className="flex items-center gap-2 mb-2">
            <div className={`${shimmer} h-6 w-16`} />
            <div className={`${shimmer} h-5 w-24 rounded-full`} />
          </div>
          <div className="flex items-center gap-1.5">
            <div className={`${shimmer} h-4 w-56`} />
            <div className={`${shimmer} w-5 h-5 rounded-full`} />
          </div>
        </div>
      </div>

      {/* Content skeleton - mimics empty state */}
      <div className="flex flex-col items-center justify-center py-8">
        <div className={`${shimmer} w-12 h-12 rounded-full mb-4`} />
        <div className={`${shimmer} h-4 w-40 mb-1`} />
        <div className={`${shimmer} h-3 w-56 mb-4`} />
        <div className={`${shimmer} h-7 w-44 rounded-lg`} />
      </div>
    </Card>
  );
});

TeamSkeleton.displayName = 'TeamSkeleton';

/**
 * Content area skeleton (used when header is already loaded)
 */
const ContentSkeleton = memo(() => (
  <div className="flex flex-col items-center justify-center py-10 px-4">
    <div className="w-16 h-16 rounded-full bg-muted animate-pulse mb-5" />
    <div className="w-44 h-5 bg-muted rounded animate-pulse mb-2" />
    <div className="w-64 h-4 bg-muted rounded animate-pulse mb-1.5" />
    <div className="w-52 h-4 bg-muted rounded animate-pulse mb-5" />
    <div className="w-48 h-9 bg-muted rounded-lg animate-pulse" />
  </div>
));

ContentSkeleton.displayName = 'ContentSkeleton';

/**
 * TeamManagement Component
 * Main component for managing event collaborators
 */
const TeamManagement = ({ eventId, role, isOwner, canInviteStaff, canInviteCoManager, canRemoveTeamMember }) => {
  const { t } = useTranslation(['team', 'common']);

  // Modal state
  const [isInviteModalOpen, setIsInviteModalOpen] = useState(false);
  const [preselectedRole, setPreselectedRole] = useState(null);
  const [isPermissionsModalOpen, setIsPermissionsModalOpen] = useState(false);
  const [editingCollaborator, setEditingCollaborator] = useState(null);
  const [removingCollaboratorId, setRemovingCollaboratorId] = useState(null);
  const [removeError, setRemoveError] = useState(null);

  // Fetch collaborators
  const {
    data: collaborators = [],
    isLoading: isLoadingCollaborators,
    refetch,
    error: collaboratorsError,
  } = useListEventCollaboratorsQuery({ eventId }, { skip: !eventId });

  // Revoke mutation
  const [revokeCollaborator] = useRevokeCollaboratorMutation();

  // Can user invite anyone? (permissions received as props — already booleans)
  const canInvite = canInviteStaff || canInviteCoManager;

  // Has collaborators?
  const hasCollaborators = collaborators.length > 0;

  // Handle invite modal
  const handleOpenInviteModal = useCallback(() => {
    setPreselectedRole(null);
    setIsInviteModalOpen(true);
  }, []);

  const handleCloseInviteModal = useCallback(() => {
    setIsInviteModalOpen(false);
    setPreselectedRole(null);
  }, []);

  // Handle invite from role section "+" button (pre-selects role)
  const handleInviteForRole = useCallback((role) => {
    setPreselectedRole(role);
    setIsInviteModalOpen(true);
  }, []);

  // Handle remove collaborator
  const handleRemoveCollaborator = useCallback(
    async (collaboratorId) => {
      if (!canRemoveTeamMember) return;

      const confirmed = window.confirm(t('team:confirm.removeMessage', 'Tem a certeza que deseja remover este colaborador?'));
      if (!confirmed) return;

      try {
        setRemovingCollaboratorId(collaboratorId);
        setRemoveError(null);
        await revokeCollaborator({ collaboratorId }).unwrap();
      } catch (err) {
        setRemoveError(t('team:error.removeFailed', 'Erro ao remover colaborador'));
      } finally {
        setRemovingCollaboratorId(null);
      }
    },
    [canRemoveTeamMember, revokeCollaborator, t]
  );

  // Handle edit collaborator
  const handleEditCollaborator = useCallback((collaborator) => {
    setEditingCollaborator(collaborator);
  }, []);

  const handleCloseEditModal = useCallback(() => {
    setEditingCollaborator(null);
  }, []);

  // No permission
  if (!role || (!canInviteStaff && !canRemoveTeamMember)) {
    return (
      <Card variant="default" padded="lg" elevated className="animate-fade-in">
        <NoPermissionBanner />
      </Card>
    );
  }

  return (
    <Card variant="default" padded="lg" elevated className="animate-fade-in">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-start sm:justify-between gap-4 mb-6">
        <div className="flex-1">
          {/* Title row with owner badge and count */}
          <div className="flex items-center gap-2 mb-2">
            <Text variant="h5" className="font-semibold text-foreground">
              {t('team:title', 'Equipa')}
            </Text>
            {isOwner && (
              <Badge variant="warning" tone="soft" size="sm" className="flex items-center gap-1">
                <span className="text-xs">👑</span>
                <span>{t('team:owner.badge', 'Organizador')}</span>
              </Badge>
            )}
            {hasCollaborators && (
              <Badge variant="neutral" tone="soft" size="sm">
                {collaborators.length}
              </Badge>
            )}
          </div>

          {/* Description with role info button */}
          <div className="flex items-center gap-1.5">
            <Text variant="body2" className="text-muted-foreground">
              {t('team:description', 'Gerir colaboradores e permissões do evento')}
            </Text>
            <button
              onClick={() => setIsPermissionsModalOpen(true)}
              className="inline-flex items-center justify-center w-5 h-5 rounded-full text-muted-foreground hover:text-primary-500 hover:bg-primary-50 dark:hover:bg-primary-900/20 transition-all"
              aria-label={t('team:legend.title', 'Roles disponíveis')}
            >
              <FiInfo className="h-3.5 w-3.5" />
            </button>
          </div>
        </div>

        {/* Invite button */}
        {canInvite && (
          <Button
            id="fab-action-team"
            variant="primary"
            size="sm"
            onClick={handleOpenInviteModal}
          >
            <span className="flex items-center">
              <FiUserPlus className="text-sm mr-1.5" />
              {t('team:actions.inviteMember', 'Convidar Membro')}
            </span>
          </Button>
        )}
      </div>

      {/* Remove error banner */}
      {removeError && (
        <div className="mb-4 p-3 bg-error-50 dark:bg-error-900/20 rounded-lg flex items-center justify-between">
          <Text variant="body2" className="text-error-600 dark:text-error-400">
            {removeError}
          </Text>
          <button
            onClick={() => setRemoveError(null)}
            className="text-error-400 hover:text-error-600 dark:hover:text-error-300 ml-2"
            aria-label={t('common:actions.dismiss', 'Fechar')}
          >
            &times;
          </button>
        </div>
      )}

      {/* Content: Error, Loading, Empty state or Collaborator list */}
      {collaboratorsError ? (
        <ErrorState onRetry={refetch} />
      ) : isLoadingCollaborators ? (
        <ContentSkeleton />
      ) : hasCollaborators ? (
        <CollaboratorList
          collaborators={collaborators}
          onRemove={handleRemoveCollaborator}
          onEdit={handleEditCollaborator}
          canRemove={canRemoveTeamMember}
          canEdit={isOwner}
          currentUserRole={role}
          removingId={removingCollaboratorId}
          isLoading={false}
          showPending={true}
          onInviteForRole={handleInviteForRole}
          canInvite={canInvite}
        />
      ) : (
        <EmptyStateWithCTA />
      )}

      {/* Invite modal */}
      {canInvite && (
        <InviteCollaboratorModal
          isOpen={isInviteModalOpen}
          onClose={handleCloseInviteModal}
          eventId={eventId}
          currentUserRole={role}
          defaultRole={preselectedRole}
        />
      )}

      {/* Edit collaborator modal (Owner only) */}
      {isOwner && (
        <EditCollaboratorModal
          isOpen={!!editingCollaborator}
          onClose={handleCloseEditModal}
          collaborator={editingCollaborator}
          eventId={eventId}
        />
      )}

      {/* Role Permissions Info Modal */}
      <RolePermissionsInfo
        isOpen={isPermissionsModalOpen}
        onClose={() => setIsPermissionsModalOpen(false)}
        roles={getInvitableRoles(role)}
      />
    </Card>
  );
};

TeamManagement.propTypes = {
  eventId: PropTypes.string.isRequired,
  role: PropTypes.string,
  isOwner: PropTypes.bool,
  canInviteStaff: PropTypes.bool,
  canInviteCoManager: PropTypes.bool,
  canRemoveTeamMember: PropTypes.bool,
};

export default memo(TeamManagement);
