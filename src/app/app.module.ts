import { APP_INTERCEPTOR } from '@nestjs/core';
import { Module } from '@nestjs/common';
import { ScheduleModule } from '@nestjs/schedule';
import { PrometheusModule } from 'common/prometheus';
import { ConfigModule } from 'common/config';
import { SentryInterceptor } from 'common/sentry';
import { HealthModule } from 'common/health';
import { LoggerModule } from 'common/logger';
import { ProviderModule } from 'common/provider';
import { WorkerModule } from 'worker';
import { AppService } from './app.service';
import { HTTPModule } from '../http';

@Module({
  imports: [
    LoggerModule,
    PrometheusModule,
    ConfigModule,
    ProviderModule,
    HTTPModule,
    HealthModule,
    WorkerModule,
    ScheduleModule.forRoot(),
  ],
  providers: [
    { provide: APP_INTERCEPTOR, useClass: SentryInterceptor },
    AppService,
  ],
})
export class AppModule {}
