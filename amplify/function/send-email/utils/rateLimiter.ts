import { CloudWatch } from '@aws-sdk/client-cloudwatch';

export class RateLimiter {
  private readonly maxRequestsPerSecond: number;
  private readonly timeWindowMs: number;
  private requests: number[];
  private cloudWatch: CloudWatch;

  constructor(maxRequestsPerSecond = 14) {
    this.maxRequestsPerSecond = maxRequestsPerSecond;
    this.timeWindowMs = 1000;
    this.requests = [];
    this.cloudWatch = new CloudWatch({ region: process.env.BAFATORIO_APP_REGION });
  }

  async acquire(): Promise<void> {
    const now = Date.now();
    this.requests = this.requests.filter(time => time > now - this.timeWindowMs);

    if (this.requests.length >= this.maxRequestsPerSecond) {
      const oldestRequest = this.requests[0];
      const waitTime = oldestRequest + this.timeWindowMs - now;
      await this.trackThrottling(waitTime);
      await new Promise(resolve => setTimeout(resolve, waitTime));
    }

    this.requests.push(now);
  }

  private async trackThrottling(waitTime: number): Promise<void> {
    try {
      await this.cloudWatch.putMetricData({
        Namespace: 'EmailService/RateLimiter',
        MetricData: [{
          MetricName: 'ThrottlingDelay',
          Value: waitTime,
          Unit: 'Milliseconds'
        }]
      });
    } catch (error) {
      console.error('Error tracking rate limiting metrics:', error);
    }
  }
}