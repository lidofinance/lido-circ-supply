import { Inject, Injectable, LoggerService } from '@nestjs/common';
import { WSTETH_CONTRACT_TOKEN, Wsteth } from '@lido-nestjs/contracts';
import { Block } from '@ethersproject/abstract-provider';
import { LOGGER_PROVIDER } from '@lido-nestjs/logger';
import { InjectMetric } from '@willsoto/nestjs-prometheus';
import { METRIC_TOKEN_SUPPLY_DATA } from 'common/prometheus';
import { Gauge } from 'prom-client';
import { TokenCircSupplyDataV1, TokenService } from '../token';

@Injectable()
export class WstethService extends TokenService {
  constructor(
    @Inject(LOGGER_PROVIDER)
    protected readonly logger: LoggerService,

    @Inject(WSTETH_CONTRACT_TOKEN)
    protected readonly contract: Wsteth,

    @InjectMetric(METRIC_TOKEN_SUPPLY_DATA)
    protected readonly metricToken: Gauge<string>,
  ) {
    super(logger, contract.provider, metricToken);
  }

  protected contractName = 'wsteth';

  protected async getSupplyFromContract(
    blockInfo: Block,
  ): Promise<TokenCircSupplyDataV1> {
    // We fetch data from the contract by block hash, to be sure, that all data from the same block
    const overrides = { blockTag: { blockHash: blockInfo.hash } } as any;
    const totalSupply = await this.contract.totalSupply(overrides);

    return { totalSupply, circSupply: totalSupply };
  }
}
