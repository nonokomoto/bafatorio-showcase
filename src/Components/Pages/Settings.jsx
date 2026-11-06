import React, { useState, useMemo } from 'react';
import { NavLink, Route, Routes } from 'react-router-dom';
import { FiUser, FiCreditCard, FiBell, FiShield, FiZap, FiMenu } from 'react-icons/fi';
import { useTranslation } from 'react-i18next';
import PropTypes from 'prop-types';
import ProfilePage from '../Settings/ProfileSettings';
import SubscriptionManagement from '../Settings/SubscriptionManagement';
import NotionIntegrationSettings from '../Settings/NotionIntegrationSettings';
import SecuritySettings from '../Settings/SecuritySettings';
import { Text } from '../UI';
import { WipGuard } from '../UI/DevOverlay';
import { WIP_COMPONENTS } from '../../Utils/devStages';

const SidebarSettingLink = React.memo(({ to, children, icon, onClick }) => (
  <NavLink
    to={to}
    onClick={onClick}
    className={({ isActive }) =>
      `flex items-center gap-3 px-3 py-2.5 rounded-lg transition-colors duration-150 text-sm font-medium
      ${isActive
        ? 'bg-primary-100 dark:bg-primary-900/40 text-primary-700 dark:text-primary-300'
        : 'text-foreground hover:bg-neutral-100/50 dark:hover:bg-background-800/50'
      }`
    }
  >
    {icon}
    <span>{children}</span>
  </NavLink>
));

SidebarSettingLink.propTypes = {
  to: PropTypes.string.isRequired,
  children: PropTypes.node.isRequired,
  icon: PropTypes.node.isRequired,
  onClick: PropTypes.func.isRequired
};

SidebarSettingLink.displayName = 'SidebarSettingLink';

const SettingsSidebar = React.memo(({ isMobileMenuOpen, setIsMobileMenuOpen, t }) => (
  <div className={`bg-background-50 dark:bg-background-900 rounded-xl border border-neutral-200/60 dark:border-neutral-800/60 p-3 ${isMobileMenuOpen ? 'block' : 'hidden'} lg:block`}>
    <Text
      variant="h6"
      weight="semibold"
      className="mb-3 px-3 pt-1 font-display text-foreground"
    >
      {t('page.settings')}
    </Text>
    <nav className="space-y-0.5">
      <SidebarSettingLink to="/app/settings/profile" icon={<FiUser className="w-[18px] h-[18px]" />} onClick={() => setIsMobileMenuOpen(false)}>{t('page.profile')}</SidebarSettingLink>
      <SidebarSettingLink to="/app/settings/billing" icon={<FiCreditCard className="w-[18px] h-[18px]" />} onClick={() => setIsMobileMenuOpen(false)}>{t('page.plans')}</SidebarSettingLink>
      <SidebarSettingLink to="/app/settings/security" icon={<FiShield className="w-[18px] h-[18px]" />} onClick={() => setIsMobileMenuOpen(false)}>{t('page.security')}</SidebarSettingLink>
      <SidebarSettingLink to="/app/settings/integration" icon={<FiZap className="w-[18px] h-[18px]" />} onClick={() => setIsMobileMenuOpen(false)}>{t('page.integrations')}</SidebarSettingLink>
      {/* Notificações fica em último — ainda em desenvolvimento (ADR-022) */}
      <SidebarSettingLink to="/app/settings/notification" icon={<FiBell className="w-[18px] h-[18px]" />} onClick={() => setIsMobileMenuOpen(false)}>{t('page.notifications')}</SidebarSettingLink>
    </nav>
  </div>
));

SettingsSidebar.propTypes = {
  isMobileMenuOpen: PropTypes.bool.isRequired,
  setIsMobileMenuOpen: PropTypes.func.isRequired,
  t: PropTypes.func.isRequired
};

SettingsSidebar.displayName = 'SettingsSidebar';

const PlaceholderPage = React.memo(({ title }) => (
  <div className="bg-card rounded-xl border border-border p-6">
    <Text
      variant="h5"
      weight="medium"
      className="mb-2 text-foreground"
    >
      {title}
    </Text>
    <Text variant="body2" className="text-muted-foreground">
      {title === 'Notificações' ? 'Esta página está em desenvolvimento.' : 'This page is under development.'}
    </Text>
  </div>
));

PlaceholderPage.propTypes = {
  title: PropTypes.string.isRequired
};

PlaceholderPage.displayName = 'PlaceholderPage';

const SettingsContent = React.memo(({ t }) => (
  <Routes>
    <Route path="profile" element={<ProfilePage />} />
    <Route path="billing" element={<WipGuard active={WIP_COMPONENTS.SETTINGS_BILLING} portalId="settings-content"><SubscriptionManagement /></WipGuard>} />
    <Route path="notification" element={<WipGuard active={WIP_COMPONENTS.SETTINGS_NOTIFICATION} portalId="settings-content"><PlaceholderPage title={t('page.notifications')} /></WipGuard>} />
    <Route path="security" element={<WipGuard active={WIP_COMPONENTS.SETTINGS_SECURITY} portalId="settings-content"><SecuritySettings /></WipGuard>} />
    <Route path="integration" element={<WipGuard active={WIP_COMPONENTS.SETTINGS_INTEGRATION} portalId="settings-content"><NotionIntegrationSettings /></WipGuard>} />
  </Routes>
));

SettingsContent.propTypes = {
  t: PropTypes.func.isRequired
};

SettingsContent.displayName = 'SettingsContent';

const SettingsPage = () => {
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);
  const { t } = useTranslation('settings');

  const memoizedSettingsSidebar = useMemo(() => (
    <SettingsSidebar
      isMobileMenuOpen={isMobileMenuOpen}
      setIsMobileMenuOpen={setIsMobileMenuOpen}
      t={t}
    />
  ), [isMobileMenuOpen, t]);

  const memoizedSettingsContent = useMemo(() => <SettingsContent t={t} />, [t]);

  return (
    <div className="container mx-auto">
      <div className="flex items-center justify-between mb-6">
        <Text
          variant="h4"
          weight="semibold"
          className="font-display text-foreground"
        >
          {t('page.title')}
        </Text>
        <button
          className="lg:hidden w-10 h-10 rounded-lg flex items-center justify-center text-muted-foreground bg-card border border-border hover:bg-accent transition-colors"
          onClick={() => setIsMobileMenuOpen(!isMobileMenuOpen)}
          aria-label="Toggle menu"
        >
          <FiMenu className="w-5 h-5" />
        </button>
      </div>
      <div className="lg:flex lg:gap-6">
        <div className="lg:w-60 mb-6 lg:mb-0 flex-shrink-0">
          {memoizedSettingsSidebar}
        </div>
        <div className="relative flex-1 min-h-[60vh]" id="settings-content">
          {memoizedSettingsContent}
        </div>
      </div>
    </div>
  );
};

SettingsPage.displayName = 'SettingsPage';

export default React.memo(SettingsPage);
