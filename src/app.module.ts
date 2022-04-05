import { APP_INTERCEPTOR, ModuleRef } from '@nestjs/core';
import { Module } from '@nestjs/common';
import { ScheduleModule } from '@nestjs/schedule';
import { getToken } from '@willsoto/nestjs-prometheus';
import { FallbackProviderModule } from '@lido-nestjs/execution';
import { SimpleFallbackJsonRpcBatchProvider } from '@lido-nestjs/execution';
import {
  LdoContractModule,
  LidoContractModule,
  WstethContractModule,
  AragonTokenManagerContractModule,
} from '@lido-nestjs/contracts';

import {
  METRIC_EL_RPC_REQUEST_DURATION,
  METRIC_EL_RPC_REQUEST_ERRORS,
  PrometheusModule,
} from 'common/prometheus';
import { ConfigModule, ConfigService } from 'common/config';
import { SentryInterceptor } from 'common/sentry';
import { HealthModule } from 'common/health';
import { LoggerModule } from 'common/logger';
import { HTTPModule } from './http';
import { Counter, Histogram } from 'prom-client';

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
      async useFactory(configService: ConfigService, moduleRef: ModuleRef) {
        const requestsHistogram: Histogram<string> = moduleRef.get(
          getToken(METRIC_EL_RPC_REQUEST_DURATION),
          { strict: false },
        );
        const errorsCounter: Counter<string> = moduleRef.get(
          getToken(METRIC_EL_RPC_REQUEST_ERRORS),
          { strict: false },
        );

        return {
          urls: configService.get('EL_API_URLS'),
          network: configService.get('CHAIN_ID'),
          fetchMiddlewares: [
            async (next) => {
              const endTimer = requestsHistogram.startTimer();

              try {
                return await next();
              } catch (error) {
                errorsCounter.inc();
                throw error;
              } finally {
                endTimer();
              }
            },
          ],
        };
      },
      inject: [ConfigService, ModuleRef],
    }),
    LdoContractModule.forRootAsync(contractOptions),
    LidoContractModule.forRootAsync(contractOptions),
    WstethContractModule.forRootAsync(contractOptions),
    AragonTokenManagerContractModule.forRootAsync(contractOptions),
  ],
  providers: [{ provide: APP_INTERCEPTOR, useClass: SentryInterceptor }],
})
export class AppModule {}
