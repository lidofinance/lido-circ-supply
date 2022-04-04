import { Controller, Get, Version } from '@nestjs/common';
import { ApiResponse, ApiTags } from '@nestjs/swagger';
import { StethService } from './steth.service';
import { TokenCircSupplyV1 } from '../token/token.entity';

@Controller('/')
@ApiTags('Lido Tokens Supply')
export class StethController {
  constructor(private readonly stethService: StethService) {}

  @Version('1')
  @Get('steth')
  @ApiResponse({
    status: 200,
    description: 'Returns stETH supply information',
    type: TokenCircSupplyV1,
  })
  async stethCircSupplyV1(): Promise<TokenCircSupplyV1> {
    return await this.stethService.getLastSupplyData();
  }
}
