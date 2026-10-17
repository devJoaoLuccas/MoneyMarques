import {
  Equals,
  IsBoolean,
  IsEmail,
  IsNotEmpty,
  IsOptional,
  IsString,
  Length,
  Matches,
  MaxLength,
} from 'class-validator';
import { NormalizeEmail, NormalizeName, TrimString } from './transforms';
import { PASSWORD_MAX_LENGTH } from '../services/password-policy';

const EMAIL_MESSAGE = 'Informe um e-mail válido.';
const EMAIL_MAX = 254;

/** Senha: sem trim (CA: espacos fazem parte da senha) e com teto contra DoS no hash. */
const PASSWORD_CEILING = PASSWORD_MAX_LENGTH + 100;

export class LoginDto {
  @NormalizeEmail()
  @IsEmail({}, { message: EMAIL_MESSAGE })
  @MaxLength(EMAIL_MAX, { message: EMAIL_MESSAGE })
  email!: string;

  @IsString({ message: 'Informe sua senha.' })
  @IsNotEmpty({ message: 'Informe sua senha.' })
  @MaxLength(PASSWORD_CEILING, { message: 'Informe sua senha.' })
  senha!: string;

  @IsOptional()
  @IsBoolean()
  manterSessao?: boolean;
}

export class RegisterDto {
  @NormalizeName()
  @IsString({ message: 'Informe seu nome completo.' })
  @Length(2, 120, { message: 'O nome deve ter entre 2 e 120 caracteres.' })
  nomeCompleto!: string;

  @NormalizeEmail()
  @IsEmail({}, { message: EMAIL_MESSAGE })
  @MaxLength(EMAIL_MAX, { message: EMAIL_MESSAGE })
  email!: string;

  /** A politica de senha (tamanho minimo etc.) e aplicada no servico. */
  @IsString({ message: 'Informe uma senha.' })
  @MaxLength(PASSWORD_CEILING, { message: 'A senha é longa demais.' })
  senha!: string;

  @Equals(true, {
    message:
      'É necessário aceitar os Termos de Uso e a Política de Privacidade.',
  })
  aceiteTermos!: boolean;
}

export class ForgotPasswordDto {
  @NormalizeEmail()
  @IsEmail({}, { message: EMAIL_MESSAGE })
  @MaxLength(EMAIL_MAX, { message: EMAIL_MESSAGE })
  email!: string;
}

export class ResetPasswordDto {
  @TrimString()
  @IsString()
  @IsNotEmpty({ message: 'Link inválido.' })
  @MaxLength(200, { message: 'Link inválido.' })
  token!: string;

  @IsString({ message: 'Informe a nova senha.' })
  @MaxLength(PASSWORD_CEILING, { message: 'A senha é longa demais.' })
  senha!: string;
}

export class VerifyEmailDto {
  @TrimString()
  @IsString()
  @IsNotEmpty({ message: 'Link inválido.' })
  @MaxLength(200, { message: 'Link inválido.' })
  token!: string;
}

export class MfaCodeDto {
  @IsOptional()
  @TrimString()
  @Matches(/^\d{6}$/, { message: 'O código deve ter 6 dígitos.' })
  codigo?: string;

  @IsOptional()
  @TrimString()
  @IsString()
  @MaxLength(32, { message: 'Código de recuperação inválido.' })
  codigoRecuperacao?: string;
}

export class MfaEnableDto {
  @TrimString()
  @Matches(/^\d{6}$/, { message: 'O código deve ter 6 dígitos.' })
  codigo!: string;
}

export class MfaDisableDto extends MfaCodeDto {
  @IsString({ message: 'Informe sua senha.' })
  @IsNotEmpty({ message: 'Informe sua senha.' })
  @MaxLength(PASSWORD_CEILING, { message: 'Informe sua senha.' })
  senha!: string;
}
