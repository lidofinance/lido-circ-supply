import { Inject, Injectable, LoggerService } from '@nestjs/common';
import { LIDO_CONTRACT_TOKEN, Lido } from '@lido-nestjs/contracts';
import { Block } from '@ethersproject/abstract-provider';
import { LOGGER_PROVIDER } from '@lido-nestjs/logger';
import { TokenCircSupplyDataV1, TokenService } from '../token';

@Injectable()
export class StethService extends TokenService {
  constructor(
    @Inject(LOGGER_PROVIDER)
    protected readonly logger: LoggerService,

    @Inject(LIDO_CONTRACT_TOKEN)
    protected readonly contract: Lido,
  ) {
    super(logger, contract.provider);
  }

  protected contractName = 'steth';

  protected async getSupplyFromContract(
    blockInfo: Block,
  ): Promise<TokenCircSupplyDataV1> {
    const overrides = { blockTag: { blockHash: blockInfo.hash } } as any;
    const totalSupply = await this.contract.totalSupply(overrides);

    return {
      totalSupply: totalSupply.toHexString(),
      circSupply: totalSupply.toHexString(),
    };
  }
}
