import { Inject, Injectable, LoggerService } from '@nestjs/common';
import { Cron, CronExpression } from '@nestjs/schedule';
import {
  LIDO_CONTRACT_TOKEN,
  LDO_CONTRACT_TOKEN,
  Lido,
  Ldo,
} from '@lido-nestjs/contracts';
import { Block } from '@ethersproject/abstract-provider';
import { LOGGER_PROVIDER } from '@lido-nestjs/logger';
import { InjectMetric } from '@willsoto/nestjs-prometheus';
import { Gauge } from 'prom-client';
import { OneAtTime } from 'common/decorators';
import { METRIC_TOKEN_INFO } from 'common/prometheus';
import { LdoVestingService } from './vesting.service';
import { LdoTreasuryService } from './treasury.service';
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

    @InjectMetric(METRIC_TOKEN_INFO)
    protected readonly metric: Gauge<string>,

    protected readonly vestingService: LdoVestingService,
    protected readonly treasuryService: LdoTreasuryService,
  ) {
    super(logger, ldoContract.provider, metric);
  }

  protected contractName = 'ldo';

  protected async getSupplyFromContract(
    blockInfo: Block,
  ): Promise<TokenCircSupplyDataV1> {
    // Collecting data by blockHash ensures that all data is from the same block
    const overrides = { blockTag: { blockHash: blockInfo.hash } } as any;

    const [totalSupply, treasuryAmount, lockedAmount] = await Promise.all([
      this.ldoContract.totalSupply(overrides),
      this.treasuryService.getTreasuryBalance(blockInfo),
      this.vestingService.collectLockedAmount(blockInfo),
    ]);

    const circSupply = totalSupply.sub(treasuryAmount).sub(lockedAmount);

    return { totalSupply, circSupply };
  }

  @Cron(CronExpression.EVERY_MINUTE)
  @OneAtTime()
  protected async updateSupplyData(): Promise<void> {
    super.updateSupplyData();
  }
}
