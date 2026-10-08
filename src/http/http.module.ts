import { APP_FILTER, APP_GUARD, APP_INTERCEPTOR } from '@nestjs/core';
import { MiddlewareConsumer, Module } from '@nestjs/common';

import { HEALTH_URL, READY_URL } from 'common/health';
import { METRICS_URL } from 'common/prometheus';

import { SWAGGER_URL } from './common/swagger';
import { ThrottlerModule, ThrottlerBehindProxyGuard } from './common/throttler';
import { LoggerMiddleware, MetricsMiddleware } from './common/middleware';
import { CacheModule, ServerErrorNoStoreFilter, SkippableCacheInterceptor } from './common/cache';
import { SupplyModule } from './supply';

@Module({
  imports: [SupplyModule, CacheModule, ThrottlerModule],
  providers: [
    { provide: APP_GUARD, useClass: ThrottlerBehindProxyGuard },
    { provide: APP_INTERCEPTOR, useClass: SkippableCacheInterceptor },
    { provide: APP_FILTER, useClass: ServerErrorNoStoreFilter },
  ],
})
export class HTTPModule {
  configure(consumer: MiddlewareConsumer) {
    consumer
      .apply(MetricsMiddleware, LoggerMiddleware)
      .exclude(`${SWAGGER_URL}/(.*)`, SWAGGER_URL, METRICS_URL, HEALTH_URL, READY_URL)
      .forRoutes('*');
  }
}
