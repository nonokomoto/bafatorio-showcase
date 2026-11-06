import { useTranslation } from 'react-i18next';

const SERVICES = ['catering', 'av', 'security'];

// Floating product excerpt: supplier services being ticked off.
// Reusable wherever an ancestor toggles the `visible` class.
export default function SuppliersSnippet() {
  const { t } = useTranslation();

  return (
    <div className="snippet" aria-hidden="true">
      <div className="snippet-head">
        <div>
          <span className="snippet-label">{t('snippets.suppliers.label')}</span>
          <strong>{t('snippets.suppliers.title')}</strong>
        </div>
        <span className="mini-status">{t('snippets.suppliers.badge')}</span>
      </div>
      <div className="mini-list">
        {SERVICES.map((service) => (
          <div key={service} className="mini-row">
            <i className="mini-service-icon" />
            <span className="mini-name">{t(`snippets.suppliers.services.${service}`)}</span>
            <span className="mini-check">✓</span>
          </div>
        ))}
      </div>
    </div>
  );
}
