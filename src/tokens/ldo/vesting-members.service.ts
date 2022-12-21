import { Inject, Injectable, LoggerService } from '@nestjs/common';
import {
  ARAGON_TOKEN_MANAGER_CONTRACT_TOKEN as CONTRACT_TOKEN,
  AragonTokenManager as TokenManager,
} from '@lido-nestjs/contracts';
import { LOGGER_PROVIDER } from '@lido-nestjs/logger';
import { Block } from '@ethersproject/abstract-provider';
import { PrometheusService } from 'common/prometheus';
import { OVERLAPPING_REORG_OFFSET } from './ldo.constants';

@Injectable()
export class LdoVestingMembersService {
  constructor(
    @Inject(LOGGER_PROVIDER) protected readonly logger: LoggerService,
    @Inject(CONTRACT_TOKEN) protected readonly tmContract: TokenManager,

    protected readonly prometheusService: PrometheusService,
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

    /**
     * Since we get updates only for new blocks while the server is running,
     * we also look at RevokeVesting events to make sure that vestings will be
     * updated in the case of a vesting revoke
     */
    const newFilter = this.tmContract.filters.NewVesting();
    const revokeFilter = this.tmContract.filters.RevokeVesting();

    this.logger.debug('Collecting vesting members started', {
      fromBlock,
      toBlock,
    });

    // TODO:
    // There will be an error when over 10000 events
    // Need to receive events in chunks
    const [newEvents, revokeEvents] = await Promise.all([
      this.tmContract.queryFilter(newFilter, fromBlock, toBlock),
      this.tmContract.queryFilter(revokeFilter, fromBlock, toBlock),
    ]);

    const updatedAddresses = new Set<string>();

    newEvents.forEach((event) => updatedAddresses.add(event.args.receiver));
    revokeEvents.forEach((event) => updatedAddresses.add(event.args.receiver));

    this.mergeAddresses(updatedAddresses);
    this.lastFetchedBlock = toBlock;
    const allAddresses = this.membersAddresses;

    this.logger.debug('Vesting members fetched', {
      updatedAddressesLength: updatedAddresses.size,
      allAddressesLength: allAddresses.size,
      fromBlock,
      toBlock,
    });

    this.prometheusService.tokenInfo.set({ token: 'ldo', field: 'vesting-members' }, allAddresses.size);

    return { updatedAddresses, allAddresses };
  }

  /**
   * Merges updated addresses with the saved list
   */
  protected mergeAddresses(updatedAddresses: Set<string>): void {
    updatedAddresses.forEach((address) => this.membersAddresses.add(address));
  }
}
