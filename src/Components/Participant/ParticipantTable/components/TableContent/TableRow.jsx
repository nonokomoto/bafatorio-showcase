import PropTypes from 'prop-types';
import { format } from 'date-fns';
import { FiChevronRight } from 'react-icons/fi';
import ParticipantAvatar from '../../../ParticipantAvatar';
import RoleBadge from '../../../RoleBadge';
import StatusBadge from '../../../StatusBadge';
import { useRoleLookup } from '../../../../../Hook/useRoleLookup';

const TableRow = ({
  participant,
  selectedParticipants,
  handleSelectParticipant,
  onRowClick,
}) => {
  const { getRoleName, getRoleColor } = useRoleLookup();
  const isSelected = selectedParticipants.includes(participant.id);
  const roleName = getRoleName(participant.roleId, participant.role?.name);

  const handleClick = (e) => {
    if (e.target.type === 'checkbox' || e.target.closest('input[type="checkbox"]')) {
      return;
    }
    onRowClick?.(participant);
  };

  return (
    <tr
      className={`border-b border-border hover:bg-accent transition-colors cursor-pointer ${
        isSelected ? 'bg-[#EEF2FF] dark:bg-primary/10' : 'bg-card'
      }${participant.__isOptimistic ? ' opacity-70 animate-pulse' : ''}`}
      onClick={handleClick}
    >
      {/* Checkbox */}
      <td className="px-4 py-3 w-11" onClick={(e) => e.stopPropagation()}>
        <input
          type="checkbox"
          checked={isSelected}
          onChange={() => handleSelectParticipant(participant.id)}
          className="h-4 w-4 rounded border-border text-[#4069FF] focus:ring-2 focus:ring-[#4069FF]/20 cursor-pointer"
          style={{ accentColor: '#4069FF' }}
        />
      </td>

      {/* Participant: Avatar + Name + Job */}
      <td className="px-4 py-3 min-w-[240px]">
        <div className="flex items-center justify-between group">
          <div className="flex items-center gap-3">
            <ParticipantAvatar participant={participant} size="sm" />
            <div className="min-w-0">
              <div className="text-[13px] font-medium text-foreground truncate">
                {participant.participantName}
              </div>
              {participant.participantJob && (
                <div className="text-xs text-muted-foreground truncate">
                  {participant.participantJob}
                </div>
              )}
            </div>
          </div>
          <FiChevronRight
            size={16}
            className="text-muted-foreground group-hover:text-foreground group-hover:translate-x-0.5 transition-all flex-shrink-0 ml-2"
          />
        </div>
      </td>

      {/* Email */}
      <td className="px-4 py-3">
        <span className="text-[13px] text-muted-foreground">
          {participant.participantEmail || '—'}
        </span>
      </td>

      {/* Role */}
      <td className="px-4 py-3">
        <RoleBadge roleName={roleName} colorKey={getRoleColor(participant.roleId)} />
      </td>

      {/* Status */}
      <td className="px-4 py-3">
        <StatusBadge status={participant.participantStatus} />
      </td>

      {/* Organization */}
      <td className="px-4 py-3">
        <span className="text-[13px] text-muted-foreground">
          {participant.organization || '—'}
        </span>
      </td>

      {/* Registration Date */}
      <td className="px-4 py-3">
        <span className="text-xs text-muted-foreground">
          {participant.registrationDate
            ? format(new Date(participant.registrationDate), 'dd/MM/yy')
            : '—'}
        </span>
      </td>

      {/* Dependents Count */}
      <td className="px-4 py-3">
        {participant.dependentsCount > 0 ? (
          <div className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-medium" style={{ backgroundColor: '#F0F4FF', color: '#4069FF' }}>
            <span className="w-1.5 h-1.5 rounded-full" style={{ backgroundColor: '#4069FF' }} />
            {participant.dependentsCount}
          </div>
        ) : (
          <span className="text-[13px] text-muted-foreground">—</span>
        )}
      </td>
    </tr>
  );
};

TableRow.propTypes = {
  participant: PropTypes.shape({
    id: PropTypes.string.isRequired,
    participantName: PropTypes.string.isRequired,
    participantEmail: PropTypes.string,
    participantPhone: PropTypes.string,
    participantJob: PropTypes.string,
    participantStatus: PropTypes.string,
    roleId: PropTypes.string,
    role: PropTypes.shape({
      id: PropTypes.string,
      name: PropTypes.string,
    }),
    organization: PropTypes.string,
    registrationDate: PropTypes.string,
    photoUrl: PropTypes.string,
    dependentsCount: PropTypes.number,
    __isOptimistic: PropTypes.bool,
  }).isRequired,
  dependentCounts: PropTypes.object.isRequired,
  selectedParticipants: PropTypes.array.isRequired,
  handleSelectParticipant: PropTypes.func.isRequired,
  onRowClick: PropTypes.func,
};

export default TableRow;
