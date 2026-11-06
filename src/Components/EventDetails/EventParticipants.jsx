import { useState, useMemo } from 'react';
import PropTypes from 'prop-types';
import { useNavigate } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { FiSearch, FiArrowRight, FiEye, FiChevronRight, FiUsers } from 'react-icons/fi';
import { Card, Text } from '../UI';
import ParticipantAvatar from '../Participant/ParticipantAvatar';
import RoleBadge from '../Participant/RoleBadge';
import StatusBadge from '../Participant/StatusBadge';
import ParticipantDetailPanel from '../Participant/ParticipantDetailPanel';
import { useRoleLookup } from '../../Hook/useRoleLookup';
import { useListParticipantsByEventLambdaQuery } from '../../Api/services/participantApi';
import { filterParticipants } from '../../Utils/filterParticipants';

// Painel de detalhe sempre em modo leitura: sem onEdit/onEmail e permissões a false.
const READONLY_PERMISSIONS = { canManageParticipants: false, canSendEmails: false };

// Ordem dos chips de estado (adesão): confirmados primeiro, cancelados por último.
const STATUS_ORDER = ['CONFIRMED', 'REGISTERED', 'ATTENDED', 'CANCELLED'];

const depsOf = (p) => p?.dependentsCount ?? p?.dependents?.length ?? 0;

/**
 * Vista READ-ONLY dos participantes dentro do EventDetails. Os writes (criar,
 * editar, importar, check-in) vivem na página dedicada /app/participants.
 */
