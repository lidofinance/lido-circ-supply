import { Block } from '@ethersproject/abstract-provider';
import { TokenInfo } from '../token.entity';

export abstract class TokenService {
  public abstract tokenName: string;
  public abstract getTokenInfo(blockInfo: Block): Promise<TokenInfo>;
}
