import { Inject, Injectable, LoggerService } from '@nestjs/common';
import {
  ARAGON_TOKEN_MANAGER_CONTRACT_TOKEN as CONTRACT_TOKEN,
  AragonTokenManager as TokenManager,
} from '@lido-nestjs/contracts';
import { range } from '@lido-nestjs/utils';
import { LOGGER_PROVIDER } from '@lido-nestjs/logger';
import { Block } from '@ethersproject/abstract-provider';
import { PrometheusService } from 'common/prometheus';
import { VestingInfo } from './interfaces';

@Injectable()
export class LdoVestingVestingsService {
  constructor(
    @Inject(LOGGER_PROVIDER) protected readonly logger: LoggerService,
    @Inject(CONTRACT_TOKEN) protected readonly tmContract: TokenManager,

    protected readonly prometheusService: PrometheusService,
  ) {}

  protected membersVestings = new Map<string, VestingInfo[]>();

  /**
   * Updates vestings for list of members
   */
  public async collectMembersVestings(
    updatedMembers: Set<string>,
    blockInfo: Block,
  ): Promise<{
    updatedVestings: Map<string, VestingInfo[]>;
    allVestings: Map<string, VestingInfo[]>;
  }> {
    this.logger.debug('Collecting member vestings started', {
      membersLength: updatedMembers.size,
    });

    const updatedVestings = await this.fetchMembersVestings(updatedMembers, blockInfo);

    this.mergeVestings(updatedVestings);
    const allVestings = this.membersVestings;

    const updatedVestingsLength = this.getVestingsLength(updatedVestings);
    const allVestingsLength = this.getVestingsLength(allVestings);

    this.logger.debug('Vesting members fetched', {
      updatedVestingsLength,
      allVestingsLength,
    });

    this.prometheusService.tokenInfo.set({ token: 'ldo', field: 'vestings' }, allVestings.size);

    return { updatedVestings, allVestings };
  }

  /**
   * Returns all vestings for list of members
   */
  protected async fetchMembersVestings(members: Set<string>, blockInfo: Block): Promise<Map<string, VestingInfo[]>> {
    const fetchedVestings = new Map<string, VestingInfo[]>();

    await Promise.all(
      [...members].map(async (member) => {
        const memberVestings = await this.fetchOneMemberVestings(member, blockInfo);

        fetchedVestings.set(member, memberVestings);
      }),
    );

    return fetchedVestings;
  }

  /**
   * Fetches all vestings for one member
   */
  protected async fetchOneMemberVestings(member: string, blockInfo: Block): Promise<VestingInfo[]> {
    // Collecting data by blockHash ensures that all data is from the same block
    const overrides = { blockTag: { blockHash: blockInfo.hash } } as any;

    const length = await this.tmContract.vestingsLengths(member, overrides);
    const vestingIds = range(0, length.toNumber());

    return await Promise.all(
      vestingIds.map(async (vestingId) => {
        const vestingInfo = await this.tmContract.getVesting(member, vestingId, overrides);

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
  protected mergeVestings(updatedVestings: Map<string, VestingInfo[]>): void {
    updatedVestings.forEach((memberVestings, memberAddress) => this.membersVestings.set(memberAddress, memberVestings));
  }

  /**
   * Calculates the length of the all vestings
   */
  protected getVestingsLength(membersVestings: Map<string, VestingInfo[]>): number {
    return [...membersVestings].reduce((acc, [, vestings]) => acc + vestings.length, 0);
  }
}
