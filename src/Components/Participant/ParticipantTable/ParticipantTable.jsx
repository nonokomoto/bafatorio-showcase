import { useState, useMemo, useEffect, lazy, Suspense, useRef, useCallback } from 'react';
import { useSelector } from 'react-redux';
import { useTranslation } from 'react-i18next';
import PropTypes from 'prop-types';
import { FiPlus, FiUpload, FiDownload, FiSearch, FiRefreshCw } from 'react-icons/fi';
import { useParticipantActions } from './hooks/useParticipantActions';
import { useParticipantTable } from './hooks/useParticipantTable';
import { useRoleLookup } from '../../../Hook/useRoleLookup';
import { useFidelizeStatus } from '../../../Hook/useFidelizeStatus';
import { useAuthz, writeBlockedTitle } from '../../../Hook/useAuthz';
import { PLAN_KEYS } from '../../../Utils/plans';
import AlertPopup from '../../Layout/AlertPopUp';
import { selectSelectedEventId } from '../../../Api/eventSelectors';
import Spinner from '../../UI/spinner';
import { Card, Text, Button } from '../../UI';
import { ParticipantTableSkeleton } from '../../Skeletons';
import { normalizeString } from '../../../Utils/stringUtils';
import { DEFAULT_FILTERS } from './utils/constants';
import { exportParticipants } from './utils/exportParticipants';
import FilterDropdown from './components/TableHeader/FilterDropdown';

// New V2 components
import RoleFilterChips from './components/RoleFilterChips';
import BulkActionBar from './components/BulkActionBar';

// Components
import TableContent from './components/TableContent/Index';
import NoParticipants from './components/NoParticipants';

// Lazy loaded components
const SendEmail = lazy(() => import('../SendEmail'));
const ImportParticipantsModal = lazy(() => import('../ImportParticipantsModal'));
const FidelizeSyncModal = lazy(() => import('../FidelizeSyncModal'));
const TierUpgradeModal = lazy(() => import('../../Billing/TierUpgradeModal'));

