import { Test } from '@nestjs/testing';
import { FastifyAdapter, NestFastifyApplication } from '@nestjs/platform-fastify';
import { BigNumber } from '@ethersproject/bignumber';
import { parseEther } from '@ethersproject/units';
import { SimpleFallbackJsonRpcBatchProvider } from '@lido-nestjs/execution';
import {
  ARAGON_TOKEN_MANAGER_CONTRACT_TOKEN,
  LDO_CONTRACT_TOKEN,
  LIDO_CONTRACT_TOKEN,
  WSTETH_CONTRACT_TOKEN,
} from '@lido-nestjs/contracts';
import { SUPPLY_CACHE_CONTROL, ERROR_CACHE_CONTROL } from 'http/common/cache';
import { WorkerService } from 'worker';
import { AppModule } from './app.module';
import { APP_VERSION } from './app.constants';
import { configureApp } from './configure-app';

// Boots the real application module graph against fake RPC and contracts.
// Covers everything a dependency bump can break: DI wiring, routing,
// versioning, headers, cache, throttling, CORS, probes, metrics and Swagger
const TREASURY = '0x3e40D73EB977Dc6a537aF587D48316feE66E9C8c';

const block = (number: number) => ({
  number,
  hash: `0x${number.toString(16).padStart(64, '0')}`,
  timestamp: 1_700_000_000 + number,
});

const chain = {
  ldoTotalSupply: parseEther('1000000'),
  treasuryBalance: parseEther('100'),
  stethTotalSupply: parseEther('9000000.5'),
  wstethTotalSupply: parseEther('8000000'),
};

const fakes = {
  provider: {
    getNetwork: async () => ({ chainId: 1, name: 'homestead' }),
    getBlock: jest.fn<Promise<ReturnType<typeof block>>, [string]>(),
  },
  ldo: {
    totalSupply: async () => chain.ldoTotalSupply,
    decimals: async () => 18,
    balanceOf: async (holder: string) => (holder === TREASURY ? chain.treasuryBalance : BigNumber.from(0)),
    filters: { Transfer: () => 'burns' },
    queryFilter: async () => [],
  },
  lido: {
    totalSupply: async () => chain.stethTotalSupply,
    decimals: async () => 18,
    getTreasury: async () => TREASURY,
  },
  wsteth: {
    totalSupply: async () => chain.wstethTotalSupply,
    decimals: async () => 18,
  },
  tokenManager: {
    filters: { NewVesting: () => 'new', RevokeVesting: () => 'revoke' },
    queryFilter: async () => [],
    vestingsLengths: async () => BigNumber.from(0),
    getVesting: async () => undefined,
  },
};

const sleep = (ms: number) => new Promise((resolve) => setTimeout(resolve, ms));

