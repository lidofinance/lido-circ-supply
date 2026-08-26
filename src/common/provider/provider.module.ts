import { Global, Module } from '@nestjs/common';
import { ConnectionInfo } from '@ethersproject/web';
import { FallbackProviderModule } from '@lido-nestjs/execution';
import { APP_NAME, APP_VERSION } from 'app/app.constants';
import { PrometheusService } from 'common/prometheus';
import { ConfigService } from 'common/config';

// Identifies the app in outgoing RPC calls, so providers can attribute traffic
const toConnectionInfo = (rpcUrl: string): ConnectionInfo => ({
  url: rpcUrl,
  headers: { 'User-Agent': `${APP_NAME}/${APP_VERSION}` },
});

@Global()
@Module({
  imports: [
    FallbackProviderModule.forRootAsync({
      async useFactory(configService: ConfigService, prometheusService: PrometheusService) {
        const [firstRpcUrl, ...restRpcUrls] = configService.get('EL_API_URLS');

        return {
          urls: [toConnectionInfo(firstRpcUrl), ...restRpcUrls.map(toConnectionInfo)],
          network: configService.get('CHAIN_ID'),
          fetchMiddlewares: [
            async (next) => {
              const endTimer = prometheusService.elRpcRequestDuration.startTimer();

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
