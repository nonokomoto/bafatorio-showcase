import { useTranslation } from 'react-i18next';

// Compact orbit panel: live communication thread.
export default function OrbitMessagesPanel() {
  const { t } = useTranslation();

  return (
    <div className="orbit-feature-panel">
      <div className="orbit-feature-title">
        <strong>{t('snippets.orbit.comms')}</strong>
        <span>{t('snippets.orbit.now')}</span>
      </div>
      <div className="orbit-messages">
        <span className="orbit-message">{t('snippets.orbit.briefing')}</span>
        <span className="orbit-message">{t('snippets.orbit.received')}</span>
      </div>
    </div>
  );
}
