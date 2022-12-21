import { Inject, LoggerService } from '@nestjs/common';
import { Block } from '@ethersproject/abstract-provider';
import { formatUnits } from '@ethersproject/units';
import { BigNumber } from '@ethersproject/bignumber';
import { LOGGER_PROVIDER } from '@lido-nestjs/logger';
import { PrometheusService } from 'common/prometheus';
import { StorageService, TokenData } from 'storage';
import { TokenInfo } from './interfaces';

export class TokensService {
  constructor(
    @Inject(LOGGER_PROVIDER) protected readonly logger: LoggerService,

    protected readonly prometheusService: PrometheusService,
    protected readonly storageService: StorageService,
  ) {}

  /**
   * Gets token circ supply from the storage
   */
  public getTokenPlainCircSupply(tokenName: string): string {
    const tokenData = this.storageService.get(tokenName);
    const circSupply = BigNumber.from(tokenData.circSupply);

    return formatUnits(circSupply, tokenData.decimals);
  }

  /**
   * Gets token total supply from the storage
   */
  public getTokenPlainTotalSupply(tokenName: string): string {
    const tokenData = this.storageService.get(tokenName);
    const totalSupply = BigNumber.from(tokenData.totalSupply);

    return formatUnits(totalSupply, tokenData.decimals);
  }

  /**
   * Gets token info from the storage
   */
  public getTokenData(tokenName: string): TokenData {
    return this.storageService.get(tokenName);
  }

  /**
   * Saves token data to the storage
   */
  public saveTokenData(
    tokenName: string,
    blockInfo: Block,
    tokenInfo: TokenInfo,
  ): void {
    const blockNumber = blockInfo.number;
    const blockHash = blockInfo.hash;
    const blockTimestamp = blockInfo.timestamp;

    const tokenData = {
      totalSupply: tokenInfo.totalSupply.toHexString(),
      circSupply: tokenInfo.circSupply.toHexString(),
      decimals: tokenInfo.decimals,
      blockNumber,
      blockHash,
      blockTimestamp,
    };

    this.storageService.set(tokenName, tokenData);
    this.updateMetrics(tokenName, tokenData);

    this.logger.debug('Token data updated', { tokenName, tokenData });
  }

  /**
   * Updates token metrics
   */
  protected updateMetrics(token: string, data: TokenData): void {
    const totalSupply = BigNumber.from(data.totalSupply);
    const circSupply = BigNumber.from(data.circSupply);

    this.prometheusService.tokenInfo.set(
      { token, field: 'total-supply' },
      Number(formatUnits(totalSupply, data.decimals)),
    );

    this.prometheusService.tokenInfo.set(
      { token, field: 'circ-supply' },
      Number(formatUnits(circSupply, data.decimals)),
    );

    this.prometheusService.tokenInfo.set(
      { token, field: 'update-timestamp' },
      data.blockTimestamp,
    );
  }
}
