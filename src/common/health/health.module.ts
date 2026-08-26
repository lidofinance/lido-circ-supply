import { Module } from '@nestjs/common';
import { TerminusModule } from '@nestjs/terminus';
import { TokensModule } from 'tokens';
import { StorageModule } from 'storage';
import { HealthController } from './health.controller';
import { ReadyController } from './ready.controller';

@Module({
  providers: [],
  controllers: [HealthController, ReadyController],
  imports: [TerminusModule, TokensModule, StorageModule],
})
export class HealthModule {}
