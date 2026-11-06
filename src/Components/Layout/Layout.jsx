import { useState, useEffect, useRef, useCallback, Suspense } from 'react';
import { Outlet, useNavigate } from 'react-router-dom';
import { useDispatch, useSelector } from 'react-redux';
import Sidebar from './Sidebar';
import Header from './Header';
// Footer removed — ThemeToggle moved to Header
import { fetchCurrentUser, userSignOut } from '../../Redux/Auth/userSlice';
import Container from './Container';
import ToastContainer from '../UI/ToastContainer';
import useIdleTimeout from '../../Hook/useIdleTimeout';
import SessionTimeoutModal from '../Common/SessionTimeoutModal';
import ErrorBoundary from '../Common/ErrorBoundary';
import PostSignupPlanModal from '../Billing/CreatePlan/PostSignupPlanModal';
import CheckoutSuccessModal from '../Billing/CheckoutSuccessModal';
import usePlanSelectionGate from '../../Hook/usePlanSelectionGate';
import useCheckoutReturn from '../../Hook/useCheckoutReturn';

/**
 * Main Layout component with responsive behavior
 * - Desktop: Horizontal layout with fixed height and independent scrolling in main content
 * - Mobile/Tablet: Vertical flow with natural document scrolling (fixes the "scroll trapping" issue)
 */
const Layout = () => {
  // Sidebar inicia fechado em mobile (< lg); aberto em desktop.
  const [isCollapsed, setIsCollapsed] = useState(() => window.innerWidth < 1024);
  const [isDropdownOpen, setIsDropdownOpen] = useState(false);
  const mainContentRef = useRef(null);
  const sidebarToggleRef = useRef(null);
  const dispatch = useDispatch();
  const navigate = useNavigate();
  const isAuthenticated = useSelector((state) => state.user.isAuthenticated);
  const userId = useSelector((state) => state.user.user?.sub);

  // Onboarding de escolha de plano (contas acabadas de se registar) — a
  // mecânica do gate vive no hook.
  const { showPlanSelectionModal, handlePlanDecided } = usePlanSelectionGate(userId);

  // Regresso da Stripe: fecha o onboarding (fix do loop pós-compra do Por
  // Evento) e alimenta o ecrã de sucesso — a mecânica vive no hook.
  const { checkoutSuccess, dismissCheckoutSuccess } = useCheckoutReturn(handlePlanDecided);

  const handleSessionTimeout = useCallback(() => {
    dispatch(userSignOut())
      .unwrap()
      .catch(() => {})
      .finally(() => navigate('/signin'));
  }, [dispatch, navigate]);

  const { isWarning, remainingSeconds, resetTimer } = useIdleTimeout({
    onTimeout: handleSessionTimeout,
  });

  // Refresh Cognito groups on mount to prevent stale tokens after group migration
  useEffect(() => {
    if (isAuthenticated) {
      dispatch(fetchCurrentUser());
    }
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  useEffect(() => {
    const handleResize = () => {
      if (window.innerWidth < 1024) {
        setIsCollapsed(true);
      }
    };

    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, []);

  const toggleSidebar = useCallback(() => {
    setIsCollapsed(prev => {
      if (!prev && mainContentRef.current) {
        setTimeout(() => mainContentRef.current.focus(), 300);
      }
      return !prev;
    });
  }, []);

  // Apenas fecha o sidebar em mobile/tablet (< lg). Em desktop, mantém o estado atual.
  const closeSidebar = useCallback(() => {
    if (window.innerWidth < 1024) {
      setIsCollapsed(true);
      if (sidebarToggleRef.current) {
        setTimeout(() => sidebarToggleRef.current.focus(), 300);
      }
    }
  }, []);

  const toggleDropdown = useCallback(() => setIsDropdownOpen(prev => !prev), []);

  return (
    <div className="flex flex-col lg:flex-row min-h-screen lg:h-screen lg:overflow-hidden bg-background">
      <Sidebar
        isCollapsed={isCollapsed}
        toggleSidebar={toggleSidebar}
        closeSidebar={closeSidebar}
        toggleButtonRef={sidebarToggleRef}
      />

      {/* Mobile sidebar overlay */}
      {!isCollapsed && (
        <div
          className="fixed inset-0 bg-black/50 dark:bg-black/60 backdrop-blur-sm z-20 lg:hidden transition-opacity duration-200"
          onClick={closeSidebar}
          aria-hidden="true"
          role="presentation"
        />
      )}

      <div className="flex flex-col flex-1 min-w-0">
        <Header
          onToggleSidebar={toggleSidebar}
          isCollapsed={isCollapsed}
          toggleDropdown={toggleDropdown}
          isDropdownOpen={isDropdownOpen}
          toggleButtonRef={sidebarToggleRef}
        />

        <main
          ref={mainContentRef}
          className="relative flex-1 min-h-0 min-w-0 lg:overflow-y-auto scrollbar-hide focus:outline-none"
          role="main"
          id="main-content"
          tabIndex="-1"
          aria-label="Main content"
        >
          <Container className="mx-auto max-w-screen-2xl space-y-6 py-6">
            <ErrorBoundary>
              <Suspense fallback={<div className="min-h-[50vh]" />}>
                <Outlet />
              </Suspense>
            </ErrorBoundary>
          </Container>
        </main>
      </div>

      <ToastContainer />

      <SessionTimeoutModal
        isWarning={isWarning}
        remainingSeconds={remainingSeconds}
        onContinue={resetTimer}
        onLogout={handleSessionTimeout}
      />

      <PostSignupPlanModal
        isOpen={showPlanSelectionModal}
        onDecided={handlePlanDecided}
      />

      <CheckoutSuccessModal
        isOpen={Boolean(checkoutSuccess)}
        planKey={checkoutSuccess?.planKey}
        tierKey={checkoutSuccess?.tierKey}
        billingCycle={checkoutSuccess?.billingCycle}
        onClose={dismissCheckoutSuccess}
      />
    </div>
  );
};

export default Layout;
