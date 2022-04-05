import { APP_INTERCEPTOR } from '@nestjs/core';
import { Module } from '@nestjs/common';
import { ScheduleModule } from '@nestjs/schedule';
import { FallbackProviderModule } from '@lido-nestjs/execution';
import { SimpleFallbackJsonRpcBatchProvider } from '@lido-nestjs/execution';
import {
  LdoContractModule,
  LidoContractModule,
  WstethContractModule,
  AragonTokenManagerContractModule,
} from '@lido-nestjs/contracts';

import { PrometheusModule } from 'common/prometheus';
import { ConfigModule, ConfigService } from 'common/config';
import { SentryInterceptor } from 'common/sentry';
import { HealthModule } from 'common/health';
import { LoggerModule } from 'common/logger';
import { HTTPModule } from './http';

const contractOptions = {
  async useFactory(provider: SimpleFallbackJsonRpcBatchProvider) {
    return { provider };
  },
  inject: [SimpleFallbackJsonRpcBatchProvider],
};

@Module({
  imports: [
    LoggerModule,
    PrometheusModule,
    ConfigModule,
    HTTPModule,
    HealthModule,
    ScheduleModule.forRoot(),
    FallbackProviderModule.forRootAsync({
      async useFactory(configService: ConfigService) {
        return {
          urls: configService.get('EL_API_URLS'),
          network: configService.get('CHAIN_ID'),
        };
      },
      inject: [ConfigService],
    }),
    LdoContractModule.forRootAsync(contractOptions),
    LidoContractModule.forRootAsync(contractOptions),
    WstethContractModule.forRootAsync(contractOptions),
    AragonTokenManagerContractModule.forRootAsync(contractOptions),
  ],
  providers: [{ provide: APP_INTERCEPTOR, useClass: SentryInterceptor }],
})
export class AppModule {}
