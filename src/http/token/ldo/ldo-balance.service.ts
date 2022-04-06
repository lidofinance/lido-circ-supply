import { Gauge } from 'prom-client';
import { InjectMetric } from '@willsoto/nestjs-prometheus';
import { Inject, Injectable, LoggerService } from '@nestjs/common';
import { LDO_CONTRACT_TOKEN, Ldo } from '@lido-nestjs/contracts';
import { LOGGER_PROVIDER } from '@lido-nestjs/logger';
import { Block } from '@ethersproject/abstract-provider';
import { BigNumber } from '@ethersproject/bignumber';
import { METRIC_TOKEN_INFO } from 'common/prometheus';

@Injectable()
export class LdoBalanceService {
  constructor(
    @Inject(LOGGER_PROVIDER)
    protected readonly logger: LoggerService,

    @Inject(LDO_CONTRACT_TOKEN)
    protected readonly ldoContract: Ldo,

    @InjectMetric(METRIC_TOKEN_INFO)
    protected readonly metric: Gauge<string>,
  ) {}

  /**
   * Fetches balances for list of holder
   */
  public async fetchHoldersBalances(
    holdersAddresses: Set<string>,
    blockInfo: Block,
  ): Promise<Map<string, BigNumber>> {
    const fetchedBalances = new Map<string, BigNumber>();
    const holdersLength = holdersAddresses.size;

    this.logger.log('Fetches balances started', { holdersLength });

    await Promise.all(
      [...holdersAddresses].map(async (member) => {
        const holderBalance = await this.fetchHolderBalance(member, blockInfo);
        fetchedBalances.set(member, holderBalance);
      }),
    );

    this.logger.log('Holders balances fetched', { holdersLength });

    return fetchedBalances;
  }

  /**
   * Fetches a holder balance
   */
  public async fetchHolderBalance(
    holderAddress: string,
    blockInfo: Block,
  ): Promise<BigNumber> {
    // Collecting data by blockHash ensures that all data is from the same block
    const overrides = { blockTag: { blockHash: blockInfo.hash } } as any;

    return await this.ldoContract.balanceOf(holderAddress, overrides);
  }
}
