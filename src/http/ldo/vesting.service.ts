import { Inject, Injectable, LoggerService } from '@nestjs/common';
import {
  ARAGON_TOKEN_MANAGER_CONTRACT_TOKEN,
  AragonTokenManager,
} from '@lido-nestjs/contracts';
import { LOGGER_PROVIDER } from '@lido-nestjs/logger';
import { range } from '@lido-nestjs/utils';
import { Block } from '@ethersproject/abstract-provider';
import { BigNumber } from '@ethersproject/bignumber';
import { VestingInfo } from './interfaces';
import { InjectMetric } from '@willsoto/nestjs-prometheus';
import { Gauge } from 'prom-client';
import { METRIC_VESTING_DATA } from 'common/prometheus';

@Injectable()
export class LdoVestingService {
  constructor(
    @Inject(LOGGER_PROVIDER)
    protected readonly logger: LoggerService,

    @Inject(ARAGON_TOKEN_MANAGER_CONTRACT_TOKEN)
    protected readonly contract: AragonTokenManager,

    @InjectMetric(METRIC_VESTING_DATA)
    protected readonly metricVesting: Gauge<string>,
  ) {}

  protected members = new Set<string>();
  protected vestings = new Map<string, VestingInfo[]>();

  /** Returns cached vestings */
  public getCachedVestings() {
    return this.vestings;
  }

  /** Calculates the sum of non-vested tokens for a map of vestings at a specific time */
  public calculateTotalNonVestedTokens(
    vestings: Map<string, VestingInfo[]>,
    timestamp: number,
  ) {
    let total = BigNumber.from(0);

    vestings.forEach((memberVestings) => {
      memberVestings.forEach((vestingInfo) => {
        const nonVested = this.calculateNonVestedTokens(vestingInfo, timestamp);
        total = total.add(nonVested);
      });
    });

    return total;
  }

  /**
   * Calculates amount of non-vested tokens at a specific time
   * https://github.com/aragon/aragon-apps/blob/6f581bf8ec43697c481f3692127f2ed0a2fba9de/apps/token-manager/contracts/TokenManager.sol#L358
   */
  public calculateNonVestedTokens(vestingInfo: VestingInfo, timestamp: number) {
    const { amount, cliff, start, vesting } = vestingInfo;

    if (timestamp >= vesting) {
      return 0;
    }

    if (timestamp < cliff) {
      return amount;
    }

    const vestedTokens = amount.mul(timestamp - start).div(vesting - start);
    return amount.sub(vestedTokens);
  }

  /** Receives updates in the block range and updates the cached data based on them */
  public async updateCachedVestings(
    fromBlock: number,
    currentBlock: Block,
  ): Promise<void> {
    const toBlock = currentBlock.number;

    // First, we update the data for vesting members by collecting changes from events

    const updatedMembers = await this.getUpdatedMembers(fromBlock, toBlock);
    updatedMembers.forEach((updatedMember) => this.members.add(updatedMember));

    this.logger.log('Updated members fetched', {
      updatedMembersLength: updatedMembers.size,
      totalMembersLength: this.members.size,
      fromBlock,
      toBlock,
    });

    this.metricVesting.set(
      { token: 'ldo', field: 'members' },
      this.members.size,
    );

    // Then we get new data for all vestings of each updated member

    let updatedVestingsLength = 0;

    await Promise.all(
      [...updatedMembers].map(async (member) => {
        const vestings = await this.getMemberVestings(member, currentBlock);
        this.vestings.set(member, vestings);
        updatedVestingsLength += vestings.length;
      }),
    );

    const totalVestingsLength = [...this.vestings].reduce(
      (acc, [, vestings]) => acc + vestings.length,
      0,
    );

    this.logger.log('Vesting for updated members fetched', {
      updatedVestingsLength,
      totalVestingsLength,
      fromBlock,
      toBlock,
    });

    this.metricVesting.set(
      { token: 'ldo', field: 'vestings' },
      totalVestingsLength,
    );
  }

  /** Receives updates on vesting members based on events in the block range */
  protected async getUpdatedMembers(
    fromBlock: number,
    toBlock: number,
  ): Promise<Set<string>> {
    const newFilter = this.contract.filters.NewVesting();
    const revokeFilter = this.contract.filters.RevokeVesting();

    // TODO:
    // There will be an error when over 1000 events
    // Need to receive events in chunks
    const [newEvents, revokeEvents] = await Promise.all([
      this.contract.queryFilter(newFilter, fromBlock, toBlock),
      this.contract.queryFilter(revokeFilter, fromBlock, toBlock),
    ]);

    const updatedMembers = new Set<string>();

    newEvents.forEach((event) => updatedMembers.add(event.args.receiver));
    revokeEvents.forEach((event) => updatedMembers.add(event.args.receiver));

    return updatedMembers;
  }

  /** Get all vestings for a member */
  protected async getMemberVestings(
    member: string,
    currentBlock: Block,
  ): Promise<VestingInfo[]> {
    // We fetch data from the contract by block hash, to be sure, that all data from the same block
    const overrides = { blockTag: { blockHash: currentBlock.hash } } as any;

    const length = await this.contract.vestingsLengths(member, overrides);
    const vestingIds = range(0, length.toNumber());

    return await Promise.all(
      vestingIds.map(async (vestingId) => {
        const vestingInfo = await this.contract.getVesting(
          member,
          vestingId,
          overrides,
        );

        return {
          amount: vestingInfo.amount,
          start: vestingInfo.start.toNumber(),
          cliff: vestingInfo.cliff.toNumber(),
          vesting: vestingInfo.vesting.toNumber(),
          revokable: vestingInfo.revokable,
        };
      }),
    );
  }
}
