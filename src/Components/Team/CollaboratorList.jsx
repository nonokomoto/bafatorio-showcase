/**
 * @file CollaboratorList.jsx
 * @description Team list with avatar strip, role-based sections, and pending invites
 * Implements the Priority #7 wireframe: avatars + role sections + quick invite + pending highlighted
 */

import { memo, useMemo } from 'react';
import PropTypes from 'prop-types';
import { useTranslation } from 'react-i18next';
import { FiPlus, FiUsers } from 'react-icons/fi';
import { Text, Badge } from '../UI';
import CollaboratorCard from './CollaboratorCard';
import { EVENT_ROLES, ROLE_DISPLAY_NAMES, ROLE_DOT_COLORS, ROLE_BADGE_VARIANTS, ROLE_I18N_MAP, canRemoveCollaborator } from '../../Utils/eventRolesConfig';
import { getAvatarColor, getInitials } from '../../Utils/avatarColors';

// ---- Avatar Strip ----

const AvatarStrip = memo(({ collaborators, onInviteClick, canInvite }) => {
  const { t } = useTranslation(['team']);
  const MAX_VISIBLE = 5;
  const visible = collaborators.slice(0, MAX_VISIBLE);
  const overflow = collaborators.length - MAX_VISIBLE;

  return (
    <div className="flex items-center mb-5">
      {/* Overlapping avatar circles */}
      <div className="flex -space-x-2">
        {visible.map((collab, i) => {
          const color = getAvatarColor(collab.userId || collab.userEmail);
          const initials = getInitials(collab.userName, collab.userEmail);
          return (
            <div
              key={collab.id}
              className={`w-10 h-10 rounded-full ${color.bg} ${color.text} flex items-center justify-center text-xs font-semibold ring-2 ring-white dark:ring-background-900`}
              style={{ zIndex: MAX_VISIBLE - i }}
              title={collab.userName || collab.userEmail}
            >
              {initials}
            </div>
          );
        })}

        {/* Overflow counter */}
        {overflow > 0 && (
          <div
            className="w-10 h-10 rounded-full bg-muted flex items-center justify-center text-xs font-semibold text-foreground ring-2 ring-white dark:ring-background-900"
            style={{ zIndex: 0 }}
          >
            +{overflow}
          </div>
        )}
      </div>

      {/* Quick invite button */}
      {canInvite && (
        <button
          onClick={() => onInviteClick?.(null)}
          className="ml-2 w-10 h-10 rounded-full border-2 border-dashed border-border flex items-center justify-center text-muted-foreground hover:border-primary-400 hover:text-primary-500 dark:hover:border-primary-500 dark:hover:text-primary-400 transition-colors"
          aria-label={t('team:actions.inviteMember', 'Convidar membro')}
        >
          <FiPlus className="w-4 h-4" />
        </button>
      )}
    </div>
  );
});

AvatarStrip.displayName = 'AvatarStrip';

AvatarStrip.propTypes = {
  collaborators: PropTypes.array.isRequired,
  onInviteClick: PropTypes.func,
  canInvite: PropTypes.bool,
};

// ---- Role Section ----

