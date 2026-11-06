import { useTranslation } from 'react-i18next';

// Compact orbit panel: supplier statuses.
export default function OrbitSuppliersPanel() {
  const { t } = useTranslation();

  return (
    <div className="orbit-feature-panel">
      <div className="orbit-feature-title">
        <strong>{t('snippets.suppliers.label')}</strong>
        <span>5</span>
      </div>
      <div className="orbit-statuses">
        <span className="orbit-status">
          {t('snippets.suppliers.services.av')} <i />
        </span>
        <span className="orbit-status">
          {t('snippets.suppliers.services.catering')} <i />
        </span>
      </div>
    </div>
  );
}
