import { Inject, Injectable, LoggerService, OnModuleInit } from '@nestjs/common';
import { SimpleFallbackJsonRpcBatchProvider } from '@lido-nestjs/execution';
import { LOGGER_PROVIDER } from '@lido-nestjs/logger';
import { CHAINS } from '@lido-nestjs/constants';

import { ConfigService } from 'common/config';
import { PrometheusService } from 'common/prometheus';
import { APP_NAME, APP_VERSION } from './app.constants';

@Injectable()
export class AppService implements OnModuleInit {
  constructor(
    @Inject(LOGGER_PROVIDER) protected readonly logger: LoggerService,

    protected readonly provider: SimpleFallbackJsonRpcBatchProvider,
    protected readonly configService: ConfigService,
    protected readonly prometheusService: PrometheusService,
  ) {}

  public async onModuleInit(): Promise<void> {
    const network = await this.getNetworkName();
    const env = this.configService.get('NODE_ENV');
    const version = APP_VERSION;
    const name = APP_NAME;

    this.prometheusService.buildInfo.labels({ env, network, name, version }).inc();
    this.logger.log('Init app', { env, network, name, version });
  }

  protected async getNetworkName(): Promise<string> {
    const network = await this.provider.getNetwork();
    const name = CHAINS[network.chainId]?.toLocaleLowerCase();
    return name || network.name;
  }
}
