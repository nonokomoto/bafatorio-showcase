 
import { parseCsv } from '../parseCsv';

// Papa.parse with worker:true bootstraps a Blob-URL Worker that jsdom does
// not support, so we mock the module surface and drive worker behaviour
// from the test. WORKERS_SUPPORTED is mutable per test to exercise both
// the worker-supported and fallback branches.
jest.mock('papaparse', () => {
  const parseImpl = jest.fn();
  return {
    __esModule: true,
    default: {
      WORKERS_SUPPORTED: true,
      parse: parseImpl,
    },
    WORKERS_SUPPORTED: true,
    parse: parseImpl,
  };
});

import Papa from 'papaparse';

const mockSyncResult = (rows) => ({
  data: rows,
  errors: [],
  meta: { delimiter: ',' },
});

beforeEach(() => {
  jest.clearAllMocks();
  Papa.WORKERS_SUPPORTED = true;
  jest.spyOn(console, 'warn').mockImplementation(() => {});
});

afterEach(() => {
  jest.useRealTimers();
});

describe('parseCsv', () => {
  describe('synchronous fallback paths', () => {
    test('uses sync parse when WORKERS_SUPPORTED is false', async () => {
      Papa.WORKERS_SUPPORTED = false;
      Papa.parse.mockReturnValue(mockSyncResult([['a', 'b']]));

      const result = await parseCsv('a,b');

      expect(Papa.parse).toHaveBeenCalledTimes(1);
      const [text, config] = Papa.parse.mock.calls[0];
      expect(text).toBe('a,b');
      // worker:false is explicit — not undefined — so a future Papa version
      // that defaults worker to true cannot accidentally spin one up here.
      expect(config.worker).toBe(false);
      expect(config.skipEmptyLines).toBe(true);
      expect(result.data).toEqual([['a', 'b']]);
    });

    test('forces sync path when caller supplies a function-valued option', async () => {
      Papa.parse.mockReturnValue(mockSyncResult([['x']]));
      const transform = jest.fn((v) => v);

      await parseCsv('x', { transform });

      // Function options aren't structured-cloneable; we must not even
      // attempt the worker path. worker is forced to false explicitly.
      expect(Papa.parse).toHaveBeenCalledTimes(1);
      expect(Papa.parse.mock.calls[0][1].worker).toBe(false);
    });

    test('returns errors array when sync parse throws', async () => {
      Papa.WORKERS_SUPPORTED = false;
      Papa.parse.mockImplementation(() => { throw new Error('boom'); });

      const result = await parseCsv('a,b');

      expect(result.data).toEqual([]);
      expect(result.errors).toEqual([{ message: 'boom' }]);
    });
  });

  describe('worker path', () => {
    test('resolves with worker complete callback result', async () => {
      const finalResult = mockSyncResult([['header'], ['row1']]);

      Papa.parse.mockImplementation((text, config) => {
        // Simulate the worker firing complete synchronously.
        config.complete(finalResult);
      });

      const result = await parseCsv('header\nrow1');
      expect(result).toBe(finalResult);
      expect(Papa.parse.mock.calls[0][1].worker).toBe(true);
    });

    test('falls back to sync when worker emits error', async () => {
      const syncResult = mockSyncResult([['fallback']]);
      Papa.parse
        .mockImplementationOnce((text, config) => {
          config.error(new Error('worker boot failed'));
        })
        .mockImplementationOnce(() => syncResult);

      const result = await parseCsv('x');

      expect(result).toBe(syncResult);
      // 1st call: worker:true. 2nd call: forced worker:false.
      expect(Papa.parse).toHaveBeenCalledTimes(2);
      expect(Papa.parse.mock.calls[0][1].worker).toBe(true);
      expect(Papa.parse.mock.calls[1][1].worker).toBe(false);
      expect(console.warn).toHaveBeenCalledWith(
        expect.stringContaining('Falling back to synchronous parse'),
      );
    });

    test('falls back to sync after timeout when worker never completes', async () => {
      jest.useFakeTimers();
      const syncResult = mockSyncResult([['rescued']]);

      Papa.parse
        .mockImplementationOnce(() => { /* never fires complete or error */ })
        .mockImplementationOnce(() => syncResult);

      const promise = parseCsv('a,b');
      // Advance past the 8s defensive timeout.
      jest.advanceTimersByTime(8001);
      const result = await promise;

      expect(result).toBe(syncResult);
      expect(console.warn).toHaveBeenCalledWith(
        expect.stringContaining('worker timed out'),
      );
    });

    test('strips caller-supplied worker:true so sync fallback cannot re-spawn worker', async () => {
      // Reviewer scenario: caller passes options that include the keys we own.
      // Helper must NOT propagate them to the sync path — otherwise the
      // fallback would attempt the very worker that just failed.
      Papa.WORKERS_SUPPORTED = false; // forces sync path
      const seenConfigs = [];
      Papa.parse.mockImplementation((text, config) => {
        seenConfigs.push(config);
        return mockSyncResult([['x']]);
      });

      const callerCallback = jest.fn();
      await parseCsv('a', {
        worker: true, // attacker / mistake
        complete: callerCallback,
        error: callerCallback,
      });

      expect(seenConfigs).toHaveLength(1);
      // Caller's worker/complete/error must have been stripped, and worker
      // must be explicitly set to false on the sync call.
      expect(seenConfigs[0].worker).toBe(false);
      expect(seenConfigs[0].complete).toBeUndefined();
      expect(seenConfigs[0].error).toBeUndefined();
      // Caller's callbacks must never fire — the helper's API is Promise-based.
      expect(callerCallback).not.toHaveBeenCalled();
    });

    test('worker error fallback also forces worker:false on retry', async () => {
      const seen = [];
      Papa.parse.mockImplementation((text, config) => {
        seen.push(config);
        if (seen.length === 1) {
          // First call (worker path) — emit error.
          config.error(new Error('worker boot failed'));
          return undefined;
        }
        // Second call (sync fallback) — must have worker:false.
        return mockSyncResult([['fallback']]);
      });

      const result = await parseCsv('x');
      expect(seen).toHaveLength(2);
      expect(seen[0].worker).toBe(true);  // worker attempt
      expect(seen[1].worker).toBe(false); // forced sync on retry
      expect(result.data).toEqual([['fallback']]);
    });

    test('ignores late complete after timeout-triggered fallback', async () => {
      jest.useFakeTimers();
      let storedComplete;
      const syncResult = mockSyncResult([['from-fallback']]);

      Papa.parse
        .mockImplementationOnce((text, config) => {
          storedComplete = config.complete;
        })
        .mockImplementationOnce(() => syncResult);

      const promise = parseCsv('a');
      jest.advanceTimersByTime(8001);

      // Worker finally responds — must NOT overwrite the already-resolved value.
      storedComplete(mockSyncResult([['too-late']]));
      const result = await promise;

      expect(result.data).toEqual([['from-fallback']]);
    });
  });
});
