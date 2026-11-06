import { useTranslation } from 'react-i18next';
import PropTypes from 'prop-types';
import { FiUsers } from 'react-icons/fi';
import TableRow from './TableRow';
import SortableHeader from '../SortableHeader';

const COLUMNS = [
  { key: 'participantName', labelKey: 'participantsV2.table.columns.participant' },
  { key: 'participantEmail', labelKey: 'participantsV2.table.columns.email' },
  { key: 'roleId', labelKey: 'participantsV2.table.columns.role' },
  { key: 'participantStatus', labelKey: 'participantsV2.table.columns.status' },
  { key: 'organization', labelKey: 'participantsV2.table.columns.organization' },
  { key: 'registrationDate', labelKey: 'participantsV2.table.columns.registration' },
  { key: 'dependentsCount', labelKey: 'participantsV2.table.columns.dependents' },
];

const TableContent = ({
  tableData,
  selectedParticipants,
  handleSelectParticipant,
  handleSelectAll,
  requestSort,
  sortConfig,
  dependentCounts,
  onRowClick,
}) => {
  const { t } = useTranslation('participant');

  return (
    <div className="overflow-x-auto">
      <table className="w-full min-w-[800px]">
        <thead>
          <tr className="border-b border-border">
            <th className="px-4 py-3 bg-muted w-11">
              <input
                type="checkbox"
                onChange={handleSelectAll}
                checked={selectedParticipants.length === tableData.length && tableData.length > 0}
                className="h-4 w-4 rounded border-border text-[#4069FF] focus:ring-[#4069FF] cursor-pointer"
                style={{ accentColor: '#4069FF' }}
              />
            </th>
            {COLUMNS.map(col => (
              <SortableHeader
                key={col.key}
                label={t(col.labelKey, col.key)}
                sortKey={col.key}
                sortConfig={sortConfig}
                onSort={requestSort}
              />
            ))}
          </tr>
        </thead>
        <tbody>
          {tableData.length > 0 ? (
            tableData.map(participant => (
              <TableRow
                key={participant.id}
                participant={participant}
                dependentCounts={dependentCounts}
                selectedParticipants={selectedParticipants}
                handleSelectParticipant={handleSelectParticipant}
                onRowClick={onRowClick}
              />
            ))
          ) : (
            <tr>
              <td colSpan={COLUMNS.length + 1} className="px-6 py-16 text-center">
                <div className="flex flex-col items-center justify-center">
                  <div className="w-16 h-16 rounded-full flex items-center justify-center mb-4" style={{ backgroundColor: '#EEF2FF' }}>
                    <FiUsers size={28} style={{ color: '#6366F1' }} />
                  </div>
                  <p className="text-[15px] font-semibold text-card-foreground">
                    {t('participantsV2.emptyState.title', 'Nenhum participante encontrado')}
                  </p>
                  <p className="text-[13px] text-muted-foreground mt-1 max-w-[300px]">
                    {t('participantsV2.emptyState.withFilters', 'Tente ajustar os filtros ou o termo de pesquisa.')}
                  </p>
                </div>
              </td>
            </tr>
          )}
        </tbody>
      </table>
    </div>
  );
};

TableContent.propTypes = {
  tableData: PropTypes.array.isRequired,
  selectedParticipants: PropTypes.array.isRequired,
  handleSelectParticipant: PropTypes.func.isRequired,
  handleSelectAll: PropTypes.func.isRequired,
  requestSort: PropTypes.func.isRequired,
  sortConfig: PropTypes.shape({
    key: PropTypes.string,
    direction: PropTypes.string,
  }).isRequired,
  dependentCounts: PropTypes.object.isRequired,
  onRowClick: PropTypes.func,
};

export default TableContent;
