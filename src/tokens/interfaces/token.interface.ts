import { Block } from '@ethersproject/abstract-provider';
import { BigNumber } from '@ethersproject/bignumber';

export abstract class TokenService {
  public abstract tokenName: string;
  public abstract getTokenInfo(blockInfo: Block): Promise<TokenInfo>;
}

export interface TokenInfo {
  decimals: number;
  totalSupply: BigNumber;
  circSupply: BigNumber;
}
