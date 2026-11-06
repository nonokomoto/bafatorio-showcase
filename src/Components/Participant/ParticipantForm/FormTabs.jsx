import PropTypes from 'prop-types';
import { useTranslation } from 'react-i18next';
import { TABS } from './formTabsConfig';

const FormTabs = ({ activeTab, onTabChange }) => {
  const { t } = useTranslation('participant');

  return (
    <>
      {/* Desktop sidebar */}
      <nav className="hidden sm:flex flex-col w-[220px] bg-muted border-r border-border py-2 shrink-0 gap-0.5">
        {TABS.map(({ key, Icon, iconCls, bgCls, labelKey, fallback }) => {
          const isActive = activeTab === key;
          return (
            <button
              key={key}
              type="button"
              onClick={() => onTabChange(key)}
              className={`flex items-center gap-2.5 py-2.5 px-3.5 mx-2 rounded-[10px] border-none cursor-pointer w-[calc(100%-16px)] text-left text-sm transition-colors ${
                isActive
                  ? 'bg-card text-foreground font-semibold shadow-sm'
                  : 'bg-transparent text-foreground font-normal hover:bg-accent'
              }`}
            >
              <span className={`w-7 h-7 rounded-lg flex items-center justify-center shrink-0 transition-colors ${isActive ? bgCls : 'bg-transparent'}`}>
                <Icon
                  size={16}
                  className={`transition-colors ${isActive ? iconCls : 'text-muted-foreground'}`}
                />
              </span>
              <span>{t(labelKey, fallback)}</span>
            </button>
          );
        })}
      </nav>

      {/* Mobile horizontal tabs */}
      <nav className="flex sm:hidden flex-row overflow-x-auto border-b border-border px-2 py-1 gap-1 shrink-0 scrollbar-hide bg-muted">
        {TABS.map(({ key, Icon, iconCls, bgCls }) => {
          const isActive = activeTab === key;
          return (
            <button
              key={key}
              type="button"
              onClick={() => onTabChange(key)}
              className={`flex items-center justify-center w-10 h-10 rounded-[10px] border-none cursor-pointer shrink-0 transition-colors ${
                isActive
                  ? 'bg-card shadow-sm'
                  : 'bg-transparent hover:bg-accent'
              }`}
            >
              <span className={`w-7 h-7 rounded-lg flex items-center justify-center transition-colors ${isActive ? bgCls : 'bg-transparent'}`}>
                <Icon
                  size={16}
                  className={`transition-colors ${isActive ? iconCls : 'text-muted-foreground'}`}
                />
              </span>
            </button>
          );
        })}
      </nav>
    </>
  );
};

FormTabs.propTypes = {
  activeTab: PropTypes.string.isRequired,
  onTabChange: PropTypes.func.isRequired,
};

export default FormTabs;
