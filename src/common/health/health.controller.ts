import { HealthCheckService, MemoryHealthIndicator, HealthCheck } from '@nestjs/terminus';
import { Controller, Get } from '@nestjs/common';
import { ApiExcludeController } from '@nestjs/swagger';
import { SkipCache } from 'http/common/cache';
import { HEALTH_URL } from './health.constants';

@Controller(HEALTH_URL)
@ApiExcludeController()
@SkipCache()
export class HealthController {
  constructor(
    protected health: HealthCheckService,
    protected memory: MemoryHealthIndicator,
  ) {}

  @Get()
  @HealthCheck()
  check() {
    return this.health.check([async () => this.memory.checkHeap('memoryHeap', 1024 * 1024 * 1024)]);
  }
}
