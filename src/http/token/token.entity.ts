import { ApiProperty } from '@nestjs/swagger';
import { BigNumber } from '@ethersproject/bignumber';

const example = {
  totalSupply: '0x0de0b6b3a7640000',
  circSupply: '0x0de0b6b3a7640000',
  blockNumber: 14500000,
  blockHash:
    '0xfeed3e175e482268db83d4fd87a43c708f40983343f4b039e582c6f6a95e0e78',
  blockTimestamp: 1648797020000,
};

export class TokenCircSupplyV1 {
  @ApiProperty({ example: example.totalSupply })
  totalSupply: string;

  @ApiProperty({ example: example.circSupply })
  circSupply: string;

  @ApiProperty({ example: example.blockNumber })
  blockNumber: number;

  @ApiProperty({ example: example.blockTimestamp })
  blockHash: string;

  @ApiProperty({ example: example.blockTimestamp })
  blockTimestamp: number;
}

export interface TokenCircSupplyDataV1 {
  totalSupply: BigNumber;
  circSupply: BigNumber;
}