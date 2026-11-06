import Papa from 'papaparse';

/**
 * Parse CSV text off the main thread when the runtime supports it. Falls
 * back to a synchronous parse on the same thread when the worker can't
 * spin up — Papa's worker is built from a Blob URL and is known to fail in
 * a few real-world conditions:
 *   - Bundler/path rewrites in production (PapaParse#114, #273)
 *   - Strict Content-Security-Policy headers without `worker-src blob:`
 *   - Function-valued options (transform, transformHeader, step, chunk,
 *     beforeFirstChunk) which are not structured-cloneable across the
 *     worker boundary — those force the sync path before even trying.
 *
 * Always resolves with Papa's raw result shape: { data, errors, meta }.
 * Never rejects: failures from the sync fallback collapse into an empty
 * `data` plus an entry in `errors`.
 *
 * The 8s timeout exists because Papa's `error:` callback is documented for
 * FileReader errors, not for worker init/script-load failures, so a silent
 * worker bootstrap failure would otherwise hang the Promise forever.
 *
 * @param {string} text - CSV text to parse.
 * @param {object} [options] - Papa.parse options. Function-valued options
 *   force the synchronous path; pass plain values where possible.
 * @returns {Promise<{data: any[], errors: object[], meta: object}>}
 */
// The helper OWNS these three Papa options — callers must not set them, and
// if they do we strip them so the sync/fallback paths can never accidentally
// re-trigger a worker or call a stale callback. `worker` is decided here
// based on WORKERS_SUPPORTED + function-valued options. `complete` and
// `error` drive the returned Promise.
const HELPER_OWNED_OPTS = ['worker', 'complete', 'error'];

// Function-valued options other than the ones we own. None of these can be
// cloned across the postMessage boundary into Papa's worker, so any of them
// forces the synchronous path before we even try.
const NON_TRANSFERABLE_FN_OPTS = [
  'transform',
  'transformHeader',
  'beforeFirstChunk',
  'step',
  'chunk',
];

const stripHelperOwnedOpts = (options) => {
  const cleaned = { ...options };
  for (const k of HELPER_OWNED_OPTS) delete cleaned[k];
  return cleaned;
};

export const parseCsv = (text, options = {}) => {
  // Caller-supplied options first, then defaults — but the three helper-owned
  // keys (worker/complete/error) are stripped so the caller can never sneak
  // a worker:true (or stale callbacks) into our sync path.
  const config = { skipEmptyLines: true, ...stripHelperOwnedOpts(options) };

  const hasFunctionOpt = NON_TRANSFERABLE_FN_OPTS.some(
    (k) => typeof config[k] === 'function',
  );

  // Worker not supported by the runtime OR caller passed a function option
  // that can't cross the postMessage boundary → take the sync path. Force
  // worker:false explicitly so even if Papa ever changes default behaviour
  // we cannot accidentally spin up a worker on this codepath.
  if (!Papa.WORKERS_SUPPORTED || hasFunctionOpt) {
    try {
      return Promise.resolve(Papa.parse(text, { ...config, worker: false }));
    } catch (e) {
      return Promise.resolve({ data: [], errors: [{ message: e.message }], meta: {} });
    }
  }

  return new Promise((resolve) => {
    let settled = false;
    const finish = (result) => {
      if (settled) return;
      settled = true;
      resolve(result);
    };

    const fallbackToSync = (reason) => {
      // Surface so future CSP rollouts or bundler regressions are observable.
      console.warn(`[parseCsv] Falling back to synchronous parse: ${reason}`);
      try {
        // Same explicit worker:false guard. If we got here it's because the
        // worker path failed; we must not retry it on the fallback.
        finish(Papa.parse(text, { ...config, worker: false }));
      } catch (e) {
        finish({ data: [], errors: [{ message: e.message }], meta: {} });
      }
    };

    const timeoutId = setTimeout(() => fallbackToSync('worker timed out'), 8000);

    Papa.parse(text, {
      ...config,
      worker: true,
      complete: (result) => {
        clearTimeout(timeoutId);
        finish(result);
      },
      error: (err) => {
        clearTimeout(timeoutId);
        fallbackToSync(err?.message || 'worker emitted error');
      },
    });
  });
};

export default parseCsv;
