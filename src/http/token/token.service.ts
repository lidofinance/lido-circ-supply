import {
  Inject,
  Injectable,
  LoggerService,
  OnModuleInit,
} from '@nestjs/common';
import { Cron, CronExpression } from '@nestjs/schedule';
import { Block } from '@ethersproject/abstract-provider';
import { Provider } from '@ethersproject/providers';
import { LOGGER_PROVIDER } from '@lido-nestjs/logger';
import { OneAtTime } from 'common/decorators';
import { TokenCircSupplyV1, TokenCircSupplyDataV1 } from './token.entity';

@Injectable()
export abstract class TokenService implements OnModuleInit {
  constructor(
    @Inject(LOGGER_PROVIDER)
    protected readonly logger: LoggerService,

    protected readonly provider: Provider,
  ) {}

  public async onModuleInit() {
    await this.updateSupplyData();
  }

  public async getLastSupplyData(): Promise<TokenCircSupplyV1> {
    return this.supplyData;
  }

  protected contractName: string;
  protected supplyData: TokenCircSupplyV1;

  protected abstract getSupplyFromContract(
    blockInfo: Block,
  ): Promise<TokenCircSupplyDataV1>;

  @Cron(CronExpression.EVERY_MINUTE)
  @OneAtTime()
  protected async updateSupplyData(): Promise<void> {
    this.logger.log('Supply data updating', {
      contract: this.contractName,
      currentData: this.supplyData,
    });

    try {
      const blockInfo = await this.provider.getBlock('latest');
      const blockNumber = blockInfo.number;
      const blockHash = blockInfo.hash;
      const blockTimestamp = blockInfo.timestamp;

      const isNewBlock = this.isNewBlock(blockInfo);
      if (!isNewBlock) return;

      const supply = await this.getSupplyFromContract(blockInfo);

      this.supplyData = {
        ...supply,
        blockNumber,
        blockHash,
        blockTimestamp,
      };

      // TODO: add metric

      this.logger.log('Supply data updated', {
        contract: this.contractName,
        newData: this.supplyData,
      });
    } catch (error) {
      this.logger.error(error);
    }
  }

  protected isNewBlock(blockInfo: Block) {
    const isSameBlock = blockInfo.hash === this.supplyData?.blockHash;
    if (isSameBlock) {
      return false;
    }

    const isOlderData = blockInfo.number < this.supplyData?.blockNumber;
    if (isOlderData) {
      this.logger.warn('The fetched block is older than the saved one', {
        blockNumber: blockInfo.number,
        prevData: this.supplyData,
      });

      return false;
    }

    return true;
  }
}
