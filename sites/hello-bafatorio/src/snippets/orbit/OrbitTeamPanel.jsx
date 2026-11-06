import { useTranslation } from 'react-i18next';

// Compact orbit panel: linked team avatars.
export default function OrbitTeamPanel() {
  const { t } = useTranslation();

  return (
    <div className="orbit-feature-panel">
      <div className="orbit-feature-title">
        <strong>{t('snippets.orbit.team')}</strong>
        <span>3</span>
      </div>
      <div className="orbit-avatar-stack">
        <i />
        <i />
        <i />
        <em>{t('snippets.orbit.linked')}</em>
      </div>
    </div>
  );
}
