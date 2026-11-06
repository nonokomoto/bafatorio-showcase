import { useTranslation } from 'react-i18next';

const BARS = ['48%', '72%', '58%', '92%', '78%'];

// Compact orbit panel: report bars growing.
export default function OrbitReportsPanel() {
  const { t } = useTranslation();

  return (
    <div className="orbit-feature-panel">
      <div className="orbit-feature-title">
        <strong>{t('snippets.orbit.reports')}</strong>
        <span>{t('snippets.orbit.ready')}</span>
      </div>
      <div className="orbit-bars">
        {BARS.map((height) => (
          <i key={height} style={{ '--bar-height': height }} />
        ))}
      </div>
    </div>
  );
}
