/**
 * @file performanceMetrics.ts
 * @description Utility functions for measuring and publishing Lambda performance metrics to CloudWatch.
 *
 * Tracks ScanCommand performance to detect DynamoDB degradation and slow queries.
 * Uses the CloudWatch namespace "BafatorioApp" for centralized monitoring.
 *
 * Example:
 *   const duration = await measureScanPerformance('UpdateEventRoleScanDuration', async () => {
 *     return await client.send(new ScanCommand(...));
 *   });
 *   console.log(`Scan completed in ${duration}ms`);
 */

import { CloudWatchClient, PutMetricDataCommand } from '@aws-sdk/client-cloudwatch';

const client = new CloudWatchClient({
  region: process.env.BAFATORIO_APP_REGION || 'eu-west-1',
});

const NAMESPACE = 'BafatorioApp';
const PERFORMANCE_THRESHOLD_MS = 500; // Warning threshold for slow scans

/**
 * Measures the execution time of an async operation and publishes the result to CloudWatch.
 *
 * @param metricName - CloudWatch metric name (e.g., "UpdateEventRoleScanDuration")
 * @param operation - Async function to measure
 * @returns Duration in milliseconds
 * @throws Error if the operation throws
 *
 * @example
 *   const duration = await measureScanPerformance('UpdateEventRoleScanDuration', async () => {
 *     return await client.send(new ScanCommand({ ... }));
 *   });
 */
export async function measureScanPerformance<T>(
  metricName: string,
  operation: () => Promise<T>
): Promise<{ duration: number; result: T }> {
  const startTime = Date.now();

  try {
    const result = await operation();
    const duration = Date.now() - startTime;

    // Publish metric to CloudWatch
    await publishMetric(metricName, duration);

    // Log warning if duration exceeds threshold
    if (duration > PERFORMANCE_THRESHOLD_MS) {
      console.warn(
        `[PERF WARNING] ${metricName}: ${duration}ms (threshold: ${PERFORMANCE_THRESHOLD_MS}ms)`
      );
    } else {
      console.log(`[PERF OK] ${metricName}: ${duration}ms`);
    }

    return { duration, result };
  } catch (error) {
    const duration = Date.now() - startTime;
    // Publish error metric
    await publishMetric(`${metricName}_Error`, duration);
    console.error(
      `[PERF ERROR] ${metricName} failed after ${duration}ms:`,
      error instanceof Error ? error.message : String(error)
    );
    throw error;
  }
}

/**
 * Publishes a metric to CloudWatch.
 *
 * @param metricName - Name of the metric
 * @param value - Metric value (duration in milliseconds)
 */
async function publishMetric(metricName: string, value: number): Promise<void> {
  try {
    await client.send(
      new PutMetricDataCommand({
        Namespace: NAMESPACE,
        MetricData: [
          {
            MetricName: metricName,
            Value: value,
            Unit: 'Milliseconds',
            Timestamp: new Date(),
          },
        ],
      })
    );
  } catch (error) {
    // Log but don't throw — metrics publication should not break the handler
    console.error(
      `Failed to publish metric ${metricName}:`,
      error instanceof Error ? error.message : String(error)
    );
  }
}

/**
 * Publishes a count metric to CloudWatch (e.g., item count from a scan).
 *
 * @param metricName - Name of the metric
 * @param value - Count value
 */
export async function publishCountMetric(metricName: string, value: number): Promise<void> {
  try {
    await client.send(
      new PutMetricDataCommand({
        Namespace: NAMESPACE,
        MetricData: [
          {
            MetricName: metricName,
            Value: value,
            Unit: 'Count',
            Timestamp: new Date(),
          },
        ],
      })
    );
  } catch (error) {
    console.error(
      `Failed to publish count metric ${metricName}:`,
      error instanceof Error ? error.message : String(error)
    );
  }
}
