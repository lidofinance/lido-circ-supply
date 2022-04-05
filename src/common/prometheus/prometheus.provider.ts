import {
  makeCounterProvider,
  makeGaugeProvider,
  makeHistogramProvider,
} from '@willsoto/nestjs-prometheus';
import {
  METRIC_HTTP_REQUEST_DURATION,
  METRIC_VESTING_DATA,
  METRIC_TOKEN_SUPPLY_DATA,
  METRIC_EL_RPC_REQUEST_DURATION,
  METRIC_EL_RPC_REQUEST_ERRORS,
} from './prometheus.constants';

export const PrometheusRequestsHistogramProvider = makeHistogramProvider({
  name: METRIC_HTTP_REQUEST_DURATION,
  help: 'Duration of http requests',
  buckets: [0.01, 0.1, 0.2, 0.5, 1, 1.5, 2, 5],
  labelNames: ['statusCode', 'method', 'pathname'] as const,
});

export const PrometheusVestingGaugeProvider = makeGaugeProvider({
  name: METRIC_VESTING_DATA,
  help: 'Vesting data',
  labelNames: ['token', 'field'] as const,
});

export const PrometheusTokenSupplyGaugeProvider = makeGaugeProvider({
  name: METRIC_TOKEN_SUPPLY_DATA,
  help: 'Token supply data',
  labelNames: ['token', 'field'] as const,
});

export const PrometheusELRPCRequestsHistogramProvider = makeHistogramProvider({
  name: METRIC_EL_RPC_REQUEST_DURATION,
  help: 'EL RPC request duration',
  buckets: [0.1, 0.2, 0.3, 0.6, 1, 1.5, 2, 5],
});

export const PrometheusELRPCErrorsCounterProvider = makeCounterProvider({
  name: METRIC_EL_RPC_REQUEST_ERRORS,
  help: 'Number of EL RPC requests errors',
});
