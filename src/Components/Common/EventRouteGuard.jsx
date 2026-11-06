/**
 * @file EventRouteGuard.jsx
 * @description Route-level guard for event access control
 * Implements access validation at the route level per ACCESS_LEVELS_STRATEGY.md
 *
 * This guard ensures that only users with access to an event (Owner or Collaborator)
 * can view the event routes. It works alongside EventRoleGuard which handles
 * granular permission checks within components.
 *
 * Usage in routes:
 * <Route path="event/:id" element={
 *   <EventRouteGuard>
 *     <EventDetails />
 *   </EventRouteGuard>
 * } />
 */

import { memo } from 'react';
import PropTypes from 'prop-types';
import { useParams, Navigate, useLocation, useNavigate } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { useEventRole, EVENT_ROLES } from '../../Hook/useEventRole';
import { Card, Text, Button } from '../UI';
import { FiAlertTriangle, FiArrowLeft } from 'react-icons/fi';

/**
 * Access Denied component
 * Shown when user doesn't have access to the event
 */
const AccessDenied = memo(({ onGoBack }) => {
  const { t } = useTranslation(['common', 'event']);

  return (
    <div className="min-h-[50vh] flex items-center justify-center p-4">
      <Card variant="default" padded="lg" className="max-w-md text-center">
        <div className="flex justify-center mb-4">
          <div className="h-16 w-16 rounded-full bg-error-100 dark:bg-error-900/30 flex items-center justify-center">
            <FiAlertTriangle className="h-8 w-8 text-error-500" />
          </div>
        </div>

        <Text variant="h5" className="font-semibold mb-2">
          {t('event:access.denied.title', 'Acesso Negado')}
        </Text>

        <Text variant="body2" className="text-muted-foreground mb-6">
          {t(
            'event:access.denied.message',
            'Não tem permissão para aceder a este evento. Contacte o organizador para solicitar acesso.'
          )}
        </Text>

        <Button
          variant="primary"
          onClick={onGoBack}
          className="inline-flex items-center gap-2"
        >
          <FiArrowLeft className="h-4 w-4" />
          {t('common:actions.goBack', 'Voltar')}
        </Button>
      </Card>
    </div>
  );
});

AccessDenied.displayName = 'AccessDenied';

AccessDenied.propTypes = {
  onGoBack: PropTypes.func.isRequired,
};

/**
 * EventRouteGuard Component
 * Protects event routes by checking if the user has access to the event
 */
const EventRouteGuard = ({
  children,
  redirectTo = '/app/events',
  showAccessDenied = true,
}) => {
  const { id: eventId } = useParams();
  const location = useLocation();
  const navigate = useNavigate();
  const { hasAccess, isLoading, error, role } = useEventRole(eventId);

  // While loading, render children directly — EventDetails handles its own skeletons
  if (isLoading) {
    return children;
  }

  // Handle error, no access, or STAFF_CHECKIN (no access to event details page)
  if (error || !hasAccess || role === EVENT_ROLES.STAFF_CHECKIN) {
    if (showAccessDenied) {
      return (
        <AccessDenied
          onGoBack={() => {
            if (window.history.length > 2) {
              navigate(-1);
            } else {
              navigate(redirectTo, { replace: true });
            }
          }}
        />
      );
    }

    // Redirect to specified path
    return <Navigate to={redirectTo} state={{ from: location }} replace />;
  }

  // Access granted - render children
  return children;
};

EventRouteGuard.propTypes = {
  /** Content to render when access is granted */
  children: PropTypes.node.isRequired,

  /** Path to redirect to when access is denied (if showAccessDenied is false) */
  redirectTo: PropTypes.string,

  /** Show access denied message instead of redirecting */
  showAccessDenied: PropTypes.bool,
};

export default memo(EventRouteGuard);
