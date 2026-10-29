import { Inject, Injectable, LoggerService } from '@nestjs/common';
import {
  ARAGON_TOKEN_MANAGER_CONTRACT_TOKEN as CONTRACT_TOKEN,
  AragonTokenManager as TokenManager,
} from '@lido-nestjs/contracts';
import { LOGGER_PROVIDER } from '@lido-nestjs/logger';
import { Block } from '@ethersproject/abstract-provider';
import { ConfigService } from 'common/config';
import { PrometheusService } from 'common/prometheus';
import { OVERLAPPING_REORG_OFFSET } from './ldo.constants';
import { fetchVestingMembers } from './ldo-events';
import { getLdoScanStart } from './ldo-snapshot';

@Injectable()
export class LdoVestingMembersService {
  constructor(
    @Inject(LOGGER_PROVIDER) protected readonly logger: LoggerService,
    @Inject(CONTRACT_TOKEN) protected readonly tmContract: TokenManager,

    protected readonly prometheusService: PrometheusService,
    protected readonly configService: ConfigService,
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

    const scanStart = getLdoScanStart(this.configService.get('CHAIN_ID'));
    if (lastFetchedBlock === null) {
      this.mergeAddresses(new Set(scanStart.snapshot?.vestingMembers));
    }

    const fromBlock = lastFetchedBlock ? lastFetchedBlock - fromBlockOffset : scanStart.fromBlock;
    const toBlock = blockInfo.number;

    this.logger.debug('Collecting vesting members started', {
      fromBlock,
      toBlock,
    });

    const updatedAddresses = await fetchVestingMembers(this.tmContract, fromBlock, toBlock);

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
