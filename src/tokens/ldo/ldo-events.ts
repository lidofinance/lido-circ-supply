import { AragonTokenManager, Ldo } from '@lido-nestjs/contracts';
import { AddressZero } from '@ethersproject/constants';
// Not from 'common/provider': its index loads the config module, which validates env on import
// and breaks scripts/ldo-snapshot.ts
import { queryFilterInChunks } from 'common/provider/query-filter-in-chunks';

/**
 * Collects addresses for which LDO tokens were burned in the block range
 */
export const fetchBurnsAddresses = async (
  ldoContract: Ldo,
  fromBlock: number,
  toBlock: number,
): Promise<Set<string>> => {
  const filter = ldoContract.filters.Transfer(null, AddressZero);

  const events = await queryFilterInChunks(fromBlock, toBlock, (chunkFromBlock, chunkToBlock) =>
    ldoContract.queryFilter(filter, chunkFromBlock, chunkToBlock),
  );

  return new Set(events.map((event) => event.args._from));
};

/**
 * Collects addresses which received or lost a vesting in the block range
 */
export const fetchVestingMembers = async (
  tmContract: AragonTokenManager,
  fromBlock: number,
  toBlock: number,
): Promise<Set<string>> => {
  /**
   * Since we get updates only for new blocks while the service is running,
   * we also look at RevokeVesting events to make sure that vestings will be
   * updated in the case of a vesting revoke
   */
  const newFilter = tmContract.filters.NewVesting();
  const revokeFilter = tmContract.filters.RevokeVesting();

  const [newEvents, revokeEvents] = await Promise.all([
    queryFilterInChunks(fromBlock, toBlock, (chunkFromBlock, chunkToBlock) =>
      tmContract.queryFilter(newFilter, chunkFromBlock, chunkToBlock),
    ),
    queryFilterInChunks(fromBlock, toBlock, (chunkFromBlock, chunkToBlock) =>
      tmContract.queryFilter(revokeFilter, chunkFromBlock, chunkToBlock),
    ),
  ]);

  return new Set([...newEvents, ...revokeEvents].map((event) => event.args.receiver));
};
