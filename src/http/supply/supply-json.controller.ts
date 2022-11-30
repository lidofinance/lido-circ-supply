import { Controller, Get, Version } from '@nestjs/common';
import { ApiResponse, ApiTags } from '@nestjs/swagger';
import { SupplyEntity } from './supply.entity';
import { TokensService } from 'tokens';

@Controller('detailed')
@ApiTags('Detailed Supply Data')
export class SupplyJsonController {
  constructor(protected readonly tokensService: TokensService) {}

  @Version('1')
  @Get('ldo')
  @ApiResponse({
    status: 200,
    description: 'Returns LDO supply information',
    type: SupplyEntity,
  })
  ldoCircSupplyV1(): SupplyEntity {
    return this.tokensService.getTokenData('ldo');
  }

  @Version('1')
  @Get('steth')
  @ApiResponse({
    status: 200,
    description: 'Returns stETH supply information',
    type: SupplyEntity,
  })
  stethCircSupplyV1(): SupplyEntity {
    return this.tokensService.getTokenData('steth');
  }

  @Version('1')
  @Get('wsteth')
  @ApiResponse({
    status: 200,
    description: 'Returns wstETH supply information',
    type: SupplyEntity,
  })
  wstethCircSupplyV1(): SupplyEntity {
    return this.tokensService.getTokenData('wsteth');
  }
}
