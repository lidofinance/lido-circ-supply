import { CronJob } from 'cron';
import { Gauge } from 'prom-client';
import { Inject, LoggerService, OnModuleInit } from '@nestjs/common';
import { Block } from '@ethersproject/abstract-provider';
import { BigNumber } from '@ethersproject/bignumber';
import { InjectMetric } from '@willsoto/nestjs-prometheus';
import { SimpleFallbackJsonRpcBatchProvider } from '@lido-nestjs/execution';
import { LOGGER_PROVIDER } from '@lido-nestjs/logger';
import { SchedulerRegistry } from '@nestjs/schedule';

import { METRIC_TOKEN_INFO } from 'common/prometheus';
import { ConfigService } from 'common/config';
import { OneAtTime } from 'common/decorators';
import { getDecimalPart, getIntegerPart } from 'utils';
import { TokenCircSupply, TokenInfo } from './token.entity';

import { LdoService } from './ldo';
import { StethService } from './steth';
import { WstethService } from './wsteth';

export class TokenService implements OnModuleInit {
  constructor(
    @Inject(LOGGER_PROVIDER) protected readonly logger: LoggerService,
    @InjectMetric(METRIC_TOKEN_INFO) protected readonly metric: Gauge<string>,

    protected readonly provider: SimpleFallbackJsonRpcBatchProvider,
    protected readonly configService: ConfigService,
    protected readonly schedulerRegistry: SchedulerRegistry,

    protected readonly ldoService: LdoService,
    protected readonly stethService: StethService,
    protected readonly wstethService: WstethService,
  ) {}

  protected tokensServices = [
    this.ldoService,
    this.stethService,
    this.wstethService,
  ];

  protected tokensData = new Map<string, TokenCircSupply>();
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
   * Runs tokens update cycle for `this.tokensServices`
   */
  @OneAtTime()
  protected async runTokensUpdateCycle(): Promise<void> {
    try {
      this.logger.log('Starting update cycle');

      const blockInfo = await this.provider.getBlock('latest');
      if (!this.isNewBlock(blockInfo)) return;

      await Promise.all(
        this.tokensServices.map(async (service) => {
          const tokenName = service.tokenName;
          const tokenInfo = await service.getTokenInfo(blockInfo);
          this.saveTokenData(tokenName, blockInfo, tokenInfo);
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
   * Gets token info from the cache
   */
  public getTokenData(tokenName: string): TokenCircSupply {
    return this.tokensData.get(tokenName);
  }

  /**
   * Gets token circ supply from the cache
   */
  public getTokenPlainCircSupply(tokenName: string): string {
    const tokenData = this.tokensData.get(tokenName);
    const circSupply = BigNumber.from(tokenData.circSupply);

    const { decimals } = tokenData;

    const digitalPart = getIntegerPart(circSupply, decimals).toString();
    const decimalPart = getDecimalPart(circSupply, decimals).toString();

    return `${digitalPart}.${decimalPart}`;
  }

  /**
   * Saves token data to to the cache
   */
  protected saveTokenData(
    tokenName: string,
    blockInfo: Block,
    tokenInfo: TokenInfo,
  ): void {
    const blockNumber = blockInfo.number;
    const blockHash = blockInfo.hash;
    const blockTimestamp = blockInfo.timestamp;

    const tokenData = {
      totalSupply: tokenInfo.totalSupply.toHexString(),
      circSupply: tokenInfo.circSupply.toHexString(),
      decimals: tokenInfo.decimals,
      blockNumber,
      blockHash,
      blockTimestamp,
    };

    this.tokensData.set(tokenName, tokenData);
    this.updateMetrics(tokenName, tokenData);

    this.logger.log('Token data updated', { tokenName, tokenInfo });
  }

  /**
   * Updates token metrics
   */
  protected updateMetrics(token: string, data: TokenCircSupply): void {
    const totalSupply = BigNumber.from(data.totalSupply);
    const circSupply = BigNumber.from(data.circSupply);

    this.metric.set(
      { token, field: 'total-supply' },
      getIntegerPart(totalSupply, data.decimals).toNumber(),
    );

    this.metric.set(
      { token, field: 'circ-supply' },
      getIntegerPart(circSupply, data.decimals).toNumber(),
    );

    this.metric.set({ token, field: 'update-timestamp' }, data.blockTimestamp);
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
