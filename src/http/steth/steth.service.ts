import { Inject, Injectable, LoggerService } from '@nestjs/common';
import { Cron, CronExpression } from '@nestjs/schedule';
import { LIDO_CONTRACT_TOKEN, Lido } from '@lido-nestjs/contracts';
import { Block } from '@ethersproject/abstract-provider';
import { LOGGER_PROVIDER } from '@lido-nestjs/logger';
import { InjectMetric } from '@willsoto/nestjs-prometheus';
import { Gauge } from 'prom-client';
import { METRIC_TOKEN_SUPPLY_DATA } from 'common/prometheus';
import { OneAtTime } from 'common/decorators';
import { TokenCircSupplyDataV1, TokenService } from '../token';

@Injectable()
export class StethService extends TokenService {
  constructor(
    @Inject(LOGGER_PROVIDER)
    protected readonly logger: LoggerService,

    @Inject(LIDO_CONTRACT_TOKEN)
    protected readonly contract: Lido,

    @InjectMetric(METRIC_TOKEN_SUPPLY_DATA)
    protected readonly metricToken: Gauge<string>,
  ) {
    super(logger, contract.provider, metricToken);
  }

  protected contractName = 'steth';

  protected async getSupplyFromContract(
    blockInfo: Block,
  ): Promise<TokenCircSupplyDataV1> {
    // We fetch data from the contract by block hash, to be sure, that all data from the same block
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
