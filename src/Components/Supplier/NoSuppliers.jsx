import PropTypes from 'prop-types';
import { useTranslation } from 'react-i18next';
import NoDataImage from '../../assets/NoData.svg';
import { Text } from '../UI';

const NoSuppliers = ({ hasFilters = false }) => {
  const { t } = useTranslation('supplier');

  return (
    <div className="flex flex-col items-center justify-center py-16 px-4 bg-card rounded-b-lg border-t border-border">
      <img
        src={NoDataImage}
        alt={t('list.empty.imageAlt', 'Sem fornecedores')}
        className="mx-auto w-28 mb-6"
      />
      <Text
        variant="h5"
        className="font-medium mb-3 text-text-900 dark:text-text-100"
      >
        {hasFilters
          ? t('list.empty.noMatchTitle', 'Nenhum fornecedor corresponde aos filtros')
          : t('list.empty.title', 'Nenhum fornecedor encontrado')}
      </Text>
      <Text
        variant="body2"
        className="max-w-md mx-auto text-center text-muted-foreground"
      >
        {hasFilters
          ? t('list.empty.noMatchDescription', 'Tente ajustar a pesquisa ou os filtros.')
          : t('list.empty.description', 'Adicione o seu primeiro fornecedor para começar.')}
      </Text>
    </div>
  );
};

NoSuppliers.propTypes = {
  hasFilters: PropTypes.bool,
};

export default NoSuppliers;
