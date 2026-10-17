import { Module } from '@nestjs/common';
import { SecurityModule } from './common/security/security.module';
import { AppConfigModule } from './config/app-config.module';
import { AuditModule } from './modules/audit/audit.module';
import { AuthModule } from './modules/auth/auth.module';
import { FamilyModule } from './modules/family/family.module';
import { MailModule } from './modules/mail/mail.module';
import { PainelModule } from './modules/painel/painel.module';
import { PrismaModule } from './prisma/prisma.module';

@Module({
  imports: [
    AppConfigModule,
    PrismaModule,
    SecurityModule,
    AuditModule,
    MailModule,
    AuthModule,
    FamilyModule,
    PainelModule,
  ],
})
export class AppModule {}
