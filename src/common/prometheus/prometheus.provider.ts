import {
  makeGaugeProvider,
  makeHistogramProvider,
} from '@willsoto/nestjs-prometheus';
import {
  METRIC_HTTP_REQUEST_DURATION,
  METRIC_VESTING_DATA,
  METRIC_TOKEN_SUPPLY_DATA,
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

// TODO: add metrics for execution layer provider: errors counter, histogram, etc.
