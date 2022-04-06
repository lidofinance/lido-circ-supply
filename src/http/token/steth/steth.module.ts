import { Module } from '@nestjs/common';
import { StethService } from './steth.service';

@Module({
  providers: [StethService],
  exports: [StethService],
})
export class StethModule {}
