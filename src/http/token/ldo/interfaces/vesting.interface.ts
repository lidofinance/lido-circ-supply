import { BigNumber } from '@ethersproject/bignumber';

export interface VestingInfo {
  amount: BigNumber;
  start: number;
  cliff: number;
  vesting: number;
  revokable: boolean;
}

export type Block = string | number;
