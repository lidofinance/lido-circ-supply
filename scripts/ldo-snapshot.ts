/**
 * Builds or checks src/tokens/ldo/snapshots/mainnet.json from mainnet LDO events.
 *
 *   EL_API_URLS=<archive rpc> yarn ldo-snapshot:check            rebuild up to the stored toBlock and compare
 *   EL_API_URLS=<archive rpc> yarn ldo-snapshot:update [toBlock]  rebuild up to toBlock (default: finalized) and save
 */
import { readFileSync, writeFileSync } from 'fs';
import { join } from 'path';
import { StaticJsonRpcProvider } from '@ethersproject/providers';
import { CHAINS } from '@lido-nestjs/constants';
import {
  ARAGON_TOKEN_MANAGER_CONTRACT_ADDRESSES,
  AragonTokenManager__factory,
  LDO_CONTRACT_ADDRESSES,
  Ldo__factory,
} from '@lido-nestjs/contracts';
import { LDO_DEPLOY_BLOCK } from 'tokens/ldo/ldo.constants';
import { fetchBurnsAddresses, fetchVestingMembers } from 'tokens/ldo/ldo-events';
import type { LdoEventsSnapshot } from 'tokens/ldo/ldo-snapshot';

const CHAIN_ID = CHAINS.Mainnet;
const SNAPSHOT_PATH = join(__dirname, '..', 'src', 'tokens', 'ldo', 'snapshots', 'mainnet.json');
const RPC_ATTEMPTS = 3;

// A full scan makes ~9k calls, so one transient RPC error must not fail the run
class RetryingProvider extends StaticJsonRpcProvider {
  async send(method: string, params: unknown[]): Promise<unknown> {
    for (let attempt = 1; ; attempt++) {
      try {
        return await super.send(method, params);
      } catch (error) {
        if (attempt >= RPC_ATTEMPTS) throw error;
        await new Promise((resolve) => setTimeout(resolve, attempt * 1000));
      }
    }
  }
}

const buildSnapshot = async (provider: StaticJsonRpcProvider, toBlock: number): Promise<LdoEventsSnapshot> => {
  const ldoContract = Ldo__factory.connect(LDO_CONTRACT_ADDRESSES[CHAIN_ID], provider);
  const tmContract = AragonTokenManager__factory.connect(ARAGON_TOKEN_MANAGER_CONTRACT_ADDRESSES[CHAIN_ID], provider);
  const fromBlock = LDO_DEPLOY_BLOCK[CHAIN_ID];

  const [burnsAddresses, vestingMembers] = await Promise.all([
    fetchBurnsAddresses(ldoContract, fromBlock, toBlock),
    fetchVestingMembers(tmContract, fromBlock, toBlock),
  ]);

  return { toBlock, burnsAddresses: [...burnsAddresses].sort(), vestingMembers: [...vestingMembers].sort() };
};

const reportDiff = (field: string, stored: string[], actual: string[]): void => {
  const missing = actual.filter((address) => !stored.includes(address));
  const extra = stored.filter((address) => !actual.includes(address));

  if (missing.length) console.error(`${field}: missing in snapshot`, missing);
  if (extra.length) console.error(`${field}: not on chain`, extra);
};

const main = async (): Promise<void> => {
  const [command, toBlockArg] = process.argv.slice(2);
  const rpcUrl = process.env.EL_API_URLS?.split(',')[0];

  if (!rpcUrl || !['check', 'update'].includes(command)) {
    console.error('Usage: EL_API_URLS=<archive rpc> ldo-snapshot.ts check | update [toBlock]');
    process.exit(1);
  }

  const provider = new RetryingProvider(rpcUrl, CHAIN_ID);
  const finalizedBlock = (await provider.getBlock('finalized')).number;

  if (command === 'update') {
    const toBlock = toBlockArg ? Number(toBlockArg) : finalizedBlock;

    if (!Number.isInteger(toBlock) || toBlock > finalizedBlock) {
      throw new Error(`toBlock ${toBlockArg} must be an integer not above the finalized block ${finalizedBlock}`);
    }

    const snapshot = await buildSnapshot(provider, toBlock);
    writeFileSync(SNAPSHOT_PATH, `${JSON.stringify(snapshot, null, 2)}\n`);

    console.log(
      `Saved snapshot up to block ${toBlock}: ${snapshot.burnsAddresses.length} burns addresses, ` +
        `${snapshot.vestingMembers.length} vesting members`,
    );
    return;
  }

  const stored: LdoEventsSnapshot = JSON.parse(readFileSync(SNAPSHOT_PATH, 'utf8'));

  if (stored.toBlock > finalizedBlock) {
    throw new Error(`Snapshot toBlock ${stored.toBlock} is above the finalized block ${finalizedBlock}`);
  }

  const actual = await buildSnapshot(provider, stored.toBlock);

  if (JSON.stringify(stored) !== JSON.stringify(actual)) {
    reportDiff('burnsAddresses', stored.burnsAddresses, actual.burnsAddresses);
    reportDiff('vestingMembers', stored.vestingMembers, actual.vestingMembers);
    console.error(`Snapshot does not match chain data up to block ${stored.toBlock}`);
    process.exit(1);
  }

  console.log(`Snapshot matches chain data up to block ${stored.toBlock}`);
};

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
