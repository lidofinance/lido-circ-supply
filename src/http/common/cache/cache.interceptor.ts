import { CacheInterceptor } from '@nestjs/cache-manager';
import { ExecutionContext, Injectable } from '@nestjs/common';
import { SKIP_CACHE_KEY } from './skip-cache.decorator';

@Injectable()
export class SkippableCacheInterceptor extends CacheInterceptor {
  protected trackBy(context: ExecutionContext): string | undefined {
    const shouldSkip = this.reflector.getAllAndOverride<boolean>(SKIP_CACHE_KEY, [
      context.getHandler(),
      context.getClass(),
    ]);

    if (shouldSkip) {
      return undefined;
    }

    return super.trackBy(context);
  }
}
