import { Counter, Histogram } from 'prom-client';
import { ModuleRef } from '@nestjs/core';
import { getToken } from '@willsoto/nestjs-prometheus';
import { FallbackProviderModule } from '@lido-nestjs/execution';
import {
  METRIC_EL_RPC_REQUEST_DURATION,
  METRIC_EL_RPC_REQUEST_ERRORS,
} from 'common/prometheus';
import { ConfigService } from 'common/config';

export const ProviderModule = FallbackProviderModule.forRootAsync({
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
});
