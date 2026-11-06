import { useTranslation } from 'react-i18next';

const FOLDERS = ['contracts', 'production', 'partners', 'licenses'];

// Floating product excerpt: document folders confirming one by one.
// Reusable wherever an ancestor toggles the `visible` class.
export default function DocumentsSnippet() {
  const { t } = useTranslation();

  return (
    <div className="snippet" aria-hidden="true">
      <div className="snippet-head">
        <div>
          <span className="snippet-label">{t('snippets.documents.label')}</span>
          <strong>{t('snippets.documents.title')}</strong>
        </div>
        <span className="mini-status">{t('snippets.documents.badge')}</span>
      </div>
      <div className="mini-folder-grid">
        {FOLDERS.map((folder) => (
          <div key={folder} className="mini-folder">
            <i className="mini-folder-icon" />
            <strong>{t(`snippets.documents.folders.${folder}.name`)}</strong>
            <span>{t(`snippets.documents.folders.${folder}.meta`)}</span>
          </div>
        ))}
      </div>
    </div>
  );
}
