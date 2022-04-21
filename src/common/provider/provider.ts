import { FallbackProviderModule } from '@lido-nestjs/execution';
import { PrometheusService } from 'common/prometheus';
import { ConfigService } from 'common/config';

export const ProviderModule = FallbackProviderModule.forRootAsync({
  async useFactory(
    configService: ConfigService,
    prometheusService: PrometheusService,
  ) {
    return {
      urls: configService.get('EL_API_URLS'),
      network: configService.get('CHAIN_ID'),
      fetchMiddlewares: [
        async (next) => {
          const endTimer = prometheusService.elRpcRequestDuration.startTimer();

          try {
            return await next();
          } catch (error) {
            prometheusService.elRpcErrors.inc();
            throw error;
          } finally {
            endTimer();
          }
        },
      ],
    };
  },
  inject: [ConfigService, PrometheusService],
});
