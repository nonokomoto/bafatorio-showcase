import  { useState, useEffect } from "react";
import PropTypes from 'prop-types';
import { useDispatch } from 'react-redux';
import { useTranslation } from 'react-i18next';
import { useConfirmPresenceMutation, useCreateParticipantMutation, useSubscribeToParticipantStatusChangesQuery, participantApi } from "../../Api/services/participantApi";
import { FiSearch, FiUserPlus } from "react-icons/fi";
import ParticipantDetails from "./ParticipantDetails";
import ConfirmedParticipantsList from "./ConfirmedParticipantsList";
import Spinner from "../UI/spinner";
import AlertPopup from "../Layout/AlertPopUp";
import { Text, Input, Button, Card } from '../UI';
import { normalizeString } from '../../Utils/stringUtils';
import { useRoleLookup } from '../../Hook/useRoleLookup';
import RoleBadge from '../Participant/RoleBadge';
import { useAuthz, billingGateErrorKey, writeBlockedTitle } from '../../Hook/useAuthz';
import 'animate.css';

const SearchParticipant = ({
  eventId,
  participants = [],
  isLoading = false,
  error = null,
  dependentCounts = {},
  dependents = [],
  isDependentsLoading = false,
  dependentsError = null
}) => {
  
  const { t } = useTranslation('participant');
  
  const { getRoleName, getRoleColor } = useRoleLookup();
  const dispatch = useDispatch();

  // Local states
  const [searchTerm, setSearchTerm] = useState("");
  const [selectedParticipant, setSelectedParticipant] = useState(null);
  const [searchedDependentId, setSearchedDependentId] = useState(null); // Track which dependent was searched
  const [showAddButton, setShowAddButton] = useState(false);
  const [lastUpdate, setLastUpdate] = useState(null);
  const [alertConfig, setAlertConfig] = useState({
    show: false,
    message: '',
    isConfirmation: false
  });

  // Gate cosmético (§4b): o registo à porta (walk-in) cria participante —
  // conta para o limite do plano e respeita a janela, como o Add da tabela.
  const { limit: authzLimit, writable, reason: accessReason } = useAuthz(eventId);
  const participantLimit = authzLimit('participants', participants?.length || 0);
  const addBlocked = participantLimit.reached || !writable;

  // API Hooks
  const [confirmPresence, { isLoading: isUpdating }] = useConfirmPresenceMutation();
  const [createParticipant, { isLoading: isCreating }] = useCreateParticipantMutation();
  const { data: updatedParticipant } = useSubscribeToParticipantStatusChangesQuery();

  // Merge cross-collaborator live updates straight into the RTK Query cache (the single
  // source of truth) so every consumer of the participant list — this page included — sees them.
  useEffect(() => {
    const incoming = updatedParticipant?.onUpdateParticipant;
    if (!incoming || incoming.eventId !== eventId) return;

    // The subscription returns `dependents`/`event` as GraphQL connection objects
    // (`{ nextToken, __typename }`), not the flat array the list query uses. Merging them
    // would clobber the cache's real dependents array, so keep only the participant's own fields.
    const participantFields = { ...incoming };
    delete participantFields.dependents;
    delete participantFields.event;

    dispatch(
      participantApi.util.updateQueryData(
        'listParticipantsByEventLambda',
        { eventId },
        (draft) => {
          if (!draft?.items) return;
          const idx = draft.items.findIndex((p) => p.id === incoming.id);
          // Only patch a participant already in the list. onUpdateParticipant fires on UPDATE,
          // so the row exists; injecting a connection-shaped row for an unknown id would corrupt
          // the canonical cache (a refetch covers the rare not-found case).
          if (idx !== -1) {
            Object.assign(draft.items[idx], participantFields);
          }
        }
      )
    );
    setLastUpdate(new Date());
  }, [updatedParticipant, eventId, dispatch]);

  // Handle input change
  const handleInputChange = (e) => {
    const value = e.target.value;
    setSearchTerm(value);
    setSelectedParticipant(null);
    
    if (value.length === 0 || !participants) {
      setShowAddButton(false);
      return;
    }

    const normalizedValue = normalizeString(value);

    // Check if any participant matches
    const hasParticipantMatch = participants.some((participant) =>
      normalizeString(participant.participantName).includes(normalizedValue)
    );
    
    // Check if any dependent matches
    const hasDependentMatch = dependents.some((dependent) =>
      dependent.name && normalizeString(dependent.name).includes(normalizedValue)
    );
    
    setShowAddButton(!hasParticipantMatch && !hasDependentMatch && value.length > 0);
  };

  // Handle select participant (optionally with a searched dependent)
  const handleSelectParticipant = (participant, dependentId = null) => {
    setSelectedParticipant(participant);
    setSearchedDependentId(dependentId);
    setSearchTerm("");
  };
  
  // Handle add and confirm participant
  const handleAddAndConfirmParticipant = async () => {
    const newParticipant = {
      participantName: searchTerm,
      participantStatus: "ATTENDED",
      roleId: null,
      eventId: eventId,
      participantNote: t('searchParticipants.newParticipant.defaultNote'),
      registrationDate: new Date().toISOString(),
      dependentsCount: 0
    };

    setSearchTerm("");
    setShowAddButton(false);

    try {
      // createParticipant patches the list cache optimistically (onQueryStarted), so the
      // new card appears immediately and rolls itself back on failure.
      // participantCount is updated automatically by DynamoDB Stream (participantStream).
      await createParticipant(newParticipant).unwrap();
      setLastUpdate(new Date());
    } catch (error) {
      console.error(t('searchParticipants.newParticipant.addError'), error);
      // Recusa do gate (janela/limite atingido durante o check-in) tem copy
      // própria com o porquê; o resto cai na mensagem genérica.
      setAlertConfig({
        show: true,
        message: t(billingGateErrorKey(error, 'searchParticipants.alerts.error.addParticipant')),
        isConfirmation: false
      });
    }
  };

  // Loading and error handling
  if (isLoading) return <Spinner status='loadingWithMessage' loadingMessage={t('searchParticipants.loading.participants')} />;
  if (isDependentsLoading) return <Spinner status='loadingWithMessage' loadingMessage={t('searchParticipants.loading.dependents')} />;
  if (error) return (
    <Card className="p-4 bg-error-50 dark:bg-error-900/20">
      <Text color="error">{t('searchParticipants.loading.error')}</Text>
    </Card>
  );
  if (dependentsError) return (
    <Card className="p-4 bg-error-50 dark:bg-error-900/20">
      <Text color="error">{t('searchParticipants.loading.dependentsError')}</Text>
    </Card>
  );

  // Create a map of participantId -> participant for quick lookup
  const participantMap = participants?.reduce((map, p) => {
    map[p.id] = p;
    return map;
  }, {}) || {};

  // Get suggestions from participants AND dependents
  const getSuggestions = () => {
    if (searchTerm.length === 0 || !participants) return [];

    const normalizedSearch = normalizeString(searchTerm);

    // Find matching participants
    const participantSuggestions = participants
      .filter(p => normalizeString(p.participantName).includes(normalizedSearch))
      .map(p => ({
        type: 'participant',
        id: p.id,
        name: p.participantName,
        participant: p,
        parentParticipant: null
      }));

    // Find matching dependents and link to their participant
    const dependentSuggestions = dependents
      .filter(d => d.name && normalizeString(d.name).includes(normalizedSearch))
      .map(d => {
        const parentParticipant = participantMap[d.participantId];
        return {
          type: 'dependent',
          id: d.id,
          name: d.name,
          participant: parentParticipant,
          parentParticipant: parentParticipant
        };
      })
      .filter(d => d.parentParticipant); // Only include if we found the parent participant

    return [...participantSuggestions, ...dependentSuggestions];
  };

  const suggestions = getSuggestions();

  return (
    <div className="container mx-auto animate__animated animate__fadeIn animate__faster">
      <div className="flex flex-col lg:flex-row gap-4">
        {/* Search and details column */}
        <div className="w-full lg:w-1/2 space-y-4 bg-card rounded-xl shadow-sm p-6 animate__animated animate__fadeInLeft animate__faster">
          {/* Section Title */}
          <Text variant="h5" weight="medium" className="mb-4">
            {t('searchParticipants.title')}
          </Text>
        
          {/* Search field */}
          <div className="animate__animated animate__fadeIn animate__faster">
            <Input
              type="text"
              value={searchTerm}
              name="searchParticipant"
              onChange={handleInputChange}
              placeholder={t('searchParticipants.search.input.placeholder')}
              startIcon={<FiSearch size={20} className="text-muted-foreground" />}
              fullWidth
            />
          </div>

          {/* Search suggestions */}
          {suggestions.length > 0 && (
            <ul className="mt-2 bg-card border border-border rounded-lg overflow-hidden shadow-lg animate__animated animate__fadeIn animate__faster">
              {suggestions.map((suggestion) => (
                <li
                  key={`${suggestion.type}-${suggestion.id}`}
                  onClick={() => handleSelectParticipant(
                    suggestion.participant,
                    suggestion.type === 'dependent' ? suggestion.id : null
                  )}
                  className="p-3 hover:bg-accent cursor-pointer flex flex-col transition duration-300 ease-in-out border-b border-border last:border-b-0"
                >
                  <div className="flex items-center justify-between gap-2">
                    <div className="flex items-center gap-2 min-w-0">
                      <Text weight="medium" className="truncate">{suggestion.name}</Text>
                      {suggestion.type === 'dependent' && (
                        <span className="text-xs px-2 py-0.5 bg-secondary-100 dark:bg-secondary-900 text-secondary-700 dark:text-secondary-300 rounded-full">
                          {t('searchParticipants.search.dependentLabel')}
                        </span>
                      )}
                    </div>
                    {suggestion.type === 'participant' && (
                      <RoleBadge
                        roleName={getRoleName(suggestion.participant?.roleId)}
                        colorKey={getRoleColor(suggestion.participant?.roleId)}
                        className="shrink-0"
                      />
                    )}
                  </div>
                  {suggestion.type === 'dependent' && suggestion.parentParticipant && (
                    <Text variant="small" color="muted" className="mt-1">
                      {t('searchParticipants.search.dependentOf', { name: suggestion.parentParticipant.participantName })}
                    </Text>
                  )}
                </li>
              ))}
            </ul>
          )}

          {/* Add participant button */}
          {showAddButton && (
              <div className="mt-4 text-center animate__animated animate__fadeIn animate__faster">
                <Text variant="body" color="muted" className="mb-2">
                  {t('searchParticipants.search.notFound.message')}
                </Text>
                <Button
                  onClick={handleAddAndConfirmParticipant}
                  disabled={isCreating || addBlocked}
                  title={writeBlockedTitle(t, {
                    writable,
                    reason: accessReason,
                    limitReached: participantLimit.reached,
                    limitMessage: t('participantsV2.table.limitReached', { max: participantLimit.max }),
                  })}
                  variant="primary"
                  size="lg"
                  fullWidth
                  startIcon={<FiUserPlus size={20} />}
                  loading={isCreating}
                >
                  {isCreating ? t('searchParticipants.search.notFound.addingButton') : t('searchParticipants.search.notFound.addButton')}
                </Button>
              </div>
          )}

          {/* Participant details */}
          <ParticipantDetails
            eventId={eventId}
            selectedParticipant={selectedParticipant}
            dependentCount={selectedParticipant ? dependentCounts[selectedParticipant.id] || 0 : 0}
            dependents={dependents}
            searchedDependentId={searchedDependentId}
            isUpdating={isUpdating}
            confirmPresence={confirmPresence}
            setLastUpdate={setLastUpdate}
            setSelectedParticipant={setSelectedParticipant}
          />
        </div>

        {/* Confirmed participants list */}
        <ConfirmedParticipantsList
          participants={participants}
          dependents={dependents}
          handleSelectParticipant={handleSelectParticipant}
          lastUpdate={lastUpdate}
        />
      </div>

      {/* Alert popup */}
      {alertConfig.show && (
        <AlertPopup
          message={alertConfig.message}
          onClose={() => setAlertConfig({ ...alertConfig, show: false })}
          isConfirmation={alertConfig.isConfirmation}
          title={t('searchParticipants.alerts.error.title')}
          confirmText={t('searchParticipants.alerts.error.confirmText')}
        />
      )}
    </div>
  );
};

SearchParticipant.propTypes = {
  eventId: PropTypes.string.isRequired,
  participants: PropTypes.arrayOf(PropTypes.shape({
    id: PropTypes.string.isRequired,
    participantName: PropTypes.string.isRequired,
    participantEmail: PropTypes.string,
    participantPhone: PropTypes.string,
    roleId: PropTypes.string,
    participantStatus: PropTypes.string.isRequired,
    participantJob: PropTypes.string,
    participantNote: PropTypes.string,
    eventId: PropTypes.string.isRequired,
    updatedAt: PropTypes.oneOfType([PropTypes.string, PropTypes.instanceOf(Date)])
  })),
  isLoading: PropTypes.bool,
  error: PropTypes.object,
  dependentCounts: PropTypes.objectOf(PropTypes.number),
  dependents: PropTypes.arrayOf(PropTypes.shape({
    id: PropTypes.string.isRequired,
    name: PropTypes.string,
    age: PropTypes.string,
    participantId: PropTypes.string.isRequired
  })),
  isDependentsLoading: PropTypes.bool,
  dependentsError: PropTypes.object
};

export default SearchParticipant;