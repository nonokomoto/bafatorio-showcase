import { useState, useRef, useEffect } from 'react';
import { FiFilter, FiX, FiChevronDown } from 'react-icons/fi';
import { useTranslation } from 'react-i18next';
import PropTypes from 'prop-types';
import { PARTICIPANT_STATUSES, DEPENDENT_CATEGORIES } from '../../utils/constants';
import { useListEventRolesQuery } from '../../../../../Api/services/roleApi';
import { useSelector } from 'react-redux';
import { selectSelectedEventId } from '../../../../../Api/eventSelectors';

const FilterDropdown = ({ filters, onFilterChange, hasDependents = false }) => {
  const { t } = useTranslation('participant');
  const [isOpen, setIsOpen] = useState(false);
  const dropdownRef = useRef(null);
  const selectedEventId = useSelector(selectSelectedEventId);
  const { data: rolesData } = useListEventRolesQuery(
    { eventId: selectedEventId },
    { skip: !selectedEventId }
  );

  // Close dropdown when clicking outside
  useEffect(() => {
    const handleClickOutside = (event) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target)) {
        setIsOpen(false);
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const activeFilterCount = Object.values(filters).filter(v => v !== '' && v !== null).length;

  const handleClearFilters = () => {
    onFilterChange({
      status: '',
      roleId: '',
      dependentCategory: ''
    });
  };

  const handleFilterChange = (key, value) => {
    onFilterChange({
      ...filters,
      [key]: value
    });
  };

  // Get translated options
  const statusOptions = PARTICIPANT_STATUSES.map(status => ({
    value: status,
    label: t(`pages.participantForm.statuses.labels.${status}`)
  }));

  const categoryOptions = (rolesData || []).map(role => ({
    value: role.id,
    label: role.name
  }));

  const dependentCategoryOptions = DEPENDENT_CATEGORIES.map(category => ({
    value: category,
    label: t(`pages.participantForm.dependents.fields.age.labels.${category}`)
  }));

  return (
    <div className="relative" ref={dropdownRef}>
      <button
        type="button"
        onClick={() => setIsOpen(!isOpen)}
        className={`
          flex items-center gap-2 px-3 py-2.5
          bg-card
          border rounded-lg
          text-text-700 dark:text-text-200
          hover:border-input
          focus:ring-2 focus:ring-primary/30 focus:border-primary/50
          transition-colors duration-200 shadow-sm
          ${activeFilterCount > 0
            ? 'border-primary/50 bg-primary/5 dark:bg-primary/10'
            : 'border-border'
          }
        `}
        aria-expanded={isOpen}
        aria-haspopup="true"
      >
        <FiFilter className={`h-4 w-4 ${activeFilterCount > 0 ? 'text-primary-500' : 'text-primary-500'}`} />
        <span className="hidden sm:inline text-sm font-medium">
          {t('pages.participantTable.filters.label')}
        </span>
        {activeFilterCount > 0 && (
          <span className="flex items-center justify-center w-5 h-5 text-xs font-semibold text-white bg-primary rounded-full">
            {activeFilterCount}
          </span>
        )}
        <FiChevronDown className={`h-4 w-4 transition-transform duration-200 ${isOpen ? 'rotate-180' : ''}`} />
      </button>

      {isOpen && (
        <div className="absolute right-0 z-50 mt-2 w-72 sm:w-80
          bg-card
          border border-border
          rounded-xl shadow-lg
          animate__animated animate__fadeIn animate__faster"
        >
          <div className="p-4 border-b border-border flex items-center justify-between">
            <span className="text-sm font-semibold text-text-900 dark:text-text-100">
              {t('pages.participantTable.filters.title')}
            </span>
            {activeFilterCount > 0 && (
              <button
                type="button"
                onClick={handleClearFilters}
                className="text-xs text-primary hover:text-primary-dark flex items-center gap-1 transition-colors"
              >
                <FiX className="h-3 w-3" />
                {t('pages.participantTable.filters.clearAll')}
              </button>
            )}
          </div>

          <div className="p-4 space-y-4">
            {/* Status Filter */}
            <div>
              <label className="block text-xs font-medium text-text-700 dark:text-text-300 mb-1.5">
                {t('pages.participantTable.filters.status')}
              </label>
              <select
                value={filters.status || ''}
                onChange={(e) => handleFilterChange('status', e.target.value)}
                className="block w-full px-3 py-2 text-sm
                  bg-card
                  border border-border rounded-lg
                  text-text-900 dark:text-text-100
                  focus:ring-2 focus:ring-primary/30 focus:border-primary/50
                  transition-colors duration-200"
              >
                <option value="">{t('pages.participantTable.filters.allStatuses')}</option>
                {statusOptions.map(option => (
                  <option key={option.value} value={option.value}>
                    {option.label}
                  </option>
                ))}
              </select>
            </div>

            {/* Category Filter */}
            <div>
              <label className="block text-xs font-medium text-text-700 dark:text-text-300 mb-1.5">
                {t('pages.participantTable.filters.category')}
              </label>
              <select
                value={filters.roleId || ''}
                onChange={(e) => handleFilterChange('roleId', e.target.value)}
                className="block w-full px-3 py-2 text-sm
                  bg-card
                  border border-border rounded-lg
                  text-text-900 dark:text-text-100
                  focus:ring-2 focus:ring-primary/30 focus:border-primary/50
                  transition-colors duration-200"
              >
                <option value="">{t('pages.participantTable.filters.allCategories')}</option>
                {categoryOptions.map(option => (
                  <option key={option.value} value={option.value}>
                    {option.label}
                  </option>
                ))}
              </select>
            </div>

            {/* Dependent Category Filter - Only show if there are dependents */}
            {hasDependents && (
              <div>
                <label className="block text-xs font-medium text-text-700 dark:text-text-300 mb-1.5">
                  {t('pages.participantTable.filters.dependentCategory')}
                </label>
                <select
                  value={filters.dependentCategory || ''}
                  onChange={(e) => handleFilterChange('dependentCategory', e.target.value)}
                  className="block w-full px-3 py-2 text-sm
                    bg-card
                    border border-border rounded-lg
                    text-text-900 dark:text-text-100
                    focus:ring-2 focus:ring-primary/30 focus:border-primary/50
                    transition-colors duration-200"
                >
                  <option value="">{t('pages.participantTable.filters.allDependentCategories')}</option>
                  {dependentCategoryOptions.map(option => (
                    <option key={option.value} value={option.value}>
                      {option.label}
                    </option>
                  ))}
                </select>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
};

FilterDropdown.propTypes = {
  filters: PropTypes.shape({
    status: PropTypes.string,
    roleId: PropTypes.string,
    dependentCategory: PropTypes.string
  }).isRequired,
  onFilterChange: PropTypes.func.isRequired,
  hasDependents: PropTypes.bool
};

export default FilterDropdown;
