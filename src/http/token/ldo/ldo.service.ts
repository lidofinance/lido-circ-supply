import { Inject, Injectable } from '@nestjs/common';
import { LDO_CONTRACT_TOKEN, Ldo } from '@lido-nestjs/contracts';
import { Block } from '@ethersproject/abstract-provider';
import { LdoVestingService } from './vesting.service';
import { LdoTreasuryService } from './treasury.service';
import { TokenInfo } from '../token.entity';
import { TokenService } from '../interfaces';

@Injectable()
export class LdoService implements TokenService {
  constructor(
    @Inject(LDO_CONTRACT_TOKEN) protected readonly ldoContract: Ldo,

    protected readonly vestingService: LdoVestingService,
    protected readonly treasuryService: LdoTreasuryService,
  ) {}

  public tokenName = 'ldo';

  /**
   * Returns the token info for the given block
   */
  public async getTokenInfo(blockInfo: Block): Promise<TokenInfo> {
    // Collecting data by blockHash ensures that all data is from the same block
    const overrides = { blockTag: { blockHash: blockInfo.hash } } as any;

    const [totalSupply, decimals, treasuryAmount, lockedAmount] =
      await Promise.all([
        this.ldoContract.totalSupply(overrides),
        this.ldoContract.decimals(overrides),
        this.treasuryService.getTreasuryBalance(blockInfo),
        this.vestingService.collectLockedAmount(blockInfo),
      ]);

    const circSupply = totalSupply.sub(treasuryAmount).sub(lockedAmount);

    return { totalSupply, circSupply, decimals };
  }
}
