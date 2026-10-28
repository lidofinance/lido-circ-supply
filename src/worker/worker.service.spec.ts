import { CronJob } from 'cron';
import { BigNumber } from '@ethersproject/bignumber';
import { WorkerService } from './worker.service';

const block = (number: number, hash = `0x${number}`) => ({ number, hash, timestamp: 1_700_000_000 + number }) as any;
const tokenInfo = { decimals: 18, totalSupply: BigNumber.from(10), circSupply: BigNumber.from(5) };

describe('WorkerService', () => {
  let service: WorkerService;
  let logger: Record<string, jest.Mock>;
  let provider: { getBlock: jest.Mock };
  let schedulerRegistry: { addCronJob: jest.Mock };
  let tokensService: { saveTokenData: jest.Mock };
  let ldo: { tokenName: string; getTokenInfo: jest.Mock };
  let steth: { tokenName: string; getTokenInfo: jest.Mock };

  const runCycle = () => (service as any).runTokensUpdateCycle() as Promise<void>;

  beforeEach(() => {
    logger = { log: jest.fn(), debug: jest.fn(), warn: jest.fn(), error: jest.fn() };
    provider = { getBlock: jest.fn().mockResolvedValue(block(100)) };
    schedulerRegistry = { addCronJob: jest.fn() };
    tokensService = { saveTokenData: jest.fn() };
    ldo = { tokenName: 'ldo', getTokenInfo: jest.fn().mockResolvedValue(tokenInfo) };
    steth = { tokenName: 'steth', getTokenInfo: jest.fn().mockResolvedValue(tokenInfo) };

    service = new WorkerService(
      logger as any,
      [ldo, steth] as any,
      provider as any,
      { get: () => '0 0 1 1 *' } as any,
      schedulerRegistry as any,
      tokensService as any,
    );
  });

  afterEach(() => {
    schedulerRegistry.addCronJob.mock.calls.forEach(([, job]: [string, CronJob]) => job.stop());
  });

  it('runs the first cycle without waiting and schedules the cron job on init', async () => {
    service.onModuleInit();

    expect(schedulerRegistry.addCronJob).toHaveBeenCalledWith('tokens', expect.any(CronJob));
    expect(schedulerRegistry.addCronJob.mock.calls[0][1].running).toBe(true);
    expect(provider.getBlock).toHaveBeenCalledWith('latest');

    await new Promise(setImmediate);
    expect(tokensService.saveTokenData).toHaveBeenCalledTimes(2);
  });

  it('saves the info of every token for the fetched block', async () => {
    await runCycle();

    expect(ldo.getTokenInfo).toHaveBeenCalledWith(block(100));
    expect(tokensService.saveTokenData).toHaveBeenCalledWith('ldo', block(100), tokenInfo);
    expect(tokensService.saveTokenData).toHaveBeenCalledWith('steth', block(100), tokenInfo);
  });

  it('skips the cycle when the block did not change', async () => {
    await runCycle();
    await runCycle();

    expect(tokensService.saveTokenData).toHaveBeenCalledTimes(2);
    expect(logger.warn).toHaveBeenCalledWith('Fetched block is the same as a previous one', expect.anything());
  });

  it('skips the cycle when the fetched block is older than the saved one', async () => {
    await runCycle();
    provider.getBlock.mockResolvedValue(block(99));
    await runCycle();

    expect(tokensService.saveTokenData).toHaveBeenCalledTimes(2);
    expect(logger.warn).toHaveBeenCalledWith('Fetched block is older than the saved one', expect.anything());
  });

  it('updates on a newer block and on a same-height block with another hash', async () => {
    await runCycle();
    provider.getBlock.mockResolvedValue(block(101));
    await runCycle();
    provider.getBlock.mockResolvedValue(block(101, '0xreorged'));
    await runCycle();

    expect(tokensService.saveTokenData).toHaveBeenCalledTimes(6);
  });

  it('logs a failed cycle instead of throwing and retries on the next run', async () => {
    provider.getBlock.mockRejectedValueOnce(new Error('rpc down'));
    await expect(runCycle()).resolves.toBeUndefined();

    expect(logger.error).toHaveBeenCalledWith(expect.objectContaining({ message: 'rpc down' }));
    expect(tokensService.saveTokenData).not.toHaveBeenCalled();

    await runCycle();
    expect(tokensService.saveTokenData).toHaveBeenCalledTimes(2);
  });

  it('does not remember the block when a token fetch fails', async () => {
    ldo.getTokenInfo.mockRejectedValueOnce(new Error('contract call failed'));
    await runCycle();
    expect(logger.error).toHaveBeenCalledWith(expect.objectContaining({ message: 'contract call failed' }));

    await runCycle();
    expect(tokensService.saveTokenData).toHaveBeenCalledWith('ldo', block(100), tokenInfo);
  });
});
