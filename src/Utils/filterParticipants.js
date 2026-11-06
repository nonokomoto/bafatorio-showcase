/**
 * @file filterParticipants.js
 * @description Filtro read-only para a tab de Participantes do EventDetails:
 * procura por nome/email/organização e devolve sempre ordenado por nome.
 */

const norm = (v) => (typeof v === 'string' ? v.toLowerCase() : '');

/**
 * @param {Array<object>} participants
 * @param {string} query — termo de procura (nome, email ou organização)
 * @returns {Array<object>} filtrados e ordenados por nome (case-insensitive)
 */
export const filterParticipants = (participants, query) => {
  if (!Array.isArray(participants)) return [];

  const q = (query || '').trim().toLowerCase();
  const matched = q
    ? participants.filter((p) => {
        const haystack = `${norm(p?.participantName)} ${norm(p?.participantEmail)} ${norm(p?.organization)}`;
        return haystack.includes(q);
      })
    : [...participants];

  return matched.sort((a, b) =>
    norm(a?.participantName).localeCompare(norm(b?.participantName), 'pt', { sensitivity: 'base' }),
  );
};