const RoleSection = memo(({ role, members, onRemove, onEdit, canRemove, canEdit, currentUserRole, removingId, onInviteClick, canInvite }) => {
  const { t } = useTranslation(['team']);
  const roleName = t(`team:roles.${ROLE_I18N_MAP[role]}.name`, ROLE_DISPLAY_NAMES[role] || role);

  const badgeVariant = ROLE_BADGE_VARIANTS[role] || 'neutral';
  const dotColor = ROLE_DOT_COLORS[role] || 'bg-gray-400';

  return (
    <section>
      {/* Section header */}
      <div className="flex items-center gap-2 px-4 py-2 bg-background-50 dark:bg-background-800/30 rounded-lg mb-1">
        <span className={`w-2 h-2 rounded-full ${dotColor}`} />
        <Text variant="overline" className="text-muted-foreground uppercase tracking-wider text-xs font-semibold flex-1">
          {roleName}
        </Text>
        <Badge variant={badgeVariant} tone="soft" size="xs">
          {members.length}
        </Badge>
        {canInvite && (
          <button
            onClick={() => onInviteClick(role)}
            className="p-1 rounded-md text-muted-foreground hover:text-primary-500 hover:bg-primary-50 dark:hover:bg-primary-900/20 transition-colors"
            aria-label={t('team:actions.invite', 'Convidar')}
          >
            <FiPlus className="w-3.5 h-3.5" />
          </button>
        )}
      </div>

      {/* Member rows */}
      <div className="divide-y divide-border">
        {members.map((collab) => (
          <CollaboratorCard
            key={collab.id}
            collaborator={collab}
            onRemove={onRemove}
            onEdit={onEdit}
            canRemove={canRemove && canRemoveCollaborator(currentUserRole, collab.role)}
            canEdit={canEdit}
            isRemoving={removingId === collab.id}
          />
        ))}
      </div>
    </section>
  );
});

RoleSection.displayName = 'RoleSection';

RoleSection.propTypes = {
  role: PropTypes.string.isRequired,
  members: PropTypes.array.isRequired,
  onRemove: PropTypes.func,
  onEdit: PropTypes.func,
  canRemove: PropTypes.bool,
  canEdit: PropTypes.bool,
  currentUserRole: PropTypes.string,
  removingId: PropTypes.string,
  onInviteClick: PropTypes.func,
  canInvite: PropTypes.bool,
};

// ---- Pending Section ----

const PendingSection = memo(({ pending, onRemove, canRemove, currentUserRole, removingId }) => {
  const { t } = useTranslation(['team']);

  return (
    <section>
      {/* Warning-tinted header */}
      <div className="flex items-center gap-2 px-4 py-2 bg-warning-50 dark:bg-warning-900/20 rounded-lg mb-1">
        <span className="w-2 h-2 rounded-full bg-warning-400" />
        <Text variant="overline" className="text-warning-600 dark:text-warning-400 uppercase tracking-wider text-xs font-semibold flex-1">
          {t('team:list.pendingInvites', 'Convites Pendentes')}
        </Text>
        <Badge variant="warning" tone="soft" size="xs">
          {pending.length}
        </Badge>
      </div>

      {/* Pending rows */}
      <div className="divide-y divide-warning-100/50 dark:divide-warning-900/20">
        {pending.map((collab) => (
          <CollaboratorCard
            key={collab.id}
            collaborator={collab}
            onRemove={onRemove}
            canRemove={canRemove && canRemoveCollaborator(currentUserRole, collab.role)}
            isRemoving={removingId === collab.id}
            isPending
          />
        ))}
      </div>
    </section>
  );
});

PendingSection.displayName = 'PendingSection';

PendingSection.propTypes = {
  pending: PropTypes.array.isRequired,
  onRemove: PropTypes.func,
  canRemove: PropTypes.bool,
  currentUserRole: PropTypes.string,
  removingId: PropTypes.string,
};

// ---- Empty State ----

const EmptyState = memo(({ message }) => (
  <div className="flex flex-col items-center justify-center py-8 text-center">
    <FiUsers className="h-12 w-12 text-muted-foreground mb-3" />
    <Text variant="body2" className="text-muted-foreground">
      {message}
    </Text>
  </div>
));

EmptyState.displayName = 'EmptyState';

EmptyState.propTypes = {
  message: PropTypes.string.isRequired,
};

// ---- Loading Skeleton ----

