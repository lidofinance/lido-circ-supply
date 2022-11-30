import { Controller, Get, Header, Version } from '@nestjs/common';
import { ApiResponse, ApiTags } from '@nestjs/swagger';
import { TokensService } from 'tokens';

@Controller('plain')
@ApiTags('Plain Supply Data With Decimals')
export class SupplyPlainController {
  constructor(protected readonly tokensService: TokensService) {}

  @Version('1')
  @Get('ldo')
  @Header('content-type', 'text/html')
  @ApiResponse({
    status: 200,
    description: 'Returns LDO supply information',
  })
  ldoCircSupplyV1(): string {
    return this.tokensService.getTokenPlainCircSupply('ldo');
  }

  @Version('1')
  @Get('steth')
  @Header('content-type', 'text/html')
  @ApiResponse({
    status: 200,
    description: 'Returns stETH supply information',
  })
  stethCircSupplyV1(): string {
    return this.tokensService.getTokenPlainCircSupply('steth');
  }

  @Version('1')
  @Get('wsteth')
  @Header('content-type', 'text/html')
  @ApiResponse({
    status: 200,
    description: 'Returns wstETH supply information',
  })
  wstethCircSupplyV1(): string {
    return this.tokensService.getTokenPlainCircSupply('wsteth');
  }
}
