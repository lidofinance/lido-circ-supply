import { Module } from '@nestjs/common';
import { StethController } from './steth.controller';
import { StethService } from './steth.service';

@Module({
  controllers: [StethController],
  providers: [StethService],
})
export class StethModule {}
