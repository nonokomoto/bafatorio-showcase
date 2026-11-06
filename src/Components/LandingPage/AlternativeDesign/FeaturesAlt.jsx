import { useState, useEffect } from 'react';
import PropTypes from 'prop-types';
import { Container, Text, Card, Badge } from '../../UI';
import {
  FiCalendar,
  FiUsers,
  FiFileText,
  FiBriefcase,
  FiClock,
  FiShield,
  FiChevronRight
} from 'react-icons/fi';
import { useTranslation } from 'react-i18next';

// Importando utilidades para imagens
import { getFeatureImage, createPlaceholderImage } from './utils';

// Importar animate.css se ainda não estiver disponível globalmente
import 'animate.css';

// Componente de menu para o lado esquerdo
const MenuFeatureItem = ({ icon, title, isActive, onClick }) => (
  <div 
    onClick={onClick}
    className={`
      flex items-center p-3 rounded-lg cursor-pointer transition-all duration-200 mb-2 
      ${isActive ?
        'bg-primary-50/80 text-primary-600 dark:bg-primary-900/10 dark:text-primary-300' :
        'hover:bg-background-50/80 dark:hover:bg-background-700/30 text-text-500 dark:text-text-400 hover:translate-x-0.5'
      }
    `}
  >
    <div className={`
      w-9 h-9 flex items-center justify-center rounded-lg mr-3 transition-colors duration-200
      ${isActive ? 'bg-primary-50/70 text-primary-500 dark:bg-primary-800/20 dark:text-primary-400' : 'text-text-500/70 dark:text-text-400/70'}
    `}>
      {icon}
    </div>
    
    <Text 
      variant="body2" 
      weight={isActive ? "medium" : "normal"}
      className="transition-colors duration-200"
    >
      {title}
    </Text>
    
    {isActive && (
      <FiChevronRight className="ml-auto h-4 w-4 text-primary-400 dark:text-primary-400/70 animate__animated animate__fadeIn animate__faster" />
    )}
  </div>
);

MenuFeatureItem.propTypes = {
  icon: PropTypes.node.isRequired,
  title: PropTypes.string.isRequired,
  isActive: PropTypes.bool.isRequired,
  onClick: PropTypes.func.isRequired
};

const FeatureDetail = ({ title, description, image, bullets, isActive }) => {
  // Usando useEffect para disparar as animações quando o item se torna ativo
  useEffect(() => {
    // Este efeito executa quando isActive muda
  }, [isActive]);

  if (!isActive) return null;

  return (
    <div className="animate__animated animate__fadeIn animate__faster w-full">
      <div className="flex flex-col md:flex-row gap-8 bg-card/90 rounded-lg shadow-sm p-5 border border-background-100/60 dark:border-background-700/60">
        {/* Coluna de conteúdo - animação para entrar da esquerda */}
        <div className="flex-1 animate__animated animate__fadeInLeft" style={{ animationDuration: '0.5s' }}>
          <Text 
            variant="h3" 
            className="font-display mb-4 text-text-800 dark:text-text-100 flex items-center"
          >
            <span className="inline-block w-1.5 h-7 bg-primary-400/70 mr-3 rounded-full"></span>
            {title}
          </Text>
          
          <Text 
            variant="body" 
            className="mb-6 text-text-600 dark:text-text-300 leading-relaxed"
          >
            {description}
          </Text>

          <div className="space-y-3 mt-5">
            {bullets.map((item, idx) => (
              <div key={idx} className="flex animate__animated animate__fadeInUp bg-background-50/60 dark:bg-background-700/30 p-3 rounded-md" style={{ animationDelay: `${idx * 0.1}s`, animationDuration: '0.4s' }}>
                <div className="mr-3 h-5 w-5 text-primary-400 flex-shrink-0">
                  <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
                    <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
                  </svg>
                </div>
                <Text variant="body2" className="text-text-600 dark:text-text-300">
                  {item}
                </Text>
              </div>
            ))}
          </div>
        </div>
        
        {/* Coluna de imagem - animação para entrar da direita */}
        <div className="flex-1 animate__animated animate__fadeInRight flex items-center justify-center" style={{ animationDuration: '0.5s' }}>
          <div className="relative aspect-[4/3] h-full max-h-[350px] w-full overflow-hidden rounded-lg border border-background-100/60 dark:border-background-700/60 shadow-sm transition-all duration-300 hover:shadow-md">
            <img 
              src={image} 
              alt={title} 
              className="h-full w-full object-cover object-center transition-transform duration-700 hover:scale-102"
              onError={(e) => {
                e.target.onerror = null;
                e.target.src = createPlaceholderImage(title, '4069FF', 'FFFFFF', 800, 600);
              }}
            />
            <div className="absolute inset-0 bg-gradient-to-tr from-primary-500/5 to-transparent dark:from-primary-700/10 pointer-events-none"></div>
          </div>
        </div>
      </div>
    </div>
  );
};

