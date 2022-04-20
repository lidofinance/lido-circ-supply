import { CronJob } from 'cron';
import { Inject, LoggerService, OnModuleInit } from '@nestjs/common';
import { SchedulerRegistry } from '@nestjs/schedule';
import { Block } from '@ethersproject/abstract-provider';
import { SimpleFallbackJsonRpcBatchProvider } from '@lido-nestjs/execution';
import { LOGGER_PROVIDER } from '@lido-nestjs/logger';
import { ConfigService } from 'common/config';
import { OneAtTime } from 'common/decorators';
import { TOKEN_SERVICES, TokenService, TokensService } from 'tokens';

export class WorkerService implements OnModuleInit {
  constructor(
    @Inject(LOGGER_PROVIDER) protected readonly logger: LoggerService,
    @Inject(TOKEN_SERVICES) protected readonly servicesList: TokenService[],

    protected readonly provider: SimpleFallbackJsonRpcBatchProvider,
    protected readonly configService: ConfigService,
    protected readonly schedulerRegistry: SchedulerRegistry,
    protected readonly tokensService: TokensService,
  ) {}

  protected lastBlock: Pick<Block, 'hash' | 'number'> | null;

  /**
   * Initializes the tokens update cycle
   */
  public async onModuleInit(): Promise<void> {
    await this.runTokensUpdateCycle();

    const jobName = 'tokens';
    const jobInterval = this.configService.get('TOKEN_UPDATE_CRON');
    const jobInstance = new CronJob(jobInterval, async () => {
      await this.runTokensUpdateCycle();
    });

    this.schedulerRegistry.addCronJob(jobName, jobInstance);
    jobInstance.start();

    this.logger.log('Job started', { jobName, jobInterval });
  }

  /**
   * Runs tokens update cycle for `this.servicesList`
   */
  @OneAtTime()
  protected async runTokensUpdateCycle(): Promise<void> {
    try {
      this.logger.log('Starting update cycle');

      const blockInfo = await this.provider.getBlock('latest');
      if (!this.isNewBlock(blockInfo)) return;

      await Promise.all(
        this.servicesList.map(async (service) => {
          const tokenName = service.tokenName;
          const tokenInfo = await service.getTokenInfo(blockInfo);
          this.tokensService.saveTokenData(tokenName, blockInfo, tokenInfo);
        }),
      );

      const { number, hash } = blockInfo;
      this.lastBlock = { number, hash };

      this.logger.log('End update cycle');
    } catch (error) {
      this.logger.error(error);
    }
  }

  /**
   * Checks if the block is newer than the cached one
   */
  protected isNewBlock(blockInfo: Block): boolean {
    if (!this.lastBlock) return true;

    const prevHash = this.lastBlock.hash;
    const prevNumber = this.lastBlock.number;

    const newHash = blockInfo.hash;
    const newNumber = blockInfo.number;

    const logInfo = { prevHash, prevNumber, newHash, newNumber };

    if (prevHash === newHash) {
      this.logger.warn('Fetched block is the same as a previous one', logInfo);
      return false;
    }

    if (newNumber < prevNumber) {
      this.logger.warn('Fetched block is older than the saved one', logInfo);
      return false;
    }

    return true;
  }
}
