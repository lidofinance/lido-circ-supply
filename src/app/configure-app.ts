import { VersioningType } from '@nestjs/common';
import type { NestFastifyApplication } from '@nestjs/platform-fastify';
import type { FastifyInstance } from 'fastify';
import * as Sentry from '@sentry/node';
import { SwaggerModule, DocumentBuilder } from '@nestjs/swagger';
import { LOGGER_PROVIDER } from '@lido-nestjs/logger';
import { setSwaggerCacheControl, SWAGGER_URL } from 'http/common/swagger';
import { ConfigService } from 'common/config';
import { APP_DESCRIPTION, APP_NAME, APP_VERSION } from './app.constants';

/**
 * Applies everything the app needs between its creation and `listen`,
 * shared by `main.ts` and the e2e tests
 */
export const configureApp = (app: NestFastifyApplication): void => {
  const configService: ConfigService = app.get(ConfigService);
  const environment = configService.get('NODE_ENV');
  const corsWhitelist = configService.get('CORS_WHITELIST_REGEXP');
  const sentryDsn = configService.get('SENTRY_DSN');

  // versions
  app.enableVersioning({ type: VersioningType.URI });

  // logger
  app.useLogger(app.get(LOGGER_PROVIDER));

  // sentry
  const release = `${APP_NAME}@${APP_VERSION}`;
  Sentry.init({ dsn: sentryDsn, release, environment });

  // cors
  if (corsWhitelist !== '') {
    const whitelistRegexp = new RegExp(corsWhitelist);

    app.enableCors({
      origin(origin, callback) {
        if (!origin || whitelistRegexp.test(origin)) {
          callback(null, true);
        } else {
          callback(new Error('Not allowed by CORS'), false);
        }
      },
    });
  }

  // swagger
  setSwaggerCacheControl(app.getHttpAdapter().getInstance() as FastifyInstance);
  const swaggerConfig = new DocumentBuilder().setTitle(APP_DESCRIPTION).setVersion(APP_VERSION).build();
  const swaggerDocument = SwaggerModule.createDocument(app, swaggerConfig);
  SwaggerModule.setup(SWAGGER_URL, app, swaggerDocument);
};
