import { defineFunction } from "@aws-amplify/backend";

export const sendEmail = defineFunction({
    name: 'sendEmail',
    entry: './handler.ts',
    environment: {
       BAFATORIO_APP_REGION: process.env.BAFATORIO_APP_REGION || 'eu-west-1',
       BAFATORIO_APP_DEFAULT_FROM_EMAIL: process.env.BAFATORIO_APP_DEFAULT_FROM_EMAIL || 'noreply@bafatorio.com',
       BAFATORIO_APP_EMAIL_LOG_TABLE_NAME: process.env.BAFATORIO_APP_EMAIL_LOG_TABLE_NAME || 'EmailLog-xxxxxxxxxxxxxxxxxxxxxxxxxx-NONE',
       BAFATORIO_APP_EMAIL_TEMPLATE_BUCKET_NAME: process.env.BAFATORIO_APP_EMAIL_TEMPLATE_BUCKET_NAME || 'bafatorio-template-storage',
    },
    timeoutSeconds: 300,
    memoryMB: 512,
    resourceGroupName: 'data',
});
    
   
    
