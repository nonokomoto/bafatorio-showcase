/**
 * @file ownerId.js
 * @description Normaliza o campo `owner` do DynamoDB para o sub cru do Cognito.
 *
 * Os registos Gen-1 guardam `sub::sub` (ADR-013); os userId de referência
 * (EventCollaborator.userId, authors da agenda) guardam o sub cru. Qualquer
 * comparação entre os dois SEM normalizar falha em silêncio — devolve false e
 * ninguém vê erro nenhum.
 *
 * Espelho frontend do normalizeUserId de amplify/function/shared/
 * resolveEventAccess.ts. O mesmo split está copiado inline em Documents.jsx,
 * DocumentFolderList.jsx e DocumentPreviewModal.jsx — código novo importa
 * daqui; migrar os inline é tarefa própria.
 */
export function normalizeOwnerId(id) {
  return typeof id === 'string' ? id.split('::')[0] : '';
}
