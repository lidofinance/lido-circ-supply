import { Gauge } from 'prom-client';
import { InjectMetric } from '@willsoto/nestjs-prometheus';
import { Inject, Injectable, LoggerService } from '@nestjs/common';
import {
  ARAGON_TOKEN_MANAGER_CONTRACT_TOKEN,
  AragonTokenManager,
} from '@lido-nestjs/contracts';
import { LOGGER_PROVIDER } from '@lido-nestjs/logger';
import { Block } from '@ethersproject/abstract-provider';
import { METRIC_TOKEN_INFO } from 'common/prometheus';
import { OVERLAPPING_REORG_OFFSET } from './ldo.constants';

@Injectable()
export class LdoVestingMembersService {
  constructor(
    @Inject(LOGGER_PROVIDER)
    protected readonly logger: LoggerService,

    @Inject(ARAGON_TOKEN_MANAGER_CONTRACT_TOKEN)
    protected readonly tmContract: AragonTokenManager,

    @InjectMetric(METRIC_TOKEN_INFO)
    protected readonly metric: Gauge<string>,
  ) {}

  protected membersAddresses = new Set<string>();
  protected lastFetchedBlock = null;

  /**
   * Collects vesting members addresses
   */
  public async collectMembersAddresses(blockInfo: Block): Promise<{
    updatedAddresses: Set<string>;
    allAddresses: Set<string>;
  }> {
    // Updates data with some blocks overlap to avoid possible reorganizations
    const fromBlockOffset = OVERLAPPING_REORG_OFFSET;
    const lastFetchedBlock = this.lastFetchedBlock ?? null;

    const fromBlock = lastFetchedBlock ? lastFetchedBlock - fromBlockOffset : 0;
    const toBlock = blockInfo.number;

    const newFilter = this.tmContract.filters.NewVesting();
    const revokeFilter = this.tmContract.filters.RevokeVesting();

    this.logger.debug('Collecting vesting members started', {
      fromBlock,
      toBlock,
    });

    // TODO:
    // There will be an error when over 1000 events
    // Need to receive events in chunks
    const [newEvents, revokeEvents] = await Promise.all([
      this.tmContract.queryFilter(newFilter, fromBlock, toBlock),
      this.tmContract.queryFilter(revokeFilter, fromBlock, toBlock),
    ]);

    const updatedAddresses = new Set<string>();

    newEvents.forEach((event) => updatedAddresses.add(event.args.receiver));
    revokeEvents.forEach((event) => updatedAddresses.add(event.args.receiver));

    this.mergeAddresses(updatedAddresses);
    const allAddresses = this.membersAddresses;

    this.logger.debug('Vesting members fetched', {
      updatedAddressesLength: updatedAddresses.size,
      allAddressesLength: allAddresses.size,
      fromBlock,
      toBlock,
    });

    this.metric.set(
      { token: 'ldo', field: 'vesting-members' },
      allAddresses.size,
    );

    return { updatedAddresses, allAddresses };
  }

  /**
   * Merges updated addresses with the saved list
   */
  protected mergeAddresses(updatedAddresses: Set<string>): void {
    updatedAddresses.forEach((address) => this.membersAddresses.add(address));
  }
}
