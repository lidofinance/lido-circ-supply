import { PrometheusModule as PrometheusModuleSource } from '@willsoto/nestjs-prometheus';
import {
  PrometheusRequestsHistogramProvider,
  PrometheusTokenInfoGaugeProvider,
  PrometheusELRPCRequestsHistogramProvider,
  PrometheusELRPCErrorsCounterProvider,
} from './prometheus.provider';
import { METRICS_PREFIX, METRICS_URL } from './prometheus.constants';
import { PrometheusController } from './prometheus.controller';

export const PrometheusModule = PrometheusModuleSource.register({
  controller: PrometheusController,
  path: METRICS_URL,
  defaultMetrics: {
    enabled: true,
    config: { prefix: METRICS_PREFIX },
  },
});

const providers = [
  PrometheusRequestsHistogramProvider,
  PrometheusTokenInfoGaugeProvider,
  PrometheusELRPCRequestsHistogramProvider,
  PrometheusELRPCErrorsCounterProvider,
];

PrometheusModule.global = true;
PrometheusModule.providers = providers;
PrometheusModule.exports = providers;
