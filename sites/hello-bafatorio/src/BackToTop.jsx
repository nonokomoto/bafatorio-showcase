import { useEffect, useState } from 'react';
import { useTranslation } from 'react-i18next';

const SHOW_AFTER_PX = 480;

export default function BackToTop() {
  const { t } = useTranslation();
  const [visible, setVisible] = useState(() => window.scrollY > SHOW_AFTER_PX);

  useEffect(() => {
    const updateVisibility = () => setVisible(window.scrollY > SHOW_AFTER_PX);
    window.addEventListener('scroll', updateVisibility, { passive: true });
    return () => window.removeEventListener('scroll', updateVisibility);
  }, []);

  if (!visible) return null;

  return (
    <a
      className="back-to-top"
      href="#top"
      aria-label={t('footer.backToTop')}
      title={t('footer.backToTop')}
    >
      <span aria-hidden="true">↑</span>
    </a>
  );
}
