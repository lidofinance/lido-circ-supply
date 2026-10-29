import { CHAINS } from '@lido-nestjs/constants';
import * as mainnetSnapshot from './snapshots/mainnet.json';
import { LDO_DEPLOY_BLOCK } from './ldo.constants';

/**
 * Addresses derived from LDO events from the deploy block up to `toBlock` inclusive.
 * Generated and checked by `scripts/ldo-snapshot.ts`, never edited by hand
 */
export interface LdoEventsSnapshot {
  toBlock: number;
  burnsAddresses: string[];
  vestingMembers: string[];
}

export const LDO_EVENTS_SNAPSHOTS: Partial<Record<CHAINS, LdoEventsSnapshot>> = {
  [CHAINS.Mainnet]: mainnetSnapshot,
};

/**
 * Returns the block the first events scan starts from and the snapshot known before it
 */
export const getLdoScanStart = (chainId: number): { fromBlock: number; snapshot?: LdoEventsSnapshot } => {
  const snapshot = LDO_EVENTS_SNAPSHOTS[chainId];

  if (snapshot) {
    return { fromBlock: snapshot.toBlock + 1, snapshot };
  }

  return { fromBlock: LDO_DEPLOY_BLOCK[chainId] ?? 0 };
};
