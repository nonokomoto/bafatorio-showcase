import { defineFunction } from "@aws-amplify/backend";

export const getSupplierForEventFunction = defineFunction({
    name: 'get-supplier-for-event',
    entry: './handler.ts',
    resourceGroupName: 'data',
});
