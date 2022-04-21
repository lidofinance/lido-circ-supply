import { Module } from '@nestjs/common';
import {
  AragonTokenManagerContractModule,
  LdoContractModule,
  LidoContractModule,
} from '@lido-nestjs/contracts';
import { SimpleFallbackJsonRpcBatchProvider } from '@lido-nestjs/execution';
import { LdoService } from './ldo.service';
import { LdoBalanceService } from './ldo-balance.service';
import { LdoBurnsService } from './ldo-burns.service';
import { LdoVestingCalcsService } from './vesting-calcs.service';
import { LdoVestingMembersService } from './vesting-members.service';
import { LdoVestingVestingsService } from './vesting-vestings.service';
import { LdoVestingService } from './vesting.service';
import { LdoTreasuryService } from './treasury.service';

const contractOptions = {
  async useFactory(provider: SimpleFallbackJsonRpcBatchProvider) {
    return { provider };
  },
  inject: [SimpleFallbackJsonRpcBatchProvider],
};

@Module({
  imports: [
    LdoContractModule.forFeatureAsync(contractOptions),
    LidoContractModule.forFeatureAsync(contractOptions),
    AragonTokenManagerContractModule.forFeatureAsync(contractOptions),
  ],
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
  exports: [LdoService],
})
export class LdoModule {}
