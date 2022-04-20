import { Inject, Injectable } from '@nestjs/common';
import { LIDO_CONTRACT_TOKEN, Lido } from '@lido-nestjs/contracts';
import { Block } from '@ethersproject/abstract-provider';
import { TokenInfo } from '../token.entity';
import { TokenService } from '../interfaces';

@Injectable()
export class StethService implements TokenService {
  constructor(
    @Inject(LIDO_CONTRACT_TOKEN) protected readonly lidoContract: Lido,
  ) {}

  public tokenName = 'steth';

  /**
   * Returns the token info for the given block
   */
  public async getTokenInfo(blockInfo: Block): Promise<TokenInfo> {
    // Collecting data by blockHash ensures that all data is from the same block
    const overrides = { blockTag: { blockHash: blockInfo.hash } } as any;

    const [totalSupply, decimals] = await Promise.all([
      this.lidoContract.totalSupply(overrides),
      this.lidoContract.decimals(overrides),
    ]);

    const circSupply = totalSupply;

    return { totalSupply, circSupply, decimals };
  }
}
