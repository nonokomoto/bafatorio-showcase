interface BatchConfig {
    maxBatchSize: number;
    concurrentBatches: number;
    delayBetweenBatches: number;
}

export class BatchProcessor {
    private config: BatchConfig;

    constructor(config?: Partial<BatchConfig>) {
        this.config = {
            maxBatchSize: 50,
            concurrentBatches: 3,
            delayBetweenBatches: 1000,
            ...config
        };
    }

    private chunk<T>(array: T[], size: number): T[][] {
        return array.reduce((chunks, item, index) => {
            const chunkIndex = Math.floor(index / size);
            if (!chunks[chunkIndex]) {
                chunks[chunkIndex] = [];
            }
            chunks[chunkIndex].push(item);
            return chunks;
        }, [] as T[][]);
    }

    async processBatch<T, R>(
        items: T[],
        processor: (item: T) => Promise<R>
    ): Promise<R[]> {
        const batches = this.chunk(items, this.config.maxBatchSize);
        const results: R[] = [];

        for (let i = 0; i < batches.length; i += this.config.concurrentBatches) {
            const currentBatches = batches.slice(i, i + this.config.concurrentBatches);
            
            const batchResults = await Promise.all(
                currentBatches.map(batch =>
                    Promise.all(batch.map(processor))
                )
            );

            results.push(...batchResults.flat());

            if (i + this.config.concurrentBatches < batches.length) {
                await new Promise(resolve => 
                    setTimeout(resolve, this.config.delayBetweenBatches)
                );
            }
        }

        return results;
    }
}