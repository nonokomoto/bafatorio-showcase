// function/approve-supplier-selection/resource.ts
import { defineFunction } from "@aws-amplify/backend";

export const approveSupplierSelectionFunction = defineFunction({
  name: 'approveSupplierSelection',
  entry: './handler.ts',
  timeoutSeconds: 30,
  resourceGroupName: 'data',
});
