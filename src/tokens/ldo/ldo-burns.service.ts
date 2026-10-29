import { Inject, Injectable, LoggerService } from '@nestjs/common';
import { LDO_CONTRACT_TOKEN, Ldo } from '@lido-nestjs/contracts';
import { LOGGER_PROVIDER } from '@lido-nestjs/logger';
import { Block } from '@ethersproject/abstract-provider';
import { ConfigService } from 'common/config';
import { PrometheusService } from 'common/prometheus';
import { OVERLAPPING_REORG_OFFSET } from './ldo.constants';
import { fetchBurnsAddresses } from './ldo-events';
import { getLdoScanStart } from './ldo-snapshot';

@Injectable()
export class LdoBurnsService {
  constructor(
    @Inject(LOGGER_PROVIDER) protected readonly logger: LoggerService,
    @Inject(LDO_CONTRACT_TOKEN) protected readonly ldoContract: Ldo,

    protected readonly prometheusService: PrometheusService,
    protected readonly configService: ConfigService,
  ) {}

  protected burnsAddresses = new Set<string>();
  protected lastFetchedBlock = null;

  /**
   * Collects addresses for which LDO tokens were burned
   */
  public async collectBurnsAddresses(blockInfo: Block): Promise<{
    updatedAddresses: Set<string>;
    allAddresses: Set<string>;
  }> {
    // Updates data with some blocks overlap to avoid possible reorganizations
    const fromBlockOffset = OVERLAPPING_REORG_OFFSET;
    const lastFetchedBlock = this.lastFetchedBlock ?? null;

    const scanStart = getLdoScanStart(this.configService.get('CHAIN_ID'));
    if (lastFetchedBlock === null) {
      this.mergeAddresses(new Set(scanStart.snapshot?.burnsAddresses));
    }

    const fromBlock = lastFetchedBlock ? lastFetchedBlock - fromBlockOffset : scanStart.fromBlock;
    const toBlock = blockInfo.number;

    this.logger.debug('Collecting token burns started', {
      fromBlock,
      toBlock,
    });

    const updatedAddresses = await fetchBurnsAddresses(this.ldoContract, fromBlock, toBlock);

    this.mergeAddresses(updatedAddresses);
    this.lastFetchedBlock = toBlock;
    const allAddresses = this.burnsAddresses;

    this.logger.debug('Token burns fetched', {
      updatedAddressesLength: updatedAddresses.size,
      allAddressesLength: allAddresses.size,
      fromBlock,
      toBlock,
    });

    this.prometheusService.tokenInfo.set({ token: 'ldo', field: 'burns' }, allAddresses.size);

    return { updatedAddresses, allAddresses };
  }

  /**
   * Merges updated addresses with the saved list
   */
  protected mergeAddresses(updatedAddresses: Set<string>): void {
    updatedAddresses.forEach((address) => this.burnsAddresses.add(address));
  }
}
