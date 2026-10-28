import { validate } from './env.validation';
import { Environment, LogFormat, LogLevel } from './interfaces';

const required = { EL_API_URLS: 'http://rpc-one.test,http://rpc-two.test', CHAIN_ID: '1' };

describe('validate', () => {
  let exit: jest.SpyInstance;
  let consoleError: jest.SpyInstance;

  beforeEach(() => {
    exit = jest.spyOn(process, 'exit').mockImplementation(() => {
      throw new Error('process.exit');
    });
    consoleError = jest.spyOn(console, 'error').mockImplementation(() => undefined);
  });

  afterEach(() => {
    exit.mockRestore();
    consoleError.mockRestore();
  });

  it('applies defaults when optional variables are absent', () => {
    expect(validate({ ...required })).toMatchObject({
      NODE_ENV: Environment.development,
      PORT: 3000,
      CORS_WHITELIST_REGEXP: '',
      GLOBAL_THROTTLE_TTL: 5,
      GLOBAL_THROTTLE_LIMIT: 100,
      GLOBAL_CACHE_TTL: 1,
      SENTRY_DSN: null,
      LOG_LEVEL: LogLevel.info,
      LOG_FORMAT: LogFormat.json,
      TOKEN_UPDATE_CRON: '*/1 * * * *',
    });
  });

  // Container env files often pass optional variables as empty strings
  it('applies defaults when optional variables are empty strings', () => {
    const config = validate({
      ...required,
      PORT: '',
      GLOBAL_THROTTLE_TTL: '',
      GLOBAL_THROTTLE_LIMIT: '',
      GLOBAL_CACHE_TTL: '',
      LOG_LEVEL: '',
      LOG_FORMAT: '',
    });

    expect(config).toMatchObject({
      PORT: 3000,
      GLOBAL_THROTTLE_TTL: 5,
      GLOBAL_THROTTLE_LIMIT: 100,
      GLOBAL_CACHE_TTL: 1,
      LOG_LEVEL: LogLevel.info,
      LOG_FORMAT: LogFormat.json,
    });
  });

  it('parses the provided values', () => {
    const config = validate({
      ...required,
      NODE_ENV: 'production',
      PORT: '8080',
      GLOBAL_THROTTLE_TTL: '10',
      GLOBAL_THROTTLE_LIMIT: '20',
      GLOBAL_CACHE_TTL: '30',
      LOG_LEVEL: 'debug',
      LOG_FORMAT: 'simple',
      TOKEN_UPDATE_CRON: '0 */3 * * *',
      SENTRY_DSN: 'https://key@sentry.test/1',
      CORS_WHITELIST_REGEXP: '^https://lido\\.fi$',
    });

    expect(config).toMatchObject({
      NODE_ENV: Environment.production,
      PORT: 8080,
      GLOBAL_THROTTLE_TTL: 10,
      GLOBAL_THROTTLE_LIMIT: 20,
      GLOBAL_CACHE_TTL: 30,
      LOG_LEVEL: LogLevel.debug,
      LOG_FORMAT: LogFormat.simple,
      TOKEN_UPDATE_CRON: '0 */3 * * *',
      SENTRY_DSN: 'https://key@sentry.test/1',
      CORS_WHITELIST_REGEXP: '^https://lido\\.fi$',
      CHAIN_ID: 1,
      EL_API_URLS: ['http://rpc-one.test', 'http://rpc-two.test'],
    });
  });

  it.each([
    ['EL_API_URLS is missing', { CHAIN_ID: '1' }],
    ['CHAIN_ID is missing', { EL_API_URLS: 'http://rpc.test' }],
    ['CHAIN_ID is not a number', { ...required, CHAIN_ID: 'mainnet' }],
    ['PORT is below 1', { ...required, PORT: '0' }],
    ['LOG_LEVEL is unknown', { ...required, LOG_LEVEL: 'verbose' }],
    ['LOG_FORMAT is unknown', { ...required, LOG_FORMAT: 'xml' }],
    ['NODE_ENV is unknown', { ...required, NODE_ENV: 'prod' }],
  ])('exits the process when %s', (_, config) => {
    expect(() => validate(config)).toThrow('process.exit');
    expect(exit).toHaveBeenCalledWith(1);
    expect(consoleError).toHaveBeenCalledTimes(1);
  });

  it('reports the validation error as a JSON log line by default', () => {
    expect(() => validate({ CHAIN_ID: '1' })).toThrow('process.exit');

    const line = JSON.parse(consoleError.mock.calls[0][0]);
    expect(line.level).toBe('error');
    expect(line.message).toContain('EL_API_URLS');
  });

  it('reports the validation error as plain text for the simple log format', () => {
    expect(() => validate({ CHAIN_ID: '1', LOG_FORMAT: 'simple' })).toThrow('process.exit');

    const line: string = consoleError.mock.calls[0][0];
    expect(() => JSON.parse(line)).toThrow();
    expect(line).toContain('EL_API_URLS');
  });
});
