import { useTranslation } from 'react-i18next';

// Compact orbit panel: live check-in ring.
export default function OrbitCheckinPanel() {
  const { t } = useTranslation();

  return (
    <div className="orbit-feature-panel">
      <div className="orbit-feature-title">
        <strong>{t('snippets.orbit.checkin')}</strong>
        <span>{t('snippets.orbit.live')}</span>
      </div>
      <div className="orbit-checkin">
        <span className="orbit-checkin-ring" />
        <span className="orbit-checkin-copy">
          <strong>{t('snippets.orbit.present')}</strong>
          <span>{t('snippets.orbit.presentOf')}</span>
        </span>
      </div>
    </div>
  );
}
