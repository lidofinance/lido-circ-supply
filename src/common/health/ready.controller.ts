import { HealthCheckService, HealthCheck, HealthCheckError, HealthIndicatorResult } from '@nestjs/terminus';
import { Controller, Get, Inject } from '@nestjs/common';
import { ApiExcludeController } from '@nestjs/swagger';
import { TOKEN_SERVICES, TokenService } from 'tokens';
import { StorageService } from 'storage';
import { READY_URL } from './health.constants';

@Controller(READY_URL)
@ApiExcludeController()
export class ReadyController {
  constructor(
    @Inject(TOKEN_SERVICES) protected readonly servicesList: TokenService[],

    protected readonly health: HealthCheckService,
    protected readonly storageService: StorageService,
  ) {}

  @Get()
  @HealthCheck()
  check() {
    return this.health.check([async () => this.checkTokensData()]);
  }

  /**
   * Reports `up` only after the update cycle has stored data for every token,
   * so k8s does not route traffic to a pod that still responds with 503
   */
  protected checkTokensData(): HealthIndicatorResult {
    const missingTokens = this.servicesList
      .map((service) => service.tokenName)
      .filter((tokenName) => this.storageService.get(tokenName) == null);

    const isReady = missingTokens.length === 0;
    const result: HealthIndicatorResult = {
      tokensData: { status: isReady ? 'up' : 'down', missingTokens },
    };

    if (!isReady) {
      throw new HealthCheckError('Tokens data is not collected yet', result);
    }

    return result;
  }
}
