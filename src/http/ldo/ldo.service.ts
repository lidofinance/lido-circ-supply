import { Inject, Injectable, LoggerService } from '@nestjs/common';
import { Cron, CronExpression } from '@nestjs/schedule';
import {
  LIDO_CONTRACT_TOKEN,
  LDO_CONTRACT_TOKEN,
  Lido,
  Ldo,
} from '@lido-nestjs/contracts';
import { Block } from '@ethersproject/abstract-provider';
import { CallOverrides } from '@ethersproject/contracts';
import { BigNumber } from '@ethersproject/bignumber';
import { LOGGER_PROVIDER } from '@lido-nestjs/logger';
import { InjectMetric } from '@willsoto/nestjs-prometheus';
import { Gauge } from 'prom-client';
import { METRIC_TOKEN_SUPPLY_DATA } from 'common/prometheus';
import { OneAtTime } from 'common/decorators';
import { LdoVestingService } from './vesting.service';
import { OVERLAPPING_REORG_OFFSET } from './ldo.constants';
import { TokenCircSupplyDataV1, TokenService } from '../token';

@Injectable()
export class LdoService extends TokenService {
  constructor(
    @Inject(LOGGER_PROVIDER)
    protected readonly logger: LoggerService,

    @Inject(LDO_CONTRACT_TOKEN)
    protected readonly ldoContract: Ldo,

    @Inject(LIDO_CONTRACT_TOKEN)
    protected readonly lidoContract: Lido,

    @InjectMetric(METRIC_TOKEN_SUPPLY_DATA)
    protected readonly metricToken: Gauge<string>,

    protected readonly vestingService: LdoVestingService,
  ) {
    super(logger, ldoContract.provider, metricToken);
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

    return { totalSupply, circSupply };
  }

  /** Returns the amount of tokens in the Lido treasury */
  protected async getTreasuryAmount(
    overrides: CallOverrides,
  ): Promise<BigNumber> {
    const treasuryAddress = await this.lidoContract.getTreasury(overrides);
    const treasuryBalance = await this.ldoContract.balanceOf(
      treasuryAddress,
      overrides,
    );

    return treasuryBalance;
  }

  /** Updates the vesting information and returns an amount of locked tokens in the vesting for the current block */
  protected async getLockedAmount(blockInfo: Block) {
    // We update the information with some overlap in order to avoid possible reorganizations in the network
    const fromBlockOffset = OVERLAPPING_REORG_OFFSET;
    const lastSavedBlock = this.supplyData?.blockNumber ?? null;

    const fromBlock = lastSavedBlock ? lastSavedBlock - fromBlockOffset : 0;
    const toBlock = blockInfo;

    await this.vestingService.updateCachedVestings(fromBlock, toBlock);
    const cachedVestings = this.vestingService.getCachedVestings();

    return this.vestingService.calculateTotalNonVestedTokens(
      cachedVestings,
      blockInfo.timestamp,
    );
  }

  @Cron(CronExpression.EVERY_MINUTE)
  @OneAtTime()
  protected async updateSupplyData(): Promise<void> {
    super.updateSupplyData();
  }
}
