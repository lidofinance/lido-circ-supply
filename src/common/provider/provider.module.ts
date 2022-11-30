import { Global, Module } from '@nestjs/common';
import { FallbackProviderModule } from '@lido-nestjs/execution';
import { PrometheusService } from 'common/prometheus';
import { ConfigService } from 'common/config';

@Global()
@Module({
  imports: [
    FallbackProviderModule.forRootAsync({
      async useFactory(
        configService: ConfigService,
        prometheusService: PrometheusService,
      ) {
        return {
          urls: configService.get('EL_API_URLS'),
          network: configService.get('CHAIN_ID'),
          fetchMiddlewares: [
            async (next) => {
              const endTimer =
                prometheusService.elRpcRequestDuration.startTimer();

              try {
                const result = await next();
                endTimer({ result: 'success' });
                return result;
              } catch (error) {
                endTimer({ result: 'error' });
                throw error;
              }
            },
          ],
        };
      },
      inject: [ConfigService, PrometheusService],
    }),
  ],
  providers: [],
  exports: [],
})
export class ProviderModule {}
