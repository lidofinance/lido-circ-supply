import { Module } from '@nestjs/common';
import { WstethController } from './wsteth.controller';
import { WstethService } from './wsteth.service';

@Module({
  controllers: [WstethController],
  providers: [WstethService],
})
export class WstethModule {}
