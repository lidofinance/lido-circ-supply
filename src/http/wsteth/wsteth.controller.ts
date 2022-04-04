import { Controller, Get, Version } from '@nestjs/common';
import { ApiResponse, ApiTags } from '@nestjs/swagger';
import { WstethService } from './wsteth.service';
import { TokenCircSupplyV1 } from '../token/token.entity';

@Controller('/')
@ApiTags('Lido Tokens Supply')
export class WstethController {
  constructor(private readonly wstethService: WstethService) {}

  @Version('1')
  @Get('/wsteth')
  @ApiResponse({
    status: 200,
    description: 'Returns wstETH supply information',
    type: TokenCircSupplyV1,
  })
  async wstethCircSupplyV1(): Promise<TokenCircSupplyV1> {
    return await this.wstethService.getLastSupplyData();
  }
}
