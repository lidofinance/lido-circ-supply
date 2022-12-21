import { Module } from '@nestjs/common';
import { TokensModule } from 'tokens';

import { SupplyCircPlainController } from './supply-plain-circ.controller';
import { SupplyTotalPlainController } from './supply-plain-total.controller';
import { SupplyJsonController } from './supply-json.controller';

@Module({
  imports: [TokensModule],
  controllers: [
    SupplyCircPlainController,
    SupplyTotalPlainController,
    SupplyJsonController,
  ],
})
export class SupplyModule {}
