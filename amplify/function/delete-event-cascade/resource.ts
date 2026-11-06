import { defineFunction } from '@aws-amplify/backend';

export const deleteEventCascadeFunction = defineFunction({
  name: 'deleteEventCascade',
  entry: './handler.ts',
  // Alinhado com o timeout de 30s do resolver AppSync (ADR-035 §8): não faz
  // sentido continuar a trabalhar depois de o caller já ter recebido erro —
  // o retry do frontend retoma onde esta execução ficou.
  timeoutSeconds: 29,
  resourceGroupName: 'data',
});
