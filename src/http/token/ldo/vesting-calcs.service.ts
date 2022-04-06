import { Inject, Injectable, LoggerService } from '@nestjs/common';
import { LOGGER_PROVIDER } from '@lido-nestjs/logger';
import { BigNumber } from '@ethersproject/bignumber';

import { VestingInfo } from './interfaces';

@Injectable()
export class LdoVestingCalcsService {
  constructor(
    @Inject(LOGGER_PROVIDER)
    protected readonly logger: LoggerService,
  ) {}

  /**
   * Calculates the amount of locked tokens for a list of vestings at a specific time
   */
  public calculateLockedTokens(
    vestings: Map<string, VestingInfo[]>,
    burns: Set<string>,
    balances: Map<string, BigNumber>,
    timestamp: number,
  ): BigNumber {
    let totalLocked = BigNumber.from(0);

    vestings.forEach((memberVestings, memberAddress) => {
      const memberNotVested = this.calculateMultiplyVestings(
        memberVestings,
        timestamp,
      );

      /**
       * Member's tokens can be burned without a vesting update,
       * so we need to subtract the burned tokens to get the locked tokens
       */

      let memberLockedTokens = memberNotVested;

      if (burns.has(memberAddress)) {
        const memberBalance = balances.get(memberAddress);

        memberLockedTokens = this.subtractBurnedTokens(
          memberNotVested,
          memberBalance,
        );
      }

      totalLocked = totalLocked.add(memberLockedTokens);
    });

    return totalLocked;
  }

  /**
   * Subtracts burned tokens from the total amount of locked tokens
   */
  protected subtractBurnedTokens(
    nonVested: BigNumber,
    balance: BigNumber,
  ): BigNumber {
    if (balance == null) throw new Error(`Balance can't be null`);
    return balance.lt(nonVested) ? balance : nonVested;
  }

  /**
   * Calculates amount of non-vested tokens for a list of vestings at a specific time
   */
  protected calculateMultiplyVestings(
    vestings: VestingInfo[],
    timestamp: number,
  ): BigNumber {
    let total = BigNumber.from(0);

    vestings.forEach((vestingInfo) => {
      const nonVested = this.calculateOneVesting(vestingInfo, timestamp);
      total = total.add(nonVested);
    });

    return total;
  }

  /**
   * Calculates amount of non-vested tokens at a specific time
   * https://github.com/aragon/aragon-apps/blob/6f581bf8ec43697c481f3692127f2ed0a2fba9de/apps/token-manager/contracts/TokenManager.sol#L358
   */
  protected calculateOneVesting(
    vestingInfo: VestingInfo,
    timestamp: number,
  ): BigNumber {
    const { amount, cliff, start, vesting } = vestingInfo;

    if (timestamp >= vesting) {
      return BigNumber.from(0);
    }

    if (timestamp < cliff) {
      return amount;
    }

    const vestedTokens = amount.mul(timestamp - start).div(vesting - start);
    return amount.sub(vestedTokens);
  }
}
