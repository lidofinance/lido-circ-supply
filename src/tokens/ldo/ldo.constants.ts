import { CHAINS } from '@lido-nestjs/constants';

export const OVERLAPPING_REORG_OFFSET = 10;

export const LDO_DEPLOY_BLOCK: Partial<Record<CHAINS, number>> = {
  [CHAINS.Mainnet]: 11_473_216,
  [CHAINS.Hoodi]: 727,
};
