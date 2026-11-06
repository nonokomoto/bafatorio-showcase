import PropTypes from 'prop-types';
import { FiChevronUp, FiChevronDown } from 'react-icons/fi';

const SortableHeader = ({ label, sortKey, sortConfig, onSort }) => {
  const isActive = sortConfig.key === sortKey;
  const isAscending = isActive && sortConfig.direction === 'ascending';
  const isDescending = isActive && sortConfig.direction === 'descending';

  return (
    <th
      className="px-6 py-3 bg-card cursor-pointer select-none hover:bg-accent transition-colors"
      onClick={() => onSort(sortKey)}
    >
      <div className="flex items-center gap-1">
        <span className="text-xs uppercase tracking-[0.05em] font-semibold text-muted-foreground">
          {label}
        </span>
        <div className="flex flex-col -space-y-1">
          <FiChevronUp
            size={12}
            className={isAscending ? 'text-[#4069FF]' : 'text-muted-foreground opacity-30'}
          />
          <FiChevronDown
            size={12}
            className={isDescending ? 'text-[#4069FF]' : 'text-muted-foreground opacity-30'}
          />
        </div>
      </div>
    </th>
  );
};

SortableHeader.propTypes = {
  label: PropTypes.node,
  sortKey: PropTypes.string,
  sortConfig: PropTypes.shape({
    key: PropTypes.string,
    direction: PropTypes.string,
  }).isRequired,
  onSort: PropTypes.func.isRequired,
};

export default SortableHeader;
