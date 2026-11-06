/**
 * @file update-collaborator-schedule-access/resource.ts
 * @description Lambda que liga/desliga a visibilidade da agenda da equipa para
 * um STAFF_LOGISTICS (ADR-029, revisão 2026-07-16).
 */

import { defineFunction } from '@aws-amplify/backend';

export const updateCollaboratorScheduleAccessFunction = defineFunction({
  name: 'update-collaborator-schedule-access',
  resourceGroupName: 'data',
  timeoutSeconds: 30,
});
