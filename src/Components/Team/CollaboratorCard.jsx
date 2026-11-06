/**
 * @file CollaboratorCard.jsx
 * @description Row component for displaying an individual team member
 * Uses colored avatar circle with initials per wireframe spec
 */

import { memo } from 'react';
import PropTypes from 'prop-types';
import { useTranslation } from 'react-i18next';
import { FiTrash2, FiClock, FiEdit2, FiFolder, FiPackage } from 'react-icons/fi';
import { Text, Badge } from '../UI';
import {
  EVENT_ROLES,
  ROLE_DISPLAY_NAMES,
  ROLE_I18N_MAP,
} from '../../Utils/eventRolesConfig';
import { getAvatarColor, getInitials } from '../../Utils/avatarColors';

/**
 * Get badge variant based on role
 */
const getRoleBadgeVariant = (role) => {
  switch (role) {
    case EVENT_ROLES.OWNER:
      return 'warning';
    case EVENT_ROLES.CO_MANAGER:
      return 'primary';
    case EVENT_ROLES.STAFF_CHECKIN:
      return 'success';
    case EVENT_ROLES.STAFF_LOGISTICS:
      return 'info';
    default:
      return 'neutral';
  }
};

/**
 * CollaboratorCard — Team member row
 * Displays: colored avatar + name/email + role badge + remove action (hover-revealed)
 */
