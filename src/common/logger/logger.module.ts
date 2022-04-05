import {
  jsonTransport,
  LoggerModule as Logger,
  simpleTransport,
} from '@lido-nestjs/logger';
import { ModuleRef } from '@nestjs/core';
import { ConfigModule, ConfigService, LogFormat } from 'common/config';
import { SimpleFallbackJsonRpcBatchProvider } from '@lido-nestjs/execution';

const refConfig = { strict: false };
const fieldColors = { block: 'blue' };

export const LoggerModule = Logger.forRootAsync({
  imports: [ConfigModule],
  inject: [ConfigService, ModuleRef],
  useFactory: async (configService: ConfigService, moduleRef: ModuleRef) => {
    const { secrets } = configService;
    const level = configService.get('LOG_LEVEL');
    const format = configService.get('LOG_FORMAT');
    const isJSON = format === LogFormat.json;

    const transports = isJSON
      ? jsonTransport({ secrets })
      : simpleTransport({ secrets, fieldColors });

    return {
      level,
      transports,
      defaultMeta: {
        get block() {
          const provider = moduleRef.get(
            SimpleFallbackJsonRpcBatchProvider,
            refConfig,
          );
          return provider.blockNumber;
        },
      },
    };
  },
});
