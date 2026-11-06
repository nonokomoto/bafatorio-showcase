/**
 * @file PendingInvitationsDropdown.jsx
 * @description Dropdown component for displaying and managing pending invitations
 * Shows in the header when user has pending invitations to accept/decline
 */

import { useState, useRef, useEffect, memo, useCallback } from 'react';
import PropTypes from 'prop-types';
import { useTranslation } from 'react-i18next';
import { useNavigate } from 'react-router-dom';
import { FiBell, FiCheck, FiX, FiUsers } from 'react-icons/fi';
import { Text, Badge, Button } from '../UI';
import {
  useListMyPendingInvitationsQuery,
  useAcceptInvitationMutation,
  useDeclineInvitationMutation,
} from '../../Api/services/collaboratorApi';
import {
  ROLE_DISPLAY_NAMES,
  EVENT_ROLES,
} from '../../Utils/eventRolesConfig';

/**
 * Single invitation item component
 */
const InvitationItem = memo(({
  invitation,
  onAccept,
  onDecline,
  isAccepting,
  isDeclining,
}) => {
  const { t } = useTranslation(['team']);

  const { id, role, invitedAt } = invitation;
  const roleName = ROLE_DISPLAY_NAMES[role] || role;

  const formatDate = (dateString) => {
    if (!dateString) return '';
    return new Date(dateString).toLocaleDateString('pt-PT', {
      day: '2-digit',
      month: '2-digit',
    });
  };

  const isProcessing = isAccepting || isDeclining;

  return (
    <div className="p-3 hover:bg-accent border-b border-border last:border-b-0">
      <div className="flex items-start gap-3">
        <div className="h-8 w-8 rounded-full bg-primary-100 dark:bg-primary-900/30 flex items-center justify-center flex-shrink-0">
          <FiUsers className="h-4 w-4 text-primary-600 dark:text-primary-400" />
        </div>

        <div className="flex-1 min-w-0">
          <Text variant="body2" className="font-medium truncate">
            {t('team:invitation.newInvite', 'Novo convite')}
          </Text>
          <div className="flex items-center gap-2 mt-0.5">
            <Badge variant="primary" tone="soft" size="xs">
              {roleName}
            </Badge>
            <Text variant="caption" className="text-muted-foreground">
              {formatDate(invitedAt)}
            </Text>
          </div>

          {/* Actions */}
          <div className="flex items-center gap-2 mt-2">
            <Button
              variant="primary"
              size="xs"
              onClick={() => onAccept(id)}
              loading={isAccepting}
              disabled={isProcessing}
              className="flex items-center gap-1"
            >
              <FiCheck className="h-3 w-3" />
              {t('team:invitation.accept', 'Aceitar')}
            </Button>
            <Button
              variant="ghost"
              size="xs"
              onClick={() => onDecline(id)}
              loading={isDeclining}
              disabled={isProcessing}
              className="text-error-500 hover:text-error-600"
            >
              <FiX className="h-3 w-3" />
              {t('team:invitation.decline', 'Recusar')}
            </Button>
          </div>
        </div>
      </div>
    </div>
  );
});

InvitationItem.displayName = 'InvitationItem';

InvitationItem.propTypes = {
  invitation: PropTypes.shape({
    id: PropTypes.string.isRequired,
    eventId: PropTypes.string.isRequired,
    role: PropTypes.string.isRequired,
    invitedAt: PropTypes.string,
  }).isRequired,
  onAccept: PropTypes.func.isRequired,
  onDecline: PropTypes.func.isRequired,
  isAccepting: PropTypes.bool,
  isDeclining: PropTypes.bool,
};

/**
 * Empty state component
 */
const EmptyState = memo(() => {
  const { t } = useTranslation(['team']);

  return (
    <div className="p-4 text-center">
      <FiUsers className="h-8 w-8 text-muted-foreground mx-auto mb-2" />
      <Text variant="body2" className="text-muted-foreground">
        {t('team:invitation.noInvitations', 'Sem convites pendentes')}
      </Text>
    </div>
  );
});

EmptyState.displayName = 'EmptyState';

/**
 * PendingInvitationsDropdown Component
 * Shows a bell icon with badge when user has pending invitations
 */
