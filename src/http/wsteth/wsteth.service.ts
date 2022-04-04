import { Inject, Injectable, LoggerService } from '@nestjs/common';
import { WSTETH_CONTRACT_TOKEN, Wsteth } from '@lido-nestjs/contracts';
import { Block } from '@ethersproject/abstract-provider';
import { LOGGER_PROVIDER } from '@lido-nestjs/logger';
import { TokenCircSupplyDataV1, TokenService } from '../token';

@Injectable()
export class WstethService extends TokenService {
  constructor(
    @Inject(LOGGER_PROVIDER)
    protected readonly logger: LoggerService,

    @Inject(WSTETH_CONTRACT_TOKEN)
    protected readonly contract: Wsteth,
  ) {
    super(logger, contract.provider);
  }

  protected contractName = 'wsteth';

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
