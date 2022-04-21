import { Module } from '@nestjs/common';
import { TokensModule } from 'tokens';

import { SupplyPlainController } from './supply-plain.controller';
import { SupplyJsonController } from './supply-json.controller';

@Module({
  imports: [TokensModule],
  controllers: [SupplyPlainController, SupplyJsonController],
})
export class SupplyModule {}
