import { useDispatch, useSelector, shallowEqual } from 'react-redux';
import { FaSearch, FaFilter, FaSort, FaChevronDown } from 'react-icons/fa';
import { useTranslation } from 'react-i18next';
import PropTypes from 'prop-types';
import {
  setFilter,
  setSortCriterion,
  setSearchQuery,
} from '../../Redux/Event/eventControlsSlice';
import { Text, Input } from '../UI';
import { EVENT_STATUS, EVENT_STATUS_KEYS } from '../../Utils/eventStatusConfig';

const EventControls = ({ totalEvents }) => {
  const dispatch = useDispatch();
  // Seletor estreito + shallowEqual: não re-renderiza a barra a cada clique de
  // paginação (currentPage/itemsPerPage não são usados aqui).
  const { filter, sortCriterion, searchQuery } = useSelector(
    state => ({
      filter: state.eventControls.filter,
      sortCriterion: state.eventControls.sortCriterion,
      searchQuery: state.eventControls.searchQuery,
    }),
    shallowEqual
  );
  const { t } = useTranslation('event');

  const handleFilterChange = (e) => dispatch(setFilter(e.target.value));
  const handleSortChange = (e) => dispatch(setSortCriterion(e.target.value));
  const handleSearchChange = (e) => dispatch(setSearchQuery(e.target.value));

  const filterOptions = [
    { value: 'all', label: t('eventControls.buttons.filter') },
    ...EVENT_STATUS_KEYS.map(key => ({ value: key, label: t(EVENT_STATUS[key].labelKey) })),
  ];

  const sortOptions = [
    { value: '', label: t('eventControls.buttons.sort') },
    { value: 'dateAsc', label: t('eventControls.sort.dateAsc') },
    { value: 'dateDesc', label: t('eventControls.sort.dateDesc') },
    { value: 'titleAsc', label: t('eventControls.sort.titleAsc') },
    { value: 'titleDesc', label: t('eventControls.sort.titleDesc') },
  ];

  return (
    <div className="flex flex-col gap-3 py-3 sm:flex-row sm:items-center sm:py-4">
      {/* Campo de pesquisa — ocupa o espaço disponível */}
      <div className="flex-grow min-w-0">
        <Input
          type="text"
          name="searchEvents"
          placeholder={t('eventControls.buttons.search')}
          value={searchQuery}
          onChange={handleSearchChange}
          startIcon={<FaSearch className="text-muted-foreground" />}
          className="w-full focus:ring-primary-500/30"
          size="sm"
        />
      </div>

      {/* Filtro dropdown */}
      <div className="relative w-full sm:w-auto">
        <button
          type="button"
          tabIndex={-1}
          aria-hidden="true"
          className="flex items-center justify-between w-full sm:w-[150px] px-3 py-2 bg-card border border-border rounded-md shadow-sm text-sm text-foreground hover:border-primary-400 focus:outline-none focus:ring-2 focus:ring-primary-500/30 transition-colors duration-200"
        >
          <div className="flex items-center">
            <FaFilter className="text-primary-500/70 dark:text-primary-400/70 mr-2" />
            <span className="truncate">{filterOptions.find(option => option.value === filter)?.label || t('eventControls.buttons.filter')}</span>
          </div>
          <FaChevronDown className="text-muted-foreground text-xs ml-2 flex-shrink-0" />
        </button>
        <select
          value={filter}
          onChange={handleFilterChange}
          className="absolute inset-0 w-full h-full opacity-0 cursor-pointer"
          aria-label={t('eventControls.buttons.filter')}
        >
          {filterOptions.map(option => (
            <option key={option.value} value={option.value}>
              {option.label}
            </option>
          ))}
        </select>
      </div>

      {/* Ordenar dropdown */}
      <div className="relative w-full sm:w-auto">
        <button
          type="button"
          tabIndex={-1}
          aria-hidden="true"
          className="flex items-center justify-between w-full sm:w-[150px] px-3 py-2 bg-card border border-border rounded-md shadow-sm text-sm text-foreground hover:border-primary-400 focus:outline-none focus:ring-2 focus:ring-primary-500/30 transition-colors duration-200"
        >
          <div className="flex items-center">
            <FaSort className="text-primary-500/70 dark:text-primary-400/70 mr-2" />
            <span className="truncate">{sortOptions.find(option => option.value === sortCriterion)?.label || t('eventControls.buttons.sort')}</span>
          </div>
          <FaChevronDown className="text-muted-foreground text-xs ml-2 flex-shrink-0" />
        </button>
        <select
          value={sortCriterion}
          onChange={handleSortChange}
          className="absolute inset-0 w-full h-full opacity-0 cursor-pointer"
          aria-label={t('eventControls.buttons.sort')}
        >
          {sortOptions.map(option => (
            <option key={option.value} value={option.value}>
              {option.label}
            </option>
          ))}
        </select>
      </div>

      {/* Total de eventos */}
      <div className="sm:ml-1 sm:pl-3 sm:border-l sm:border-border">
        <Text variant="body2" className="text-muted-foreground whitespace-nowrap">
          {t('eventControls.totalEvents')}: <span className="font-medium text-foreground">{totalEvents}</span>
        </Text>
      </div>
    </div>
  );
};

EventControls.propTypes = {
  totalEvents: PropTypes.number.isRequired
};

export default EventControls;