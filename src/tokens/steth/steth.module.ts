import { LidoContractModule } from '@lido-nestjs/contracts';
import { SimpleFallbackJsonRpcBatchProvider } from '@lido-nestjs/execution';
import { Module } from '@nestjs/common';
import { StethService } from './steth.service';

@Module({
  imports: [
    LidoContractModule.forFeatureAsync({
      inject: [SimpleFallbackJsonRpcBatchProvider],
      async useFactory(provider) {
        return { provider };
      },
    }),
  ],
  providers: [StethService],
  exports: [StethService],
})
export class StethModule {}