const PendingInvitationsDropdown = () => {
  const { t } = useTranslation(['team']);
  const navigate = useNavigate();

  // Dropdown state
  const [isOpen, setIsOpen] = useState(false);
  const [processingId, setProcessingId] = useState(null);
  const [processingAction, setProcessingAction] = useState(null);
  const dropdownRef = useRef(null);

  // Fetch pending invitations
  const {
    data: invitations = [],
    isLoading,
    refetch,
  } = useListMyPendingInvitationsQuery();

  // Mutations
  const [acceptInvitation] = useAcceptInvitationMutation();
  const [declineInvitation] = useDeclineInvitationMutation();

  const invitationCount = invitations.length;

  // Close dropdown when clicking outside
  useEffect(() => {
    const handleClickOutside = (event) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target)) {
        setIsOpen(false);
      }
    };

    if (isOpen) {
      document.addEventListener('mousedown', handleClickOutside);
      return () => document.removeEventListener('mousedown', handleClickOutside);
    }
  }, [isOpen]);

  // Handle accept invitation
  const handleAccept = useCallback(async (invitationId) => {
    try {
      setProcessingId(invitationId);
      setProcessingAction('accept');
      const result = await acceptInvitation({ invitationId }).unwrap();
      refetch();

      // Navigate after accepting — STAFF_CHECKIN goes to events list (no access to event details)
      if (result?.eventId) {
        setIsOpen(false);
        if (result.role === EVENT_ROLES.STAFF_CHECKIN) {
          navigate('/app/events');
        } else {
          navigate(`/app/event/${result.eventId}`);
        }
      }
    } catch (err) {
      console.error('[PendingInvitationsDropdown] Error accepting:', err);
    } finally {
      setProcessingId(null);
      setProcessingAction(null);
    }
  }, [acceptInvitation, refetch, navigate]);

  // Handle decline invitation
  const handleDecline = useCallback(async (invitationId) => {
    try {
      setProcessingId(invitationId);
      setProcessingAction('decline');
      await declineInvitation({ invitationId }).unwrap();
      refetch();
    } catch (err) {
      console.error('[PendingInvitationsDropdown] Error declining:', err);
    } finally {
      setProcessingId(null);
      setProcessingAction(null);
    }
  }, [declineInvitation, refetch]);

  // Toggle dropdown
  const toggleDropdown = useCallback(() => {
    setIsOpen((prev) => !prev);
  }, []);

  // Don't render if no invitations and not loading
  if (!isLoading && invitationCount === 0) {
    return null;
  }

  return (
    <div className="relative" ref={dropdownRef}>
      {/* Trigger button */}
      <button
        onClick={toggleDropdown}
        className={`
          relative p-2 rounded-lg transition-colors
          hover:bg-accent
          focus:outline-none focus:ring-2 focus:ring-primary-500/50
          ${isOpen ? 'bg-muted' : ''}
        `}
        aria-expanded={isOpen}
        aria-haspopup="true"
        aria-label={t('team:invitation.viewInvitations', 'Ver convites')}
      >
        <FiBell className="h-5 w-5 text-muted-foreground" />

        {/* Badge with count */}
        {invitationCount > 0 && (
          <span className="absolute -top-1 -right-1 h-5 w-5 flex items-center justify-center bg-error-500 text-white text-xs font-medium rounded-full">
            {invitationCount > 9 ? '9+' : invitationCount}
          </span>
        )}
      </button>

      {/* Dropdown panel */}
      {isOpen && (
        <>
          {/* Overlay */}
          <div
            className="fixed inset-0 z-30"
            onClick={() => setIsOpen(false)}
            aria-hidden="true"
          />

          {/* Dropdown content */}
          <div
            className="absolute right-0 mt-2 w-80 bg-popover rounded-lg shadow-lg border border-border z-40 overflow-hidden"
            role="menu"
            aria-orientation="vertical"
          >
            {/* Header */}
            <div className="px-4 py-3 border-b border-border bg-muted">
              <div className="flex items-center justify-between">
                <Text variant="subtitle2" className="font-medium">
                  {t('team:invitation.title', 'Convites')}
                </Text>
                {invitationCount > 0 && (
                  <Badge variant="primary" tone="solid" size="sm">
                    {invitationCount}
                  </Badge>
                )}
              </div>
            </div>

            {/* Invitations list */}
            <div className="max-h-80 overflow-y-auto">
              {isLoading ? (
                <div className="p-4 text-center">
                  <Text variant="body2" className="text-muted-foreground">
                    {t('common:loading', 'A carregar...')}
                  </Text>
                </div>
              ) : invitationCount === 0 ? (
                <EmptyState />
              ) : (
                invitations.map((invitation) => (
                  <InvitationItem
                    key={invitation.id}
                    invitation={invitation}
                    onAccept={handleAccept}
                    onDecline={handleDecline}
                    isAccepting={processingId === invitation.id && processingAction === 'accept'}
                    isDeclining={processingId === invitation.id && processingAction === 'decline'}
                  />
                ))
              )}
            </div>
          </div>
        </>
      )}
    </div>
  );
};

export default memo(PendingInvitationsDropdown);
