import { LoggerService, OnModuleInit } from '@nestjs/common';
import { Gauge } from 'prom-client';
import { Block } from '@ethersproject/abstract-provider';
import { Provider } from '@ethersproject/providers';
import { BigNumber } from '@ethersproject/bignumber';
import { TokenCircSupplyV1, TokenCircSupplyDataV1 } from './token.entity';

export abstract class TokenService implements OnModuleInit {
  constructor(
    protected readonly logger: LoggerService,
    protected readonly provider: Provider,
    protected readonly metricToken: Gauge<string>,
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
        totalSupply: supply.totalSupply.toHexString(),
        circSupply: supply.circSupply.toHexString(),
        blockNumber,
        blockHash,
        blockTimestamp,
      };

      this.logger.log('Supply data updated', {
        contract: this.contractName,
        newData: this.supplyData,
      });

      this.updateMetrics();
    } catch (error) {
      this.logger.error(error);
    }
  }

  /** Checks if the block is newer than the cached one */
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

  /** Updates token metrics */
  protected updateMetrics() {
    this.metricToken.set(
      { token: this.contractName, field: 'circ-supply' },
      BigNumber.from(this.supplyData.circSupply).div(1e9).div(1e9).toNumber(),
    );

    this.metricToken.set(
      { token: this.contractName, field: 'total-supply' },
      BigNumber.from(this.supplyData.totalSupply).div(1e9).div(1e9).toNumber(),
    );

    this.metricToken.set(
      { token: this.contractName, field: 'timestamp' },
      this.supplyData.blockTimestamp,
    );
  }
}
