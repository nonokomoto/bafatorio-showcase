import { useRef, useEffect, useMemo, useState } from 'react';
import { Link, useNavigate, useLocation } from 'react-router-dom';
import { FiMenu, FiX, FiSun, FiMoon } from 'react-icons/fi';
import PropTypes from 'prop-types';
import { Button, Container } from '../UI';
import LanguageSwitcher from '../Common/LanguageSwitcher';
import { useTranslation } from 'react-i18next';
import BrandLogo from './BrandLogo';
import { track } from 'src/Utils/analytics';

const LandingHeader = ({ scrolled = false, shouldUseMinimalAnimations = false }) => {
  const { t } = useTranslation('landingPageAlt');
  const navigate = useNavigate();
  const location = useLocation();
  const [isMenuOpen, setIsMenuOpen] = useState(false);
  const [isDarkMode, setIsDarkMode] = useState(() => {
    try {
      const savedTheme = localStorage.getItem('theme');
      return savedTheme === 'dark' ||
        (!savedTheme && window.matchMedia('(prefers-color-scheme: dark)').matches);
    } catch {
      return window.matchMedia?.('(prefers-color-scheme: dark)').matches ?? false;
    }
  });

  const toggleMenu = () => setIsMenuOpen(!isMenuOpen);

  const handleNavToSection = (sectionId) => {
    if (location.pathname === '/') {
      // If already on home, just scroll to the section
      const element = document.getElementById(`alt-${sectionId}`);
      if (element) {
        element.scrollIntoView({ behavior: 'smooth' });
      }
    } else {
      // If on another page, navigate to home with hash
      navigate(`/#alt-${sectionId}`);
      // Use timeout to ensure the page has loaded before scrolling
      setTimeout(() => {
        const element = document.getElementById(`alt-${sectionId}`);
        if (element) {
          element.scrollIntoView({ behavior: 'smooth' });
        }
      }, 100);
    }
    setIsMenuOpen(false);
  };

  const toggleDarkMode = () => {
    setIsDarkMode(prev => !prev);
  };

  useEffect(() => {
    if (isDarkMode) {
      document.documentElement.classList.add('dark');
      localStorage.setItem('theme', 'dark');
    } else {
      document.documentElement.classList.remove('dark');
      localStorage.setItem('theme', 'light');
    }
  }, [isDarkMode]);

  const navItems = useMemo(() => [
    { id: 'hero', label: t('nav.home') },
    { id: 'features', label: t('nav.features') },
    { id: 'testimonials', label: t('nav.testimonials') },
    { id: 'pricing', label: t('nav.pricing') },
  ], [t]);

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
  }, [isMenuOpen]);

  return (
    <header
      ref={headerRef}
      className={`fixed top-0 left-0 right-0 z-50 bg-card/90 transition-all duration-300`}
      style={{
        backdropFilter: 'blur(8px)',
        WebkitBackdropFilter: 'blur(8px)',
        boxShadow: scrolled || isMenuOpen ? '0 1px 3px 0 rgba(0, 0, 0, 0.1)' : 'none',
        transform: 'translateY(0)',
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
            <button
              key={item.id}
              onClick={() => handleNavToSection(item.id)}
              className="px-3 sm:px-4 py-2 text-sm font-medium rounded-lg transition-colors text-foreground hover:bg-background-50 dark:hover:bg-background-800 bg-transparent border-none cursor-pointer"
            >
              {item.label}
            </button>
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

          <Link to="/signup" onClick={() => track('cta_click', { cta: 'header' })}>
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
              <button
                key={item.id}
                onClick={() => handleNavToSection(item.id)}
                className={`text-sm sm:text-base font-medium p-2 sm:p-3 rounded-lg hover:bg-background-50 dark:hover:bg-background-800 transition-all text-foreground bg-transparent border-none cursor-pointer w-full text-left ${
                  !shouldUseMinimalAnimations ? 'transform hover:-translate-y-0.5 animate__animated animate__fadeInDown' : ''
                } focus:outline-none focus:ring-2 focus:ring-primary-400`}
                style={shouldUseMinimalAnimations ? {} : {
                  animationDelay: `${index * 0.05}s`,
                  willChange: 'opacity, transform'
                }}
              >
                {item.label}
              </button>
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

                <Link
                  to="/signup"
                  onClick={() => {
                    track('cta_click', { cta: 'header' });
                    setIsMenuOpen(false);
                  }}
                >
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

LandingHeader.propTypes = {
  scrolled: PropTypes.bool,
  shouldUseMinimalAnimations: PropTypes.bool
};

export default LandingHeader;
