import { APP_NAME } from 'app/app.constants';

export const METRICS_URL = 'metrics';
export const METRICS_PREFIX = `${APP_NAME.replace(/-|\ /g, '_')}_`;

export const METRIC_HTTP_REQUEST_DURATION = `${METRICS_PREFIX}http_requests_duration_seconds`;

export const METRIC_BUILD_INFO = `${METRICS_PREFIX}build_info`;

export const METRIC_TOKEN_INFO = `${METRICS_PREFIX}token_info`;

export const METRIC_EL_RPC_REQUEST_DURATION = `${METRICS_PREFIX}el_rpc_requests_duration_seconds`;
export const METRIC_EL_RPC_REQUEST_ERRORS = `${METRICS_PREFIX}el_rpc_requests_errors_total`;
