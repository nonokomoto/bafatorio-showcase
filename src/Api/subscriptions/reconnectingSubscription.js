const DEFAULT_INITIAL_DELAY_MS = 1000;
const DEFAULT_MAX_DELAY_MS = 30000;

/**
 * Wraps an AppSync GraphQL subscription with exponential-backoff reconnect.
 *
 * AppSync WebSockets drop silently after inactivity or network blips. Default
 * Amplify .subscribe() only calls the `error` handler — it never retries — so
 * real-time updates stop until the user reloads the page.
 *
 * createObservable is called each time we need a fresh observable (so the
 * auth token is re-read on every reconnect).
 *
 * Returns a handle with the same shape as a native subscription: { unsubscribe }.
 */
export const createReconnectingSubscription = ({
    createObservable,
    next,
    onError,
    label = 'subscription',
    initialDelayMs = DEFAULT_INITIAL_DELAY_MS,
    maxDelayMs = DEFAULT_MAX_DELAY_MS,
}) => {
    let currentSub = null;
    let retryTimer = null;
    let cancelled = false;
    let attempt = 0;

    const clearRetry = () => {
        if (retryTimer) {
            clearTimeout(retryTimer);
            retryTimer = null;
        }
    };

    const scheduleReconnect = (error) => {
        if (cancelled) return;
        const delay = Math.min(maxDelayMs, initialDelayMs * 2 ** attempt);
        attempt += 1;
        console.warn(
            `[${label}] subscription error — reconnecting in ${delay}ms (attempt ${attempt})`,
            error,
        );
        retryTimer = setTimeout(connect, delay);
    };

    const connect = () => {
        if (cancelled) return;
        clearRetry();
        try {
            currentSub = createObservable().subscribe({
                next: (result) => {
                    // Any successful message resets backoff.
                    attempt = 0;
                    try {
                        next(result);
                    } catch (handlerError) {
                        console.error(`[${label}] next handler threw:`, handlerError);
                    }
                },
                error: (error) => {
                    onError?.(error);
                    scheduleReconnect(error);
                },
            });
        } catch (error) {
            onError?.(error);
            scheduleReconnect(error);
        }
    };

    connect();

    return {
        unsubscribe: () => {
            cancelled = true;
            clearRetry();
            try {
                currentSub?.unsubscribe();
            } catch (error) {
                console.error(`[${label}] unsubscribe threw:`, error);
            }
        },
    };
};
