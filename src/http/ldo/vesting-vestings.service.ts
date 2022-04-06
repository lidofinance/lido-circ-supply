import { Gauge } from 'prom-client';
import { InjectMetric } from '@willsoto/nestjs-prometheus';
import { Inject, Injectable, LoggerService } from '@nestjs/common';
import {
  ARAGON_TOKEN_MANAGER_CONTRACT_TOKEN,
  AragonTokenManager,
} from '@lido-nestjs/contracts';
import { range } from '@lido-nestjs/utils';
import { LOGGER_PROVIDER } from '@lido-nestjs/logger';
import { Block } from '@ethersproject/abstract-provider';
import { METRIC_TOKEN_INFO } from 'common/prometheus';
import { VestingInfo } from './interfaces';

@Injectable()
export class LdoVestingVestingsService {
  constructor(
    @Inject(LOGGER_PROVIDER)
    protected readonly logger: LoggerService,

    @Inject(ARAGON_TOKEN_MANAGER_CONTRACT_TOKEN)
    protected readonly tmContract: AragonTokenManager,

    @InjectMetric(METRIC_TOKEN_INFO)
    protected readonly metric: Gauge<string>,
  ) {}

  protected membersVestings = new Map<string, VestingInfo[]>();

  /**
   * Updates vestings for list of members
   */
  public async collectMembersVestings(
    updatedMembers: Set<string>,
    blockInfo: Block,
  ) {
    this.logger.log('Collecting member vestings started', {
      membersLength: updatedMembers.size,
    });

    const updatedVestings = await this.fetchMembersVestings(
      updatedMembers,
      blockInfo,
    );

    this.mergeVestings(updatedVestings);
    const allVestings = this.membersVestings;

    const updatedVestingsLength = this.getVestingsLength(updatedVestings);
    const allVestingsLength = this.getVestingsLength(allVestings);

    this.logger.log('Vesting members fetched', {
      updatedVestingsLength,
      allVestingsLength,
    });

    this.metric.set({ token: 'ldo', field: 'vestings' }, allVestings.size);

    return { updatedVestings, allVestings };
  }

  /**
   * Returns all vestings for list of members
   */
  protected async fetchMembersVestings(members: Set<string>, blockInfo: Block) {
    const fetchedVestings = new Map<string, VestingInfo[]>();

    await Promise.all(
      [...members].map(async (member) => {
        const memberVestings = await this.fetchOneMemberVestings(
          member,
          blockInfo,
        );

        fetchedVestings.set(member, memberVestings);
      }),
    );

    return fetchedVestings;
  }

  /**
   * Returns all vestings for one member
   */
  protected async fetchOneMemberVestings(
    member: string,
    blockInfo: Block,
  ): Promise<VestingInfo[]> {
    // Collecting data by blockHash ensures that all data is from the same block
    const overrides = { blockTag: { blockHash: blockInfo.hash } } as any;

    const length = await this.tmContract.vestingsLengths(member, overrides);
    const vestingIds = range(0, length.toNumber());

    return await Promise.all(
      vestingIds.map(async (vestingId) => {
        const vestingInfo = await this.tmContract.getVesting(
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

  /**
   * Merges updated vestings with the saved list
   */
  protected mergeVestings(updatedVestings: Map<string, VestingInfo[]>) {
    updatedVestings.forEach((memberVestings, memberAddress) =>
      this.membersVestings.set(memberAddress, memberVestings),
    );
  }

  /**
   * Calculates the length of the all vestings
   */
  protected getVestingsLength(membersVestings: Map<string, VestingInfo[]>) {
    return [...membersVestings].reduce(
      (acc, [, vestings]) => acc + vestings.length,
      0,
    );
  }
}
