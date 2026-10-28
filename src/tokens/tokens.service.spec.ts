import { ServiceUnavailableException } from '@nestjs/common';
import { BigNumber } from '@ethersproject/bignumber';
import { parseEther } from '@ethersproject/units';
import { StorageService } from 'storage';
import { TokensService } from './tokens.service';

const block = { number: 100, hash: '0xabc', timestamp: 1_700_000_000 } as any;
const logger = { log: jest.fn(), debug: jest.fn(), warn: jest.fn(), error: jest.fn() };

describe('TokensService', () => {
  let service: TokensService;
  let tokenInfo: { set: jest.Mock };

  beforeEach(() => {
    tokenInfo = { set: jest.fn() };
    service = new TokensService(logger as any, { tokenInfo } as any, new StorageService());
  });

  it('responds with 503 until data for the token is collected', () => {
    const error = new ServiceUnavailableException('No data collected for ldo yet');

    expect(() => service.getTokenData('ldo')).toThrow(error);
    expect(() => service.getTokenPlainCircSupply('ldo')).toThrow(error);
    expect(() => service.getTokenPlainTotalSupply('ldo')).toThrow(error);
  });

  describe('with saved data', () => {
    beforeEach(() => {
      service.saveTokenData('ldo', block, {
        decimals: 18,
        totalSupply: parseEther('1000000'),
        circSupply: parseEther('999900.5'),
      });
    });

    it('stores supplies as hex strings with the block info', () => {
      expect(service.getTokenData('ldo')).toEqual({
        totalSupply: parseEther('1000000').toHexString(),
        circSupply: parseEther('999900.5').toHexString(),
        decimals: 18,
        blockNumber: 100,
        blockHash: '0xabc',
        blockTimestamp: 1_700_000_000,
      });
    });

    it('formats plain supplies as decimal strings', () => {
      expect(service.getTokenPlainCircSupply('ldo')).toBe('999900.5');
      expect(service.getTokenPlainTotalSupply('ldo')).toBe('1000000.0');
    });

    it('keeps tokens separate', () => {
      expect(() => service.getTokenData('steth')).toThrow(ServiceUnavailableException);
    });

    it('updates the token metrics', () => {
      expect(tokenInfo.set).toHaveBeenCalledWith({ token: 'ldo', field: 'total-supply' }, 1_000_000);
      expect(tokenInfo.set).toHaveBeenCalledWith({ token: 'ldo', field: 'circ-supply' }, 999_900.5);
      expect(tokenInfo.set).toHaveBeenCalledWith({ token: 'ldo', field: 'update-timestamp' }, 1_700_000_000);
    });

    it('replaces the data on the next save', () => {
      const nextBlock = { ...block, number: 101, hash: '0xdef' };
      service.saveTokenData('ldo', nextBlock, {
        decimals: 18,
        totalSupply: BigNumber.from(1),
        circSupply: BigNumber.from(1),
      });

      expect(service.getTokenData('ldo')).toMatchObject({ blockNumber: 101, blockHash: '0xdef', totalSupply: '0x01' });
    });
  });

  it('respects token decimals', () => {
    service.saveTokenData('six', block, {
      decimals: 6,
      totalSupply: BigNumber.from(1_500_000),
      circSupply: BigNumber.from(1),
    });

    expect(service.getTokenPlainTotalSupply('six')).toBe('1.5');
    expect(service.getTokenPlainCircSupply('six')).toBe('0.000001');
  });
});
