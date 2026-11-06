import { CloudWatch } from '@aws-sdk/client-cloudwatch';
import { EmailType } from '../templateManager';

/**
 * Class responsible for tracking email service metrics in CloudWatch
 */
export class EmailMetrics {
    private cloudWatch: CloudWatch;
    private namespace: string;

    constructor() {
        this.cloudWatch = new CloudWatch({ region: process.env.BAFATORIO_APP_REGION || 'eu-west-1' });
        this.namespace = 'EmailService';
    }

    /**
     * Tracks when an email is sent, including success/failure status
     * @param emailType - Type of email being sent
     * @param success - Whether the send was successful
     */
    async trackEmailSent(emailType: EmailType, success: boolean): Promise<void> {
        try {
            await this.cloudWatch.putMetricData({
                Namespace: this.namespace,
                MetricData: [
                    {
                        MetricName: 'EmailsSent',
                        Value: 1,
                        Unit: 'Count',
                        Dimensions: [
                            { Name: 'EmailType', Value: emailType },
                            { Name: 'Status', Value: success ? 'Success' : 'Failed' }
                        ]
                    }
                ]
            });
        } catch (error) {
            console.error('Erro ao registar métricas de envio:', error);
        }
    }

    /**
     * Tracks when an email is enqueued to SQS
     * @param emailType - Type of email being enqueued
     * @param success - Whether the enqueue was successful
     */
    async trackEmailEnqueued(emailType: EmailType, success: boolean): Promise<void> {
        try {
            await this.cloudWatch.putMetricData({
                Namespace: this.namespace,
                MetricData: [
                    {
                        MetricName: 'EmailsEnqueued',
                        Value: 1,
                        Unit: 'Count',
                        Dimensions: [
                            { Name: 'EmailType', Value: emailType },
                            { Name: 'Status', Value: success ? 'Success' : 'Failed' }
                        ]
                    }
                ]
            });
        } catch (error) {
            console.error('Erro ao registar métricas de enfileiramento:', error);
        }
    }

    /**
     * Tracks template initialization status
     * @param success - Whether initialization was successful
     */
    async trackTemplateInitialization(success: boolean): Promise<void> {
        try {
            await this.cloudWatch.putMetricData({
                Namespace: this.namespace,
                MetricData: [
                    {
                        MetricName: 'TemplateInitialization',
                        Value: 1,
                        Unit: 'Count',
                        Dimensions: [
                            { Name: 'Status', Value: success ? 'Success' : 'Failed' }
                        ]
                    }
                ]
            });
        } catch (error) {
            console.error('Erro ao registar métricas de inicialização:', error);
        }
    }

    /**
     * Tracks queue processing metrics
     * @param processedCount - Number of messages processed
     * @param failedCount - Number of failed messages
     */
    async trackQueueProcessing(processedCount: number, failedCount: number): Promise<void> {
        try {
            await this.cloudWatch.putMetricData({
                Namespace: this.namespace,
                MetricData: [
                    {
                        MetricName: 'QueueProcessing',
                        Value: processedCount,
                        Unit: 'Count',
                        Dimensions: [
                            { Name: 'Status', Value: 'Processed' }
                        ]
                    },
                    {
                        MetricName: 'QueueProcessing',
                        Value: failedCount,
                        Unit: 'Count',
                        Dimensions: [
                            { Name: 'Status', Value: 'Failed' }
                        ]
                    }
                ]
            });
        } catch (error) {
            console.error('Erro ao registar métricas de processamento da fila:', error);
        }
    }
}