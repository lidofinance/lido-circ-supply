import { Inject, Injectable, LoggerService } from '@nestjs/common';
import { LOGGER_PROVIDER } from '@lido-nestjs/logger';
import {
  LIDO_CONTRACT_TOKEN,
  LDO_CONTRACT_TOKEN,
  Lido,
  Ldo,
} from '@lido-nestjs/contracts';
import { Block } from '@ethersproject/abstract-provider';
import { BigNumber } from '@ethersproject/bignumber';

@Injectable()
export class LdoTreasuryService {
  constructor(
    @Inject(LOGGER_PROVIDER)
    protected readonly logger: LoggerService,

    @Inject(LDO_CONTRACT_TOKEN)
    protected readonly ldoContract: Ldo,

    @Inject(LIDO_CONTRACT_TOKEN)
    protected readonly lidoContract: Lido,
  ) {}

  /**
   * Returns the amount of LDO tokens in the Lido treasury
   */
  public async getTreasuryBalance(blockInfo: Block): Promise<BigNumber> {
    // Collecting data by blockHash ensures that all data is from the same block
    const overrides = { blockTag: { blockHash: blockInfo.hash } } as any;

    const treasuryAddress = await this.lidoContract.getTreasury(overrides);
    const treasuryBalance = await this.ldoContract.balanceOf(
      treasuryAddress,
      overrides,
    );

    return treasuryBalance;
  }
}
