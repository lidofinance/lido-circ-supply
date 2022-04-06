import { Inject, Injectable, LoggerService } from '@nestjs/common';
import { Cron, CronExpression } from '@nestjs/schedule';
import { LIDO_CONTRACT_TOKEN, Lido } from '@lido-nestjs/contracts';
import { Block } from '@ethersproject/abstract-provider';
import { LOGGER_PROVIDER } from '@lido-nestjs/logger';
import { InjectMetric } from '@willsoto/nestjs-prometheus';
import { Gauge } from 'prom-client';
import { METRIC_TOKEN_INFO } from 'common/prometheus';
import { OneAtTime } from 'common/decorators';
import { TokenCircSupplyDataV1, TokenService } from '../token';

@Injectable()
export class StethService extends TokenService {
  constructor(
    @Inject(LOGGER_PROVIDER)
    protected readonly logger: LoggerService,

    @Inject(LIDO_CONTRACT_TOKEN)
    protected readonly contract: Lido,

    @InjectMetric(METRIC_TOKEN_INFO)
    protected readonly metric: Gauge<string>,
  ) {
    super(logger, contract.provider, metric);
  }

  protected contractName = 'steth';

  protected async getSupplyFromContract(
    blockInfo: Block,
  ): Promise<TokenCircSupplyDataV1> {
    // Collecting data by blockHash ensures that all data is from the same block
    const overrides = { blockTag: { blockHash: blockInfo.hash } } as any;
    const totalSupply = await this.contract.totalSupply(overrides);

    return { totalSupply, circSupply: totalSupply };
  }

  @Cron(CronExpression.EVERY_MINUTE)
  @OneAtTime()
  protected async updateSupplyData(): Promise<void> {
    super.updateSupplyData();
  }
}
