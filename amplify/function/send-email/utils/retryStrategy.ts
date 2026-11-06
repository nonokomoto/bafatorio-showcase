interface RetryConfig {
    maxAttempts: number;
    baseDelay: number;
    maxDelay: number;
    jitter: boolean;
}

export class RetryStrategy {
    private config: RetryConfig;

    constructor(config?: Partial<RetryConfig>) {
        this.config = {
            maxAttempts: 2,
            baseDelay: 1000,
            maxDelay: 10000,
            jitter: true,
            ...config
        };
    }

    private calculateDelay(attempt: number): number {
        // Exponential backoff
        let delay = Math.min(
            this.config.maxDelay,
            this.config.baseDelay * Math.pow(2, attempt - 1)
        );

        // Add jitter if enabled
        if (this.config.jitter) {
            delay = delay * (0.5 + Math.random());
        }

        return delay;
    }

    async execute<T>(operation: () => Promise<T>): Promise<T> {
        let lastError: Error | null = null;

        for (let attempt = 1; attempt <= this.config.maxAttempts; attempt++) {
            try {
                return await operation();
            } catch (error) {
                lastError = error as Error;
                
                if (attempt === this.config.maxAttempts) {
                    throw error;
                }

                const delay = this.calculateDelay(attempt);
                console.log(`Tentativa ${attempt} falhou. Aguardando ${delay}ms antes de tentar novamente.`);
                await new Promise(resolve => setTimeout(resolve, delay));
            }
        }

        throw lastError;
    }
}