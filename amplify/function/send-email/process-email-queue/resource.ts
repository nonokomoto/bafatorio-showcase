import { defineFunction } from "@aws-amplify/backend";
import * as sqs from "aws-cdk-lib/aws-sqs";
import * as iam from "aws-cdk-lib/aws-iam";
import { Duration } from "aws-cdk-lib";
import { Construct } from "constructs";

export const createQueueResources = (scope: Construct) => {
  const deadLetterQueue = new sqs.Queue(scope, 'EmailDLQ', {
    // Remove queueName to let CloudFormation generate unique names
    retentionPeriod: Duration.days(14),
    encryption: sqs.QueueEncryption.KMS_MANAGED,
    enforceSSL: true
  });

  const queue = new sqs.Queue(scope, 'EmailQueue', {
    // Remove queueName to let CloudFormation generate unique names
    visibilityTimeout: Duration.seconds(300),
    retentionPeriod: Duration.days(1),
    encryption: sqs.QueueEncryption.KMS_MANAGED,
    enforceSSL: true,
    deadLetterQueue: {
      queue: deadLetterQueue,
      maxReceiveCount: 3
    }
  });

  // Criar URLs das filas
  const queueUrl = queue.queueUrl;
  const dlqUrl = deadLetterQueue.queueUrl;

  return { queue, deadLetterQueue, queueUrl, dlqUrl };
};

export const processEmailQueue = defineFunction({
    name: 'processEmailQueue',
    entry: 'handler.ts',
    environment: {
        BAFATORIO_APP_REGION: process.env.BAFATORIO_APP_REGION || 'eu-west-1',
        BAFATORIO_APP_DEFAULT_FROM_EMAIL: process.env.BAFATORIO_APP_DEFAULT_FROM_EMAIL || 'noreply@bafatorio.com',
        BAFATORIO_APP_EMAIL_LOG_TABLE_NAME: process.env.BAFATORIO_APP_EMAIL_LOG_TABLE_NAME || 'EmailLog-xxxxxxxxxxxxxxxxxxxxxxxxxx-NONE',
        BAFATORIO_APP_EMAIL_TEMPLATE_BUCKET_NAME: process.env.BAFATORIO_APP_EMAIL_TEMPLATE_BUCKET_NAME || 'bafatorio-template-storage',
     },
    timeoutSeconds: 300, // 5 minutes
    resourceGroupName: 'data',
});