describe('App (e2e)', () => {
  let app: NestFastifyApplication;
  let releaseFirstBlock: () => void;

  const get = (url: string, headers: Record<string, string> = {}) => app.inject({ method: 'GET', url, headers });

  const runUpdateCycle = async (blockNumber: number) => {
    fakes.provider.getBlock.mockResolvedValue(block(blockNumber));
    await (app.get(WorkerService) as any).runTokensUpdateCycle();
  };

  const waitUntilReady = async () => {
    for (let attempt = 0; attempt < 50; attempt++) {
      if ((await get('/ready')).statusCode === 200) return;
      await sleep(100);
    }
    throw new Error('The app did not become ready');
  };

  beforeAll(async () => {
    // The first update cycle starts on init; hold it to observe the empty state
    fakes.provider.getBlock.mockReturnValueOnce(
      new Promise((resolve) => (releaseFirstBlock = () => resolve(block(100)))),
    );

    const moduleRef = await Test.createTestingModule({ imports: [AppModule] })
      .overrideProvider(SimpleFallbackJsonRpcBatchProvider)
      .useValue(fakes.provider)
      .overrideProvider(LDO_CONTRACT_TOKEN)
      .useValue(fakes.ldo)
      .overrideProvider(LIDO_CONTRACT_TOKEN)
      .useValue(fakes.lido)
      .overrideProvider(WSTETH_CONTRACT_TOKEN)
      .useValue(fakes.wsteth)
      .overrideProvider(ARAGON_TOKEN_MANAGER_CONTRACT_TOKEN)
      .useValue(fakes.tokenManager)
      .compile();

    app = moduleRef.createNestApplication<NestFastifyApplication>(new FastifyAdapter({ trustProxy: false }), {
      bufferLogs: true,
    });
    configureApp(app);

    await app.init();
    await app.getHttpAdapter().getInstance().ready();
  });

  afterAll(async () => {
    await app.close();
  });

  describe('before the first update cycle completes', () => {
    it('is alive but not ready', async () => {
      expect((await get('/health')).statusCode).toBe(200);

      const ready = await get('/ready');
      expect(ready.statusCode).toBe(503);
      expect(ready.json().error.tokensData.missingTokens).toEqual(['ldo', 'steth', 'wsteth']);
    });

    it.each(['/v1/plain/ldo', '/v1/plain/total/steth', '/v1/detailed/wsteth'])(
      'responds 503 without caching on %s',
      async (url) => {
        const response = await get(url);

        expect(response.statusCode).toBe(503);
        expect(response.headers['cache-control']).toBe(ERROR_CACHE_CONTROL);
        expect(response.json().message).toMatch(/No data collected/);
      },
    );
  });

  describe('after the first update cycle', () => {
    beforeAll(async () => {
      releaseFirstBlock();
      await waitUntilReady();
    });

    it('reports ready', async () => {
      const ready = await get('/ready');

      expect(ready.statusCode).toBe(200);
      expect(ready.json().info.tokensData).toEqual({ status: 'up', missingTokens: [] });
    });

    it.each([
      ['/v1/plain/ldo', '999900.0'],
      ['/v1/plain/total/ldo', '1000000.0'],
      ['/v1/plain/steth', '9000000.5'],
      ['/v1/plain/total/steth', '9000000.5'],
      ['/v1/plain/wsteth', '8000000.0'],
      ['/v1/plain/total/wsteth', '8000000.0'],
    ])('serves %s as cacheable plain text: %s', async (url, body) => {
      const response = await get(url);

      expect(response.statusCode).toBe(200);
      expect(response.body).toBe(body);
      expect(response.headers['content-type']).toMatch(/^text\/html/);
      expect(response.headers['cache-control']).toBe(SUPPLY_CACHE_CONTROL);
    });

    it('serves the detailed LDO supply at the block of the cycle', async () => {
      const response = await get('/v1/detailed/ldo');

      expect(response.statusCode).toBe(200);
      expect(response.headers['content-type']).toMatch(/^application\/json/);
      expect(response.headers['cache-control']).toBe(SUPPLY_CACHE_CONTROL);
      expect(response.json()).toEqual({
        totalSupply: chain.ldoTotalSupply.toHexString(),
        circSupply: chain.ldoTotalSupply.sub(chain.treasuryBalance).toHexString(),
        decimals: 18,
        blockNumber: 100,
        blockHash: block(100).hash,
        blockTimestamp: block(100).timestamp,
      });
    });

    it.each(['/v1/detailed/steth', '/v1/detailed/wsteth'])('serves %s', async (url) => {
      const response = await get(url);

      expect(response.statusCode).toBe(200);
      expect(response.json()).toMatchObject({ blockNumber: 100, decimals: 18 });
    });

    it('requires the API version in the path', async () => {
      expect((await get('/plain/ldo')).statusCode).toBe(404);
      expect((await get('/v2/plain/ldo')).statusCode).toBe(404);
    });

    it('serves cached responses for GLOBAL_CACHE_TTL seconds', async () => {
      expect((await get('/v1/detailed/steth')).json().blockNumber).toBe(100);

      await runUpdateCycle(101);
      expect((await get('/v1/detailed/steth')).json().blockNumber).toBe(100);

      await sleep(1_200);
      expect((await get('/v1/detailed/steth')).json().blockNumber).toBe(101);
    });

    it.each(['/health', '/ready'])('never caches the %s probe', async (url) => {
      const response = await get(url);

      expect(response.statusCode).toBe(200);
      expect(response.headers['cache-control']).toBe('no-cache, no-store, must-revalidate');
    });
  });

  describe('rate limiting', () => {
    const limit = Number(process.env.GLOBAL_THROTTLE_LIMIT);

    it('limits requests per CF-Connecting-IP and leaves the probes and metrics alone', async () => {
      const headers = { 'cf-connecting-ip': '203.0.113.7' };
      const responses = [];

      for (let i = 0; i <= limit; i++) responses.push(await get('/v1/plain/ldo', headers));

      expect(responses.slice(0, limit).map((response) => response.statusCode)).toEqual(Array(limit).fill(200));
      expect(responses[0].headers['x-ratelimit-limit']).toBe(String(limit));
      expect(responses[0].headers['x-ratelimit-remaining']).toBe(String(limit - 1));

      const throttled = responses[limit];
      expect(throttled.statusCode).toBe(429);
      expect(throttled.headers['retry-after']).toBeDefined();

      expect((await get('/v1/plain/ldo', { 'cf-connecting-ip': '203.0.113.8' })).statusCode).toBe(200);
      expect((await get('/health', headers)).statusCode).toBe(200);
      expect((await get('/ready', headers)).statusCode).toBe(200);
      expect((await get('/metrics', headers)).statusCode).toBe(200);
    });

    it('shares the bucket of an IPv6 /64', async () => {
      const first = await get('/v1/plain/ldo', { 'cf-connecting-ip': '2001:db8:1:2::1' });
      const second = await get('/v1/plain/ldo', { 'cf-connecting-ip': '2001:db8:1:2:ffff::1' });

      expect(first.headers['x-ratelimit-remaining']).toBe(String(limit - 1));
      expect(second.headers['x-ratelimit-remaining']).toBe(String(limit - 2));
    });
  });

  describe('CORS', () => {
    it.each(['https://lido.fi', 'https://stake.lido.fi', 'http://testnet.lido.fi'])('allows %s', async (origin) => {
      const response = await get('/v1/plain/ldo', { origin });

      expect(response.statusCode).toBe(200);
      expect(response.headers['access-control-allow-origin']).toBe(origin);
    });

    it.each(['https://lido.fi.evil.example', 'https://evil.example'])('rejects %s', async (origin) => {
      const response = await get('/v1/plain/ldo', { origin });

      expect(response.headers['access-control-allow-origin']).toBeUndefined();
      expect(response.statusCode).not.toBe(200);
    });
  });

  describe('observability', () => {
    it('exposes build and token metrics', async () => {
      const response = await get('/metrics');
      const circSupply = `(?=[^}]*token="ldo")(?=[^}]*field="circ-supply")`;

      expect(response.statusCode).toBe(200);
      expect(response.body).toMatch(new RegExp(`^build_info\\{(?=[^}]*version="${APP_VERSION}")[^}]*\\} 1$`, 'm'));
      expect(response.body).toMatch(new RegExp(`^lido_circ_supply_token_info\\{${circSupply}[^}]*\\} 999900$`, 'm'));
      expect(response.body).toMatch(/^http_requests_duration_seconds_count\{/m);
      expect(response.body).toMatch(/^# TYPE el_rpc_requests_duration_seconds histogram$/m);
    });

    it('serves the Swagger document without caching and hides the service routes', async () => {
      const response = await get('/api-json');
      const document = response.json();

      expect(response.statusCode).toBe(200);
      expect(response.headers['cache-control']).toBe('no-cache, must-revalidate');
      expect(document.info.version).toBe(APP_VERSION);
      expect(Object.keys(document.paths).sort()).toEqual([
        '/v1/detailed/ldo',
        '/v1/detailed/steth',
        '/v1/detailed/wsteth',
        '/v1/plain/ldo',
        '/v1/plain/steth',
        '/v1/plain/total/ldo',
        '/v1/plain/total/steth',
        '/v1/plain/total/wsteth',
        '/v1/plain/wsteth',
      ]);
    });

    it('serves the Swagger UI', async () => {
      const response = await get('/api');

      expect(response.statusCode).toBe(200);
      expect(response.headers['content-type']).toMatch(/^text\/html/);
      expect(response.headers['cache-control']).toBe('no-cache, must-revalidate');
    });
  });
});
