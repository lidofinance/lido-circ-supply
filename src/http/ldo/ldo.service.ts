import { Inject, Injectable, LoggerService } from '@nestjs/common';
import {
  ARAGON_TOKEN_MANAGER_CONTRACT_TOKEN,
  LIDO_CONTRACT_TOKEN,
  LDO_CONTRACT_TOKEN,
  AragonTokenManager,
  Lido,
  Ldo,
} from '@lido-nestjs/contracts';
import { Block } from '@ethersproject/abstract-provider';
import { CallOverrides } from '@ethersproject/contracts';
import { LOGGER_PROVIDER } from '@lido-nestjs/logger';
import { TokenCircSupplyDataV1, TokenService } from '../token';
import { LdoVestingService } from './vesting.service';
import { OVERLAPPING_REORG_OFFSET } from './ldo.constants';

@Injectable()
export class LdoService extends TokenService {
  constructor(
    @Inject(LOGGER_PROVIDER)
    protected readonly logger: LoggerService,

    @Inject(ARAGON_TOKEN_MANAGER_CONTRACT_TOKEN)
    protected readonly tokenManagerContract: AragonTokenManager,

    @Inject(LDO_CONTRACT_TOKEN)
    protected readonly ldoContract: Ldo,

    @Inject(LIDO_CONTRACT_TOKEN)
    protected readonly lidoContract: Lido,

    protected readonly vestingService: LdoVestingService,
  ) {
    super(logger, ldoContract.provider);
  }

  protected contractName = 'ldo';

  protected async getSupplyFromContract(
    blockInfo: Block,
  ): Promise<TokenCircSupplyDataV1> {
    const overrides = { blockTag: { blockHash: blockInfo.hash } } as any;

    const [totalSupply, treasuryAmount, lockedAmount] = await Promise.all([
      this.ldoContract.totalSupply(overrides),
      this.getTreasuryAmount(overrides),
      this.getLockedAmount(blockInfo),
    ]);

    const circSupply = totalSupply.sub(treasuryAmount).sub(lockedAmount);

    return {
      totalSupply: totalSupply.toHexString(),
      circSupply: circSupply.toHexString(),
    };
  }

  protected async getTreasuryAmount(overrides: CallOverrides) {
    const treasuryAddress = await this.lidoContract.getTreasury(overrides);
    const treasuryBalance = await this.ldoContract.balanceOf(
      treasuryAddress,
      overrides,
    );

    return treasuryBalance;
  }

  protected async getLockedAmount(blockInfo: Block) {
    const lastSavedBlock = this.supplyData?.blockNumber ?? null;
    const offset = OVERLAPPING_REORG_OFFSET;

    const fromBlock = lastSavedBlock ? lastSavedBlock - offset : 0;
    const toBlock = blockInfo;

    await this.vestingService.updateVestings(fromBlock, toBlock);
    const cachedVestings = this.vestingService.getCachedVestings();

    return this.vestingService.calculateTotalNonVestedTokens(
      cachedVestings,
      blockInfo.timestamp,
    );
  }
}
