import { Global, Module } from '@nestjs/common';
import { AuthConfig } from './auth.config';

/** Expoe a configuracao validada do .env para toda a aplicacao. */
@Global()
@Module({
  providers: [
    { provide: AuthConfig, useFactory: () => new AuthConfig(process.env) },
  ],
  exports: [AuthConfig],
})
export class AppConfigModule {}
