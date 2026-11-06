import { useTranslation } from 'react-i18next';

const DAYS = [
  { number: '22', event: 'setup', tone: 'is-purple' },
  { number: '23', event: 'budget', tone: 'is-orange' },
  { number: '24', event: 'opening', tone: 'is-blue' },
  { number: '25', event: 'closing', tone: 'is-red' },
];

// Floating product excerpt: agenda days being filled with tasks.
// Reusable wherever an ancestor toggles the `visible` class.
export default function AgendaSnippet() {
  const { t } = useTranslation();

  return (
    <div className="snippet" aria-hidden="true">
      <div className="snippet-head">
        <div>
          <span className="snippet-label">{t('snippets.agenda.label')}</span>
          <strong>{t('snippets.agenda.title')}</strong>
        </div>
        <span className="mini-status">{t('snippets.agenda.badge')}</span>
      </div>
      <div className="mini-calendar">
        {DAYS.map((day) => (
          <div key={day.number} className="mini-day">
            <span className="mini-day-number">{day.number}</span>
            <span className={`mini-agenda-event ${day.tone}`}>
              {t(`snippets.agenda.events.${day.event}`)}
            </span>
          </div>
        ))}
      </div>
    </div>
  );
}
