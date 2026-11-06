// function/select-event-supplier/resource.ts
import { defineFunction } from "@aws-amplify/backend";

export const selectEventSupplierFunction = defineFunction({
  name: 'selectEventSupplier',
  entry: './handler.ts',
  timeoutSeconds: 30,
  resourceGroupName: 'data',
});
