import { useState } from 'react';
import { useTranslation } from 'react-i18next';

import useSectionView from './useSectionView.js';

const VIDEO_BASE = 'https://bafatorio-public-assets.s3.eu-west-1.amazonaws.com/media/video-promocional/com-legenda';

// The promo runs 65s at 16MB, so it never loads with the page: the visitor sees
// a poster and only pays for the video after asking for it. Subtitled cut, so
// it still reads for anyone watching muted.
const VIDEO_BY_LOCALE = {
  'pt-PT': `${VIDEO_BASE}/bafatorio-pt-marta.mp4`,
  'en-US': `${VIDEO_BASE}/bafatorio-en.mp4`,
};
// Portuguese is the product's primary language, but a visitor outside the
// mapped locales is not lusophone: the English subtitled cut serves them.
const FALLBACK_VIDEO = VIDEO_BY_LOCALE['en-US'];

const POSTER = '/video/promo-poster-1280.webp';
const POSTER_SRCSET = '/video/promo-poster-640.webp 640w, /video/promo-poster-1280.webp 1280w';
const POSTER_SIZES = '(min-width: 900px) 860px, 92vw';

export default function VideoShowcase() {
  const { t, i18n } = useTranslation();
  const [playing, setPlaying] = useState(false);
  const sectionRef = useSectionView('video');

  const src = VIDEO_BY_LOCALE[i18n.resolvedLanguage] ?? FALLBACK_VIDEO;

  return (
    <section id="video" className="video-showcase" aria-labelledby="video-title" ref={sectionRef}>
      <div className="section-intro">
        <p className="section-eyebrow">{t('video.eyebrow')}</p>
        <h2 className="section-title" id="video-title">{t('video.title')}</h2>
        <p className="body-copy">{t('video.body')}</p>
      </div>

      <div className="video-frame">
        {playing ? (
          <video
            className="video-frame__player"
            src={src}
            controls
            autoPlay
            playsInline
            preload="auto"
          />
        ) : (
          <button
            type="button"
            className="video-frame__cover"
            onClick={() => setPlaying(true)}
          >
            <img
              src={POSTER}
              srcSet={POSTER_SRCSET}
              sizes={POSTER_SIZES}
              width="1280"
              height="720"
              loading="lazy"
              decoding="async"
              alt={t('video.posterAlt')}
            />
            <span className="video-frame__play" aria-hidden="true">▶</span>
            <span className="sr-only">{t('video.play')}</span>
          </button>
        )}
      </div>
    </section>
  );
}
