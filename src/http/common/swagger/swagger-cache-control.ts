import type { FastifyInstance } from 'fastify';
import { SWAGGER_URL } from './swagger.constants';

const SWAGGER_CACHE_CONTROL = 'no-cache, must-revalidate';
const SWAGGER_PATH = `/${SWAGGER_URL}`;

const isSwaggerPath = (path: string): boolean =>
  path === SWAGGER_PATH ||
  path.startsWith(`${SWAGGER_PATH}/`) ||
  path === `${SWAGGER_PATH}-json` ||
  path === `${SWAGGER_PATH}-yaml`;

export const setSwaggerCacheControl = (fastify: FastifyInstance): void => {
  fastify.addHook('onSend', (request, reply, payload, done) => {
    const path = request.url.split('?', 1)[0];

    if (isSwaggerPath(path)) reply.header('Cache-Control', SWAGGER_CACHE_CONTROL);

    done(null, payload);
  });
};
