import { useTranslation } from 'react-i18next';

// Compact orbit panel: document rows.
export default function OrbitDocumentsPanel() {
  const { t } = useTranslation();

  return (
    <div className="orbit-feature-panel">
      <div className="orbit-feature-title">
        <strong>{t('snippets.documents.label')}</strong>
        <span>5</span>
      </div>
      <div className="orbit-folders">
        <span className="orbit-folder" />
        <span className="orbit-folder" style={{ width: '92%' }} />
        <span className="orbit-folder" style={{ width: '64%' }} />
      </div>
    </div>
  );
}