FeatureDetail.propTypes = {
  title: PropTypes.string.isRequired,
  description: PropTypes.string.isRequired,
  image: PropTypes.string.isRequired,
  bullets: PropTypes.arrayOf(PropTypes.string).isRequired,
  isActive: PropTypes.bool.isRequired
};

const FEATURE_ITEMS = [
  { key: 'eventManagement', Icon: FiCalendar },
  { key: 'participantManagement', Icon: FiUsers },
  { key: 'suppliers', Icon: FiBriefcase },
  { key: 'documentation', Icon: FiFileText },
  { key: 'agenda', Icon: FiClock },
  { key: 'team', Icon: FiShield }
];

const FeaturesAlt = () => {
  const { t } = useTranslation('landingPageAlt');
  const [activeFeature, setActiveFeature] = useState(0);

  const features = FEATURE_ITEMS.map(({ key, Icon }) => ({
    icon: <Icon className="h-6 w-6" />,
    title: t(`features.items.${key}.title`),
    description: t(`features.items.${key}.description`),
    image: getFeatureImage(key),
    bullets: t(`features.items.${key}.bullets`, { returnObjects: true })
  }));

  return (
    <section className="relative overflow-hidden py-16 md:py-24 bg-gradient-to-br from-secondary-50/40 via-white to-primary-50/30 dark:from-background-800 dark:via-background-900 dark:to-background-800">
      {/* Background decoration - mais sutil */}
      <div className="absolute inset-0 -z-10">
        <div className="absolute inset-y-0 left-0 w-1/4 bg-gradient-to-r from-secondary-100/30 to-transparent dark:from-background-900/10 dark:to-transparent"></div>
        <div className="absolute inset-y-0 right-0 w-1/4 bg-gradient-to-l from-primary-100/30 to-transparent dark:from-background-900/10 dark:to-transparent"></div>
      </div>
      
      <Container>
        {/* Section header */}
        <div className="max-w-3xl mx-auto text-center mb-10 md:mb-14 animate__animated animate__fadeIn animate__faster">
          <Badge color="primary" className="mb-3">{t('features.badge')}</Badge>
          <Text 
            variant="h2"
            weight="bold"
            className="font-display mb-4 text-center text-text-800 dark:text-text-100"
          >
            {t('features.title')} <span className="text-primary-600 dark:text-primary-400">{t('features.titleHighlight')}</span>
          </Text>
          <Text 
            variant="body" 
            className="max-w-2xl mx-auto text-center text-text-600 dark:text-text-300 mb-12"
          >
            {t('features.description')}
          </Text>
        </div>
        
        {/* Side-by-side layout with menu on left */}
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 lg:gap-8">
          {/* Left side: Feature menu */}
          <div className="lg:col-span-5 xl:col-span-4 order-2 lg:order-1 animate__animated animate__fadeIn animate__faster">
            <Card className="overflow-hidden sticky top-24 shadow-md hover:shadow-lg transition-shadow duration-300 border border-background-200 dark:border-background-700">
              <div className="py-4 px-4 bg-primary-50/80 border-b border-primary-400">
                <Text variant="h6" weight="medium" className="text-center text-primary-500/70 dark:text-text-600">
                  {t('features.menuTitle')}
                </Text>
              </div>
              
              <div className="p-3">
                {features.map((feature, index) => (
                  <MenuFeatureItem
                    key={index}
                    icon={feature.icon}
                    title={feature.title}
                    isActive={index === activeFeature}
                    onClick={() => setActiveFeature(index)}
                  />
                ))}
              </div>
              
              <div className="bg-primary-50/80 p-4 border-t border-primary-400">
                <Text variant="caption" className="text-text-500/70 dark:text-text-600 text-center block">
                  {t('features.callToAction')}
                </Text>
              </div>
            </Card>
          </div>
          
          {/* Right side: Feature details */}
          <div className="lg:col-span-7 xl:col-span-8 order-1 lg:order-2 relative min-h-[500px] animate__animated animate__fadeIn animate__faster flex items-center justify-center lg:border-l lg:border-background-200 lg:dark:border-background-700 lg:pl-8">
            {features.map((feature, index) => (
              <FeatureDetail
                key={index}
                title={feature.title}
                description={feature.description}
                image={feature.image}
                bullets={feature.bullets}
                isActive={index === activeFeature}
              />
            ))}
          </div>
        </div>
      </Container>
    </section>
  );
};

export default FeaturesAlt;