const ParticipantTable = ({
  handleAddParticipants,
  selectedEvent,
  participants,
  allDependents,
  isParticipantsLoading,
  participantsError,
  refetchParticipants,
  permissions,
  onRowClick,
  onEditParticipant,
}) => {
  const { t } = useTranslation('participant');
  // O CTA de escalão é copy de billing; o resto da tabela vive no namespace participant.
  const { t: tBilling } = useTranslation('billing');

  // Local state
  const [searchInput, setSearchInput] = useState('');
  const [searchTerm, setSearchTerm] = useState('');
  const [filters, setFilters] = useState(DEFAULT_FILTERS);
  const [isImportModalOpen, setIsImportModalOpen] = useState(false);
  const [isTemplateChooserOpen, setIsTemplateChooserOpen] = useState(false);
  const [roleFilter, setRoleFilter] = useState(null);
  const [isSearchOpen, setIsSearchOpen] = useState(false);
  const [isFidelizeSyncOpen, setIsFidelizeSyncOpen] = useState(false);
  const [isTierUpgradeOpen, setIsTierUpgradeOpen] = useState(false);

  // Fidelize integration status
  const userId = useSelector((state) => state.user?.user?.sub);

  const { isConnected: isFidelizeConnected } = useFidelizeStatus(userId);

  // Debounce search (300ms)
  useEffect(() => {
    const timer = setTimeout(() => setSearchTerm(searchInput), 300);
    return () => clearTimeout(timer);
  }, [searchInput]);

  const selectedEventId = useSelector(selectSelectedEventId);

  // Gate cosmético do plano (§4b): contador X/25 e disable no limite/janela.
  const { limit: authzLimit, writable, reason: accessReason, entitlements, planKey } = useAuthz(selectedEventId);
  const participantLimit = authzLimit('participants', participants?.length || 0);
  const addBlocked = participantLimit.reached || !writable;
  const addBlockedTitle = writeBlockedTitle(t, {
    writable,
    reason: accessReason,
    limitReached: participantLimit.reached,
    limitMessage: t('participantsV2.table.limitReached', { max: participantLimit.max }),
  });
  // Subir escalão só existe no Por Evento e só com teto: no Grátis o caminho é
  // comprar um plano, não pagar uma diferença (ADR-034).
  const canUpgradeTier =
    planKey === PLAN_KEYS.PAY_PER_EVENT && Number.isFinite(participantLimit.max);
  const { getRoleName, roles: eventRoles } = useRoleLookup();

  // Actions hook
  const {
    showDeleteAlert, setShowDeleteAlert,
    selectedParticipantIds, setSelectedParticipants,
    setEmailSendStatus, handleDeleteSelected
  } = useParticipantActions();

  // Dependents
  const dependents = useMemo(() => allDependents || [], [allDependents]);

  const dependentCountsForTable = useMemo(() => {
    if (!participants) return {};
    const counts = {};
    participants.forEach(p => { counts[p.id] = p.dependentsCount || 0; });
    return counts;
  }, [participants]);

  // Role data for filter chips
  const { roles, roleCounts } = useMemo(() => {
    if (!participants) return { roles: [], roleCounts: {} };
    const countMap = {};
    participants.forEach(p => {
      const name = getRoleName(p.roleId, p.role?.name) || t('participantsV2.roleFilter.noRole', 'Sem role');
      countMap[name] = (countMap[name] || 0) + 1;
    });
    const colorByName = Object.fromEntries(eventRoles.map(r => [r.name, r.color]));
    const roleList = Object.keys(countMap).map(name => ({ name, color: colorByName[name] }));
    return { roles: roleList, roleCounts: countMap };
  }, [participants, getRoleName, eventRoles, t]);

  // Loading/error
  const isLoading = isParticipantsLoading;
  const error = participantsError;

  const selectedParticipantObjects = useMemo(() => {
    if (!participants || !selectedParticipantIds) return [];
    const selectedSet = new Set(selectedParticipantIds);
    return participants.filter(p => selectedSet.has(p.id));
  }, [participants, selectedParticipantIds]);

  // Filtered data
  const filteredData = useMemo(() => {
    if (!participants) return [];
    let result = participants;

    if (searchTerm) {
      const normalizedSearch = normalizeString(searchTerm);
      result = result.filter(participant => {
        const matchesParticipant =
          normalizeString(participant.participantName || '').includes(normalizedSearch) ||
          normalizeString(participant.participantEmail || '').includes(normalizedSearch) ||
          normalizeString(participant.participantPhone || '').includes(normalizedSearch) ||
          normalizeString(participant.organization || '').includes(normalizedSearch);
        if (matchesParticipant) return true;
        if (dependents?.length > 0) {
          return dependents
            .filter(d => d.participantId === participant.id)
            .some(dep => normalizeString(dep.name || '').includes(normalizedSearch));
        }
        return false;
      });
    }

    if (filters.status) {
      result = result.filter(p => p.participantStatus === filters.status);
    }
    if (filters.roleId) {
      result = result.filter(p => p.roleId === filters.roleId);
    }
    if (filters.dependentCategory && dependents?.length > 0) {
      result = result.filter(p =>
        dependents.filter(d => d.participantId === p.id).some(dep => dep.age === filters.dependentCategory)
      );
    }

    // Role chip filter
    if (roleFilter) {
      result = result.filter(p => {
        const name = getRoleName(p.roleId, p.role?.name) || t('participantsV2.roleFilter.noRole', 'Sem role');
        return name === roleFilter;
      });
    }

    return result;
  }, [participants, searchTerm, dependents, filters, roleFilter, getRoleName, t]);

  // Table hook
  const {
    tableData, requestSort, sortConfig, filteredDataLength,
    loadMore, hasMore, visibleCount
  } = useParticipantTable(filteredData, searchTerm, filters);

  const scrollContainerRef = useRef(null);

  const handleScroll = useCallback((e) => {
    const { scrollTop, scrollHeight, clientHeight } = e.target;
    if (scrollHeight - scrollTop - clientHeight < 100 && hasMore) {
      loadMore();
    }
  }, [hasMore, loadMore]);


  // Handlers
  const handleSelectAll = (event) => {
    setSelectedParticipants(event.target.checked ? tableData.map(p => p.id) : []);
  };

  const handleEditParticipant = () => {
    if (selectedParticipantIds.length === 1) {
      const participant = participants?.find(p => p.id === selectedParticipantIds[0]);
      if (participant && onEditParticipant) {
        onEditParticipant(participant);
      }
    }
  };


  const handleOpenTemplateChooser = () => {
    setEmailSendStatus({ success: false, failure: false });
    setIsTemplateChooserOpen(true);
  };


  // Loading/error states
  if (isLoading) return <ParticipantTableSkeleton />;

  if (error) {
    return (
      <Card className="p-8 text-center">
        <Text variant="h5" className="font-medium mb-4 text-error-500">
          {t('searchParticipants.loading.error')}
        </Text>
        {refetchParticipants && (
          <Button
            variant="primary"
            size="sm"
            onClick={refetchParticipants}
          >
            {t('pages.importModal.buttons.tryAgain', 'Tentar Novamente')}
          </Button>
        )}
      </Card>
    );
  }

  if (selectedEventId && !selectedEvent) {
    return (
      <div className="flex justify-center items-center min-h-[300px]">
        <Spinner status='loadingWithMessage' loadingMessage={t('searchParticipants.loading.eventDetails')} />
      </div>
    );
  }



  const hasActiveFilters = searchInput || filters.status || filters.roleId || filters.dependentCategory || roleFilter;

  return (
    <Card elevated="sm" padded={false} className="flex flex-col overflow-hidden animate-fade-in h-[calc(100dvh-280px)] lg:h-[calc(100vh-220px)] min-h-[500px] rounded-xl">
      {/* Toolbar */}
      <div className="flex-shrink-0 bg-card border-b border-border px-3 sm:px-6 py-3">
        <div className="flex items-center justify-between gap-2">
          {/* Left: counter */}
          <div className="flex items-center gap-2 flex-shrink-0">
            <span
              className="text-xs font-semibold px-3 py-0.5 rounded-full bg-primary-50 dark:bg-primary-900/30 text-primary dark:text-primary-300"
            >
              {t('participantsV2.table.count', { count: filteredDataLength })}
            </span>
            {allDependents?.length > 0 && (
              <span
                className="text-xs font-medium px-2.5 py-0.5 rounded-full bg-amber-50 dark:bg-amber-900/30 text-amber-700 dark:text-amber-300"
              >
                {t('participantsV2.table.dependentsCount', { count: allDependents.length, defaultValue: '{{count}} acompanhantes' })}
              </span>
            )}
            {hasActiveFilters && (
              <span className="text-xs text-text-400">
                {t('participantsV2.table.showing', { shown: filteredDataLength, total: participants?.length || 0 })}
              </span>
            )}
          </div>

          {/* Right: actions */}
          <div className="flex items-center gap-2">
            {/* Search */}
            <div className="relative">
              {isSearchOpen ? (
                <input
                  type="text"
                  value={searchInput}
                  onChange={(e) => setSearchInput(e.target.value)}
                  placeholder={t('participantsV2.table.search.placeholder', 'Pesquisar...')}
                  className="w-[160px] sm:w-[200px] text-sm border border-border rounded-lg px-3 py-2 focus:outline-none focus:border-primary bg-background dark:bg-background-700 dark:text-text-200"
                  autoFocus
                  onBlur={() => { if (!searchInput) setIsSearchOpen(false); }}
                />
              ) : (
                <button
                  onClick={() => setIsSearchOpen(true)}
                  className="p-2 rounded-lg border border-border hover:bg-accent transition-colors"
                >
                  <FiSearch size={16} className="text-text-500" />
                </button>
              )}
            </div>

            {/* Filter */}
            <FilterDropdown
              filters={filters}
              onFilterChange={setFilters}
              hasDependents={allDependents?.length > 0}
            />

            {/* Sync Fidelize */}
            {permissions?.canManageParticipants && isFidelizeConnected && entitlements.integrations && (
              <button
                onClick={() => setIsFidelizeSyncOpen(true)}
                className="inline-flex items-center gap-1.5 px-3 py-2 rounded-lg border border-border text-[13px] hover:bg-accent transition-colors"
                title={t('fidelizeSync.button')}
              >
                <FiRefreshCw size={16} className="text-violet-500" />
                <span className="hidden lg:inline text-text-700 dark:text-text-300">
                  {t('fidelizeSync.button')}
                </span>
              </button>
            )}

            {/* Import — mesma escrita que o Add: bloqueado no limite/read-only */}
            {permissions?.canManageParticipants && (
              <button
                onClick={() => setIsImportModalOpen(true)}
                disabled={addBlocked}
                title={addBlockedTitle}
                className="inline-flex items-center gap-1.5 px-3 py-2 rounded-lg border border-border text-[13px] hover:bg-accent transition-colors disabled:opacity-50 disabled:cursor-not-allowed disabled:hover:bg-transparent"
              >
                <FiUpload size={16} className="text-blue-500" />
                <span className="hidden lg:inline text-text-700 dark:text-text-300">
                  {t('participantsV2.table.actions.import', 'Importar')}
                </span>
              </button>
            )}

            {/* Export */}
            {permissions?.canManageParticipants && (
              <button
                onClick={() => exportParticipants({
                  participants: filteredData,
                  t,
                  getRoleName,
                  eventName: selectedEvent?.name,
                  allDependents,
                })}
                className="inline-flex items-center gap-1.5 px-3 py-2 rounded-lg border border-border text-[13px] hover:bg-accent transition-colors"
              >
                <FiDownload size={16} className="text-emerald-500" />
                <span className="hidden lg:inline text-text-700 dark:text-text-300">
                  {t('participantsV2.table.actions.export', 'Exportar')}
                </span>
              </button>
            )}

            {/* Add — bloqueado no limite do plano ou em evento read-only */}
            {permissions?.canManageParticipants && (
              <button
                onClick={handleAddParticipants}
                disabled={addBlocked}
                title={addBlockedTitle}
                className="inline-flex items-center gap-1.5 px-4 py-2 rounded-lg text-[13px] font-semibold text-white bg-primary hover:bg-primary-600 shadow-[0_2px_8px_rgba(64,105,255,0.3)] transition-colors disabled:opacity-50 disabled:cursor-not-allowed disabled:hover:bg-primary"
              >
                <FiPlus size={16} />
                <span className="hidden sm:inline">
                  {t('participantsV2.table.actions.add', 'Adicionar')}
                </span>
                {Number.isFinite(participantLimit.max) && (
                  <span className="text-[11px] opacity-80">
                    {(participants?.length || 0)}/{participantLimit.max}
                  </span>
                )}
              </button>
            )}
          </div>
        </div>
      </div>

      {/* Aviso antes do bloqueio, só no teto pago (ADR-038): quem já pagou tem
          de ver o teto a aproximar-se, não descobri-lo num erro de escrita. O
          CTA fica nos dois estados — no bloqueio é a única saída oferecida. */}
      {canUpgradeTier && (participantLimit.approaching || participantLimit.reached) && (
        <div className="mx-4 mb-3 flex items-center justify-between gap-3 px-3 py-2 rounded-lg bg-warning-50 dark:bg-warning-950 text-[13px] text-warning-800 dark:text-warning-200">
          <span>
            {participantLimit.reached
              ? t('participantsV2.table.limitReached', { max: participantLimit.max })
              : t('participantsV2.table.limitApproaching', {
                  current: participants?.length || 0,
                  max: participantLimit.max,
                })}
          </span>
          <button
            type="button"
            onClick={() => setIsTierUpgradeOpen(true)}
            className="flex-none font-semibold underline underline-offset-2 hover:no-underline"
          >
            {tBilling('plans.grid.upgrade.cta')}
          </button>
        </div>
      )}

      {/* Refetch indicator — only on explicit refetches, not during optimistic mutations */}

      {/* Role Filter Chips */}
      {roles.length > 0 && (
        <RoleFilterChips
          roles={roles}
          roleCounts={roleCounts}
          activeFilter={roleFilter}
          onFilterChange={setRoleFilter}
        />
      )}

      {/* Bulk Action Bar — editar/apagar são escrita: congelados em read-only */}
      <BulkActionBar
        selectedCount={selectedParticipantIds.length}
        permissions={permissions}
        writable={writable}
        readOnlyTitle={writeBlockedTitle(t, { writable, reason: accessReason })}
        onEmail={handleOpenTemplateChooser}
        onEdit={handleEditParticipant}
        onDelete={() => setShowDeleteAlert(true)}
      />

      {/* Scrollable Table */}
      <div
        ref={scrollContainerRef}
        className="flex-1 overflow-auto min-h-0"
        onScroll={handleScroll}
      >
        {!participants || participants.length === 0 ? (
          <NoParticipants />
        ) : (
          <>
            <TableContent
              tableData={tableData}
              selectedParticipants={selectedParticipantIds}
              handleSelectParticipant={(participantId) => {
                const newSelection = selectedParticipantIds.includes(participantId)
                  ? selectedParticipantIds.filter(id => id !== participantId)
                  : [...selectedParticipantIds, participantId];
                setSelectedParticipants(newSelection);
              }}
              handleSelectAll={handleSelectAll}
              requestSort={requestSort}
              sortConfig={sortConfig}
              dependentCounts={dependentCountsForTable}
              onRowClick={onRowClick}
            />
            {hasMore && (
              <div className="flex justify-center items-center py-4">
                <div className="animate-spin rounded-full h-5 w-5 border-b-2 border-primary"></div>
                <span className="ml-2 text-sm text-text-400">{t('common.loadingMore', 'A carregar mais...')}</span>
              </div>
            )}
          </>
        )}
      </div>

      {/* Footer */}
      {participants && participants.length > 0 && (
        <div className="flex-shrink-0 border-t border-border bg-card px-6 py-2.5">
          <Text variant="body2" className="text-text-400 text-xs">
            {t('pages.participantTable.showingResults', {
              showing: visibleCount > filteredDataLength ? filteredDataLength : visibleCount,
              total: filteredDataLength
            })}
          </Text>
        </div>
      )}

      <Suspense fallback={null}>
        {showDeleteAlert && (
          <AlertPopup
            title={t('pages.participantTable.confirm.delete.title')}
            message={t('pages.participantTable.confirm.delete.message', { count: selectedParticipantIds.length })}
            isConfirmation={true}
            confirmText={t('pages.participantTable.confirm.delete.confirmText')}
            cancelText={t('pages.participantTable.confirm.delete.cancelText')}
            confirmColor="error"
            onClose={async (confirmed) => {
              if (confirmed) await handleDeleteSelected(true);
              setShowDeleteAlert(false);
            }}
          />
        )}

        <SendEmail
          isOpen={isTemplateChooserOpen}
          onClose={() => setIsTemplateChooserOpen(false)}
          selectedParticipants={selectedParticipantObjects}
          eventId={selectedEventId}
          selectedEvent={selectedEvent}
          clearSelectedParticipants={() => setSelectedParticipants([])}
        />
        <ImportParticipantsModal
          isOpen={isImportModalOpen}
          onClose={() => setIsImportModalOpen(false)}
        />
        {isFidelizeSyncOpen && (
          <FidelizeSyncModal
            isOpen={isFidelizeSyncOpen}
            onClose={() => {
              setIsFidelizeSyncOpen(false);
              if (refetchParticipants) refetchParticipants();
            }}
            eventId={selectedEventId}
            eventName={selectedEvent?.eventTitle}
          />
        )}
        {isTierUpgradeOpen && (
          <TierUpgradeModal
            isOpen={isTierUpgradeOpen}
            onClose={() => setIsTierUpgradeOpen(false)}
            eventId={selectedEventId}
            currentLimit={participantLimit.max}
          />
        )}
      </Suspense>
    </Card>
  );
};

ParticipantTable.propTypes = {
  handleAddParticipants: PropTypes.func,
  selectedEvent: PropTypes.object,
  participants: PropTypes.array,
  allDependents: PropTypes.array,
  isParticipantsLoading: PropTypes.bool,
  isFetching: PropTypes.bool,
  participantsError: PropTypes.object,
  refetchParticipants: PropTypes.func,
  permissions: PropTypes.object,
  onRowClick: PropTypes.func,
  onEditParticipant: PropTypes.func,
};

export default ParticipantTable;
