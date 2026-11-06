import { Container, Text, Button } from '../../UI';
import { Link } from 'react-router-dom';
import { track } from 'src/Utils/analytics';
import { HiArrowRight, HiCheck } from 'react-icons/hi';
import 'animate.css';
import { useTranslation } from 'react-i18next';

import fallbackImage from '/src/assets/bafatorioFeatures.jpg'; 
import danielaImage from '/src/assets/daniela.jpg'; 

const HeroAlt = () => {
  const { t } = useTranslation('landingPageAlt');
  
  return (
    <section className="relative overflow-hidden bg-gradient-to-br from-white via-primary-50/30 to-secondary-50/20 dark:from-background-900 dark:via-background-800 dark:to-background-900 space-y-8">
      {/* Background pattern overlay */}
      <div className="absolute inset-0 bg-grid-primary-900/[0.03] dark:bg-grid-primary-400/[0.02] bg-[length:20px_20px] -z-10"></div>
      
      {/* Decorative graphic elements */}
      <div className="absolute -top-24 -right-24 w-96 h-96 bg-primary-500/5 dark:bg-primary-500/10 rounded-full blur-3xl animate-pulse"></div>
      <div className="absolute top-1/2 -left-24 w-96 h-96 bg-secondary-500/5 dark:bg-secondary-500/10 rounded-full blur-3xl"></div>
      <div className="absolute bottom-0 left-1/2 w-72 h-72 -translate-x-1/2 bg-success-500/3 dark:bg-success-500/5 rounded-full blur-3xl"></div>
      
      <Container className="relative">
        <div className="py-14 md:py-16">
          <div className="grid md:grid-cols-2 gap-16 items-center">
            {/* Left column: Content */}
            <div className="flex flex-col space-y-8 animate__animated animate__fadeIn">
              {/* Main headline & lead */}
              <div>
                <Text
                  as="h1"
                  variant="h1"
                  weight="bold"
                  className="text-3xl sm:text-4xl lg:text-5xl mb-5 leading-tight text-text-900 dark:text-text-100 animate__animated animate__fadeInUp"
                  style={{ animationDelay: '0.3s' }}
                >
                  <span className="text-primary-600 dark:text-primary-400 font-bold">{t('hero.titleHighlight')}</span>
                  <span className="block md:inline">{t('hero.titleSecondary')}</span>
                </Text>
                
                <Text
                  variant="subtitle1"
                  className="text-lg text-muted-foreground max-w-lg mb-2 leading-relaxed animate__animated animate__fadeInUp"
                  style={{ animationDelay: '0.4s' }}
                >
                  {t('hero.description')}
                </Text>
              </div>
              
              {/* CTA section */}
              <div className="flex flex-col space-y-6 animate__animated animate__fadeInUp" style={{ animationDelay: '0.5s' }}>
                <div className="flex flex-wrap gap-4">
                  <Button
                    size="lg"
                    variant="primary"
                    className="shadow-lg shadow-primary-500/15 hover:shadow-primary-500/25 dark:shadow-primary-900/20 dark:hover:shadow-primary-800/30 transition-all duration-300 group"
                    icon={<HiArrowRight className="group-hover:translate-x-1 transition-transform duration-300" />}
                    iconPosition="right"
                    as={Link}
                    to="/signup"
                    onClick={() => track('cta_click', { cta: 'hero' })}
                  >
                    {t('hero.ctaStart')}
                  </Button>
                  
                </div>
                
                {/* Pricing information */}
                <div className="pl-1 text-sm text-text-500 dark:text-text-400 flex items-center animate__animated animate__fadeIn" style={{ animationDelay: '0.8s' }}>
                  <div className="flex-shrink-0 h-5 w-5 bg-success-100 dark:bg-success-900/30 text-success-600 dark:text-success-400 rounded-full flex items-center justify-center mr-2">
                    <HiCheck className="w-3.5 h-3.5" />
                  </div>
                  <span>{t('hero.freeAccount')}</span>
                </div>
                
                <div className="pl-1 text-sm text-text-500 dark:text-text-400 flex items-center animate__animated animate__fadeIn" style={{ animationDelay: '0.9s' }}>
                  <div className="flex-shrink-0 h-5 w-5 bg-primary-100 dark:bg-primary-900/30 text-primary-600 dark:text-primary-400 rounded-full flex items-center justify-center mr-2">
                    <HiCheck className="w-3.5 h-3.5" />
                  </div>
                  <span>{t('hero.paidEvents')}</span>
                </div>
                
                {/* Trial friction reducer */}
                <div className="pl-1 text-sm text-text-500 dark:text-text-400 flex items-center animate__animated animate__fadeIn" style={{ animationDelay: '0.8s' }}>
                  <div className="flex-shrink-0 h-5 w-5 bg-success-100 dark:bg-success-900/30 text-success-600 dark:text-success-400 rounded-full flex items-center justify-center mr-2">
                    <HiCheck className="w-3.5 h-3.5" />
                  </div>
                  <span>{t('hero.noCreditCard')}</span>
                </div>
              </div>
              
            </div>
            
            {/* Right column: Image & visuals */}
            <div className="relative animate__animated animate__fadeInRight" style={{ animationDelay: '0.5s' }}>
              {/* Product screenshot with visual embellishments */}
              <div className="relative rounded-xl overflow-hidden shadow-2xl border border-background-200/50 dark:border-background-700/50 transition-all duration-500 hover:shadow-primary-500/20 dark:hover:shadow-primary-900/20">
                
                {/* Design elements */}
                <div className="absolute -top-1 -right-1 w-20 h-20 bg-primary-500/10 dark:bg-primary-500/15 rounded-full blur-xl"></div>
                <div className="absolute -bottom-4 -left-4 w-28 h-28 bg-secondary-500/10 dark:bg-secondary-500/15 rounded-full blur-xl"></div>
                
                {/* Main image */}
                <img 
                  src={danielaImage} 
                  alt={t('hero.imageAlt')} 
                  className="w-full object-cover max-w-full shadow-lg rounded-xl h-auto md:h-[400px] lg:h-[450px] dark:opacity-90"
                  style={{ objectPosition: 'center top' }}
                  onError={(e) => {
                    e.target.onerror = null;
                    e.target.src = fallbackImage;
                  }}
                />
                
                {/* Floating feature card */}
                <div className="absolute top-4 right-4 bg-card/95 shadow-xl px-4 py-1.5 rounded-full animate__animated animate__fadeIn border border-background-100 dark:border-background-700 backdrop-blur-sm z-10">
                  <div className="flex items-center space-x-2 text-xs font-semibold text-success-600 dark:text-success-400">
                    <svg className="w-4 h-4 flex-shrink-0" fill="currentColor" viewBox="0 0 20 20">
                      <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
                    </svg>
                    <span>{t('hero.eventsCompleted')}</span>
                  </div>
                </div>
                
              </div>
            </div>
          </div>
        </div>
      </Container>
    </section>
  );
};

export default HeroAlt;
