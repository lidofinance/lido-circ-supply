import { NestFactory } from '@nestjs/core';
import { FastifyAdapter, NestFastifyApplication } from '@nestjs/platform-fastify';
import { ConfigService } from 'common/config';
import { AppModule, configureApp } from 'app';

async function bootstrap() {
  // request.ip is the raw socket peer; X-Forwarded-For is not trusted.
  const app = await NestFactory.create<NestFastifyApplication>(AppModule, new FastifyAdapter({ trustProxy: false }), {
    bufferLogs: true,
  });

  configureApp(app);

  const appPort = app.get(ConfigService).get('PORT');
  await app.listen(appPort, '0.0.0.0');
}
bootstrap();
