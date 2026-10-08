import { Controller, Get, Header, Version } from '@nestjs/common';
import { ApiResponse, ApiTags } from '@nestjs/swagger';
import { SUPPLY_CACHE_CONTROL } from 'http/common/cache';
import { SupplyEntity } from './supply.entity';
import { TokensService } from 'tokens';

@Controller('detailed')
@ApiTags('Detailed Supply Data')
export class SupplyJsonController {
  constructor(protected readonly tokensService: TokensService) {}

  @Version('1')
  @Get('ldo')
  @Header('Cache-Control', SUPPLY_CACHE_CONTROL)
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
  @Header('Cache-Control', SUPPLY_CACHE_CONTROL)
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
  @Header('Cache-Control', SUPPLY_CACHE_CONTROL)
  @ApiResponse({
    status: 200,
    description: 'Returns wstETH supply information',
    type: SupplyEntity,
  })
  wstethCircSupplyV1(): SupplyEntity {
    return this.tokensService.getTokenData('wsteth');
  }
}
