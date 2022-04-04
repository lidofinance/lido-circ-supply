import {
  jsonTransport,
  simpleTransport,
  LoggerModule as Logger,
} from '@lido-nestjs/logger';
import { ConfigModule, ConfigService, LogFormat } from 'common/config';

export const LoggerModule = Logger.forRootAsync({
  imports: [ConfigModule],
  inject: [ConfigService],
  useFactory: async (configService: ConfigService) => {
    const level = configService.get('LOG_LEVEL', { infer: true });
    const format = configService.get('LOG_FORMAT', { infer: true });

    const isJSON = format === LogFormat.json;
    const transports = isJSON ? jsonTransport() : simpleTransport();

    return { level, transports };
  },
});
