import { Module } from '@nestjs/common';
import { TokenPlainController } from './token-plain.controller';
import { TokenJsonController } from './token-json.controller';
import { TokenService } from './token.service';
import { LdoModule } from './ldo';
import { StethModule } from './steth';
import { WstethModule } from './wsteth';

@Module({
  imports: [LdoModule, StethModule, WstethModule],
  controllers: [TokenPlainController, TokenJsonController],
  providers: [TokenService],
})
export class TokenModule {}
