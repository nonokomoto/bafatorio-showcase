import { useTranslation } from 'react-i18next';

// Compact orbit panel: participants avatar stack.
export default function OrbitParticipantsPanel() {
  const { t } = useTranslation();

  return (
    <div className="orbit-feature-panel">
      <div className="orbit-feature-title">
        <strong>{t('snippets.participants.label')}</strong>
        <span>120</span>
      </div>
      <div className="orbit-avatar-stack">
        <i />
        <i />
        <i />
        <em>+117</em>
      </div>
    </div>
  );
}
