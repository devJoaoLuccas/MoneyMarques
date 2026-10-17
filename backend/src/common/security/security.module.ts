import { Global, Module } from '@nestjs/common';
import { APP_GUARD } from '@nestjs/core';
import { CsrfGuard } from './csrf.guard';
import { RateLimiterService } from './rate-limiter.service';

@Global()
@Module({
  providers: [
    { provide: RateLimiterService, useFactory: () => new RateLimiterService() },
    { provide: APP_GUARD, useClass: CsrfGuard },
  ],
  exports: [RateLimiterService],
})
export class SecurityModule {}
