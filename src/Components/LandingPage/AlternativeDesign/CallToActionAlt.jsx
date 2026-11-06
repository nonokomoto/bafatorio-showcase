import { Link } from 'react-router-dom';
import { HiArrowRight } from 'react-icons/hi';
import { Text, Button, Container, Card } from '../../UI';
import { track } from 'src/Utils/analytics';
import { useTranslation } from 'react-i18next';
import 'animate.css';

const CallToActionAlt = () => {
  const { t } = useTranslation('landingPageAlt');

  return (
    <div className="py-8 md:py-12 lg:py-24 bg-gradient-to-br from-primary-500 via-primary-600 to-primary-700 dark:from-primary-600 dark:via-primary-700 dark:to-primary-800 relative overflow-hidden">
      {/* Decorative elements */}
      <div className="absolute -z-10 -top-24 -right-24 w-96 h-96 bg-white/5 rounded-full blur-3xl"></div>
      <div className="absolute -z-10 -bottom-24 -left-24 w-96 h-96 bg-white/5 rounded-full blur-3xl"></div>
      
      <Container>
        <Card bordered={false} elevated={false} className="relative overflow-hidden bg-gradient-to-br from-card to-muted backdrop-blur-sm p-8 md:p-12 lg:p-16 shadow-md animate__animated animate__fadeIn animate__faster">
          {/* Background patterns */}
          <div className="absolute top-0 right-0 w-full h-full opacity-5 dark:opacity-10">
            <svg width="100%" height="100%" viewBox="0 0 100 100" preserveAspectRatio="none">
              <pattern id="pattern-circles" x="0" y="0" width="20" height="20" patternUnits="userSpaceOnUse" patternContentUnits="userSpaceOnUse">
                <circle id="pattern-circle" cx="10" cy="10" r="2" fill="currentColor"></circle>
              </pattern>
              <rect x="0" y="0" width="100%" height="100%" fill="url(#pattern-circles)"></rect>
            </svg>
          </div>
          
          <div className="relative flex flex-col lg:flex-row items-center justify-between">
            <div className="text-center lg:text-left lg:w-3/5 mb-8 lg:mb-0 animate__animated animate__fadeIn animate__faster">
              <Text 
                variant="h2" 
                weight="bold" 
                className="mb-4 text-text-900 dark:text-text-100 font-display text-3xl sm:text-4xl lg:text-5xl animate__animated animate__fadeIn"
              >
                {t('callToAction.title')}
              </Text>
              <Text 
                variant="body" 
                className="text-text-600 dark:text-text-300 text-lg max-w-xl mx-auto lg:mx-0 animate__animated animate__fadeIn"
              >
                {t('callToAction.description')}
              </Text>
            </div>
            
            <div className="space-y-4 w-full lg:w-auto flex flex-col sm:flex-row sm:space-y-0 sm:space-x-4 lg:flex-col lg:space-y-4 lg:space-x-0 animate__animated animate__fadeIn" style={{ animationDelay: '0.1s' }}>
              <Link to="/signup" className="w-full lg:w-auto" onClick={() => track('cta_click', { cta: 'final' })}>
                <Button
                  variant="primary"
                  size="xl"
                  endIcon={<HiArrowRight />}
                  className="w-full lg:w-auto shadow-xl shadow-primary-500/20 dark:shadow-primary-400/10 hover:shadow-primary-500/30 dark:hover:shadow-primary-400/20 transition-all"
                >
                  {t('callToAction.button')}
                </Button>
              </Link>
            </div>
          </div>
        </Card>
        
        <div className="mt-24 grid grid-cols-1 md:grid-cols-3 gap-16 animate__animated animate__fadeIn" style={{ animationDelay: '0.15s' }}>
          <div className="flex flex-col items-center justify-center text-center animate__animated animate__fadeIn" style={{ animationDelay: '0.2s' }}>
            <div className="w-16 h-16 bg-white/10 rounded-lg text-white flex items-center justify-center mb-6">
              <svg className="w-8 h-8" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z" />
              </svg>
            </div>
            <Text variant="h5" weight="medium" className="mb-3 text-white text-center">
              {t('callToAction.features.security.title')}
            </Text>
            <Text variant="body2" className="text-white/90 text-center">
              {t('callToAction.features.security.description')}
            </Text>
          </div>
          
          <div className="flex flex-col items-center justify-center text-center animate__animated animate__fadeIn" style={{ animationDelay: '0.25s' }}>
            <div className="w-16 h-16 bg-white/10 rounded-lg text-white flex items-center justify-center mb-6">
              <svg className="w-8 h-8" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
            </div>
            <Text variant="h5" weight="medium" className="mb-3 text-white text-center">
              {t('callToAction.features.implementation.title')}
            </Text>
            <Text variant="body2" className="text-white/90 text-center">
              {t('callToAction.features.implementation.description')}
            </Text>
          </div>
          
          <div className="flex flex-col items-center justify-center text-center animate__animated animate__fadeIn" style={{ animationDelay: '0.3s' }}>
            <div className="w-16 h-16 bg-white/10 rounded-lg text-white flex items-center justify-center mb-6">
              <svg className="w-8 h-8" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 10V3L4 14h7v7l9-11h-7z" />
              </svg>
            </div>
            <Text variant="h5" weight="medium" className="mb-3 text-white text-center">
              {t('callToAction.features.support.title')}
            </Text>
            <Text variant="body2" className="text-white/90 text-center">
              {t('callToAction.features.support.description')}
            </Text>
          </div>
        </div>
      </Container>
    </div>
  );
};

export default CallToActionAlt;