const CollaboratorCard = ({
  collaborator,
  onRemove,
  onEdit,
  canRemove = false,
  canEdit = false,
  isRemoving = false,
  isPending = false,
}) => {
  const { t } = useTranslation(['team']);

  const { id, userId, userEmail, userName, role, invitedAt, sharedFolderIds, sharedSupplierIds } = collaborator;
  const sharedFoldersCount = sharedFolderIds?.length || 0;
  const sharedSuppliersCount = sharedSupplierIds?.length || 0;

  const initials = getInitials(userName, userEmail);
  // Hasha o userId (sub) para a cor bater com a da agenda (ScheduleAuthorAvatar),
  // que só recebe userId por privacidade. Pendentes ainda não têm sub → email.
  const avatarColor = getAvatarColor(userId || userEmail);
  const roleName = t(`team:roles.${ROLE_I18N_MAP[role]}.name`, ROLE_DISPLAY_NAMES[role] || role);

  const formatDate = (dateString) => {
    if (!dateString) return '';
    return new Date(dateString).toLocaleDateString('pt-PT', {
      day: '2-digit',
      month: '2-digit',
      year: 'numeric',
    });
  };

  const handleRemove = () => {
    if (onRemove && canRemove) {
      onRemove(id);
    }
  };

  const handleEdit = () => {
    if (onEdit && canEdit) {
      onEdit(collaborator);
    }
  };

  // Pending invite row
  if (isPending) {
    return (
      <div className="group relative flex items-center gap-3 px-4 py-3 rounded-lg hover:bg-warning-50/50 dark:hover:bg-warning-900/10 transition-colors">
        {/* Avatar with clock overlay */}
        <div className="relative flex-shrink-0">
          <div className={`w-8 h-8 rounded-full ${avatarColor.bg} ${avatarColor.text} flex items-center justify-center text-xs font-semibold opacity-60`}>
            {initials}
          </div>
          <div className="absolute -bottom-0.5 -right-0.5 w-3.5 h-3.5 rounded-full bg-warning-400 ring-2 ring-white dark:ring-background-900 flex items-center justify-center">
            <FiClock className="w-2 h-2 text-white" />
          </div>
        </div>

        {/* Info */}
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2">
            <Text variant="body2" className="font-medium text-foreground truncate">
              {userEmail}
            </Text>
            <Badge variant={getRoleBadgeVariant(role)} tone="soft" size="xs">
              {roleName}
            </Badge>
          </div>
          {invitedAt && (
            <Text variant="caption" className="text-muted-foreground">
              {t('team:card.invitedAt', 'Convidado em')}: {formatDate(invitedAt)}
            </Text>
          )}
        </div>

        {/* Remove action */}
        {canRemove && (
          <button
            onClick={handleRemove}
            disabled={isRemoving}
            className="opacity-0 group-hover:opacity-100 group-focus-within:opacity-100 transition-opacity p-1.5 rounded-md text-error-400 hover:text-error-600 hover:bg-error-50 dark:hover:bg-error-900/20 flex-shrink-0"
            aria-label={t('team:actions.remove', 'Remover')}
          >
            {isRemoving ? (
              <div className="w-4 h-4 border-2 border-error-400 border-t-transparent rounded-full animate-spin" />
            ) : (
              <FiTrash2 className="w-4 h-4" />
            )}
          </button>
        )}
      </div>
    );
  }

  // Active member row
  return (
    <div className="group relative flex items-center gap-3 px-4 py-3 rounded-lg hover:bg-accent transition-colors">
      {/* Colored avatar */}
      <div className={`w-8 h-8 rounded-full ${avatarColor.bg} ${avatarColor.text} flex items-center justify-center text-xs font-semibold flex-shrink-0`}>
        {initials}
      </div>

      {/* Name + email */}
      <div className="flex-1 min-w-0">
        <Text variant="body2" className="font-medium text-foreground truncate">
          {userName || userEmail}
        </Text>
        {userName && (
          <Text variant="caption" className="text-muted-foreground truncate">
            {userEmail}
          </Text>
        )}
      </div>

      {/* Sharing indicators */}
      {(sharedFoldersCount > 0 || sharedSuppliersCount > 0) && (
        <div className="flex items-center gap-2 flex-shrink-0">
          {sharedFoldersCount > 0 && (
            <span className="inline-flex items-center gap-1 text-xs text-muted-foreground" title={t('team:card.sharedFolders', { count: sharedFoldersCount })}>
              <FiFolder className="w-3 h-3" />
              {sharedFoldersCount}
            </span>
          )}
          {sharedSuppliersCount > 0 && (
            <span className="inline-flex items-center gap-1 text-xs text-muted-foreground" title={t('team:card.sharedSuppliers', { count: sharedSuppliersCount })}>
              <FiPackage className="w-3 h-3" />
              {sharedSuppliersCount}
            </span>
          )}
        </div>
      )}

      {/* Actions (hover-revealed) */}
      <div className="flex items-center gap-0.5 opacity-0 group-hover:opacity-100 group-focus-within:opacity-100 transition-opacity flex-shrink-0">
        {canEdit && (
          <button
            onClick={handleEdit}
            className="p-1.5 rounded-md text-muted-foreground hover:text-primary-600 hover:bg-primary-50 dark:hover:bg-primary-900/20"
            aria-label={t('team:actions.edit', 'Editar')}
          >
            <FiEdit2 className="w-4 h-4" />
          </button>
        )}
        {canRemove && (
          <button
            onClick={handleRemove}
            disabled={isRemoving}
            className="p-1.5 rounded-md text-error-400 hover:text-error-600 hover:bg-error-50 dark:hover:bg-error-900/20"
            aria-label={t('team:actions.remove', 'Remover')}
          >
            {isRemoving ? (
              <div className="w-4 h-4 border-2 border-error-400 border-t-transparent rounded-full animate-spin" />
            ) : (
              <FiTrash2 className="w-4 h-4" />
            )}
          </button>
        )}
      </div>
    </div>
  );
};

CollaboratorCard.propTypes = {
  collaborator: PropTypes.shape({
    id: PropTypes.string.isRequired,
    userId: PropTypes.string,
    userEmail: PropTypes.string.isRequired,
    userName: PropTypes.string,
    role: PropTypes.oneOf(Object.values(EVENT_ROLES)).isRequired,
    status: PropTypes.oneOf(['PENDING', 'ACCEPTED', 'DECLINED']),
    invitedBy: PropTypes.string,
    invitedAt: PropTypes.string,
    acceptedAt: PropTypes.string,
    sharedFolderIds: PropTypes.arrayOf(PropTypes.string),
    sharedSupplierIds: PropTypes.arrayOf(PropTypes.string),
  }).isRequired,
  onRemove: PropTypes.func,
  onEdit: PropTypes.func,
  canRemove: PropTypes.bool,
  canEdit: PropTypes.bool,
  isRemoving: PropTypes.bool,
  showStatus: PropTypes.bool,
  isPending: PropTypes.bool,
};

export default memo(CollaboratorCard);
