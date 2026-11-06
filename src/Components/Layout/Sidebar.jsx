// Sidebar.js

import React from 'react';
import { NavLink } from 'react-router-dom';
import { FiUsers, FiCheckSquare, FiSettings, FiBookOpen, FiMenu, FiCreditCard, FiTruck } from 'react-icons/fi';
import { useTranslation } from "react-i18next";
import PropTypes from 'prop-types';

const SidebarLink = ({ to, icon: Icon, text, isCollapsed, closeSidebar }) => (
  <li>
    <NavLink
      to={to}
      title={isCollapsed ? text : undefined}
      className={({ isActive }) =>
        `flex items-center px-3 py-2.5 rounded-lg transition-colors duration-200 ${
          isActive
            ? 'bg-sidebar-accent text-sidebar-accent-foreground'
            : 'text-sidebar-foreground hover:bg-sidebar-accent/80'
        } ${isCollapsed ? 'justify-center' : 'space-x-3'}`
      }
      onClick={closeSidebar}
    >
      <Icon className="w-5 h-5" aria-hidden="true" />
      {!isCollapsed && <span className="font-medium text-sm">{text}</span>}
    </NavLink>
  </li>
);

SidebarLink.propTypes = {
  to: PropTypes.string.isRequired,
  icon: PropTypes.elementType.isRequired,
  text: PropTypes.string.isRequired,
  isCollapsed: PropTypes.bool.isRequired,
  closeSidebar: PropTypes.func.isRequired
};

const GroupTitle = ({ text, isCollapsed }) => (
  !isCollapsed && (
    <h3 className="px-4 pt-6 pb-2 text-xs font-semibold uppercase text-sidebar-foreground/60 tracking-wide">
      {text}
    </h3>
  )
);

GroupTitle.propTypes = {
  text: PropTypes.string.isRequired,
  isCollapsed: PropTypes.bool.isRequired,
};

const SidebarHeader = ({ isCollapsed, toggleSidebar, title }) => (
  <div className="flex items-center justify-between h-16 bg-sidebar-accent px-3">
    {!isCollapsed && (
      <span className="text-xl font-display font-bold text-sidebar-foreground truncate">
        {title}
      </span>
    )}
    <button 
      onClick={toggleSidebar}
      className="p-2 rounded-md text-sidebar-foreground hover:bg-sidebar-foreground/10 transition-colors duration-200"
      aria-label={isCollapsed ? "Expand sidebar" : "Collapse sidebar"}
    >
      <FiMenu className="w-6 h-6" aria-hidden="true" />
    </button>
  </div>
);

SidebarHeader.propTypes = {
  isCollapsed: PropTypes.bool.isRequired,
  toggleSidebar: PropTypes.func.isRequired,
  title: PropTypes.string.isRequired
};

const SidebarFooter = ({ appName }) => (
  <div className="mt-auto py-6 px-4 text-sidebar-foreground">
    <p className="font-display text-sm font-medium">{appName}</p>
  </div>
);

SidebarFooter.propTypes = {
  appName: PropTypes.string.isRequired
};

const Sidebar = ({ isCollapsed, toggleSidebar, closeSidebar }) => {
  const { t } = useTranslation('layout');

  return (
    <aside 
      className={`
        fixed top-0 left-0 h-screen z-40
        lg:sticky lg:z-30 lg:h-screen lg:flex-shrink-0
        bg-sidebar
        shadow-lg
        flex flex-col
        transition-[width,transform] duration-300 ease-in-out
        ${isCollapsed ? 'w-0 lg:w-16' : 'w-64'}
        ${isCollapsed ? 'lg:translate-x-0 -translate-x-full overflow-hidden lg:overflow-visible' : 'translate-x-0'}
      `}
    >
      <SidebarHeader 
        isCollapsed={isCollapsed} 
        toggleSidebar={toggleSidebar} 
        title={t('sidebar.title')}
      />
      
      <nav className="flex-1 overflow-y-auto scrollbar-thin py-4" aria-label="Sidebar Navigation">
        {menuGroups.map((group, groupIndex) => (
          <div key={groupIndex} className="mb-4">
            <GroupTitle text={t(group.titleKey)} isCollapsed={isCollapsed} />
            <ul className={`${isCollapsed ? 'space-y-2 px-2' : 'space-y-1 px-3'}`}>
              {group.items.map((item) => (
                <SidebarLink
                  key={item.to}
                  to={item.to}
                  icon={item.icon}
                  text={t(item.textKey)}
                  isCollapsed={isCollapsed}
                  closeSidebar={closeSidebar}
                />
              ))}
            </ul>
          </div>
        ))}
      </nav>
      
      {!isCollapsed && (
        <SidebarFooter 
          appName={t('footer.appName')} 
        />
      )}
    </aside>
  );
};

const menuGroups = [
  {
    titleKey: 'sidebar.group.eventManagement',
    items: [
      { to: '/app/events', icon: FiBookOpen, textKey: 'sidebar.events' },
      { to: '/app/participants', icon: FiUsers, textKey: 'sidebar.participants' },
      { to: '/app/confirm-presence', icon: FiCheckSquare, textKey: 'sidebar.confirmPresence' },
      { to: '/app/suppliers', icon: FiTruck, textKey: 'sidebar.suppliers' },
    ]
  },
  {
    titleKey: 'sidebar.group.account',
    items: [
      { to: '/app/settings/profile', icon: FiSettings, textKey: 'sidebar.settings' },
      { to: '/app/plan-selection', icon: FiCreditCard, textKey: 'sidebar.planSelection' },
    ]
  }
];

Sidebar.propTypes = {
  isCollapsed: PropTypes.bool.isRequired,
  toggleSidebar: PropTypes.func.isRequired,
  closeSidebar: PropTypes.func.isRequired,
  toggleButtonRef: PropTypes.object
};

export default React.memo(Sidebar);