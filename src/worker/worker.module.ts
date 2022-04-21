import { Module } from '@nestjs/common';
import { WorkerService } from './worker.service';
import { TokensModule } from 'tokens';

@Module({
  imports: [TokensModule],
  providers: [WorkerService],
})
export class WorkerModule {}
