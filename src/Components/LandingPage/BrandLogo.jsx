import PropTypes from 'prop-types';
import inicialLogo from '../../assets/inicialLogo.svg';
import { useTranslation } from 'react-i18next';

// Definição única do logo da landing e páginas legais (header e footer).
// O ícone domina; wordmark e tagline são secundários e desaparecem em mobile.
const BrandLogo = ({ showText = true }) => {
  const { t } = useTranslation('landingPageAlt');

  return (
    <span className="inline-flex items-center">
      <img src={inicialLogo} alt="Bafatorio" className="h-12 md:h-14 w-auto mr-1" />
      {showText && (
        <span className="hidden sm:flex flex-col">
          <span className="text-sm md:text-base dark:text-text-100 font-medium font-display tracking-normal">
            Bafatorio
          </span>
          <span className="text-[8px] md:text-[9px] text-text-500 dark:text-text-400">
            {t('brand.tagline')}
          </span>
        </span>
      )}
    </span>
  );
};

BrandLogo.propTypes = {
  showText: PropTypes.bool
};

export default BrandLogo;
