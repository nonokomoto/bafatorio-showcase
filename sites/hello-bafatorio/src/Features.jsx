import { useTranslation } from 'react-i18next';

import useReveal from './useReveal.js';
import useSectionView from './useSectionView.js';
import AgendaSnippet from './snippets/AgendaSnippet.jsx';
import DocumentsSnippet from './snippets/DocumentsSnippet.jsx';
import ParticipantsSnippet from './snippets/ParticipantsSnippet.jsx';
import SuppliersSnippet from './snippets/SuppliersSnippet.jsx';

const CARD_IDS = ['participants', 'documents', 'suppliers', 'agenda'];

const SNIPPETS = {
  participants: ParticipantsSnippet,
  documents: DocumentsSnippet,
  suppliers: SuppliersSnippet,
  agenda: AgendaSnippet,
};

function FeatureCard({ id, order }) {
  const { t } = useTranslation();
  const [ref, visible] = useReveal(0.3);
  const Snippet = SNIPPETS[id];

  return (
    <article ref={ref} className={`feature-card reveal${visible ? ' visible' : ''}`}>
      <div className="feature-visual">{Snippet ? <Snippet /> : null}</div>
      <span className="feature-index">{String(order).padStart(2, '0')}</span>
      <h3>{t(`features.cards.${id}.title`)}</h3>
      <p>{t(`features.cards.${id}.body`)}</p>
    </article>
  );
}

export default function Features() {
  const { t } = useTranslation();
  const [introRef, introVisible] = useReveal(0.4);
  const sectionRef = useSectionView('features');

  return (
    <section id="features" className="features" aria-labelledby="features-title" ref={sectionRef}>
      <div ref={introRef} className={`section-intro reveal${introVisible ? ' visible' : ''}`}>
        <p className="section-eyebrow">{t('features.eyebrow')}</p>
        <h2 className="section-title" id="features-title">{t('features.title')}</h2>
        <p className="body-copy">{t('features.body')}</p>
      </div>

      <div className="feature-grid">
        {CARD_IDS.map((id, index) => (
          <FeatureCard key={id} id={id} order={index + 1} />
        ))}
      </div>
    </section>
  );
}
