import { useTranslation } from 'react-i18next';

import BrandMonogram from './BrandMonogram.jsx';
import useReveal from './useReveal.js';
import useSectionView from './useSectionView.js';

// Curves and stagger delays come from the approved prototype
// (docs/plans/hello-bafatorio/2026-07-16-hello-landing-prototype.html).
const LINKS = [
  { delay: '0.35s', d: 'M490 235 C430 200 370 150 295 95' },
  { delay: '0.45s', d: 'M490 235 C550 195 615 145 685 90' },
  { delay: '0.55s', d: 'M490 235 C610 270 680 360 835 395' },
  { delay: '0.65s', d: 'M490 235 C380 285 325 360 225 402' },
  { delay: '0.75s', d: 'M490 235 C492 320 500 390 500 455' },
  { delay: '0.85s', d: 'M490 235 C380 242 250 250 130 254' },
  { delay: '0.95s', d: 'M490 235 C600 245 740 252 872 256' },
];

const EVENT_NODES = ['human', 'powerlist', 'forum', 'ntu', 'camp', 'weddings', 'batizado'];

export default function SocialProof() {
  const { t } = useTranslation();
  const [sectionRef, visible] = useReveal(0.2);
  const trackedRef = useSectionView('social-proof', sectionRef);

  return (
    <section id="social-proof" className="proof" aria-labelledby="proof-title" ref={trackedRef}>
      <div className={`section-intro reveal${visible ? ' visible' : ''}`}>
        <p className="section-eyebrow">{t('proof.eyebrow')}</p>
        <h2 className="section-title" id="proof-title">{t('proof.title')}</h2>
        <p className="body-copy">{t('proof.body')}</p>
      </div>

      <div
        className={`proof-constellation${visible ? ' visible' : ''}`}
        role="group"
        aria-label={t('proof.constellationLabel')}
      >
        <span className="constellation-field" aria-hidden="true" />
        <svg className="constellation-links" viewBox="0 0 980 500" preserveAspectRatio="none" aria-hidden="true">
          <defs>
            <linearGradient id="constellation-line-gradient" x1="0" y1="0" x2="1" y2="1">
              <stop offset="0" stopColor="#4069ff" stopOpacity="0.68" />
              <stop offset="1" stopColor="#6366f1" stopOpacity="0.3" />
            </linearGradient>
          </defs>
          {LINKS.map((link) => (
            <path
              key={link.d}
              className="constellation-link"
              style={{ '--line-delay': link.delay }}
              pathLength="1"
              d={link.d}
            />
          ))}
        </svg>

        <div className="constellation-core">
          <BrandMonogram className="constellation-core__mark" />
          <strong>{t('brand')}</strong>
        </div>

        <div className="mobile-proof-rail">
          {EVENT_NODES.map((node) => (
            <div key={node} className={`event-node node-${node}`}>
              <strong>{t(`proof.nodes.${node}.name`)}</strong>
              <span>{t(`proof.nodes.${node}.detail`)}</span>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}
