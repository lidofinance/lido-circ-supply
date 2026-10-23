import { LOGS_FETCH_CHUNK_SIZE, LOGS_FETCH_CONCURRENCY } from './provider.constants';

const permitWaiters: (() => void)[] = [];
let inFlightQueriesCount = 0;

const acquirePermit = async (): Promise<void> => {
  if (inFlightQueriesCount < LOGS_FETCH_CONCURRENCY) {
    inFlightQueriesCount += 1;
    return;
  }

  await new Promise<void>((resolve) => permitWaiters.push(resolve));
};

const releasePermit = (): void => {
  const nextWaiter = permitWaiters.shift();

  // the permit is handed over to the waiter, so the counter stays unchanged
  if (nextWaiter) {
    nextWaiter();
    return;
  }

  inFlightQueriesCount -= 1;
};

/**
 * Fetches events for the block range in chunks, so the initial scan from
 * genesis fits into the providers' eth_getLogs block range limits
 */
export const queryFilterInChunks = async <TEvent>(
  fromBlock: number,
  toBlock: number,
  queryFn: (chunkFromBlock: number, chunkToBlock: number) => Promise<TEvent[]>,
): Promise<TEvent[]> => {
  const chunks: { chunkFromBlock: number; chunkToBlock: number }[] = [];

  for (let blockNumber = fromBlock; blockNumber <= toBlock; blockNumber += LOGS_FETCH_CHUNK_SIZE) {
    chunks.push({
      chunkFromBlock: blockNumber,
      chunkToBlock: Math.min(blockNumber + LOGS_FETCH_CHUNK_SIZE - 1, toBlock),
    });
  }

  const eventsByChunk: TEvent[][] = new Array(chunks.length);
  let nextChunkIndex = 0;
  let isFailed = false;

  const worker = async (): Promise<void> => {
    while (!isFailed && nextChunkIndex < chunks.length) {
      const chunkIndex = nextChunkIndex;
      nextChunkIndex += 1;

      const { chunkFromBlock, chunkToBlock } = chunks[chunkIndex];

      await acquirePermit();

      try {
        if (isFailed) {
          return;
        }

        eventsByChunk[chunkIndex] = await queryFn(chunkFromBlock, chunkToBlock);
      } catch (error) {
        isFailed = true;
        throw error;
      } finally {
        releasePermit();
      }
    }
  };

  const workersCount = Math.min(LOGS_FETCH_CONCURRENCY, chunks.length);
  await Promise.all(Array.from({ length: workersCount }, worker));

  return eventsByChunk.reduce((allEvents, chunkEvents) => allEvents.concat(chunkEvents), []);
};
