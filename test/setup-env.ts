// The config module validates process.env when it is imported, so the test
// environment must be in place before any app module is loaded
process.env.NODE_ENV = 'development';
process.env.CHAIN_ID = '1';
process.env.EL_API_URLS = 'http://rpc.test.invalid';
process.env.LOG_LEVEL = 'error';
process.env.LOG_FORMAT = 'simple';
process.env.CORS_WHITELIST_REGEXP = '^https?://(?:.+?\\.)?lido\\.fi$';
process.env.GLOBAL_THROTTLE_TTL = '5';
process.env.GLOBAL_THROTTLE_LIMIT = '100';
process.env.GLOBAL_CACHE_TTL = '1';
process.env.TOKEN_UPDATE_CRON = '0 0 1 1 *';
process.env.SENTRY_DSN = '';
