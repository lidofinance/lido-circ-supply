import { Gauge } from 'prom-client';
import { InjectMetric } from '@willsoto/nestjs-prometheus';
import { Inject, Injectable, LoggerService } from '@nestjs/common';
import { LDO_CONTRACT_TOKEN, Ldo } from '@lido-nestjs/contracts';
import { LOGGER_PROVIDER } from '@lido-nestjs/logger';
import { Block } from '@ethersproject/abstract-provider';
import { AddressZero } from '@ethersproject/constants';
import { METRIC_TOKEN_INFO } from 'common/prometheus';
import { OVERLAPPING_REORG_OFFSET } from './ldo.constants';

@Injectable()
export class LdoBurnsService {
  constructor(
    @Inject(LOGGER_PROVIDER)
    protected readonly logger: LoggerService,

    @Inject(LDO_CONTRACT_TOKEN)
    protected readonly ldoContract: Ldo,

    @InjectMetric(METRIC_TOKEN_INFO)
    protected readonly metric: Gauge<string>,
  ) {}

  protected burnsAddresses = new Set<string>();
  protected lastFetchedBlock = null;

  /**
   * Collects addresses for which LDO tokens were burned
   */
  public async collectBurnsAddresses(blockInfo: Block) {
    // Updates data with some blocks overlap to avoid possible reorganizations
    const fromBlockOffset = OVERLAPPING_REORG_OFFSET;
    const lastFetchedBlock = this.lastFetchedBlock ?? null;

    const fromBlock = lastFetchedBlock ? lastFetchedBlock - fromBlockOffset : 0;
    const toBlock = blockInfo.number;

    const filter = this.ldoContract.filters.Transfer(null, AddressZero);

    this.logger.log('Collecting token burns started', {
      fromBlock,
      toBlock,
    });

    // TODO:
    // There will be an error when over 1000 events
    // Need to receive events in chunks
    const events = await this.ldoContract.queryFilter(
      filter,
      fromBlock,
      toBlock,
    );

    const updatedAddresses = new Set<string>();
    events.forEach((event) => updatedAddresses.add(event.args._from));

    this.mergeAddresses(updatedAddresses);
    const allAddresses = this.burnsAddresses;

    this.logger.log('Token burns fetched', {
      updatedAddressesLength: updatedAddresses.size,
      allAddressesLength: allAddresses.size,
      fromBlock,
      toBlock,
    });

    this.metric.set({ token: 'ldo', field: 'burns' }, allAddresses.size);

    return { updatedAddresses, allAddresses };
  }

  /**
   * Merges updated addresses with the saved list
   */
  protected mergeAddresses(updatedAddresses: Set<string>) {
    updatedAddresses.forEach((address) => this.burnsAddresses.add(address));
  }
}
