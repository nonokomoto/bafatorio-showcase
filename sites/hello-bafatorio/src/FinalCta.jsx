import { useTranslation } from 'react-i18next';

import { track } from './analytics.js';
import { SIGNUP_URL } from './signup.js';
import useReveal from './useReveal.js';
import useSectionView from './useSectionView.js';
import OrbitAgendaPanel from './snippets/orbit/OrbitAgendaPanel.jsx';
import OrbitCheckinPanel from './snippets/orbit/OrbitCheckinPanel.jsx';
import OrbitDocumentsPanel from './snippets/orbit/OrbitDocumentsPanel.jsx';
import OrbitMessagesPanel from './snippets/orbit/OrbitMessagesPanel.jsx';
import OrbitParticipantsPanel from './snippets/orbit/OrbitParticipantsPanel.jsx';
import OrbitReportsPanel from './snippets/orbit/OrbitReportsPanel.jsx';
import OrbitSuppliersPanel from './snippets/orbit/OrbitSuppliersPanel.jsx';
import OrbitTeamPanel from './snippets/orbit/OrbitTeamPanel.jsx';

const ORBIT_PANELS = [
  OrbitParticipantsPanel,
  OrbitDocumentsPanel,
  OrbitSuppliersPanel,
  OrbitAgendaPanel,
  OrbitTeamPanel,
  OrbitMessagesPanel,
  OrbitCheckinPanel,
  OrbitReportsPanel,
];

export default function FinalCta() {
  const { t } = useTranslation();
  const [ref, visible] = useReveal(0.3);
  const trackedRef = useSectionView('final-cta', ref);

  return (
    <section
      ref={trackedRef}
      className={`final-cta${visible ? ' visible' : ''}`}
      id="early-access"
      aria-labelledby="final-title"
    >
      <span className="orbit" aria-hidden="true" />

      {ORBIT_PANELS.map((Panel, index) => (
        <div key={Panel.name} className={`orbit-feature of-${index + 1} reveal`} aria-hidden="true">
          <Panel />
        </div>
      ))}

      <div className="final-copy reveal">
        <h2 className="section-title" id="final-title">{t('finalCta.title')}</h2>
        <p>{t('finalCta.body')}</p>
        <a className="cta" href={SIGNUP_URL} onClick={() => track('cta_click', { placement: 'final' })}>
          {t('cta')}
          <span className="cta__arrow" aria-hidden="true">→</span>
        </a>
      </div>
    </section>
  );
}
