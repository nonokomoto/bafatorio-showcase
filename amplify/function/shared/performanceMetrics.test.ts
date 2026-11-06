/**
 * @file performanceMetrics.test.ts
 * @description Unit tests for performanceMetrics utility functions.
 */

jest.mock('@aws-sdk/client-cloudwatch', () => {
  const mockSend = jest.fn();
  return {
    CloudWatchClient: jest.fn(() => ({ send: mockSend })),
    PutMetricDataCommand: jest.fn((input) => ({ input })),
    _mockSend: mockSend,
  };
});

const { _mockSend: mockSend } = jest.requireMock('@aws-sdk/client-cloudwatch') as {
  _mockSend: jest.Mock;
};

describe('performanceMetrics', () => {
  let consoleLogSpy: jest.SpyInstance;
  let consoleWarnSpy: jest.SpyInstance;
  let consoleErrorSpy: jest.SpyInstance;

  beforeAll(() => {
    process.env.BAFATORIO_APP_REGION = 'eu-west-1';
  });

  beforeEach(() => {
    jest.clearAllMocks();
    mockSend.mockResolvedValue({});
    consoleLogSpy = jest.spyOn(console, 'log').mockImplementation();
    consoleWarnSpy = jest.spyOn(console, 'warn').mockImplementation();
    consoleErrorSpy = jest.spyOn(console, 'error').mockImplementation();
  });

  afterEach(() => {
    consoleLogSpy.mockRestore();
    consoleWarnSpy.mockRestore();
    consoleErrorSpy.mockRestore();
  });

  describe('measureScanPerformance', () => {
    it('returns duration and result from successful operation', async () => {
      // eslint-disable-next-line @typescript-eslint/no-require-imports
      const { measureScanPerformance } = require('./performanceMetrics');

      const testResult = { Items: [], Count: 0 };
      const operation = jest.fn().mockResolvedValue(testResult);

      const { duration, result } = await measureScanPerformance('TestMetric', operation);

      expect(duration).toBeGreaterThanOrEqual(0);
      expect(result).toEqual(testResult);
      expect(operation).toHaveBeenCalled();
    });

    it('publishes metric to CloudWatch for successful operation', async () => {
      // eslint-disable-next-line @typescript-eslint/no-require-imports
      const { measureScanPerformance } = require('./performanceMetrics');

      const operation = jest.fn().mockResolvedValue({ Items: [] });
      await measureScanPerformance('TestScanDuration', operation);

      expect(mockSend).toHaveBeenCalled();
    });

    it('logs info message for duration under threshold', async () => {
      // eslint-disable-next-line @typescript-eslint/no-require-imports
      const { measureScanPerformance } = require('./performanceMetrics');

      const operation = jest.fn().mockResolvedValue({ Items: [] });
      await measureScanPerformance('FastMetric', operation);

      expect(consoleLogSpy).toHaveBeenCalledWith(
        expect.stringContaining('[PERF OK]')
      );
    });

    it('logs warning for duration exceeding threshold', async () => {
      // eslint-disable-next-line @typescript-eslint/no-require-imports
      const { measureScanPerformance } = require('./performanceMetrics');

      const operation = jest.fn().mockImplementation(
        () => new Promise(resolve => {
          setTimeout(() => resolve({ Items: [] }), 600); // Exceed 500ms threshold
        })
      );

      await measureScanPerformance('SlowMetric', operation);

      expect(consoleWarnSpy).toHaveBeenCalledWith(
        expect.stringContaining('[PERF WARNING]')
      );
    });

    it('publishes error metric and re-throws on operation failure', async () => {
      // eslint-disable-next-line @typescript-eslint/no-require-imports
      const { measureScanPerformance } = require('./performanceMetrics');

      const testError = new Error('Operation failed');
      const operation = jest.fn().mockRejectedValue(testError);

      await expect(
        measureScanPerformance('FailingMetric', operation)
      ).rejects.toThrow('Operation failed');

      expect(mockSend).toHaveBeenCalled();
    });

    it('logs error message on operation failure', async () => {
      // eslint-disable-next-line @typescript-eslint/no-require-imports
      const { measureScanPerformance } = require('./performanceMetrics');

      const testError = new Error('Scan timeout');
      const operation = jest.fn().mockRejectedValue(testError);

      await expect(
        measureScanPerformance('TimeoutMetric', operation)
      ).rejects.toThrow();

      expect(consoleErrorSpy).toHaveBeenCalledWith(
        expect.stringContaining('[PERF ERROR]'),
        expect.any(String)
      );
    });
  });

  describe('publishCountMetric', () => {
    it('publishes count metric to CloudWatch', async () => {
      // eslint-disable-next-line @typescript-eslint/no-require-imports
      const { publishCountMetric } = require('./performanceMetrics');

      await publishCountMetric('ParticipantCount', 42);

      expect(mockSend).toHaveBeenCalled();
    });

    it('logs error if CloudWatch publication fails but does not throw', async () => {
      // eslint-disable-next-line @typescript-eslint/no-require-imports
      const { publishCountMetric } = require('./performanceMetrics');

      mockSend.mockRejectedValueOnce(new Error('CloudWatch unavailable'));

      // Should not throw
      await expect(publishCountMetric('FailingCount', 10)).resolves.toBeUndefined();

      expect(consoleErrorSpy).toHaveBeenCalledWith(
        expect.stringContaining('Failed to publish count metric'),
        expect.any(String)
      );
    });
  });
});
