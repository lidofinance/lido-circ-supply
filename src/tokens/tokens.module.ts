import { Module } from '@nestjs/common';
import { TokensService } from './tokens.service';
import { LdoModule, LdoService } from './ldo';
import { StethModule, StethService } from './steth';
import { WstethModule, WstethService } from './wsteth';
import { TOKEN_SERVICES } from './tokens.constants';
import { StorageModule } from 'storage';

@Module({
  imports: [LdoModule, StethModule, WstethModule, StorageModule],
  providers: [
    TokensService,
    {
      provide: TOKEN_SERVICES,
      inject: [LdoService, StethService, WstethService],
      useFactory(ldoService: LdoService, stethService: StethService, wstethService: WstethService) {
        return [ldoService, stethService, wstethService];
      },
    },
  ],
  exports: [TokensService, TOKEN_SERVICES],
})
export class TokensModule {}
