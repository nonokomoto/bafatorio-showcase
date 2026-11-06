import { useState, useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import { useNavigate } from 'react-router-dom';

const CookieBanner = () => {
  const { t } = useTranslation('legal');
  const navigate = useNavigate();
  const [isVisible, setIsVisible] = useState(false);

  useEffect(() => {
    const cookieConsent = localStorage.getItem('bafatorio-cookie-consent');
    if (!cookieConsent) {
      setIsVisible(true);
    }
  }, []);

  const handleAccept = () => {
    localStorage.setItem('bafatorio-cookie-consent', 'accepted');
    setIsVisible(false);
  };

  const handleReject = () => {
    localStorage.setItem('bafatorio-cookie-consent', 'rejected');
    setIsVisible(false);
  };

  const handleCookiePolicy = () => {
    navigate('/cookies');
  };

  if (!isVisible) return null;

  return (
    <div
      className="fixed bottom-0 left-0 right-0 z-50 animate-in fade-in slide-in-from-bottom-5 duration-300"
      role="region"
      aria-label="Cookie consent banner"
    >
      {/* Backdrop blur */}
      <div className="absolute inset-0 backdrop-blur-sm" />

      {/* Banner container */}
      <div className="relative bg-card dark:bg-background-800 border-t border-border shadow-2xl">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6">
          <div className="flex flex-col md:flex-row items-start md:items-center justify-between gap-6">
            {/* Content */}
            <div className="flex-1">
              <h3 className="text-sm font-semibold text-text-900 dark:text-text-50 mb-2">
                {t('banner.title')}
              </h3>
              <p className="text-sm text-text-600 dark:text-text-300 leading-relaxed">
                {t('banner.description')} {' '}
                <button
                  onClick={handleCookiePolicy}
                  className="font-semibold text-primary-600 dark:text-primary-400 hover:underline focus:outline-none focus:ring-2 focus:ring-primary-500 rounded px-1"
                >
                  {t('banner.policyLink')}
                </button>
              </p>
            </div>

            {/* Actions */}
            <div className="flex items-center gap-3 w-full md:w-auto">
              <button
                onClick={handleReject}
                className="flex-1 md:flex-none px-6 py-2.5 text-sm font-medium text-text-700 dark:text-text-300 bg-background-100 dark:bg-background-700 border border-border rounded-lg hover:bg-background-200 dark:hover:bg-background-600 transition-colors focus:outline-none focus:ring-2 focus:ring-primary-500 focus:ring-offset-2 dark:focus:ring-offset-background-800"
              >
                {t('banner.reject')}
              </button>
              <button
                onClick={handleAccept}
                className="flex-1 md:flex-none px-6 py-2.5 text-sm font-semibold text-white bg-primary-600 hover:bg-primary-700 rounded-lg transition-colors focus:outline-none focus:ring-2 focus:ring-primary-500 focus:ring-offset-2 dark:focus:ring-offset-background-800"
              >
                {t('banner.accept')}
              </button>

              {/* Close button */}
              <button
                onClick={handleReject}
                className="p-2 text-text-500 dark:text-text-400 hover:text-text-700 dark:hover:text-text-200 focus:outline-none focus:ring-2 focus:ring-primary-500 rounded transition-colors text-2xl leading-none"
                aria-label="Close cookie banner"
              >
                ×
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

CookieBanner.propTypes = {};

export default CookieBanner;
