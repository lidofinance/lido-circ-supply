import { Controller, Get, Version } from '@nestjs/common';
import { ApiResponse, ApiTags } from '@nestjs/swagger';
import { TokenCircSupply } from './token.entity';
import { TokenService } from './token.service';

@Controller('detailed')
@ApiTags('Detailed Supply Data')
export class TokenJsonController {
  constructor(private readonly tokenService: TokenService) {}

  @Version('1')
  @Get('ldo')
  @ApiResponse({
    status: 200,
    description: 'Returns LDO supply information',
    type: TokenCircSupply,
  })
  ldoCircSupplyV1(): TokenCircSupply {
    return this.tokenService.getTokenData('ldo');
  }

  @Version('1')
  @Get('steth')
  @ApiResponse({
    status: 200,
    description: 'Returns stETH supply information',
    type: TokenCircSupply,
  })
  stethCircSupplyV1(): TokenCircSupply {
    return this.tokenService.getTokenData('steth');
  }

  @Version('1')
  @Get('wsteth')
  @ApiResponse({
    status: 200,
    description: 'Returns wstETH supply information',
    type: TokenCircSupply,
  })
  wstethCircSupplyV1(): TokenCircSupply {
    return this.tokenService.getTokenData('wsteth');
  }
}
