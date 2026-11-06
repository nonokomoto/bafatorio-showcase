// function/list-event-suppliers/resource.ts
import { defineFunction } from "@aws-amplify/backend";

export const listEventSuppliersFunction = defineFunction({
  name: 'listEventSuppliers',
  entry: './handler.ts',
  timeoutSeconds: 30,
  resourceGroupName: 'data',
});
