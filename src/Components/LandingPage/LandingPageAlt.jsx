import { useState, useEffect, useCallback, useRef, useMemo } from 'react';
import { Link } from 'react-router-dom';
import { FiMenu, FiX, FiSun, FiMoon, FiFacebook, FiTwitter, FiInstagram, FiLinkedin, FiMessageSquare } from 'react-icons/fi';
import PropTypes from 'prop-types';
import { Text, Button, Container } from '../UI';
import LanguageSwitcher from '../Common/LanguageSwitcher';
import { useTranslation } from 'react-i18next';
import BrandLogo from './BrandLogo';

// Componentes das seções
import HeroAlt from './AlternativeDesign/HeroAlt';
import FeaturesAlt from './AlternativeDesign/FeaturesAlt';
import TestimonialsAlt from './AlternativeDesign/TestimonialsAlt';
import PricingAlt from './AlternativeDesign/PricingAlt';
import CallToActionAlt from './AlternativeDesign/CallToActionAlt'

// Importar animate.css
import 'animate.css';

// Utilidade para debounce
const debounce = (fn, ms) => {
  let timer;
  return (...args) => {
    clearTimeout(timer);
    timer = setTimeout(() => {
      fn.apply(this, args);
    }, ms);
  };
};

// Hook personalizado para detectar preferência de movimento reduzido
const usePrefersReducedMotion = () => {
  const [prefersReducedMotion, setPrefersReducedMotion] = useState(false);
  
  useEffect(() => {
    const mediaQuery = window.matchMedia('(prefers-reduced-motion: reduce)');
    setPrefersReducedMotion(mediaQuery.matches);
    
    const onChange = () => setPrefersReducedMotion(mediaQuery.matches);
    mediaQuery.addEventListener('change', onChange);
    
    return () => mediaQuery.removeEventListener('change', onChange);
  }, []);
  
  return prefersReducedMotion;
};

// Hook para detectar dispositivos de baixa performance (aproximação básica)
const useLowPerformanceDevice = () => {
  const [isLowPerformance, setIsLowPerformance] = useState(false);
  
  useEffect(() => {
    // Detecção básica - dispositivos móveis ou com menos RAM geralmente têm pior desempenho
    const isMobile = /Android|webOS|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(navigator.userAgent);
    // Também podemos detectar hardware mais fraco por número de núcleos de CPU
    const hasWeakHardware = navigator.hardwareConcurrency && navigator.hardwareConcurrency < 4;
    
    setIsLowPerformance(isMobile || hasWeakHardware);
  }, []);
  
  return isLowPerformance;
};