const EventParticipants = ({ eventId, canManageParticipants = false }) => {
  const { t } = useTranslation(['event']);
  const navigate = useNavigate();
  const { getRoleName, getRoleColor } = useRoleLookup(eventId);

  const { data, isLoading, isError, refetch } = useListParticipantsByEventLambdaQuery(
    { eventId },
    { skip: !eventId },
  );

  const [query, setQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState(null);
  const [selected, setSelected] = useState(null);

  const participants = useMemo(() => data?.items ?? [], [data]);

  // Agregados por participante num só pass: contagem por estado (adesão — a
  // métrica-chave da vista) + total de dependentes. STATUS_ORDER é a fonte única.
  const { statusCounts, totalDeps } = useMemo(() => {
    const counts = STATUS_ORDER.reduce((acc, s) => ({ ...acc, [s]: 0 }), {});
    let deps = 0;
    participants.forEach((p) => {
      if (counts[p.participantStatus] !== undefined) counts[p.participantStatus] += 1;
      deps += depsOf(p);
    });
    return { statusCounts: counts, totalDeps: deps };
  }, [participants]);

  const filtered = useMemo(() => {
    const byQuery = filterParticipants(participants, query);
    return statusFilter ? byQuery.filter((p) => p.participantStatus === statusFilter) : byQuery;
  }, [participants, query, statusFilter]);

  const goToManage = () => navigate('/app/participants');

  return (
    <Card variant="default" padded="lg" elevated className="animate-fade-in">
      {/* Header */}
      <div className="flex items-start justify-between gap-3 flex-wrap mb-4">
        <div className="flex items-center gap-2.5">
          <FiUsers className="w-5 h-5 text-primary-500 dark:text-primary-400" aria-hidden="true" />
          <div>
            <Text variant="h6" weight="medium" className="text-foreground">
              {t('participants.title', 'Participantes')}
            </Text>
            {!isLoading && !isError && participants.length > 0 && (
              <Text variant="caption" className="text-muted-foreground tabular-nums">
                {t('participants.summary', {
                  total: participants.length,
                  deps: totalDeps,
                  defaultValue: '{{total}} participantes · {{deps}} dependentes',
                })}
              </Text>
            )}
          </div>
          <span className="inline-flex items-center gap-1 text-[11px] font-semibold uppercase tracking-wide text-muted-foreground bg-muted px-2 py-0.5 rounded ml-1">
            <FiEye className="w-3 h-3" aria-hidden="true" />
            {t('participants.readonlyTag', 'Consulta')}
          </span>
        </div>

        {canManageParticipants && (
          <button
            type="button"
            onClick={goToManage}
            className="inline-flex items-center gap-1.5 text-sm font-semibold text-primary-600 dark:text-primary-400 bg-primary-50 dark:bg-primary-900/20 hover:bg-primary-100 dark:hover:bg-primary-900/40 rounded-lg px-3 py-2 transition-colors"
          >
            {t('participants.manage', 'Gerir participantes')}
            <FiArrowRight className="w-4 h-4" aria-hidden="true" />
          </button>
        )}
      </div>

      {/* Error */}
      {isError ? (
        <div className="text-center py-10">
          <Text variant="body2" className="text-muted-foreground mb-3">
            {t('participants.error', 'Não foi possível carregar os participantes.')}
          </Text>
          <button
            type="button"
            onClick={refetch}
            className="text-sm font-semibold text-primary-600 dark:text-primary-400 hover:underline"
          >
            {t('participants.retry', 'Tentar de novo')}
          </button>
        </div>
      ) : isLoading ? (
        // Loading skeleton
        <div className="animate-pulse space-y-3">
          <div className="h-11 bg-muted/60 rounded-lg" />
          {[...Array(4)].map((_, i) => (
            <div key={i} className="h-14 bg-muted/40 rounded-lg" />
          ))}
        </div>
      ) : participants.length === 0 ? (
        // Empty (evento sem participantes)
        <div className="text-center py-12">
          <FiUsers className="w-8 h-8 text-muted-foreground/50 mx-auto mb-3" aria-hidden="true" />
          <Text variant="body2" className="text-muted-foreground">
            {t('participants.empty', 'Ainda não há participantes neste evento.')}
          </Text>
        </div>
      ) : (
        <>
          {/* Estado da adesão — chips clicáveis que filtram a lista por estado */}
          <div className="flex flex-wrap gap-2 mb-3">
            {STATUS_ORDER.filter((s) => statusCounts[s] > 0).map((s) => (
              <button
                key={s}
                type="button"
                onClick={() => setStatusFilter(statusFilter === s ? null : s)}
                aria-pressed={statusFilter === s}
                className={`inline-flex items-center gap-2 rounded-lg border px-2.5 py-1.5 transition-colors ${
                  statusFilter === s
                    ? 'border-primary-400 bg-primary-50 dark:border-primary-500 dark:bg-primary-900/20'
                    : 'border-border hover:bg-muted/50'
                }`}
              >
                <StatusBadge status={s} />
                <span className="text-sm font-semibold tabular-nums text-foreground">{statusCounts[s]}</span>
              </button>
            ))}
          </div>

          {/* Search */}
          <div className="flex items-center gap-2.5 bg-muted/50 border border-border rounded-xl px-3.5 py-2.5 mb-3">
            <FiSearch className="w-4 h-4 text-muted-foreground flex-shrink-0" aria-hidden="true" />
            <input
              type="text"
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder={t('participants.search', 'Procurar por nome, email ou organização…')}
              aria-label={t('participants.search', 'Procurar por nome, email ou organização…')}
              className="w-full bg-transparent text-sm text-foreground placeholder:text-muted-foreground focus:outline-none"
            />
          </div>

          {/* Tabela */}
          {filtered.length === 0 ? (
            <div className="text-center py-8">
              <Text variant="body2" className="text-muted-foreground">
                {t('participants.noResults', 'Nenhum participante corresponde à procura.')}
              </Text>
            </div>
          ) : (
            <div className="overflow-x-auto border border-border rounded-xl">
              <table className="w-full text-sm min-w-[640px]">
                <thead>
                  <tr className="bg-muted/40 border-b border-border">
                    {['name', 'role', 'status', 'organization', 'deps'].map((col) => (
                      <th
                        key={col}
                        scope="col"
                        className={`text-[11px] uppercase tracking-wide font-bold text-muted-foreground px-4 py-3 whitespace-nowrap ${col === 'deps' ? 'text-center' : 'text-left'}`}
                      >
                        {t(`participants.columns.${col}`, col)}
                      </th>
                    ))}
                    <th scope="col" aria-label="" className="w-10" />
                  </tr>
                </thead>
                <tbody>
                  {filtered.map((p) => (
                    <tr
                      key={p.id}
                      role="button"
                      tabIndex={0}
                      onClick={() => setSelected(p)}
                      onKeyDown={(e) => {
                        if (e.key === 'Enter' || e.key === ' ') {
                          e.preventDefault();
                          setSelected(p);
                        }
                      }}
                      className="border-b border-border last:border-0 cursor-pointer hover:bg-muted/40 focus:outline-none focus-visible:bg-muted/60 transition-colors"
                    >
                      <td className="px-4 py-3">
                        <div className="flex items-center gap-3">
                          <ParticipantAvatar participant={p} size="sm" />
                          <div className="min-w-0">
                            <div className="font-semibold text-foreground truncate">{p.participantName}</div>
                            {p.participantJob && (
                              <div className="text-xs text-muted-foreground truncate">{p.participantJob}</div>
                            )}
                          </div>
                        </div>
                      </td>
                      <td className="px-4 py-3">
                        <RoleBadge roleName={getRoleName(p.roleId, '')} colorKey={getRoleColor(p.roleId)} />
                      </td>
                      <td className="px-4 py-3">
                        <StatusBadge status={p.participantStatus} />
                      </td>
                      <td className="px-4 py-3 text-muted-foreground truncate max-w-[200px]">
                        {p.organization || '—'}
                      </td>
                      <td className="px-4 py-3 text-center tabular-nums text-muted-foreground">
                        {depsOf(p) || '—'}
                      </td>
                      <td className="px-4 py-3 text-right">
                        <FiChevronRight className="w-4 h-4 text-muted-foreground inline" aria-hidden="true" />
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}

          {/* Nota read-only */}
          <div className="flex items-center gap-2 mt-3 text-xs text-muted-foreground">
            <FiEye className="w-3.5 h-3.5 flex-shrink-0" aria-hidden="true" />
            <span>
              {t('participants.readonlyNote', 'Vista só de leitura. Para adicionar ou editar, usa Gerir participantes.')}
            </span>
          </div>
        </>
      )}

      {/* Detalhe read-only (slide-over) */}
      <ParticipantDetailPanel
        participant={selected}
        onClose={() => setSelected(null)}
        permissions={READONLY_PERMISSIONS}
      />
    </Card>
  );
};

EventParticipants.propTypes = {
  eventId: PropTypes.string.isRequired,
  canManageParticipants: PropTypes.bool,
};

export default EventParticipants;
