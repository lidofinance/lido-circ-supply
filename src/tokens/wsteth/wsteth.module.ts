import { WstethContractModule } from '@lido-nestjs/contracts';
import { SimpleFallbackJsonRpcBatchProvider } from '@lido-nestjs/execution';
import { Module } from '@nestjs/common';
import { WstethService } from './wsteth.service';

@Module({
  imports: [
    WstethContractModule.forFeatureAsync({
      inject: [SimpleFallbackJsonRpcBatchProvider],
      async useFactory(provider) {
        return { provider };
      },
    }),
  ],
  providers: [WstethService],
  exports: [WstethService],
})
export class WstethModule {}
