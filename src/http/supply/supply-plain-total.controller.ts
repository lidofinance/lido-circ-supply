import { Controller, Get, Header, Version } from '@nestjs/common';
import { ApiResponse, ApiTags } from '@nestjs/swagger';
import { TokensService } from 'tokens';

@Controller('plain/total')
@ApiTags('Plain Total Supply')
export class SupplyTotalPlainController {
  constructor(protected readonly tokensService: TokensService) {}
  @Version('1')
  @Get('ldo')
  @Header('content-type', 'text/html')
  @ApiResponse({
    status: 200,
    description: 'Returns LDO total supply information',
  })
  ldoTotalSupplyV1(): string {
    return this.tokensService.getTokenPlainTotalSupply('ldo');
  }

  @Version('1')
  @Get('steth')
  @Header('content-type', 'text/html')
  @ApiResponse({
    status: 200,
    description: 'Returns stETH total supply information',
  })
  stethTotalSupplyV1(): string {
    return this.tokensService.getTokenPlainTotalSupply('steth');
  }

  @Version('1')
  @Get('wsteth')
  @Header('content-type', 'text/html')
  @ApiResponse({
    status: 200,
    description: 'Returns wstETH total supply information',
  })
  wstethTotalSupplyV1(): string {
    return this.tokensService.getTokenPlainTotalSupply('wsteth');
  }
}
