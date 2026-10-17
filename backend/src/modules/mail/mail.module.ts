import { Module } from '@nestjs/common';
import { join } from 'node:path';
import { AuthConfig } from '../../config/auth.config';
import { parseSmtpConfig } from '../../config/smtp.config';
import { createMailer } from './mail.factory';
import { MailPort } from './mail.port';

@Module({
  providers: [
    {
      provide: MailPort,
      inject: [AuthConfig],
      useFactory: (config: AuthConfig): MailPort =>
        createMailer({
          smtp: parseSmtpConfig(process.env),
          isProduction: config.isProduction,
          outboxDir:
            process.env.MAIL_OUTBOX_DIR ?? join(process.cwd(), '.dev-outbox'),
        }),
    },
  ],
  exports: [MailPort],
})
export class MailModule {}
