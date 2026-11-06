import { useDispatch, useSelector } from 'react-redux';
import { useTranslation } from 'react-i18next';
import { setCurrentPage } from '../../Redux/Suppliers/supplierControlsSlice';
import PropTypes from 'prop-types';

// currentPage clamping lives in the parent (SupplierList) — this control unmounts
// when the list fits on one page, so it can't reliably own that effect.
const SupplierPagination = ({ totalItems }) => {
  const dispatch = useDispatch();
  const { currentPage, itemsPerPage } = useSelector(state => state.supplierControls);
  const { t } = useTranslation('common');
  const totalPages = Math.ceil(totalItems / itemsPerPage);

  const handlePageChange = (page) => {
    if (page >= 1 && page <= totalPages) {
        dispatch(setCurrentPage(page));
    }
  };

  if (totalPages <= 1) return null;

  const getPageNumbers = () => {
      const pages = [];
      const pageLimit = 5;
      const sideLimit = 1;

      if (totalPages <= pageLimit + 2) {
          for (let i = 1; i <= totalPages; i++) {
              pages.push(i);
          }
      } else {
          pages.push(1);

          if (currentPage > sideLimit + 2) {
              pages.push('...');
          }

          const startPage = Math.max(2, currentPage - sideLimit);
          const endPage = Math.min(totalPages - 1, currentPage + sideLimit);

          for (let i = startPage; i <= endPage; i++) {
              pages.push(i);
          }

          if (currentPage < totalPages - sideLimit - 1) {
              pages.push('...');
          }

          pages.push(totalPages);
      }
      return pages;
  };

  const pageNumbers = getPageNumbers();

  return (
    <nav className="flex items-center justify-center" aria-label={t('pagination.ariaLabel', 'Pagination')}>
      <ul className="inline-flex items-center -space-x-px text-sm">
        <li>
          <button
            onClick={() => handlePageChange(currentPage - 1)}
            disabled={currentPage === 1}
            className="flex items-center justify-center px-3 h-8 ml-0 leading-tight text-muted-foreground bg-card border border-border rounded-l-lg hover:bg-neutral-100 hover:text-text-700 dark:hover:bg-background-700 dark:hover:text-text-100 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
          >
            {t('pagination.buttons.previous', 'Previous')}
          </button>
        </li>

        {pageNumbers.map((page, index) => (
          <li key={index}>
            {page === '...' ? (
                <span className="flex items-center justify-center px-3 h-8 leading-tight text-muted-foreground bg-card border border-border">...</span>
            ) : (
                <button
                  onClick={() => handlePageChange(page)}
                  aria-current={currentPage === page ? 'page' : undefined}
                  className={`flex items-center justify-center px-3 h-8 leading-tight border border-border transition-colors ${currentPage === page
                        ? 'z-10 text-primary-600 bg-primary-50 border-primary-300 hover:bg-primary-100 hover:text-primary-700 dark:border-primary-500 dark:bg-primary-900/30 dark:text-primary-300 font-medium'
                        : 'text-muted-foreground bg-card hover:bg-neutral-100 hover:text-text-700 dark:hover:bg-background-700 dark:hover:text-text-100'}`
                    }
                >
                  {page}
                </button>
            )}
          </li>
        ))}

        <li>
          <button
            onClick={() => handlePageChange(currentPage + 1)}
            disabled={currentPage === totalPages}
            className="flex items-center justify-center px-3 h-8 leading-tight text-muted-foreground bg-card border border-border rounded-r-lg hover:bg-neutral-100 hover:text-text-700 dark:hover:bg-background-700 dark:hover:text-text-100 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
          >
            {t('pagination.buttons.next', 'Next')}
          </button>
        </li>
      </ul>
    </nav>
  );
};

SupplierPagination.propTypes = {
  totalItems: PropTypes.number.isRequired,
};

export default SupplierPagination;
