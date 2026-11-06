import { useTranslation } from 'react-i18next';
import Text from '../UI/Text';
import Container from '../Layout/Container';
import LandingHeader from '../LandingPage/LandingHeader';
import LandingFooter from '../LandingPage/LandingFooter';
import { formatLegalDate } from '../../Utils/legalDate';

const CookiePolicy = () => {
  const { t, i18n } = useTranslation('legal');

  return (
    <div className="bg-card dark:bg-background-900 min-h-screen flex flex-col">
      <LandingHeader />
      <main className="flex-grow pt-20 pb-12">
      <Container>
        <div className="max-w-4xl mx-auto">
          {/* Header Section */}
          <div className="mb-16 pb-8 border-b border-border">
            <Text variant="h1" className="mb-3 text-3xl md:text-4xl font-bold">
              {t('cookies.title')}
            </Text>
            <Text variant="p" className="text-text-600 dark:text-text-400 text-sm">
              {t('cookies.lastUpdated')} {formatLegalDate(i18n.language)}
            </Text>
          </div>

          {/* Introduction Section */}
          <section className="mb-14 pb-10 border-b border-border">
            <Text variant="h2" className="mb-6 text-2xl md:text-3xl font-semibold text-primary-600 dark:text-primary-400">
              {t('cookies.sections.introduction.title')}
            </Text>
            <Text variant="p" className="text-text-700 dark:text-text-300 text-justify leading-relaxed mb-4 text-base">
              {t('cookies.sections.introduction.content')}
            </Text>
          </section>

          {/* What Are Cookies Section */}
          <section className="mb-14 pb-10 border-b border-border">
            <Text variant="h2" className="mb-6 text-2xl md:text-3xl font-semibold text-primary-600 dark:text-primary-400">
              {t('cookies.sections.whatAreCookies.title')}
            </Text>
            <div className="bg-background-50 dark:bg-background-800 rounded-lg p-6 md:p-8">
              <Text variant="p" className="text-text-700 dark:text-text-300 text-justify leading-relaxed text-base">
                {t('cookies.sections.whatAreCookies.content')}
              </Text>
            </div>
          </section>

          {/* Types of Cookies Section */}
          <section className="mb-14 pb-10 border-b border-border">
            <Text variant="h2" className="mb-6 text-2xl md:text-3xl font-semibold text-primary-600 dark:text-primary-400">
              {t('cookies.sections.typesOfCookies.title')}
            </Text>
            <Text variant="p" className="text-text-700 dark:text-text-300 text-justify leading-relaxed mb-4 text-base">
              {t('cookies.sections.typesOfCookies.content')}
            </Text>
          </section>

          {/* How We Use Cookies Section */}
          <section className="mb-14 pb-10 border-b border-border">
            <Text variant="h2" className="mb-6 text-2xl md:text-3xl font-semibold text-primary-600 dark:text-primary-400">
              {t('cookies.sections.howWeUseCookies.title')}
            </Text>
            <Text variant="p" className="text-text-700 dark:text-text-300 text-justify leading-relaxed mb-4 text-base">
              {t('cookies.sections.howWeUseCookies.content')}
            </Text>
          </section>

          {/* Cookie Management Section */}
          <section className="mb-14 pb-10 border-b border-border">
            <Text variant="h2" className="mb-6 text-2xl md:text-3xl font-semibold text-primary-600 dark:text-primary-400">
              {t('cookies.sections.cookieManagement.title')}
            </Text>
            <div className="bg-blue-50 dark:bg-blue-950/20 rounded-r-lg p-6">
              <Text variant="p" className="text-text-700 dark:text-text-300 text-justify leading-relaxed text-base">
                {t('cookies.sections.cookieManagement.content')}
              </Text>
            </div>
          </section>

          {/* Third-Party Cookies Section */}
          <section className="mb-14 pb-10 border-b border-border">
            <Text variant="h2" className="mb-6 text-2xl md:text-3xl font-semibold text-primary-600 dark:text-primary-400">
              {t('cookies.sections.thirdPartyCookies.title')}
            </Text>
            <Text variant="p" className="text-text-700 dark:text-text-300 text-justify leading-relaxed mb-4 text-base">
              {t('cookies.sections.thirdPartyCookies.content')}
            </Text>
          </section>

          {/* Contact Section */}
          <section className="mb-8">
            <Text variant="h2" className="mb-6 text-2xl md:text-3xl font-semibold text-primary-600 dark:text-primary-400">
              {t('cookies.sections.contact.title')}
            </Text>
            <div className="bg-primary-50 dark:bg-primary-950/20 border border-primary-200 dark:border-primary-800 rounded-lg p-6 md:p-8">
              <Text variant="p" className="text-text-700 dark:text-text-300 text-justify leading-relaxed text-base">
                {t('cookies.sections.contact.content')}
              </Text>
              <Text variant="p" className="text-primary-600 dark:text-primary-400 font-semibold mt-4">
                Email: privacy@bafatorio.com
              </Text>
            </div>
          </section>

        </div>
      </Container>
      </main>
      <LandingFooter />
    </div>
  );
};

export default CookiePolicy;