const CollaboratorListSkeleton = memo(() => (
  <div className="space-y-3">
    {/* Avatar strip skeleton */}
    <div className="flex -space-x-2 mb-5">
      {[1, 2, 3].map((i) => (
        <div key={i} className="w-10 h-10 rounded-full bg-muted animate-pulse ring-2 ring-white dark:ring-background-900" />
      ))}
    </div>
    {/* Section skeleton */}
    <div className="h-8 w-40 bg-muted rounded animate-pulse" />
    {[1, 2].map((i) => (
      <div key={i} className="flex items-center gap-3 px-4 py-3">
        <div className="w-8 h-8 rounded-full bg-muted animate-pulse" />
        <div className="flex-1 space-y-1.5">
          <div className="h-4 w-32 bg-muted rounded animate-pulse" />
          <div className="h-3 w-48 bg-muted rounded animate-pulse" />
        </div>
      </div>
    ))}
  </div>
));

CollaboratorListSkeleton.displayName = 'CollaboratorListSkeleton';

// ---- Main Component ----

const ROLE_ORDER = [EVENT_ROLES.CO_MANAGER, EVENT_ROLES.STAFF_LOGISTICS, EVENT_ROLES.STAFF_CHECKIN];

const CollaboratorList = ({
  collaborators = [],
  onRemove,
  onEdit,
  canRemove,
  canEdit = false,
  currentUserRole,
  removingId,
  isLoading = false,
  showPending = true,
  onInviteForRole,
  canInvite = false,
}) => {
  const { t } = useTranslation(['team']);

  // Group by status, then accepted by role
  const { roleGroups, pending, allAccepted } = useMemo(() => {
    const accepted = [];
    const pending = [];

    collaborators.forEach((collab) => {
      if (collab.status === 'ACCEPTED') {
        accepted.push(collab);
      } else if (collab.status === 'PENDING') {
        pending.push(collab);
      }
    });

    // Group accepted by role
    const groups = {};
    ROLE_ORDER.forEach((role) => {
      const members = accepted.filter((c) => c.role === role);
      if (members.length > 0) {
        groups[role] = members;
      }
    });

    return { roleGroups: groups, pending, allAccepted: accepted };
  }, [collaborators]);

  if (isLoading) {
    return <CollaboratorListSkeleton />;
  }

  const hasNoCollaborators = allAccepted.length === 0 && pending.length === 0;

  if (hasNoCollaborators) {
    return (
      <EmptyState message={t('team:list.empty', 'Nenhum colaborador adicionado')} />
    );
  }

  return (
    <div className="space-y-4">
      {/* Avatar strip */}
      {allAccepted.length > 0 && (
        <AvatarStrip
          collaborators={allAccepted}
          onInviteClick={onInviteForRole}
          canInvite={canInvite}
        />
      )}

      {/* Role sections */}
      {ROLE_ORDER.map((role) =>
        roleGroups[role] ? (
          <RoleSection
            key={role}
            role={role}
            members={roleGroups[role]}
            onRemove={onRemove}
            onEdit={onEdit}
            canRemove={canRemove}
            canEdit={canEdit}
            currentUserRole={currentUserRole}
            removingId={removingId}
            onInviteClick={onInviteForRole}
            canInvite={canInvite}
          />
        ) : null
      )}

      {/* Pending invites */}
      {showPending && pending.length > 0 && (
        <PendingSection
          pending={pending}
          onRemove={onRemove}
          canRemove={canRemove}
          currentUserRole={currentUserRole}
          removingId={removingId}
        />
      )}
    </div>
  );
};

CollaboratorList.propTypes = {
  collaborators: PropTypes.arrayOf(
    PropTypes.shape({
      id: PropTypes.string.isRequired,
      userId: PropTypes.string,
      userEmail: PropTypes.string.isRequired,
      role: PropTypes.string.isRequired,
      status: PropTypes.string.isRequired,
    })
  ),
  onRemove: PropTypes.func,
  onEdit: PropTypes.func,
  canRemove: PropTypes.bool,
  canEdit: PropTypes.bool,
  currentUserRole: PropTypes.string,
  removingId: PropTypes.string,
  isLoading: PropTypes.bool,
  showPending: PropTypes.bool,
  onInviteForRole: PropTypes.func,
  canInvite: PropTypes.bool,
};

export default memo(CollaboratorList);
