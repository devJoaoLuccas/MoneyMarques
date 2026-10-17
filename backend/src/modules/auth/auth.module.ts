import { Module } from '@nestjs/common';
import { AuditModule } from '../audit/audit.module';
import { MailModule } from '../mail/mail.module';
import { AuthController } from './auth.controller';
import { AuthGuard } from './guards/auth.guard';
import { MfaController } from './mfa.controller';
import { AuthContextService } from './services/auth-context.service';
import { AuthMailer } from './services/auth-mailer.service';
import { AuthService } from './services/auth.service';
import { EmailVaultService } from './services/email-vault.service';
import { EmailVerificationService } from './services/email-verification.service';
import { MfaSecretCipher } from './services/mfa-secret-cipher.service';
import { MfaService } from './services/mfa.service';
import { PasswordHasher } from './services/password-hasher.service';
import { PasswordResetService } from './services/password-reset.service';
import { SessionCookieService } from './services/session-cookie.service';
import { SessionViewService } from './services/session-view.service';
import { SessionService } from './services/session.service';
import { TokenService } from './services/token.service';
import { TotpService } from './services/totp.service';

@Module({
  imports: [AuditModule, MailModule],
  controllers: [AuthController, MfaController],
  providers: [
    AuthService,
    AuthContextService,
    AuthMailer,
    EmailVaultService,
    EmailVerificationService,
    MfaSecretCipher,
    MfaService,
    PasswordHasher,
    PasswordResetService,
    SessionCookieService,
    SessionService,
    SessionViewService,
    TokenService,
    TotpService,
    AuthGuard,
  ],
  // Outros modulos protegem suas rotas com @Auth() (AuthGuard + SessionService).
  exports: [
    AuthGuard,
    SessionService,
    SessionCookieService,
    EmailVaultService,
    TokenService,
  ],
})
export class AuthModule {}
