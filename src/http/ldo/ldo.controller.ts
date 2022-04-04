import { Controller, Get, Version } from '@nestjs/common';
import { ApiResponse, ApiTags } from '@nestjs/swagger';
import { LdoService } from './ldo.service';
import { TokenCircSupplyV1 } from '../token/token.entity';

@Controller('/')
@ApiTags('Lido Tokens Supply')
export class LdoController {
  constructor(private readonly ldoService: LdoService) {}

  @Version('1')
  @Get('/ldo')
  @ApiResponse({
    status: 200,
    description: 'Returns LDO supply information',
    type: TokenCircSupplyV1,
  })
  async ldoCircSupplyV1(): Promise<TokenCircSupplyV1> {
    return await this.ldoService.getLastSupplyData();
  }
}
