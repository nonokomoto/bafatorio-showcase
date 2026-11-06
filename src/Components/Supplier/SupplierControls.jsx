import { useState, useRef, useEffect } from 'react';
import { useDispatch, useSelector } from 'react-redux';
import { FiFilter, FiArrowDown, FiSearch } from 'react-icons/fi';
import { useTranslation } from 'react-i18next';
import PropTypes from 'prop-types';
import {
  setFilterCategory,
  setSortCriterion,
  setSearchQuery,
} from '../../Redux/Suppliers/supplierControlsSlice';
import { Button, Card, Input } from '../UI';

function useOnClickOutside(ref, handler) {
  useEffect(() => {
    const listener = (event) => {
      if (!ref.current || ref.current.contains(event.target)) {
        return;
      }
      handler(event);
    };
    document.addEventListener("mousedown", listener);
    document.addEventListener("touchstart", listener);
    return () => {
      document.removeEventListener("mousedown", listener);
      document.removeEventListener("touchstart", listener);
    };
  }, [ref, handler]);
}

const SupplierControls = ({ 
  categories = [], 
  isCompact = false, // New prop for compact mode
  className = "" 
}) => {
  const dispatch = useDispatch();
  const { filterCategory, sortCriterion, searchQuery } = useSelector(state => state.supplierControls);
  const { t } = useTranslation(['supplier', 'common']);

  const [isFilterOpen, setIsFilterOpen] = useState(false);
  const [isSortOpen, setIsSortOpen] = useState(false);

  const filterRef = useRef();
  const sortRef = useRef();

  useOnClickOutside(filterRef, () => setIsFilterOpen(false));
  useOnClickOutside(sortRef, () => setIsSortOpen(false));

  const handleSearchChange = (e) => dispatch(setSearchQuery(e.target.value));

  const handleFilterSelect = (value) => {
    dispatch(setFilterCategory(value));
    setIsFilterOpen(false);
  };
  const handleSortSelect = (value) => {
    dispatch(setSortCriterion(value));
    setIsSortOpen(false);
  };

  const filterOptions = [
    { value: 'all', label: t('supplier:filters.category.all', 'All Categories') },
    ...[...new Set(categories.filter(Boolean))].sort().map(category => ({ value: category, label: category }))
  ];

  const sortOptions = [
    { value: 'nameAsc', label: t('supplier:filters.sort.nameAsc', 'Name (A-Z)') },
    { value: 'nameDesc', label: t('supplier:filters.sort.nameDesc', 'Name (Z-A)') },
    { value: 'dateDesc', label: t('supplier:filters.sort.dateDesc', 'Updated (Newest)') },
    { value: 'dateAsc', label: t('supplier:filters.sort.dateAsc', 'Updated (Oldest)') },
  ];

  const containerClasses = `flex items-center gap-3 ${isCompact ? 'flex-row' : 'flex-wrap'} ${className}`;
  const searchClasses = isCompact 
    ? 'flex-grow min-w-[200px]' 
    : 'flex-grow lg:flex-grow-0 lg:w-auto lg:min-w-[200px] xl:min-w-[250px]';

  return (
    <div className={containerClasses}>
        <div className={searchClasses}>
            <Input
                type="text"
                name="searchSuppliers"
                placeholder={t('supplier:filters.search.placeholder', 'Search suppliers...')}
                value={searchQuery}
                onChange={handleSearchChange}
                startIcon={<FiSearch className="text-text-400" />}
                className="w-full focus:ring-primary-500/30"
                size="sm"
            />
        </div>
        
        <div className="flex items-center gap-2">
            <div className="relative" ref={filterRef}>
                <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => setIsFilterOpen(!isFilterOpen)}
                    startIcon={<FiFilter size={14} className="text-violet-500" />}
                    className="text-text-600 dark:text-text-300"
                >
                    <span className="hidden sm:inline">{t('supplier:filters.filterButton', 'Filter')}</span>
                </Button>
                {isFilterOpen && (
                    <Card 
                        className="absolute z-20 mt-2 w-56 rounded-md shadow-sm bg-card ring-1 ring-black/5 dark:ring-white/10 focus:outline-none origin-top-left" 
                        elevated="lg"
                    >
                        {filterOptions.map(option => (
                            <button
                                key={option.value}
                                onClick={() => handleFilterSelect(option.value)}
                                className={`block w-full text-left px-4 py-2 text-sm ${
                                    filterCategory === option.value 
                                        ? 'bg-primary-50 dark:bg-primary-900/20 text-primary-700 dark:text-primary-300' 
                                        : 'text-text-700 dark:text-text-200 hover:bg-accent'
                                }`}
                            >
                                {option.label}
                            </button>
                        ))}
                    </Card>
                )}
            </div>
                        
            <div className="relative" ref={sortRef}>
                <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => setIsSortOpen(!isSortOpen)}
                    startIcon={<FiArrowDown size={14} className="text-blue-500" />}
                    className="text-text-600 dark:text-text-300"
                >
                    <span className="hidden sm:inline">{t('supplier:filters.sortButton', 'Sort')}</span>
                </Button>
                {isSortOpen && (
                    <Card 
                        className="absolute z-10 mt-1 w-48 rounded-md shadow-sm bg-card ring-1 ring-black/5 dark:ring-white/10 focus:outline-none py-1 right-0 origin-top-right"
                        elevated="md"
                    >
                        {sortOptions.map(option => (
                            <button
                                key={option.value}
                                onClick={() => handleSortSelect(option.value)}
                                className={`block w-full text-left px-4 py-2 text-sm ${
                                    sortCriterion === option.value 
                                        ? 'bg-primary-50 dark:bg-primary-900/20 text-primary-700 dark:text-primary-300' 
                                        : 'text-text-700 dark:text-text-200 hover:bg-accent'
                                }`}
                            >
                                {option.label}
                            </button>
                        ))}
                    </Card>
                )}
            </div>
        </div>
    </div>
  );
};

SupplierControls.propTypes = {
  categories: PropTypes.arrayOf(PropTypes.string),
  isCompact: PropTypes.bool,
  className: PropTypes.string
};

export default SupplierControls; 