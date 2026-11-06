import { useTranslation } from 'react-i18next';
import Text from '../UI/Text';
import Container from '../Layout/Container';
import LandingHeader from '../LandingPage/LandingHeader';
import LandingFooter from '../LandingPage/LandingFooter';
import { formatLegalDate } from '../../Utils/legalDate';

const TermsOfService = () => {
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
              {t('terms.title')}
            </Text>
            <Text variant="p" className="text-text-600 dark:text-text-400 text-sm">
              {t('terms.lastUpdated')} {formatLegalDate(i18n.language)}
            </Text>
          </div>

          {/* Introduction Section */}
          <section className="mb-14 pb-10 border-b border-border">
            <Text variant="h2" className="mb-6 text-2xl md:text-3xl font-semibold text-primary-600 dark:text-primary-400">
              {t('terms.sections.introduction.title')}
            </Text>
            <Text variant="p" className="text-text-700 dark:text-text-300 text-justify leading-relaxed mb-4 text-base">
              {t('terms.sections.introduction.content')}
            </Text>
          </section>

          {/* User Responsibilities Section */}
          <section className="mb-14 pb-10 border-b border-border">
            <Text variant="h2" className="mb-6 text-2xl md:text-3xl font-semibold text-primary-600 dark:text-primary-400">
              {t('terms.sections.userResponsibilities.title')}
            </Text>
            <div className="bg-background-50 dark:bg-background-800 rounded-lg p-6 md:p-8">
              <Text variant="p" className="text-text-700 dark:text-text-300 text-justify leading-relaxed text-base">
                {t('terms.sections.userResponsibilities.content')}
              </Text>
            </div>
          </section>

          {/* Intellectual Property Section */}
          <section className="mb-14 pb-10 border-b border-border">
            <Text variant="h2" className="mb-6 text-2xl md:text-3xl font-semibold text-primary-600 dark:text-primary-400">
              {t('terms.sections.intellectualProperty.title')}
            </Text>
            <Text variant="p" className="text-text-700 dark:text-text-300 text-justify leading-relaxed mb-4 text-base">
              {t('terms.sections.intellectualProperty.content')}
            </Text>
          </section>

          {/* Limitations Section */}
          <section className="mb-14 pb-10 border-b border-border">
            <Text variant="h2" className="mb-6 text-2xl md:text-3xl font-semibold text-primary-600 dark:text-primary-400">
              {t('terms.sections.limitations.title')}
            </Text>
            <div className="bg-red-50 dark:bg-red-950/20  rounded-r-lg p-6">
              <Text variant="p" className="text-text-700 dark:text-text-300 text-justify leading-relaxed text-base">
                {t('terms.sections.limitations.content')}
              </Text>
            </div>
          </section>

          {/* Changes Section */}
          <section className="mb-14 pb-10 border-b border-border">
            <Text variant="h2" className="mb-6 text-2xl md:text-3xl font-semibold text-primary-600 dark:text-primary-400">
              {t('terms.sections.changes.title')}
            </Text>
            <Text variant="p" className="text-text-700 dark:text-text-300 text-justify leading-relaxed mb-4 text-base">
              {t('terms.sections.changes.content')}
            </Text>
          </section>

          {/* Contact Section */}
          <section className="mb-8">
            <Text variant="h2" className="mb-6 text-2xl md:text-3xl font-semibold text-primary-600 dark:text-primary-400">
              {t('terms.sections.contact.title')}
            </Text>
            <div className="bg-primary-50 dark:bg-primary-950/20 border border-primary-200 dark:border-primary-800 rounded-lg p-6 md:p-8">
              <Text variant="p" className="text-text-700 dark:text-text-300 text-justify leading-relaxed text-base">
                {t('terms.sections.contact.content')}
              </Text>
              <Text variant="p" className="text-primary-600 dark:text-primary-400 font-semibold mt-4">
                Email: support@bafatorio.com
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

export default TermsOfService;
