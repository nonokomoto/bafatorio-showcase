import { useTranslation } from 'react-i18next';
import PropTypes from 'prop-types';
import { TABLE_COLUMNS } from '../../utils/constants';

const TableHeader = ({ 
  handleSelectAll, 
  selectedParticipants, 
  tableData,
  requestSort,
  sortConfig 
}) => {
  const { t } = useTranslation('participant');
  
  return (
    <thead className="text-xs text-text-light dark:text-text-dark uppercase bg-background">
      <tr className='bg-background'>
        <th className="px-4 py-3">
          <input
            type="checkbox"
            onChange={handleSelectAll}
            checked={selectedParticipants.length === tableData.length && tableData.length > 0}
          />
        </th>
        {TABLE_COLUMNS.slice(1).map((column) => (
          <th
            key={column.accessor}
            onClick={() => requestSort(column.accessor)}
            className="px-4 py-3 cursor-pointer hover:bg-background-dark "
          >
            <div className="flex items-center">
              {t(`pages.participantTable.${column.Header}`)}
              {sortConfig.key === column.accessor && (
                <span className="ml-1">
                  {sortConfig.direction === 'ascending' ? '▲' : '▼'}
                </span>
              )}
            </div>
          </th>
        ))}
      </tr>
    </thead>
  );
};

TableHeader.propTypes = {
  handleSelectAll: PropTypes.func.isRequired,
  selectedParticipants: PropTypes.array.isRequired,
  tableData: PropTypes.array.isRequired,
  requestSort: PropTypes.func.isRequired,
  sortConfig: PropTypes.shape({
    key: PropTypes.string,
    direction: PropTypes.string
  }).isRequired
};

export default TableHeader;