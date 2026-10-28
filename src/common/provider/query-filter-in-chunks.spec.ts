import { queryFilterInChunks } from './query-filter-in-chunks';
import { LOGS_FETCH_CHUNK_SIZE, LOGS_FETCH_CONCURRENCY } from './provider.constants';

type Deferred = { from: number; to: number; resolve: (events: string[]) => void; reject: (error: Error) => void };

// A query function whose calls stay pending until the test settles them
const pendingQueries = () => {
  const calls: Deferred[] = [];
  const queryFn = (from: number, to: number) =>
    new Promise<string[]>((resolve, reject) => calls.push({ from, to, resolve, reject }));

  return { calls, queryFn };
};

const flush = () => new Promise((resolve) => setImmediate(resolve));

describe('queryFilterInChunks', () => {
  it('splits the range into chunks of LOGS_FETCH_CHUNK_SIZE blocks, inclusive on both ends', async () => {
    const queryFn = jest.fn(async (from: number, to: number) => [`${from}-${to}`]);

    const size = LOGS_FETCH_CHUNK_SIZE;
    const events = await queryFilterInChunks(0, 2 * size + 1, queryFn);

    expect(queryFn.mock.calls).toEqual([
      [0, size - 1],
      [size, 2 * size - 1],
      [2 * size, 2 * size + 1],
    ]);
    expect(events).toEqual([`0-${size - 1}`, `${size}-${2 * size - 1}`, `${2 * size}-${2 * size + 1}`]);
  });

  it('queries a single chunk for a range within the chunk size', async () => {
    const queryFn = jest.fn(async () => ['a', 'b']);

    await expect(queryFilterInChunks(100, 100, queryFn)).resolves.toEqual(['a', 'b']);
    expect(queryFn.mock.calls).toEqual([[100, 100]]);
  });

  it('returns no events for an empty range', async () => {
    const queryFn = jest.fn(async () => ['unexpected']);

    await expect(queryFilterInChunks(10, 9, queryFn)).resolves.toEqual([]);
    expect(queryFn).not.toHaveBeenCalled();
  });

  it('keeps events in block order even when later chunks resolve first', async () => {
    const { calls, queryFn } = pendingQueries();
    const result = queryFilterInChunks(0, 3 * LOGS_FETCH_CHUNK_SIZE - 1, queryFn);
    await flush();

    expect(calls).toHaveLength(3);
    calls[2].resolve(['third']);
    calls[0].resolve(['first']);
    calls[1].resolve(['second']);

    await expect(result).resolves.toEqual(['first', 'second', 'third']);
  });

  it('never runs more than LOGS_FETCH_CONCURRENCY queries at once across calls', async () => {
    const { calls, queryFn } = pendingQueries();
    const chunksPerCall = LOGS_FETCH_CONCURRENCY;
    const toBlock = chunksPerCall * LOGS_FETCH_CHUNK_SIZE - 1;

    const first = queryFilterInChunks(0, toBlock, queryFn);
    const second = queryFilterInChunks(0, toBlock, queryFn);
    await flush();

    expect(calls).toHaveLength(LOGS_FETCH_CONCURRENCY);

    calls[0].resolve(['x']);
    await flush();
    expect(calls).toHaveLength(LOGS_FETCH_CONCURRENCY + 1);

    calls.forEach((call) => call.resolve(['x']));
    await flush();
    calls.forEach((call) => call.resolve(['x']));

    await expect(first).resolves.toHaveLength(chunksPerCall);
    await expect(second).resolves.toHaveLength(chunksPerCall);
    expect(calls).toHaveLength(2 * chunksPerCall);
  });

  it('rejects on the first failed chunk and does not start the remaining ones', async () => {
    const { calls, queryFn } = pendingQueries();
    const toBlock = (LOGS_FETCH_CONCURRENCY + 3) * LOGS_FETCH_CHUNK_SIZE - 1;

    const result = queryFilterInChunks(0, toBlock, queryFn);
    await flush();

    calls[1].reject(new Error('rpc down'));
    calls.filter((_, index) => index !== 1).forEach((call) => call.resolve([]));

    await expect(result).rejects.toThrow('rpc down');
    expect(calls).toHaveLength(LOGS_FETCH_CONCURRENCY);
  });

  it('releases its permits after a failure', async () => {
    const queryFn = jest.fn(async (from: number) => [`${from}`]);

    await expect(queryFilterInChunks(0, 0, async () => Promise.reject(new Error('boom')))).rejects.toThrow('boom');
    await expect(queryFilterInChunks(0, 0, queryFn)).resolves.toEqual(['0']);
  });
});
