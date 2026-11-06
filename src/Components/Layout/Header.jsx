import React from 'react';
import { FiMenu, FiChevronDown, FiUser, FiLogOut, FiAward } from 'react-icons/fi';
import { Link, useNavigate } from 'react-router-dom';
import { useSelector, useDispatch, shallowEqual } from 'react-redux';
import { userSignOut } from './../../Redux/Auth/userSlice';
import LanguageSwitcher from "../Common/LanguageSwitcher";
import ProfileAvatar from "../Common/ProfileAvatar";
import ThemeToggle from "../Theme/ThemeToggle";
import { PendingInvitationsDropdown } from '../Team';
import PropTypes from 'prop-types';
import { useTranslation } from 'react-i18next';
import { Button, Text, Container } from '../UI';
import { USER_GROUPS } from '../../Utils/rolesConfig';
import { isAdminPlanName, isPaidPlanKey } from '../../Utils/plans';
import useProfileImage from '../../Hook/useProfileImage';
import { useGetMySubscriptionQuery } from '../../Api/services/billingApi';

const Header = ({ onToggleSidebar, isCollapsed, toggleDropdown, isDropdownOpen, toggleButtonRef }) => {
  const userData = useSelector((state) => state.user.user, shallowEqual);
  const userGroups = useSelector((state) => state.user.groups, shallowEqual);
  const { data: subscription, isLoading: isSubscriptionLoading } =
    useGetMySubscriptionQuery(userData?.sub, { skip: !userData?.sub });
  const dispatch = useDispatch();
  const navigate = useNavigate();
  const { t } = useTranslation('layout');

  // Subscrição Pro do modelo novo (planKey null = legado/inexistente = plano
  // grátis). Estados pausado/pagamento falhado continuam a contar como Pro —
  // o detalhe do estado vive na Settings; o header só mostra o plano atual.
  // O grátis também tem planKey desde o modal pós-signup, por isso a pergunta
  // é se o plano é pago, não se existe registo.
  const hasActiveSubscription =
    isPaidPlanKey(subscription?.planKey) &&
    ['active', 'paused', 'past_due', 'unpaid', 'incomplete'].includes(subscription?.status);
  const isAdmin = userGroups?.includes(USER_GROUPS.ADMIN);
  // Conta ADMIN (ADR-036): resolvePlanKey devolve null para 'ADMIN' (não é
  // plano vendável), o que aqui leria como "Grátis" — contradiz o badge Admin
  // ao lado. Esconde-se o badge de plano; o badge Admin já comunica o estado.
  const isAdminPlan = isAdminPlanName(subscription?.planName);
  const planLabel = hasActiveSubscription
    ? t('settings:subscription.planNames.PRO')
    : t('header.planFree', 'Grátis');

  const profileImageUrl = useProfileImage(userData?.picture);

  const handleLogout = async () => {
    dispatch(userSignOut());
    navigate('/signin');
  };

  return (
    <header className="shrink-0 sticky top-0 z-30 bg-card shadow-sm border-b border-border">
      <Container className="max-w-screen-2xl">
        <div className="flex justify-between items-center h-16">
          <div className="flex items-center">
            <Button
              ref={toggleButtonRef}
              onClick={onToggleSidebar}
              variant="ghost"
              iconOnly
              icon={<FiMenu className="h-5 w-5" />}
              className="mr-2 lg:hidden"
              aria-label={isCollapsed ? t('header.expandSidebar', 'Expand sidebar') : t('header.collapseSidebar', 'Collapse sidebar')}
            />
            
            {isCollapsed && (
              <Link to="/app/events" className="ml-1 flex items-center">
                <Text variant="h4" color="primary" className="font-display font-bold">
                  Bafatorio
                </Text>
              </Link>
            )}
          </div>
          
          <div className="flex items-center gap-1 xs:gap-2 sm:gap-4 pl-2 sm:pl-4 relative">
            {/* Plano atual — indicador (a gestão vive em Settings > Planos).
                Durante o load: skeleton com as mesmas dimensões — "ainda não
                sei" não é "Grátis", e remover o elemento fazia a UI saltar. */}
            {isSubscriptionLoading ? (
              <span
                className="hidden xs:inline-flex h-[26px] w-16 rounded-full bg-muted animate-pulse"
                aria-hidden="true"
              />
            ) : isAdminPlan ? null : (
              <button
                onClick={() => navigate('/app/settings/billing')}
                title={t('header.currentPlan', 'Plano atual')}
                className="hidden xs:inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-medium bg-secondary-100 text-secondary-800 dark:bg-secondary-900 dark:text-secondary-200 hover:bg-secondary-200 dark:hover:bg-secondary-800 transition-colors"
              >
                <FiAward className="w-3.5 h-3.5" />
                {planLabel}
              </button>
            )}
            
            <LanguageSwitcher />

            {/* Pending Invitations - Team Access Control */}
            <PendingInvitationsDropdown />

            <ThemeToggle />

            <button
              onClick={toggleDropdown}
              className="flex items-center space-x-2 rounded-lg hover:bg-accent focus:ring-2 focus:ring-primary/50 focus:outline-none transition-colors duration-200 "
              aria-expanded={isDropdownOpen}
              aria-haspopup="true"
            >
              <ProfileAvatar key={profileImageUrl} src={profileImageUrl} name={userData?.name} />
              <Text variant="body2" className="ml-2 font-medium hidden sm:inline-block">
                {userData?.name || t('header.user', 'Utilizador')}
              </Text>
              <FiChevronDown 
                className={`h-4 w-4 text-primary-500 transition-transform duration-200 ${
                  isDropdownOpen ? 'transform rotate-180' : ''
                }`} 
              />
            </button>

            {isDropdownOpen && (
              <>
                {/* Overlay for dropdown - captures clicks outside */}
                <div 
                  className="fixed inset-0 z-30" 
                  onClick={toggleDropdown}
                  aria-hidden="true"
                ></div>
                
                <div 
                  className="absolute right-0 mt-2 w-56 bg-popover rounded-lg shadow-lg py-1.5 top-full z-40 border border-border"
                  role="menu"
                  aria-orientation="vertical"
                  aria-labelledby="user-menu"
                >
                  <div className="px-4 py-2">
                    <p className="text-sm font-medium text-muted-foreground truncate">
                      {userData?.email || 'user@example.com'}
                    </p>
                    {/* Indicadores: admin + plano atual */}
                    <div className="mt-1 flex items-center">
                      {isAdmin && (
                        <span className="inline-flex items-center px-2 py-0.5 rounded text-xs font-medium bg-primary-100 text-primary-800 dark:bg-primary-900 dark:text-primary-200 mr-1">
                          {t('header.admin', 'Admin')}
                        </span>
                      )}
                      {!isAdminPlan && (
                        <span className="inline-flex items-center px-2 py-0.5 rounded text-xs font-medium bg-secondary-100 text-secondary-800 dark:bg-secondary-900 dark:text-secondary-200">
                          {planLabel}
                        </span>
                      )}
                    </div>
                  </div>
                  
                  <div className="border-t border-border my-1"></div>
                  
                  <Link 
                    to="/app/settings/profile" 
                    onClick={toggleDropdown}
                    className="flex items-center px-4 py-2.5 text-sm text-popover-foreground hover:bg-accent transition-colors mx-2 rounded-lg"
                    role="menuitem"
                  >
                    <FiUser className="mr-3 text-primary-500" />
                    <span>{t('header.configuration')}</span>
                  </Link>
                  
                  <div className="border-t border-border my-1 mx-3"></div>
                  
                  <button
                    onClick={handleLogout}
                    className="flex items-center w-[calc(100%-1rem)] px-4 py-2.5 text-sm text-popover-foreground hover:bg-accent transition-colors mx-2 rounded-lg"
                    role="menuitem"
                  >
                    <FiLogOut className="mr-3 text-error-500" />
                    <span>{t('header.logout')}</span>
                  </button>
                </div>
              </>
            )}
          </div>
        </div>
      </Container>
    </header>
  );
};

Header.propTypes = {
  onToggleSidebar: PropTypes.func.isRequired,
  isCollapsed: PropTypes.bool.isRequired,
  toggleDropdown: PropTypes.func.isRequired,
  isDropdownOpen: PropTypes.bool.isRequired,
  toggleButtonRef: PropTypes.shape({ current: PropTypes.instanceOf(Element) })
};

export default React.memo(Header);