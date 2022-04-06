import { Inject, Injectable } from '@nestjs/common';
import { WSTETH_CONTRACT_TOKEN, Wsteth } from '@lido-nestjs/contracts';
import { Block } from '@ethersproject/abstract-provider';
import { TokenInfo } from '../token.entity';
import { TokenService } from '../interfaces';

@Injectable()
export class WstethService implements TokenService {
  constructor(
    @Inject(WSTETH_CONTRACT_TOKEN)
    protected readonly wstethContract: Wsteth,
  ) {}

  public tokenName = 'wsteth';

  /**
   * Returns the token info for the given block
   */
  public async getTokenInfo(blockInfo: Block): Promise<TokenInfo> {
    // Collecting data by blockHash ensures that all data is from the same block
    const overrides = { blockTag: { blockHash: blockInfo.hash } } as any;

    const [totalSupply, decimals] = await Promise.all([
      this.wstethContract.totalSupply(overrides),
      this.wstethContract.decimals(overrides),
    ]);

    const circSupply = totalSupply;

    return { totalSupply, circSupply, decimals };
  }
}
