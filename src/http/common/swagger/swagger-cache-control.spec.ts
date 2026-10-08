import { FastifyAdapter } from '@nestjs/platform-fastify';
import { setSwaggerCacheControl } from './swagger-cache-control';

describe('setSwaggerCacheControl', () => {
  const swaggerPaths = ['/api', '/api/', '/api/index.html', '/api/swagger-ui.css', '/api-json', '/api-yaml'];

  it.each(swaggerPaths)('sets no-cache for %s', async (url) => {
    const fastify = new FastifyAdapter().getInstance();
    setSwaggerCacheControl(fastify);
    fastify.get(url, async () => 'ok');

    const response = await fastify.inject(url);

    expect(response.headers['cache-control']).toBe('no-cache, must-revalidate');
    await fastify.close();
  });

  it('ignores query parameters when matching Swagger paths', async () => {
    const fastify = new FastifyAdapter().getInstance();
    setSwaggerCacheControl(fastify);
    fastify.get('/api-json', async () => 'ok');

    const response = await fastify.inject('/api-json?format=openapi');

    expect(response.headers['cache-control']).toBe('no-cache, must-revalidate');
    await fastify.close();
  });

  it('does not change non-Swagger routes', async () => {
    const fastify = new FastifyAdapter().getInstance();
    setSwaggerCacheControl(fastify);
    fastify.get('/health', async (_, reply) => reply.header('Cache-Control', 'public, max-age=15').send('ok'));

    const response = await fastify.inject('/health');

    expect(response.headers['cache-control']).toBe('public, max-age=15');
    await fastify.close();
  });
});
