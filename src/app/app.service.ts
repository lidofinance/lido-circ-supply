import { Inject, Injectable, LoggerService, OnModuleInit } from '@nestjs/common';
import { SimpleFallbackJsonRpcBatchProvider } from '@lido-nestjs/execution';
import { LOGGER_PROVIDER } from '@lido-nestjs/logger';
import { CHAINS } from '@lido-nestjs/constants';

import { ConfigService } from 'common/config';
import { PrometheusService } from 'common/prometheus';
import { APP_BRANCH, APP_COMMIT, APP_NAME, APP_VERSION } from './app.constants';

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
    const branch = APP_BRANCH;
    const commit = APP_COMMIT;

    this.prometheusService.buildInfo.labels({ env, network, name, version, branch, commit }).inc();
    this.logger.log('Init app', { env, network, name, version, branch, commit });
    this.logConfig();
  }

  protected logConfig(): void {
    this.logger.log('App config', {
      port: this.configService.get('PORT'),
      chainId: this.configService.get('CHAIN_ID'),
      elRpcHosts: this.configService.get('EL_API_URLS').map((rpcUrl) => new URL(rpcUrl).host),
      tokenUpdateCron: this.configService.get('TOKEN_UPDATE_CRON'),
      globalCacheTtl: this.configService.get('GLOBAL_CACHE_TTL'),
      globalThrottleTtl: this.configService.get('GLOBAL_THROTTLE_TTL'),
      globalThrottleLimit: this.configService.get('GLOBAL_THROTTLE_LIMIT'),
      logLevel: this.configService.get('LOG_LEVEL'),
      logFormat: this.configService.get('LOG_FORMAT'),
      corsWhitelistRegexp: this.configService.get('CORS_WHITELIST_REGEXP'),
      sentryEnabled: Boolean(this.configService.get('SENTRY_DSN')),
    });
  }

  protected async getNetworkName(): Promise<string> {
    const network = await this.provider.getNetwork();
    const name = CHAINS[network.chainId]?.toLocaleLowerCase();
    return name || network.name;
  }
}
