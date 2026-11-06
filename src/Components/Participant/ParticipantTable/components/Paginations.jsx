import { FiChevronLeft, FiChevronRight } from 'react-icons/fi';
import { useTranslation } from 'react-i18next';
import PropTypes from 'prop-types';
import { Text } from '../../../UI';

const PaginationButton = ({ children, onClick, disabled }) => (
  <button
    onClick={onClick}
    disabled={disabled}
    className={`
      flex items-center justify-center w-9 h-9 rounded-lg 
      ${disabled
        ? 'bg-muted text-muted-foreground cursor-not-allowed' 
        : 'bg-primary/10 text-primary hover:bg-primary/20 dark:bg-primary/20 dark:hover:bg-primary/30 dark:text-primary-400'
      }
      transition-all duration-200 shadow-sm
    `}
    aria-disabled={disabled}
  >
    {children}
  </button>
);

PaginationButton.propTypes = {
  children: PropTypes.node.isRequired,
  onClick: PropTypes.func.isRequired,
  disabled: PropTypes.bool
};

const Pagination = ({ 
  currentPage, 
  setCurrentPage, 
  pageCount, 
  tableData, 
  filteredDataLength 
}) => {
  const { t } = useTranslation('participant');

  return (
    <div className="py-4 px-6 bg-card border-t border-border flex flex-col sm:flex-row justify-between items-center space-y-3 sm:space-y-0">
      <Text variant="body2" className="text-muted-foreground text-center sm:text-left">
        {t('pages.participantTable.pagination.showing')} {tableData.length} {t('pages.participantTable.pagination.of')} {filteredDataLength} {t('pages.participantTable.pagination.results')}
      </Text>
      <div className="flex items-center space-x-3">
        <PaginationButton
          onClick={() => setCurrentPage(currentPage - 1)}
          disabled={currentPage === 1}
        >
          <FiChevronLeft className="w-5 h-5" />
        </PaginationButton>
        
        <Text variant="body2" className="mx-1 text-foreground">
          {t('pages.participantTable.pagination.page')} <span className="font-semibold">{currentPage}</span> {t('pages.participantTable.pagination.of')} {pageCount}
        </Text>
        
        <PaginationButton
          onClick={() => setCurrentPage(currentPage + 1)}
          disabled={currentPage === pageCount}
        >
          <FiChevronRight className="w-5 h-5" />
        </PaginationButton>
      </div>
    </div>
  );
};

Pagination.propTypes = {
  currentPage: PropTypes.number.isRequired,
  setCurrentPage: PropTypes.func.isRequired,
  pageCount: PropTypes.number.isRequired,
  tableData: PropTypes.array.isRequired,
  filteredDataLength: PropTypes.number.isRequired
};

export default Pagination;