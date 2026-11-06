/**
 * @file useInvitationHandler.js
 * @description Hook to handle automatic invitation acceptance after login
 * Processes pending invitation links and redirects user to the event
 */

import { useEffect, useState, useRef } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { useSelector } from 'react-redux';
import { useAcceptInvitationMutation } from '../Api/services/collaboratorApi';

// LocalStorage key for storing pending invitation
const PENDING_INVITATION_KEY = 'pendingInvitationId';

/**
 * Hook to handle invitation flow
 * 1. Captures invitation ID from URL
 * 2. Stores it for after login
 * 3. Automatically accepts invitation after successful login
 * 4. Redirects to the event
 */
export const useInvitationHandler = () => {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const { isAuthenticated } = useSelector((state) => state.user);
  const [acceptInvitation] = useAcceptInvitationMutation();

  const [invitationStatus, setInvitationStatus] = useState({
    isProcessing: false,
    error: null,
    success: false,
  });

  // Track if we're already processing to prevent race conditions
  const processingRef = useRef(false);

  // Step 1: Capture invitation ID from URL and store it
  useEffect(() => {
    const invitationId = searchParams.get('invitation');

    if (invitationId) {
      // Store invitation for after login
      localStorage.setItem(PENDING_INVITATION_KEY, invitationId);
    }
  }, [searchParams, isAuthenticated]);

  // Step 2: Process stored invitation after successful login
  useEffect(() => {
    const processInvitation = async () => {
      if (!isAuthenticated) {
        return;
      }

      const pendingInvitationId = localStorage.getItem(PENDING_INVITATION_KEY);

      if (!pendingInvitationId) {
        return;
      }

      // Prevent race condition: check if already processing
      if (processingRef.current) {
        return;
      }

      // Mark as processing
      processingRef.current = true;
      setInvitationStatus({ isProcessing: true, error: null, success: false });

      try {
        const result = await acceptInvitation({ invitationId: pendingInvitationId }).unwrap();

        // Clear stored invitation
        localStorage.removeItem(PENDING_INVITATION_KEY);

        setInvitationStatus({ isProcessing: false, error: null, success: true });

        // Redirect to the event
        if (result?.eventId) {
          setTimeout(() => {
            navigate(`/app/event/${result.eventId}`, {
              replace: true,
              state: {
                invitationAccepted: true,
                role: result.role
              }
            });
          }, 1000);
        } else {
          setTimeout(() => {
            navigate('/app/events', { replace: true });
          }, 1000);
        }
      } catch (error) {
        // Clear stored invitation to prevent retry loops
        localStorage.removeItem(PENDING_INVITATION_KEY);

        setInvitationStatus({
          isProcessing: false,
          error: error.data?.message || error.message || 'Erro ao aceitar convite',
          success: false
        });
      } finally {
        // Reset processing flag after completion or error
        processingRef.current = false;
      }
    };

    processInvitation();
  }, [isAuthenticated, acceptInvitation, navigate]);

  return {
    isProcessingInvitation: invitationStatus.isProcessing,
    invitationError: invitationStatus.error,
    invitationSuccess: invitationStatus.success,
  };
};

/**
 * Utility function to check if there's a pending invitation
 */
export const hasPendingInvitation = () => {
  return !!localStorage.getItem(PENDING_INVITATION_KEY);
};

/**
 * Utility function to clear pending invitation
 */
export const clearPendingInvitation = () => {
  localStorage.removeItem(PENDING_INVITATION_KEY);
};
