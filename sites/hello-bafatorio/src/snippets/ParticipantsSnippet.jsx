import { useTranslation } from 'react-i18next';

const NAMES = ['Ana Silva', 'Carlos Mendes', 'Inês Pereira'];

// Floating product excerpt: participants list filling up with confirmations.
// Reusable wherever an ancestor toggles the `visible` class (features grid, final CTA).
export default function ParticipantsSnippet() {
  const { t } = useTranslation();

  return (
    <div className="snippet" aria-hidden="true">
      <div className="snippet-head">
        <div>
          <span className="snippet-label">{t('snippets.participants.label')}</span>
          <strong>{t('snippets.participants.title')}</strong>
        </div>
        <span className="mini-total">2 847</span>
      </div>
      <div className="mini-list">
        {NAMES.map((name) => (
          <div key={name} className="mini-row">
            <i className="mini-avatar" />
            <span className="mini-name">{name}</span>
            <span className="mini-status">{t('snippets.participants.confirmed')}</span>
          </div>
        ))}
      </div>
    </div>
  );
}
