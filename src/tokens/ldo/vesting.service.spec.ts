import { BigNumber } from '@ethersproject/bignumber';
import { LdoVestingService } from './vesting.service';
import { LdoVestingCalcsService } from './vesting-calcs.service';
import { LdoVestingMembersService } from './vesting-members.service';
import { LdoVestingVestingsService } from './vesting-vestings.service';
import { LdoBurnsService } from './ldo-burns.service';
import { LdoBalanceService } from './ldo-balance.service';
import { OVERLAPPING_REORG_OFFSET } from './ldo.constants';

// The whole LDO locked-amount pipeline against fake contracts: event scans,
// per-member vesting fetches, burned balances and the final calculation
const ALICE = '0x000000000000000000000000000000000000a11c';
const BOB = '0x0000000000000000000000000000000000000b0b';

const block = (number: number, timestamp: number) => ({ number, hash: `0x${number}`, timestamp }) as any;
const vesting = { amount: BigNumber.from(1000), start: 100, cliff: 200, vesting: 600, revokable: true };
const bnFields = (info: typeof vesting) => ({
  ...info,
  start: BigNumber.from(info.start),
  cliff: BigNumber.from(info.cliff),
  vesting: BigNumber.from(info.vesting),
});

type Events = { newVesting: string[]; revokeVesting: string[]; burns: string[] };

const createFixture = () => {
  const logger = { log: jest.fn(), debug: jest.fn(), warn: jest.fn(), error: jest.fn() };
  const prometheus = { tokenInfo: { set: jest.fn() } };

  const events: Events = { newVesting: [], revokeVesting: [], burns: [] };
  const vestings = new Map<string, (typeof vesting)[]>();
  const balances = new Map<string, BigNumber>();

  const tmContract = {
    filters: { NewVesting: () => 'newVesting', RevokeVesting: () => 'revokeVesting' },
    queryFilter: jest.fn(async (filter: 'newVesting' | 'revokeVesting') =>
      events[filter].map((receiver) => ({ args: { receiver } })),
    ),
    vestingsLengths: jest.fn(async (member: string) => BigNumber.from(vestings.get(member)?.length ?? 0)),
    getVesting: jest.fn(async (member: string, id: number) => bnFields(vestings.get(member)[id])),
  };

  const ldoContract = {
    filters: { Transfer: () => 'burns' },
    queryFilter: jest.fn(async () => events.burns.map((from) => ({ args: { _from: from } }))),
    balanceOf: jest.fn(async (holder: string) => balances.get(holder) ?? BigNumber.from(0)),
  };

  const service = new LdoVestingService(
    logger as any,
    new LdoVestingCalcsService(logger as any),
    new LdoVestingMembersService(logger as any, tmContract as any, prometheus as any),
    new LdoVestingVestingsService(logger as any, tmContract as any, prometheus as any),
    new LdoBurnsService(logger as any, ldoContract as any, prometheus as any),
    new LdoBalanceService(logger as any, ldoContract as any),
  );

  return { service, events, vestings, balances, tmContract, ldoContract, prometheus };
};

const scannedRanges = (queryFilter: jest.Mock) => queryFilter.mock.calls.map(([, from, to]) => [from, to]);

describe('LdoVestingService', () => {
  let fixture: ReturnType<typeof createFixture>;

  beforeEach(() => {
    fixture = createFixture();
  });

  it('scans from genesis and sums the locked tokens of all members', async () => {
    fixture.events.newVesting = [ALICE, BOB];
    fixture.vestings.set(ALICE, [vesting]);
    fixture.vestings.set(BOB, [vesting, { ...vesting, amount: BigNumber.from(100), cliff: 400 }]);

    const locked = await fixture.service.collectLockedAmount(block(1000, 350));

    expect(locked.toNumber()).toBe(500 + 500 + 100);
    expect(scannedRanges(fixture.tmContract.queryFilter)).toEqual([
      [0, 1000],
      [0, 1000],
    ]);
    expect(scannedRanges(fixture.ldoContract.queryFilter)).toEqual([[0, 1000]]);
    expect(fixture.ldoContract.balanceOf).not.toHaveBeenCalled();
  });

  it('caps the locked tokens of a member whose tokens were burned at their balance', async () => {
    fixture.events.newVesting = [ALICE];
    fixture.events.burns = [ALICE];
    fixture.vestings.set(ALICE, [vesting]);
    fixture.balances.set(ALICE, BigNumber.from(300));

    const locked = await fixture.service.collectLockedAmount(block(1000, 350));

    expect(locked.toNumber()).toBe(300);
    expect(fixture.ldoContract.balanceOf).toHaveBeenCalledWith(ALICE, { blockTag: { blockHash: '0x1000' } });
  });

  it('reads contract state at the block hash of the cycle', async () => {
    fixture.events.newVesting = [ALICE];
    fixture.vestings.set(ALICE, [vesting]);

    await fixture.service.collectLockedAmount(block(1000, 350));

    const overrides = { blockTag: { blockHash: '0x1000' } };
    expect(fixture.tmContract.vestingsLengths).toHaveBeenCalledWith(ALICE, overrides);
    expect(fixture.tmContract.getVesting).toHaveBeenCalledWith(ALICE, 0, overrides);
  });

  it('rescans from the last block minus the reorg offset and refetches members with new events', async () => {
    fixture.events.newVesting = [ALICE];
    fixture.vestings.set(ALICE, [vesting]);
    await fixture.service.collectLockedAmount(block(1000, 350));
    fixture.tmContract.queryFilter.mockClear();
    fixture.tmContract.vestingsLengths.mockClear();

    // Alice's vesting is revoked: the revoke event marks her for a refetch
    fixture.events.newVesting = [];
    fixture.events.revokeVesting = [ALICE];
    fixture.vestings.set(ALICE, []);

    const locked = await fixture.service.collectLockedAmount(block(1100, 360));

    expect(locked.toNumber()).toBe(0);
    expect(scannedRanges(fixture.tmContract.queryFilter)).toEqual([
      [1000 - OVERLAPPING_REORG_OFFSET, 1100],
      [1000 - OVERLAPPING_REORG_OFFSET, 1100],
    ]);
    expect(fixture.tmContract.vestingsLengths).toHaveBeenCalledTimes(1);
  });

  it('keeps cached vestings of members without new events', async () => {
    fixture.events.newVesting = [ALICE];
    fixture.vestings.set(ALICE, [vesting]);
    await fixture.service.collectLockedAmount(block(1000, 350));
    fixture.tmContract.vestingsLengths.mockClear();

    fixture.events.newVesting = [];
    const locked = await fixture.service.collectLockedAmount(block(1100, 400));

    expect(locked.toNumber()).toBe(400);
    expect(fixture.tmContract.vestingsLengths).not.toHaveBeenCalled();
  });
});
