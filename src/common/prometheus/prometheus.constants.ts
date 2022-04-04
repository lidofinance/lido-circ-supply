import { APP_NAME } from 'app.constants';

export const METRICS_URL = 'metrics';
export const METRICS_PREFIX = `${APP_NAME.replace(/-|\ /g, '_')}_`;

export const METRIC_HTTP_REQUEST_DURATION = `${METRICS_PREFIX}http_requests_duration_seconds`;

export const METRIC_VESTING_DATA = `${METRICS_PREFIX}vesting_data`;
export const METRIC_TOKEN_SUPPLY_DATA = `${METRICS_PREFIX}token_supply_data`;
