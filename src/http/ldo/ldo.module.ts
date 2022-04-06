import { Module } from '@nestjs/common';

import { LdoController } from './ldo.controller';
import { LdoService } from './ldo.service';
import { LdoBalanceService } from './ldo-balance.service';
import { LdoBurnsService } from './ldo-burns.service';
import { LdoVestingCalcsService } from './vesting-calcs.service';
import { LdoVestingMembersService } from './vesting-members.service';
import { LdoVestingVestingsService } from './vesting-vestings.service';
import { LdoVestingService } from './vesting.service';
import { LdoTreasuryService } from './treasury.service';

@Module({
  controllers: [LdoController],
  providers: [
    LdoService,
    LdoBalanceService,
    LdoBurnsService,
    LdoVestingService,
    LdoVestingCalcsService,
    LdoVestingMembersService,
    LdoVestingVestingsService,
    LdoTreasuryService,
  ],
})
export class LdoModule {}
