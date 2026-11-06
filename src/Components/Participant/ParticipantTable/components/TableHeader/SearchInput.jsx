import { FiSearch } from 'react-icons/fi';
import { useTranslation } from 'react-i18next';
import PropTypes from 'prop-types';

const SearchInput = ({ searchTerm, setSearchTerm }) => {
  const { t } = useTranslation('participant');
  
  return (
    <div className="relative w-full sm:w-72">
      <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
        <FiSearch className="h-5 w-5 text-muted-foreground" />
      </div>
      <input
        type="text"
        value={searchTerm}
        onChange={(e) => setSearchTerm(e.target.value)}
        placeholder={t('pages.participantTable.search.placeholder')}
        className="block w-full pl-10 pr-4 py-2.5
          bg-card
          border border-border rounded-lg
          text-foreground placeholder-muted-foreground
          focus:ring-2 focus:ring-primary/30 focus:border-primary/50
          hover:border-ring
          transition-all duration-200 shadow-sm"
      />
    </div>
  );
};

SearchInput.propTypes = {
  searchTerm: PropTypes.string.isRequired,
  setSearchTerm: PropTypes.func.isRequired
};

export default SearchInput;