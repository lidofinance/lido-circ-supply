import { Module } from '@nestjs/common';

import { LdoController } from './ldo.controller';
import { LdoService } from './ldo.service';
import { LdoVestingService } from './vesting.service';

@Module({
  controllers: [LdoController],
  providers: [LdoService, LdoVestingService],
})
export class LdoModule {}
