import { Controller, Get, Header, Version } from '@nestjs/common';
import { ApiResponse, ApiTags } from '@nestjs/swagger';
import { SUPPLY_CACHE_CONTROL } from 'http/common/cache';
import { TokensService } from 'tokens';

@Controller('plain')
@ApiTags('Plain Circ Supply')
export class SupplyCircPlainController {
  constructor(protected readonly tokensService: TokensService) {}

  @Version('1')
  @Get('ldo')
  @Header('content-type', 'text/html')
  @Header('Cache-Control', SUPPLY_CACHE_CONTROL)
  @ApiResponse({
    status: 200,
    description: 'Returns LDO circ supply information',
  })
  ldoCircSupplyV1(): string {
    return this.tokensService.getTokenPlainCircSupply('ldo');
  }

  @Version('1')
  @Get('steth')
  @Header('content-type', 'text/html')
  @Header('Cache-Control', SUPPLY_CACHE_CONTROL)
  @ApiResponse({
    status: 200,
    description: 'Returns stETH circ supply information',
  })
  stethCircSupplyV1(): string {
    return this.tokensService.getTokenPlainCircSupply('steth');
  }

  @Version('1')
  @Get('wsteth')
  @Header('content-type', 'text/html')
  @Header('Cache-Control', SUPPLY_CACHE_CONTROL)
  @ApiResponse({
    status: 200,
    description: 'Returns wstETH circ supply information',
  })
  wstethCircSupplyV1(): string {
    return this.tokensService.getTokenPlainCircSupply('wsteth');
  }
}
