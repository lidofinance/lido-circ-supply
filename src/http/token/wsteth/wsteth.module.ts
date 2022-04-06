import { Module } from '@nestjs/common';
import { WstethService } from './wsteth.service';

@Module({
  providers: [WstethService],
  exports: [WstethService],
})
export class WstethModule {}
