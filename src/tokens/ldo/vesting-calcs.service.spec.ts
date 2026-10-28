import { BigNumber } from '@ethersproject/bignumber';
import { LdoVestingCalcsService } from './vesting-calcs.service';
import { VestingInfo } from './interfaces';

// Mirrors TokenManager.sol: nothing vests before the cliff, everything is vested
// at `vesting`, and in between vesting is linear from `start`
const vesting = (overrides: Partial<VestingInfo> = {}): VestingInfo => ({
  amount: BigNumber.from(1000),
  start: 100,
  cliff: 200,
  vesting: 600,
  revokable: true,
  ...overrides,
});

const logger = { log: jest.fn(), debug: jest.fn(), warn: jest.fn(), error: jest.fn() };

describe('LdoVestingCalcsService', () => {
  const service = new LdoVestingCalcsService(logger as any);
  const member = '0x000000000000000000000000000000000000000a';
  const otherMember = '0x000000000000000000000000000000000000000b';

  const lockedAt = (timestamp: number, vestings = [vesting()], burns = new Set<string>(), balances = new Map()) =>
    service.calculateLockedTokens(new Map([[member, vestings]]), burns, balances, timestamp).toNumber();

  describe('one vesting', () => {
    it.each([
      ['before start', 50, 1000],
      ['before cliff', 199, 1000],
      ['at cliff: 100 of 500 seconds elapsed', 200, 800],
      ['half way', 350, 500],
      ['rounds vested tokens down', 233, 734],
      ['at the end', 600, 0],
      ['after the end', 700, 0],
    ])('%s', (_, timestamp, expected) => {
      expect(lockedAt(timestamp)).toBe(expected);
    });

    it('is fully locked before the cliff even when the cliff is after the end', () => {
      expect(lockedAt(550, [vesting({ cliff: 650 })])).toBe(1000);
      expect(lockedAt(650, [vesting({ cliff: 650 })])).toBe(0);
    });
  });

  it('sums the non-vested amount of all member vestings', () => {
    expect(lockedAt(350, [vesting(), vesting({ amount: BigNumber.from(100), cliff: 400 })])).toBe(600);
  });

  it('sums locked tokens across members', () => {
    const vestings = new Map([
      [member, [vesting()]],
      [otherMember, [vesting({ amount: BigNumber.from(10) })]],
    ]);

    expect(service.calculateLockedTokens(vestings, new Set(), new Map(), 350).toNumber()).toBe(505);
  });

  describe('burned tokens', () => {
    it('caps locked tokens at the balance of a member whose tokens were burned', () => {
      const balances = new Map([[member, BigNumber.from(300)]]);
      expect(lockedAt(350, [vesting()], new Set([member]), balances)).toBe(300);
    });

    it('keeps the non-vested amount when the balance covers it', () => {
      const balances = new Map([[member, BigNumber.from(5000)]]);
      expect(lockedAt(350, [vesting()], new Set([member]), balances)).toBe(500);
    });

    it('ignores the balance of members without burns', () => {
      const balances = new Map([[member, BigNumber.from(1)]]);
      expect(lockedAt(350, [vesting()], new Set(), balances)).toBe(500);
    });

    it('throws when the balance of a burned member was not fetched', () => {
      expect(() => lockedAt(350, [vesting()], new Set([member]), new Map())).toThrow("Balance can't be null");
    });
  });

  it('returns zero without vestings', () => {
    expect(service.calculateLockedTokens(new Map(), new Set(), new Map(), 350).toNumber()).toBe(0);
  });
});
