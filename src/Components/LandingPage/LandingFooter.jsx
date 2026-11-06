import { Link, useNavigate, useLocation } from 'react-router-dom';
import { FiFacebook, FiTwitter, FiInstagram, FiLinkedin, FiMessageSquare } from 'react-icons/fi';
import PropTypes from 'prop-types';
import { useTranslation } from 'react-i18next';
import Text from '../UI/Text';
import Container from '../Layout/Container';
import BrandLogo from './BrandLogo';

const LandingFooter = ({ className, style }) => {
  const { t } = useTranslation('landingPageAlt');
  const navigate = useNavigate();
  const location = useLocation();

  const handleNavToSection = (sectionId) => {
    if (location.pathname === '/') {
      const element = document.getElementById(`alt-${sectionId}`);
      if (element) {
        element.scrollIntoView({ behavior: 'smooth' });
      }
    } else {
      navigate(`/#alt-${sectionId}`);
      setTimeout(() => {
        const element = document.getElementById(`alt-${sectionId}`);
        if (element) {
          element.scrollIntoView({ behavior: 'smooth' });
        }
      }, 100);
    }
  };

  // Links do rodapé, organizados por colunas
  const footerLinks = [
    {
      title: t('footer.product'),
      links: [
        { label: t('nav.home'), sectionId: 'hero' },
        { label: t('nav.features'), sectionId: 'features' },
        { label: t('nav.testimonials'), sectionId: 'testimonials' },
        { label: t('nav.pricing'), sectionId: 'pricing' },
      ],
      isProduct: true
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
                    {section.isProduct ? (
                      <button
                        onClick={() => handleNavToSection(link.sectionId)}
                        className="text-sm text-text-600 hover:text-primary-600 dark:text-text-400 dark:hover:text-primary-600 transition-colors bg-transparent border-none cursor-pointer p-0"
                      >
                        {link.label}
                      </button>
                    ) : (
                      <a
                        href={link.href}
                        {...(link.external ? { target: '_blank', rel: 'noopener noreferrer' } : {})}
                        className="text-sm text-text-600 hover:text-primary-600 dark:text-text-400 dark:hover:text-primary-600 transition-colors"
                      >
                        {link.label}
                      </a>
                    )}
                  </li>
                ))}
              </ul>
            </div>
          ))}
        </div>

        <div className="border-t border-background-200 dark:border-background-700 pt-4 pb-4 md:pt-8 md:pb-8 text-sm text-text-500 dark:text-text-400">
          <div className="flex flex-col md:flex-row md:justify-between items-center ">
            <p>&copy; 2026 Bafatorio. {t('footer.allRightsReserved')}</p>
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

LandingFooter.propTypes = {
  className: PropTypes.string,
  style: PropTypes.object
};

export default LandingFooter;
