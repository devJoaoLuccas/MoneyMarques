import { Module } from '@nestjs/common';
import { AuditModule } from '../audit/audit.module';
import { AuthModule } from '../auth/auth.module';
import { MailModule } from '../mail/mail.module';
import { FamilyController } from './family.controller';
import { FamilyContextGuard } from './guards/family-context.guard';
import { InvitesController } from './invites.controller';
import { FamilyMailer } from './services/family-mailer.service';
import { FamilyService } from './services/family.service';
import { InvitesService } from './services/invites.service';
import { MembersService } from './services/members.service';

/** Modulo 02: Gestao Familiar (FAM-001 a FAM-006, RF-001/RF-002). */
@Module({
  imports: [AuthModule, AuditModule, MailModule],
  controllers: [FamilyController, InvitesController],
  providers: [
    FamilyService,
    MembersService,
    InvitesService,
    FamilyMailer,
    FamilyContextGuard,
  ],
})
export class FamilyModule {}
