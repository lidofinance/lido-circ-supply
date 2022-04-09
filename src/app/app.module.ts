import { APP_INTERCEPTOR } from '@nestjs/core';
import { Module } from '@nestjs/common';
import { ScheduleModule } from '@nestjs/schedule';
import { SimpleFallbackJsonRpcBatchProvider } from '@lido-nestjs/execution';
import {
  LdoContractModule,
  LidoContractModule,
  WstethContractModule,
  AragonTokenManagerContractModule,
} from '@lido-nestjs/contracts';

import { PrometheusModule } from 'common/prometheus';
import { ConfigModule } from 'common/config';
import { SentryInterceptor } from 'common/sentry';
import { HealthModule } from 'common/health';
import { LoggerModule } from 'common/logger';
import { ProviderModule } from 'common/provider';
import { AppService } from './app.service';
import { HTTPModule } from '../http';

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
    ProviderModule,
    HTTPModule,
    HealthModule,
    ScheduleModule.forRoot(),
    LdoContractModule.forRootAsync(contractOptions),
    LidoContractModule.forRootAsync(contractOptions),
    WstethContractModule.forRootAsync(contractOptions),
    AragonTokenManagerContractModule.forRootAsync(contractOptions),
  ],
  providers: [
    { provide: APP_INTERCEPTOR, useClass: SentryInterceptor },
    AppService,
  ],
})
export class AppModule {}
