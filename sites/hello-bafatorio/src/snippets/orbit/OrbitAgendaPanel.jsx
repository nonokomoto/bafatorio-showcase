import { useTranslation } from 'react-i18next';

const TASKS = [
  { width: '82%', color: '#8b3fd1' },
  { width: '62%', color: '#ef7a25' },
  { width: '74%', color: '#298fe5' },
];

// Compact orbit panel: agenda task bars filling up.
export default function OrbitAgendaPanel() {
  const { t } = useTranslation();

  return (
    <div className="orbit-feature-panel">
      <div className="orbit-feature-title">
        <strong>{t('snippets.agenda.label')}</strong>
        <span>13</span>
      </div>
      <div className="orbit-agenda">
        {TASKS.map((task) => (
          <span
            key={task.color}
            className="orbit-task"
            style={{ '--task-width': task.width, '--task-color': task.color }}
          />
        ))}
      </div>
    </div>
  );
}
