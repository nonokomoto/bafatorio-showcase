import { useState, useMemo } from "react";
import PropTypes from 'prop-types';
import { FiUser, FiUsers, FiClock, FiSearch } from "react-icons/fi";
import { format } from "date-fns";
import { pt } from "date-fns/locale";
import { useTranslation } from 'react-i18next';
import { Text, Badge, Input } from '../UI';
import { matchesSearch } from '../../Utils/stringUtils';
import RoleBadge from '../Participant/RoleBadge';
import { useRoleLookup } from '../../Hook/useRoleLookup';

// Filtros que não correspondem a uma Role do evento
const DEPENDENT_FILTER = '__dependent__';
const NO_ROLE_FILTER = '__noRole__';

const ConfirmedParticipantsList = ({
  participants = [],
  dependents = [],
  handleSelectParticipant,
  lastUpdate
}) => {
  const { t } = useTranslation('participant');
  const { roles, getRoleName, getRoleColor } = useRoleLookup();
  const [selectedRole, setSelectedRole] = useState("all");
  const [searchTerm, setSearchTerm] = useState("");
  const [showAll, setShowAll] = useState(false);

  // Create a map of participant IDs to participant names for dependent display
  const participantMap = useMemo(() => {
    const map = {};
    participants?.forEach(p => {
      map[p.id] = p;
    });
    return map;
  }, [participants]);

  // Combine confirmed participants and confirmed dependents
  const allConfirmedAttendees = useMemo(() => {
    // Confirmed participants
    const confirmedParticipants = (participants || [])
      .filter(participant => 
        participant && 
        participant.participantStatus === "ATTENDED"
      )
      .map(p => ({
        ...p,
        type: 'participant',
        displayName: p.participantName,
        roleName: getRoleName(p.roleId),
        roleColor: getRoleColor(p.roleId),
        sortDate: p.attendedDate || p.registrationDate
      }));

    // Confirmed dependents
    const confirmedDependents = (dependents || [])
      .filter(dependent => 
        dependent && 
        dependent.status === "ATTENDED"
      )
      .map(d => {
        const parentParticipant = participantMap[d.participantId];
        return {
          ...d,
          type: 'dependent',
          displayName: d.name || t('participantDetails.dependents.noName', 'Sem nome'),
          parentName: parentParticipant?.participantName,
          parentParticipant: parentParticipant,
          sortDate: d.attendedDate
        };
      });

    return [...confirmedParticipants, ...confirmedDependents];
  }, [participants, dependents, participantMap, t, getRoleName, getRoleColor]);

  // Filters and sorts the combined list (case-insensitive e accent-insensitive)
  const filteredParticipants = useMemo(() => {
    return allConfirmedAttendees
      .filter(attendee => {
        // Filtro por role: compara roleId, não o nome, porque nomes de Role são
        // livres e podem colidir entre maiúsculas e minúsculas (ADR-018)
        if (selectedRole !== "all") {
          if (selectedRole === DEPENDENT_FILTER) {
            if (attendee.type !== 'dependent') return false;
          } else if (selectedRole === NO_ROLE_FILTER) {
            if (attendee.type === 'dependent' || attendee.roleId) return false;
          } else if (attendee.type === 'dependent' || attendee.roleId !== selectedRole) {
            return false;
          }
        }
        // Search filter
        return attendee.displayName && matchesSearch(attendee.displayName, searchTerm);
      })
      .sort((a, b) => {
        if (!a.sortDate) return 1;
        if (!b.sortDate) return -1;
        return new Date(b.sortDate) - new Date(a.sortDate);
      });
  }, [allConfirmedAttendees, selectedRole, searchTerm]);

  // Determines how many participants to display
  const displayParticipants = useMemo(() => {
    return showAll ? filteredParticipants : filteredParticipants.slice(0, 5);
  }, [filteredParticipants, showAll]);

  return (
    <div className="w-full lg:w-1/2 bg-muted rounded-xl p-6">
      {/* Header com título e estatísticas */}
      <div className="flex items-center justify-between mb-6">
        <Text
          variant="h5"
          weight="medium"

        >
          {t('confirmedParticipantsList.title')}
        </Text>
        <div className="flex items-center gap-2 text-sm text-muted-foreground">
          <div className="flex items-center gap-1">
            <div className="w-2 h-2 rounded-full bg-primary"></div>
            <Text variant="small" className="text-muted-foreground">
              {filteredParticipants.length}
            </Text>
          </div>
        </div>
      </div>

      {/* Search & Filter */}
      <div className="flex items-center gap-4 mb-6">
        <div className="flex-1">
          <Input
            type="text"
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            placeholder={t('confirmedParticipantsList.search.placeholder')}
            startIcon={<FiSearch size={16} className="text-muted-foreground" />}
            fullWidth
            size="sm"
          />
        </div>
        <select
          value={selectedRole}
          onChange={(e) => setSelectedRole(e.target.value)}
          className="text-sm bg-card text-foreground rounded-lg
            px-4 py-2.5 border border-border
            focus:outline-none focus:ring-2 focus:ring-primary/20 appearance-none cursor-pointer"
        >
          <option value="all">{t('confirmedParticipantsList.role.labels.all')}</option>
          {roles.map(role => (
            <option key={role.id} value={role.id}>{role.name}</option>
          ))}
          <option value={NO_ROLE_FILTER}>{t('confirmedParticipantsList.role.labels.noRole')}</option>
          <option value={DEPENDENT_FILTER}>{t('confirmedParticipantsList.role.labels.dependent')}</option>
        </select>
      </div>

      {/* List of participants and dependents */}
      <div className="space-y-3">
        {displayParticipants.map(attendee => (
          <button
            key={`${attendee.type}-${attendee.id}`}
            onClick={() => attendee.type === 'participant' 
              ? handleSelectParticipant(attendee) 
              : attendee.parentParticipant && handleSelectParticipant(attendee.parentParticipant)
            }
            className="w-full flex items-center justify-between p-3
              rounded-lg hover:bg-accent
              transition-colors duration-normal text-left animate__animated animate__fadeIn animate__faster"
          >
            <div className="flex items-center gap-3">
              <div className={`size-8 rounded-lg flex items-center justify-center ${
                attendee.type === 'dependent'
                  ? 'bg-secondary-100 dark:bg-secondary-900/30'
                  : 'bg-primary/10'
              }`}>
                {attendee.type === 'dependent'
                  ? <FiUsers size={16} className="text-secondary-600 dark:text-secondary-400" />
                  : <FiUser size={16} className="text-primary" />
                }
              </div>
              <div>
                <div className="flex items-center gap-2">
                  <Text
                    variant="body2"
                    className="font-medium text-foreground"
                  >
                    {attendee.displayName}
                  </Text>
                  {attendee.type === 'dependent' && (
                    <Badge variant="secondary" tone="soft" size="xs">
                      {t('confirmedParticipantsList.role.labels.dependent', 'Acompanhante')}
                    </Badge>
                  )}
                </div>
                {attendee.type === 'dependent'
                  ? (
                    <Text variant="small" className="text-muted-foreground">
                      {t('confirmedParticipantsList.dependentOf', { name: attendee.parentName }, `De: ${attendee.parentName}`)}
                    </Text>
                  )
                  : (
                    <div className="mt-1">
                      <RoleBadge roleName={attendee.roleName} colorKey={attendee.roleColor} />
                    </div>
                  )
                }
              </div>
            </div>
            <Text
              variant="small"
              className="text-muted-foreground"
            >
              {attendee.sortDate 
                ? format(new Date(attendee.sortDate), "dd/MM • HH:mm:ss", { locale: pt })
                : t('states.unavailable')}
            </Text>
          </button>
        ))}
      </div>

      {/* Show more / show less button */}
      {filteredParticipants.length > 5 && (
        <button
          onClick={() => setShowAll(!showAll)}
          onKeyDown={(e) => ['Enter', ' '].includes(e.key) && setShowAll(!showAll)}
          className="w-full py-2 text-primary hover:text-primary-dark
            focus:outline-none focus:ring-2 focus:ring-primary-500 transition-colors duration-normal rounded"
        >
          <Text variant="body2" className="text-primary hover:text-primary-dark">
            {showAll ? t('confirmedParticipantsList.button.hideAll') : t('confirmedParticipantsList.button.showAll')}
          </Text>
        </button>
      )}

      {/* Last update timestamp */}
      {lastUpdate && (
        <div className="mt-4 flex items-center justify-end gap-1.5 text-xs text-muted-foreground">
          <FiClock size={12} />
          <Text variant="small" className="text-muted-foreground">
            {t('confirmedParticipantsList.lastUpdate')}: {format(new Date(lastUpdate), "HH:mm:ss", { locale: pt })}
          </Text>
        </div>
      )}
    </div>
  );
};

ConfirmedParticipantsList.propTypes = {
  participants: PropTypes.arrayOf(PropTypes.shape({
    id: PropTypes.string,
    participantName: PropTypes.string,
    roleId: PropTypes.string,
    participantStatus: PropTypes.string,
    registrationDate: PropTypes.string,
    attendedDate: PropTypes.string
  })),
  dependents: PropTypes.arrayOf(PropTypes.shape({
    id: PropTypes.string,
    name: PropTypes.string,
    age: PropTypes.string,
    participantId: PropTypes.string,
    status: PropTypes.string,
    attendedDate: PropTypes.string
  })),
  handleSelectParticipant: PropTypes.func.isRequired,
  lastUpdate: PropTypes.oneOfType([PropTypes.string, PropTypes.instanceOf(Date)])
};

export default ConfirmedParticipantsList;