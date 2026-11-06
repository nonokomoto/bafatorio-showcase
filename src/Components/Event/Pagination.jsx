// Pagination.jsx
import { useEffect } from 'react';
import PropTypes from 'prop-types';
import { useDispatch, useSelector, shallowEqual } from 'react-redux';
import { useTranslation } from 'react-i18next';
import { setCurrentPage } from '../../Redux/Event/eventControlsSlice';

const Pagination = ({ totalItems }) => {
  const dispatch = useDispatch();
  // Seletor estreito + shallowEqual: só re-renderiza quando currentPage/
  // itemsPerPage mudam, não a cada filtro/pesquisa/ordenação.
  const { currentPage, itemsPerPage } = useSelector(
    state => ({
      currentPage: state.eventControls.currentPage,
      itemsPerPage: state.eventControls.itemsPerPage,
    }),
    shallowEqual
  );
  const { t } = useTranslation('event');
  const totalPages = Math.ceil(totalItems / itemsPerPage);

  useEffect(() => {
    if (totalPages === 0) {
      dispatch(setCurrentPage(1));
      return;
    }
    if (currentPage > totalPages) {
      dispatch(setCurrentPage(totalPages));
    }
  }, [totalItems, currentPage, totalPages, dispatch]);

  const handlePageChange = (page) => {
    dispatch(setCurrentPage(page));
  };

  if (totalPages <= 1) return null;

  return (
    <nav className="flex justify-center mt-8" aria-label={t('pagination.ariaLabel')}>
      <ul className="inline-flex items-center bg-card rounded-lg shadow-sm overflow-hidden">
        {/* Botão Anterior */}
        <li>
          <button
            onClick={() => handlePageChange(currentPage - 1)}
            disabled={currentPage === 1}
            className="px-4 py-2 text-sm font-medium
              text-foreground hover:text-primary
              disabled:text-muted-foreground disabled:cursor-not-allowed
              transition-colors duration-200
              border-r border-border"
          >
            {t('pagination.buttons.previous')}
          </button>
        </li>

        {/* Números */}
        {[...Array(totalPages).keys()].map((number) => (
          <li key={number + 1}>
            <button
              onClick={() => handlePageChange(number + 1)}
              className={`px-4 py-2 text-sm font-medium
                transition-colors duration-200
                ${currentPage === number + 1
                  ? 'bg-primary text-white hover:bg-primary-dark'
                  : 'text-foreground hover:text-primary hover:bg-accent'
                }
                ${number + 1 < totalPages ? 'border-r border-border' : ''}`}
            >
              {number + 1}
            </button>
          </li>
        ))}

        {/* Botão Próximo */}
        <li>
          <button
            onClick={() => handlePageChange(currentPage + 1)}
            disabled={currentPage === totalPages}
            className="px-4 py-2 text-sm font-medium
              text-foreground hover:text-primary
              disabled:text-muted-foreground disabled:cursor-not-allowed
              transition-colors duration-200
              border-l border-border"
          >
            {t('pagination.buttons.next')}
          </button>
        </li>
      </ul>
    </nav>
  );
};

Pagination.propTypes = {
  totalItems: PropTypes.number,
};

export default Pagination;