const LandingPageAlt = () => {
  // Usando o hook dentro de um componente
  const [isMenuOpen, setIsMenuOpen] = useState(false);
  const [activeSection, setActiveSection] = useState('hero');
  const [scrolled, setScrolled] = useState(false);
  const [isDarkMode, setIsDarkMode] = useState(() => {
    // Check localStorage and system preference
    const savedTheme = localStorage.getItem('theme');
    return savedTheme === 'dark' || 
      (!savedTheme && window.matchMedia('(prefers-color-scheme: dark)').matches);
  });
  const lastScrollY = useRef(0);
  const prefersReducedMotion = usePrefersReducedMotion();
  const isLowPerformanceDevice = useLowPerformanceDevice();
  
  // Effect to apply dark mode class to html element
  useEffect(() => {
    if (isDarkMode) {
      document.documentElement.classList.add('dark');
      localStorage.setItem('theme', 'dark');
    } else {
      document.documentElement.classList.remove('dark');
      localStorage.setItem('theme', 'light');
    }
  }, [isDarkMode]);
  
  // Determinar se devemos usar animações completas ou reduzidas
  const shouldUseMinimalAnimations = useMemo(() => 
    prefersReducedMotion || isLowPerformanceDevice, 
    [prefersReducedMotion, isLowPerformanceDevice]
  );
  
  // Classes de animação condicionais
  const getAnimationClass = useCallback((baseAnimation) => {
    if (shouldUseMinimalAnimations) {
      return "animate__animated animate__fadeIn animate__faster";
    }
    return `animate__animated ${baseAnimation} animate__faster`;
  }, [shouldUseMinimalAnimations]);
  
  // Estilos de animação condicionais
  const getAnimationStyle = useCallback((delayIndex = 0) => {
    if (shouldUseMinimalAnimations) {
      return { animationDuration: '0.2s' };
    }
    return { 
      animationDuration: '0.3s', 
      animationDelay: `${delayIndex * 0.05}s`,
      willChange: 'opacity, transform'
    };
  }, [shouldUseMinimalAnimations]);

  // Monitor scroll para atualizar seção ativa e estilo do header
  useEffect(() => {
    // Executar uma vez no início para configurar corretamente
    setScrolled(window.scrollY > 20);

    const handleScroll = () => {
      const currentScrollY = window.scrollY;
      lastScrollY.current = currentScrollY;
      
      // Atualizar estado do scroll para efeitos visuais
      const isScrolled = currentScrollY > 20;
      if (isScrolled !== scrolled) {
        setScrolled(isScrolled);
      }

      // Atualizar seção ativa para navegação
      const sections = ['hero', 'features', 'testimonials', 'pricing'];
      const scrollPosition = currentScrollY + 100;

      for (let section of sections) {
        const element = document.getElementById(`alt-${section}`);
        if (element && scrollPosition >= element.offsetTop && 
            scrollPosition < element.offsetTop + element.offsetHeight) {
          setActiveSection(section);
          break;
        }
      }
    };

    // Versão com debounce para melhor desempenho
    const debouncedHandleScroll = debounce(handleScroll, 50);
    
    // Executar imediatamente na montagem
    handleScroll();
    
    window.addEventListener('scroll', debouncedHandleScroll, { passive: true });
    return () => window.removeEventListener('scroll', debouncedHandleScroll);
  }, [scrolled]);

  // Desabilitar scroll quando menu mobile estiver aberto
  useEffect(() => {
    if (isMenuOpen) {
      document.body.style.overflow = 'hidden';
    } else {
      document.body.style.overflow = '';
    }
    
    return () => {
      document.body.style.overflow = '';
    };
  }, [isMenuOpen]);

  return (
    <div className="bg-card font-sans flex flex-col min-h-screen">
      <Header 
        isMenuOpen={isMenuOpen} 
        setIsMenuOpen={setIsMenuOpen} 
        activeSection={activeSection}
        scrolled={scrolled}
        className={getAnimationClass("animate__fadeIn")}
        style={getAnimationStyle(0)}
        shouldUseMinimalAnimations={shouldUseMinimalAnimations}
        isDarkMode={isDarkMode}
        setIsDarkMode={setIsDarkMode}
      />
      
      <main className="flex-grow">
        <section 
          id="alt-hero" 
          className={`bg-gradient-to-br from-white to-primary-50 dark:from-background-900 dark:to-background-800 ${getAnimationClass("animate__fadeIn")}`}
          style={getAnimationStyle(0)}
        >
          <HeroAlt useMinimalAnimations={shouldUseMinimalAnimations} />
        </section>
        
        <section 
          id="alt-features" 
          className={`bg-gradient-to-br from-secondary-50 to-white dark:from-background-800 dark:to-background-900 ${getAnimationClass("animate__fadeIn")}`}
          style={getAnimationStyle(1)}
        >
          <FeaturesAlt useMinimalAnimations={shouldUseMinimalAnimations} />
        </section>
        
        <section 
          id="alt-testimonials" 
          className={`bg-gradient-to-br from-primary-50 to-secondary-50 dark:from-background-900 dark:to-background-800 ${getAnimationClass("animate__fadeIn")}`}
          style={getAnimationStyle(2)}
        >
          <TestimonialsAlt useMinimalAnimations={shouldUseMinimalAnimations} />
        </section>
        
        <section 
          id="alt-pricing" 
          className={`bg-gradient-to-br from-white to-primary-50 dark:from-background-800 dark:to-background-900 ${getAnimationClass("animate__fadeIn")}`}
          style={getAnimationStyle(3)}
        >
          <PricingAlt useMinimalAnimations={shouldUseMinimalAnimations} />
        </section>

        <section 
          id="alt-cta" 
          className={`bg-gradient-to-br from-primary-500 to-primary-600 dark:from-primary-600 dark:to-primary-700 ${getAnimationClass("animate__fadeIn")}`}
          style={getAnimationStyle(4)}
        >
          <CallToActionAlt useMinimalAnimations={shouldUseMinimalAnimations} />
        </section>
      </main>
      
      <Footer 
        className={getAnimationClass("animate__fadeIn")} 
        style={getAnimationStyle(5)}
      />
    </div>
  );
};

