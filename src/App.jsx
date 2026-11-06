import  { Suspense, lazy } from 'react';
import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import * as Sentry from '@sentry/react';
import { useSelector } from 'react-redux';
import PropTypes from 'prop-types';
import Layout from './Components/Layout/Layout';
import SignIn from './Components/Login/SignIn';
import SignUp from './Components/Login/SignUp';
import ForgotPasswordRouteWrapper from './Components/Login/ForgotPasswordWrapper';
import ThemeInitializer from './Components/Theme/ThemeInitializer';
import { AuthErrorHandler } from './Hook/useAuthErrorHandler';
import EventRouteGuard from './Components/Common/EventRouteGuard';
import ErrorBoundary from './Components/Common/ErrorBoundary';
import { EventDetailsSkeleton } from './Components/Skeletons';
import { WipGuard } from './Components/UI/DevOverlay';
import { WIP_COMPONENTS } from './Utils/devStages';

// Lazy imports
const Dashboard = lazy(() => import('./Components/Pages/Dashboard'));
const EventsPage = lazy(() => import('./Components/Pages/Events'));
const Participants = lazy(() => import('./Components/Pages/Participants'));
const ConfirmPresence = lazy(() => import('./Components/Pages/ConfirmPresence'));
const Settings = lazy(() => import('./Components/Pages/Settings'));
const EventDetails = lazy(() => import('./Components/Pages/EventDetails'));
const StatusUpdateHeader = lazy(() => import('./Components/Layout/StatusUpdateHandler'));
const PlanSelection = lazy(() => import('./Components/Billing/CreatePlan/PlanSelection'));
const RegisterEvent = lazy(() => import('./Components/Pages/RegisterEvent'));
const LandingPageAlt = lazy(() => import('./Components/LandingPage/LandingPageAlt'));
const Suppliers = lazy(() => import('./Components/Pages/Suppliers'));
const SupplierFormPage = lazy(() => import('./Components/Supplier/SupplierForm'));
const NotionCallback = lazy(() => import('./Components/Pages/NotionCallback'));
const TestEnhancedQueries = lazy(() => import('./Components/TestEnhancedQueries'));
const ParticipantsArchitecture = lazy(() => import('./Components/Pages/ParticipantsArchitecture'));
const TermsOfService = lazy(() => import('./Components/Pages/TermsOfService'));
const PrivacyPolicy = lazy(() => import('./Components/Pages/PrivacyPolicy'));
const CookiePolicy = lazy(() => import('./Components/Pages/CookiePolicy'));

// Rotas instrumentadas pelo Sentry: gera spans de navegação com o padrão da rota
// (ex.: /app/event/:id) em vez do URL cru. No-op se o Sentry não estiver inicializado.
const SentryRoutes = Sentry.wrapReactRouterRouting(Routes);

const LoadingFallback = () => <div className="min-h-screen" />;

const ProtectedRoute = ({ children }) => {
  const isAuthenticated = useSelector(state => state.user.isAuthenticated);
  return isAuthenticated ? children : <Navigate to="/signin" replace />;
};

ProtectedRoute.propTypes = {
  children: PropTypes.node.isRequired
};

const PublicOnlyRoute = ({ children }) => {
  const isAuthenticated = useSelector(state => state.user.isAuthenticated);
  return isAuthenticated ? <Navigate to="/app/events" replace /> : children;
};

PublicOnlyRoute.propTypes = {
  children: PropTypes.node.isRequired
};

function App() {
  return (
    <Router>
      <ThemeInitializer />
      <AuthErrorHandler />
      <ErrorBoundary>
      <Suspense fallback={<LoadingFallback />}>
        <SentryRoutes>
          {/* Public routes */}

          <Route path="/" element={<LandingPageAlt />} />
          <Route path="/alternative" element={<LandingPageAlt />} />
          <Route path="/signin" element={<PublicOnlyRoute><SignIn /></PublicOnlyRoute>} />
          <Route path="/signup" element={<PublicOnlyRoute><SignUp /></PublicOnlyRoute>} />
          <Route path="/forgotpassword" element={<PublicOnlyRoute><ForgotPasswordRouteWrapper /></PublicOnlyRoute>} />
          <Route path="/update-status" element={<StatusUpdateHeader />} />

          {/* Legal pages */}
          <Route path="/terms" element={<TermsOfService />} />
          <Route path="/privacy" element={<PrivacyPolicy />} />
          <Route path="/cookies" element={<CookiePolicy />} />
          
          {/* Test Enhanced Queries - Public route for easy testing */}
          <Route path="/test-enhanced" element={<TestEnhancedQueries />} />

          {/* Prototype: Participants Architecture */}
          <Route path="/prototype/participants" element={<ParticipantsArchitecture />} />

          {/* Protected routes */}
          <Route path="/app" element={
            <ProtectedRoute>
              <Layout />
            </ProtectedRoute>
          }>
            <Route index element={<Navigate replace to="/app/events" />} />
            <Route path="events" element={<EventsPage />} />
            <Route path="register-event" element={<RegisterEvent />} />
            <Route path="participants" element={<Participants />} />
            <Route path="confirm-presence" element={<WipGuard active={WIP_COMPONENTS.CONFIRM_PRESENCE}><ConfirmPresence /></WipGuard>} />
            <Route path="dashboard" element={<WipGuard active={WIP_COMPONENTS.DASHBOARD}><Dashboard /></WipGuard>} />
            <Route path="settings/*" element={<Settings />} />
            {/* Dedicated Suspense boundary so the lazy-chunk fallback matches the
                page shape instead of the generic empty div from Layout.jsx. */}
            <Route path="event/:id" element={
              <EventRouteGuard>
                <Suspense fallback={<EventDetailsSkeleton />}>
                  <EventDetails />
                </Suspense>
              </EventRouteGuard>
            } />
            <Route path="plan-selection" element={<WipGuard active={WIP_COMPONENTS.PLAN_SELECTION}><PlanSelection /></WipGuard>} />
            <Route path="suppliers" element={<Suppliers />} />
            <Route path="suppliers/register" element={<SupplierFormPage />} />
            <Route path="suppliers/edit/:id" element={<SupplierFormPage />} />
            <Route path="notion/callback" element={<NotionCallback />} />
          </Route>
        </SentryRoutes>
      </Suspense>
      </ErrorBoundary>
    </Router>
  );
}

export default App;