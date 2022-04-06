import { Inject, Injectable, LoggerService } from '@nestjs/common';
import { LOGGER_PROVIDER } from '@lido-nestjs/logger';
import { Block } from '@ethersproject/abstract-provider';
import { LdoBurnsService } from './ldo-burns.service';
import { LdoVestingVestingsService } from './vesting-vestings.service';
import { LdoVestingMembersService } from './vesting-members.service';
import { LdoBalanceService } from './ldo-balance.service';
import { LdoVestingCalcsService } from './vesting-calcs.service';

@Injectable()
export class LdoVestingService {
  constructor(
    @Inject(LOGGER_PROVIDER)
    protected readonly logger: LoggerService,

    protected readonly calcsService: LdoVestingCalcsService,
    protected readonly membersService: LdoVestingMembersService,
    protected readonly vestingsService: LdoVestingVestingsService,
    protected readonly burnsService: LdoBurnsService,
    protected readonly balanceService: LdoBalanceService,
  ) {}

  /**
   * Calculate all locked LDO tokens in vesting
   */
  public async collectLockedAmount(blockInfo: Block) {
    const [members, burns] = await Promise.all([
      this.membersService.collectMembersAddresses(blockInfo),
      this.burnsService.collectBurnsAddresses(blockInfo),
    ]);

    const [vestings, balances] = await Promise.all([
      this.vestingsService.collectMembersVestings(
        members.updatedAddresses,
        blockInfo,
      ),
      this.balanceService.fetchHoldersBalances(burns.allAddresses, blockInfo),
    ]);

    return this.calcsService.calculateLockedTokens(
      vestings.allVestings,
      burns.allAddresses,
      balances,
      blockInfo.timestamp,
    );
  }
}