// Header com design alternativo
const Header = ({ 
  isMenuOpen, 
  setIsMenuOpen, 
  activeSection, 
  scrolled, 
  className, 
  style, 
  shouldUseMinimalAnimations,
  isDarkMode,
  setIsDarkMode
}) => {
  const { t } = useTranslation('landingPageAlt');
  const toggleMenu = () => setIsMenuOpen(!isMenuOpen);
  
  const toggleDarkMode = () => {
    setIsDarkMode(prev => !prev);
  };
  
  // Criando itens de navegação com uso de memo para performance
  const navItems = useMemo(() => [
    { id: 'hero', label: t('nav.home') },
    { id: 'features', label: t('nav.features') },
    { id: 'testimonials', label: t('nav.testimonials') },
    { id: 'pricing', label: t('nav.pricing') },
  ], [t]);

  // Fechar menu ao clicar fora
  const headerRef = useRef(null);
  useEffect(() => {
    if (!isMenuOpen) return;
    
    const handleClickOutside = (e) => {
      if (headerRef.current && !headerRef.current.contains(e.target)) {
        setIsMenuOpen(false);
      }
    };
    
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, [isMenuOpen, setIsMenuOpen]);

  return (
    <header 
      ref={headerRef}
      className={`fixed top-0 left-0 right-0 z-50 bg-card/90 transition-all duration-300 ${className || ''}`}
      style={{
        backdropFilter: 'blur(8px)',
        WebkitBackdropFilter: 'blur(8px)',
        boxShadow: scrolled || isMenuOpen ? '0 1px 3px 0 rgba(0, 0, 0, 0.1)' : 'none',
        transform: 'translateY(0)',
        ...style
      }}
    >
      <Container className="flex items-center justify-between py-2 md:py-3">
        {/* Logo */}
        <Link to="/" className="flex items-center space-x-2" aria-label={t('nav.logoAriaLabel')}>
          <div className="flex items-center">
            <BrandLogo />
          </div>
        </Link>
        
        {/* Desktop Navigation */}
        <nav className="hidden lg:flex items-center space-x-2">
          {navItems.map(item => (
            <a
              key={item.id}
              href={`#alt-${item.id}`}
              className={`px-3 sm:px-4 py-2 text-sm font-medium rounded-lg transition-colors ${
                activeSection === item.id 
                  ? 'text-primary-600 dark:text-primary-400 bg-primary-50 dark:bg-primary-900/30' 
                  : 'text-foreground hover:bg-background-50 dark:hover:bg-background-800'
              }`}
              aria-current={activeSection === item.id ? 'page' : undefined}
            >
              {item.label}
            </a>
          ))}
        </nav>
        
        {/* Desktop and Tablet Actions */}
        <div className="hidden md:flex items-center space-x-3 lg:space-x-4">
          <LanguageSwitcher />
          
          <Link to="/signin">
            <Button variant="ghost" size="sm" className="px-3 sm:px-4">
              {t('nav.login')}
            </Button>
          </Link>
          
          <Link to="/signup">
            <Button variant="primary" size="sm" className="px-3 sm:px-4">
              {t('nav.signUp')}
            </Button>
          </Link>

          {/* Dark Mode Toggle */}
          <button
            onClick={toggleDarkMode}
            className="p-1.5 sm:p-2 rounded-lg bg-background-100 dark:bg-background-800 hover:bg-background-200 dark:hover:bg-background-700 text-foreground transition-colors duration-200"
            aria-label={isDarkMode ? t('nav.switchToLightMode') : t('nav.switchToDarkMode')}
          >
            {isDarkMode ? (
              <FiSun className="h-4 w-4 sm:h-5 sm:w-5" />
            ) : (
              <FiMoon className="h-4 w-4 sm:h-5 sm:w-5" />
            )}
          </button>
        </div>

        {/* Mobile Menu Toggle */}
        <button
          className="md:hidden p-1.5 sm:p-2 z-10 rounded-full bg-background-100/80 dark:bg-background-800/80 hover:bg-background-200 dark:hover:bg-background-700 transition-colors"
          onClick={toggleMenu}
          aria-label={t('nav.toggleMenu')}
          aria-expanded={isMenuOpen}
          aria-controls="mobile-menu"
        >
          {isMenuOpen ? (
            <FiX className="h-5 w-5 sm:h-6 sm:w-6 text-text-800 dark:text-text-200" />
          ) : (
            <FiMenu className="h-5 w-5 sm:h-6 sm:w-6 text-text-800 dark:text-text-200" />
          )}
        </button>
      </Container>

      {/* Mobile Menu */}
      {isMenuOpen && (
        <div 
          id="mobile-menu" 
          className="md:hidden bg-card p-4 sm:p-6 pb-6 shadow-lg animate__animated animate__fadeIn animate__faster max-h-[calc(100vh-4rem)] overflow-y-auto"
          role="navigation"
          aria-label={t('nav.mobileMenuAriaLabel')}
          style={{ 
            animationDuration: shouldUseMinimalAnimations ? '0.1s' : '0.2s',
            willChange: 'opacity'
          }}
        >
          <nav className="flex flex-col space-y-2 sm:space-y-3">
            {navItems.map((item, index) => (
              <a
                key={item.id}
                href={`#alt-${item.id}`}
                className={`text-sm sm:text-base font-medium p-2 sm:p-3 rounded-lg hover:bg-background-50 dark:hover:bg-background-800 transition-all ${
                  !shouldUseMinimalAnimations ? 'transform hover:-translate-y-0.5 animate__animated animate__fadeInDown' : ''
                } focus:outline-none focus:ring-2 focus:ring-primary-400 ${
                  activeSection === item.id 
                    ? 'text-primary-600 dark:text-primary-400 bg-primary-50 dark:bg-primary-900/30' 
                    : 'text-foreground'
                }`}
                onClick={() => setIsMenuOpen(false)}
                aria-current={activeSection === item.id ? 'page' : undefined}
                style={shouldUseMinimalAnimations ? {} : { 
                  animationDelay: `${index * 0.05}s`,
                  willChange: 'opacity, transform'
                }}
              >
                {item.label}
              </a>
            ))}
            
            <div className={`flex flex-col space-y-2 sm:space-y-3 pt-4 border-t border-border ${
              !shouldUseMinimalAnimations ? 'animate__animated animate__fadeIn' : ''
            }`} 
            style={shouldUseMinimalAnimations ? {} : { 
              animationDelay: '0.2s',
              willChange: 'opacity'
            }}>
              <div className="flex items-center justify-between relative">
                <div className="w-32 ml-2">
                  <LanguageSwitcher direction="up" />
                </div>
                
                {/* Dark Mode Toggle */}
                <button
                  onClick={toggleDarkMode}
                  className="p-1.5 sm:p-2 rounded-lg bg-background-100 dark:bg-background-800 hover:bg-background-200 dark:hover:bg-background-700 text-foreground transition-colors duration-200"
                  aria-label={isDarkMode ? t('nav.switchToLightMode') : t('nav.switchToDarkMode')}
                >
                  {isDarkMode ? (
                    <FiSun className="h-4 w-4 sm:h-5 sm:w-5" />
                  ) : (
                    <FiMoon className="h-4 w-4 sm:h-5 sm:w-5" />
                  )}
                </button>
              </div>
              
              <div className="grid grid-cols-2 gap-2 sm:gap-3 mb-2">
                <Link to="/signin" onClick={() => setIsMenuOpen(false)}>
                  <Button 
                    variant="ghost" 
                    size="sm" 
                    className={`w-full justify-center ${!shouldUseMinimalAnimations ? 'transform transition-transform hover:-translate-y-0.5' : ''}`}
                  >
                    {t('nav.login')}
                  </Button>
                </Link>
                
                <Link to="/signup" onClick={() => setIsMenuOpen(false)}>
                  <Button 
                    variant="primary" 
                    size="sm" 
                    className={`w-full justify-center ${!shouldUseMinimalAnimations ? 'transform transition-transform hover:-translate-y-0.5' : ''}`}
                  >
                    {t('nav.signUp')}
                  </Button>
                </Link>
              </div>
            </div>
          </nav>
        </div>
      )}
    </header>
  );
};

// Footer com design alternativo
const Footer = ({ className, style }) => {
  const { t } = useTranslation('landingPageAlt');
  const currentYear = new Date().getFullYear();
  
  // Links do rodapé, organizados por colunas
  const footerLinks = [
    {
      title: t('footer.product'),
      links: [
        { label: t('nav.home'), href: '#alt-hero' },
        { label: t('nav.features'), href: '#alt-features' },
        { label: t('nav.testimonials'), href: '#alt-testimonials' },
        { label: t('nav.pricing'), href: '#alt-pricing' },
      ]
    },
    {
      title: t('footer.resources'),
      links: [
        { label: t('footer.docs'), href: 'https://docs.bafatorio.com', external: true },
        { label: t('footer.blog'), href: 'https://blog.bafatorio.com', external: true },
      ]
    },
    {
      title: t('footer.legal'),
      links: [
        { label: t('footer.terms'), href: '/terms' },
        { label: t('footer.privacy'), href: '/privacy' },
        { label: t('footer.cookies'), href: '/cookies' },
      ]
    }
  ];

  return (
    <footer className={`bg-background-50 dark:bg-background-800 border-t border-background-200 dark:border-background-700 mt-0 md:mt-auto ${className || ''}`} style={style}>
      <Container>
        <div className="grid grid-cols-2 md:grid-cols-5 gap-8 md:gap-6 lg:gap-12 my-6 md:my-10">
          <div className="col-span-2">
            <Link to="/" className="inline-flex items-center mb-4" aria-label={t('footer.logoAriaLabel')}>
              <div className="flex items-center">
                <BrandLogo />
              </div>
            </Link>
            <Text className="text-muted-foreground mb-4">
              {t('footer.description')}
            </Text>
            <div className="flex space-x-4 mb-6">
              <a href="https://facebook.com/bafatorio" target="_blank" rel="noopener noreferrer" className="text-text-500 hover:text-primary-500 dark:text-text-400 dark:hover:text-primary-500 transition-colors">
                <span className="sr-only">Facebook</span>
                <FiFacebook className="h-6 w-6" />
              </a>
              <a href="https://twitter.com/bafatorio" target="_blank" rel="noopener noreferrer" className="text-text-500 hover:text-primary-500 dark:text-text-400 dark:hover:text-primary-500 transition-colors">
                <span className="sr-only">Twitter</span>
                <FiTwitter className="h-6 w-6" />
              </a>
              <a href="https://instagram.com/bafatorio" target="_blank" rel="noopener noreferrer" className="text-text-500 hover:text-primary-500 dark:text-text-400 dark:hover:text-primary-500 transition-colors">
                <span className="sr-only">Instagram</span>
                <FiInstagram className="h-6 w-6" />
              </a>
              <a href="https://linkedin.com/company/bafatorio" target="_blank" rel="noopener noreferrer" className="text-text-500 hover:text-primary-500 dark:text-text-400 dark:hover:text-primary-500 transition-colors">
                <span className="sr-only">LinkedIn</span>
                <FiLinkedin className="h-6 w-6" />
              </a>
              <a href="https://threads.net/@bafatorio" target="_blank" rel="noopener noreferrer" className="text-text-500 hover:text-primary-500 dark:text-text-400 dark:hover:text-primary-500 transition-colors">
                <span className="sr-only">Threads</span>
                <FiMessageSquare className="h-6 w-6" />
              </a>
            </div>
          </div>
          
          {footerLinks.map((section) => (
            <div key={section.title}>
              <Text variant="h6" className="font-medium mb-4 text-text-800 dark:text-text-200">
                {section.title}
              </Text>
              <ul className="space-y-3">
                {section.links.map((link) => (
                  <li key={link.label}>
                    <a
                      href={link.href}
                      {...(link.external ? { target: '_blank', rel: 'noopener noreferrer' } : {})}
                      className="text-sm text-text-600 hover:text-primary-600 dark:text-text-400 dark:hover:text-primary-600 transition-colors"
                    >
                      {link.label}
                    </a>
                  </li>
                ))}
              </ul>
            </div>
          ))}
        </div>
        
        <div className="border-t border-background-200 dark:border-background-700 pt-4 pb-4 md:pt-8 md:pb-8 text-sm text-text-500 dark:text-text-400">
          <div className="flex flex-col md:flex-row md:justify-between items-center ">
            <p>&copy; {currentYear} Bafatorio. {t('footer.allRightsReserved')}</p>
            <div className="flex mt-4 md:mt-0 space-x-6">
              <a href="/terms" className="hover:text-primary-600 transition-colors">
                {t('footer.terms')}
              </a>
              <a href="/privacy" className="hover:text-primary-600 transition-colors">
                {t('footer.privacy')}
              </a>
            </div>
          </div>
        </div>
      </Container>
    </footer>
  );
};

// PropTypes
Header.propTypes = {
  isMenuOpen: PropTypes.bool.isRequired,
  setIsMenuOpen: PropTypes.func.isRequired,
  activeSection: PropTypes.string.isRequired,
  scrolled: PropTypes.bool.isRequired,
  className: PropTypes.string,
  style: PropTypes.object,
  shouldUseMinimalAnimations: PropTypes.bool,
  isDarkMode: PropTypes.bool.isRequired,
  setIsDarkMode: PropTypes.func.isRequired
};

Footer.propTypes = {
  className: PropTypes.string,
  style: PropTypes.object
};

export default LandingPageAlt;
