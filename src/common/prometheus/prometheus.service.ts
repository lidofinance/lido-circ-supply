import { getOrCreateMetric } from '@willsoto/nestjs-prometheus';
import { Options, Metrics, Metric } from './interfaces';
import { METRICS_PREFIX } from './prometheus.constants';

export class PrometheusService {
  private prefix = METRICS_PREFIX;

  private getOrCreateMetric<T extends Metrics, L extends string>(
    type: T,
    options: Options<L>,
  ): Metric<T, L> {
    const nameWithPrefix = this.prefix + options.name;

    return getOrCreateMetric(type, {
      ...options,
      name: nameWithPrefix,
    }) as Metric<T, L>;
  }

  public httpRequestDuration = this.getOrCreateMetric('Histogram', {
    name: 'http_requests_duration_seconds',
    help: 'Duration of http requests',
    buckets: [0.01, 0.1, 0.2, 0.5, 1, 1.5, 2, 5],
    labelNames: ['statusCode', 'method', 'pathname'] as const,
  });

  public buildInfo = this.getOrCreateMetric('Gauge', {
    name: 'build_info',
    help: 'Build information',
    labelNames: ['name', 'version', 'env', 'network'],
  });

  public tokenInfo = this.getOrCreateMetric('Gauge', {
    name: 'token_info',
    help: 'Token info data',
    labelNames: ['token', 'field'] as const,
  });

  public elRpcRequestDuration = this.getOrCreateMetric('Histogram', {
    name: 'el_rpc_requests_duration_seconds',
    help: 'EL RPC request duration',
    buckets: [0.1, 0.2, 0.3, 0.6, 1, 1.5, 2, 5],
  });

  public elRpcErrors = this.getOrCreateMetric('Counter', {
    name: 'el_rpc_requests_errors_total',
    help: 'Number of EL RPC requests errors',
  });
}
