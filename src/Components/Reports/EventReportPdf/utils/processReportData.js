import i18next from 'i18next';
import { getSafeCurrency } from '../../../../Utils/currencyOptions';

/**
 * Processa os dados brutos para o formato necessário do relatório
 * @param {Object} rawData - Dados brutos do dashboard
 * @param {string} eventId - ID do evento específico
 * @param {Object} roleMap - Mapa roleId -> nome do role
 * @param {'summary'|'detailed'} mode - 'detailed' inclui a lista nominal de participantes
 * @returns {Object} Dados processados para o relatório
 */
// Sentinela interna para quem não tem role; nunca chega ao PDF em cru — é
// trocada pela copy traduzida na montagem da tabela.
const UNCATEGORIZED = Symbol('uncategorized');

export const processReportData = (rawData, eventId, roleMap = {}, mode = 'summary') => {
  const t = i18next.getFixedT(null, 'report');
  const event = rawData.events.find(e => e.id === eventId);
  
  // Possível que o campo seja event ou event_id
  const eventParticipants = rawData.participants.filter(p => 
    p.eventId === eventId || p.event_id === eventId || p.event === eventId
  );

  const eventDependents = rawData.dependents.filter(d => 
    eventParticipants.some(p => p.id === d.participantId)
  );

  // 2. Calcular contagens básicas
  const totalParticipants = eventParticipants.length;
  
  const confirmedCount = eventParticipants.filter(p => p.participantStatus === 'ATTENDED').length;
  const canceledCount = eventParticipants.filter(p => p.participantStatus === 'CANCELLED').length;
  const resolveRole = (p) => (p.roleId && roleMap[p.roleId]) || null;
  // As roles são criadas por evento (modelo Role), não são um enum fixo: agrupar
  // por VIP/Media/Equipa/Geral deixava de fora toda a gente com uma role real
  // diferente dessas quatro, e a tabela fechava com um total que não batia com
  // a soma das linhas. Agrupa-se pelo nome real, com uma linha para quem não tem.
  const byRoleName = new Map();
  eventParticipants.forEach((p) => {
    const chave = resolveRole(p) || UNCATEGORIZED;
    byRoleName.set(chave, (byRoleName.get(chave) || 0) + 1);
  });

  // Sem categoria fica sempre no fim, por muito que seja o maior grupo: é a
  // ausência de dado, não uma categoria a par das outras.
  const categories = [...byRoleName.entries()]
    .map(([name, value]) => ({
      name: name === UNCATEGORIZED
        ? t('eventReport.distribution.status.uncategorized', 'Sem categoria')
        : name,
      value,
      isUncategorized: name === UNCATEGORIZED,
    }))
    .sort((a, b) => a.isUncategorized - b.isUncategorized || b.value - a.value);

  const topCategory = categories.find((c) => !c.isUncategorized) || null;

  const dependentsCount = eventDependents.length;
  const totalPresent = totalParticipants + dependentsCount;

  // 3. Calcular taxas básicas
  const confirmationRate = totalParticipants > 0 
    ? ((confirmedCount / totalParticipants) * 100).toFixed(1)
    : "0.0";

  const cancellationRate = totalParticipants > 0
    ? ((canceledCount / totalParticipants) * 100).toFixed(1)
    : "0.0";

  // 4. Calcular métricas de desempenho
  const participantsWithDependents = eventParticipants.filter(p => 
    eventDependents.some(d => d.participantId === p.id)
  ).length;

  const dependentsRate = totalParticipants > 0
    ? ((participantsWithDependents / totalParticipants) * 100).toFixed(1)
    : "0.0";

  const averageDependents = participantsWithDependents > 0
    ? (dependentsCount / participantsWithDependents).toFixed(1)
    : "0.0";

  // 5. Calcular custos de fornecedores para este evento
  const eventSuppliers = (rawData.eventSuppliers || []).filter(es =>
    es.eventId === eventId || es.event_id === eventId
  );
  const currency = getSafeCurrency(event?.currency);

  const costsByStatus = { PENDING: 0, COUNTING_ON: 0, APPROVED: 0, PAID: 0, REJECTED: 0 };
  eventSuppliers.forEach(es => {
    if (costsByStatus[es.status] !== undefined && es.quoteAmount) {
      costsByStatus[es.status] += Number(es.quoteAmount) || 0;
    }
  });
  const committedTotal = costsByStatus.APPROVED + costsByStatus.PAID;

  const supplierRanking = eventSuppliers
    .filter(es => es.quoteAmount)
    .map(es => ({
      name: es.supplier?.name || t('eventReport.formatters.notAvailable'),
      category: es.supplier?.category || '',
      status: es.status,
      amount: Number(es.quoteAmount) || 0
    }))
    .sort((a, b) => b.amount - a.amount);

  // 7. Lista nominal de participantes (só no modo 'detailed' — dados pessoais)
  const PARTICIPANT_STATUS_ORDER = { ATTENDED: 0, CONFIRMED: 1, REGISTERED: 2, PENDING: 3, CANCELLED: 4 };
  const participantList = mode === 'detailed'
    ? eventParticipants
      .map(p => ({
        name: p.participantName || t('eventReport.formatters.notAvailable'),
        status: p.participantStatus,
        role: resolveRole(p) || '',
        email: p.participantEmail || '',
        phone: p.participantPhone || '',
        dependents: eventDependents
          .filter(d => d.participantId === p.id)
          .map(d => d.name)
          .filter(Boolean)
      }))
      .sort((a, b) => {
        const rankA = PARTICIPANT_STATUS_ORDER[a.status] ?? 5;
        const rankB = PARTICIPANT_STATUS_ORDER[b.status] ?? 5;
        if (rankA !== rankB) return rankA - rankB;
        return a.name.localeCompare(b.name);
      })
    : null;

  // 8. Estruturar dados para o relatório com os nomes traduzidos
  return {
    metrics: {
      general: {
        totalParticipants,
        totalPresent,
        confirmedCount,
        canceledCount,
        topCategory,
        dependentsCount
      },
      rates: {
        confirmationRate,
        cancellationRate
      },
      performance: {
        attendanceRate: confirmationRate,    // Taxa de Comparência
        dependentsRate,                     // % com Acompanhantes
        totalDependents: dependentsCount,   // Total de Acompanhantes
        averageDependents,                  // Média de Acompanhantes
        participantsWithDependents          // Total de participantes com acompanhantes
      },
      distribution: {
        byStatus: categories
      },
      costs: {
        currency,
        byStatus: costsByStatus,
        committedTotal,
        ranking: supplierRanking
      }
    },
    raw: {
      event,
      participants: eventParticipants,
      dependents: eventDependents,
      eventSuppliers
    },
    participantList
  };
};