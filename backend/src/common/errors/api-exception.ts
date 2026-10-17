import { HttpException, HttpStatus } from '@nestjs/common';

export type ApiErrorCode =
  | 'VALIDATION_ERROR'
  | 'INVALID_CREDENTIALS'
  | 'INVALID_INVITE_CODE'
  | 'TOO_MANY_ATTEMPTS'
  | 'UNAUTHENTICATED'
  | 'MFA_REQUIRED'
  | 'EMAIL_VERIFICATION_REQUIRED'
  | 'INVALID_TOKEN'
  | 'INVALID_MFA_CODE'
  | 'CSRF_REJECTED'
  | 'MFA_ALREADY_ENABLED'
  | 'MFA_NOT_CONFIGURED'
  | 'NOT_FOUND'
  | 'FORBIDDEN'
  | 'LAST_ADMIN_REQUIRED'
  | 'ALREADY_MEMBER'
  | 'INVITE_ALREADY_PENDING'
  | 'INVITE_NOT_PENDING'
  | 'BAD_REQUEST'
  | 'CONFLICT'
  | 'PAYLOAD_TOO_LARGE'
  | 'SERVICE_UNAVAILABLE'
  | 'INTERNAL_ERROR';

export type FieldErrors = Record<string, string[]>;

export interface ApiErrorBody {
  statusCode: number;
  code: ApiErrorCode;
  message: string;
  errors?: FieldErrors;
  retryAfterSeconds?: number;
}

/** Excecao de API com corpo tipado e estavel, consumido pelo frontend. */
export class ApiException extends HttpException {
  constructor(
    status: HttpStatus,
    code: ApiErrorCode,
    message: string,
    extra: Pick<ApiErrorBody, 'errors' | 'retryAfterSeconds'> = {},
  ) {
    const body: ApiErrorBody = { statusCode: status, code, message, ...extra };
    super(body, status);
  }
}

export const ApiErrors = {
  validation: (errors: FieldErrors) =>
    new ApiException(
      HttpStatus.BAD_REQUEST,
      'VALIDATION_ERROR',
      'Verifique os campos informados.',
      { errors },
    ),

  // RN-AUTH-002: mensagem publica neutra, nao revela se o e-mail existe.
  invalidCredentials: () =>
    new ApiException(
      HttpStatus.UNAUTHORIZED,
      'INVALID_CREDENTIALS',
      'Não foi possível entrar. Verifique suas credenciais e tente novamente.',
    ),

  tooManyAttempts: (retryAfterSeconds: number) =>
    new ApiException(
      HttpStatus.TOO_MANY_REQUESTS,
      'TOO_MANY_ATTEMPTS',
      'Muitas tentativas. Aguarde um pouco e tente novamente.',
      { retryAfterSeconds },
    ),

  unauthenticated: () =>
    new ApiException(
      HttpStatus.UNAUTHORIZED,
      'UNAUTHENTICATED',
      'Sessão ausente ou expirada. Entre novamente.',
    ),

  mfaRequired: () =>
    new ApiException(
      HttpStatus.FORBIDDEN,
      'MFA_REQUIRED',
      'Conclua a verificação em duas etapas para continuar.',
    ),

  emailVerificationRequired: () =>
    new ApiException(
      HttpStatus.FORBIDDEN,
      'EMAIL_VERIFICATION_REQUIRED',
      'Confirme seu e-mail para continuar.',
    ),

  invalidToken: () =>
    new ApiException(
      HttpStatus.BAD_REQUEST,
      'INVALID_TOKEN',
      'Este link é inválido ou expirou. Solicite um novo.',
    ),

  invalidInviteCode: () =>
    new ApiException(
      HttpStatus.BAD_REQUEST,
      'INVALID_INVITE_CODE',
      'Código inválido ou expirado. Confira com quem convidou você.',
    ),

  invalidMfaCode: () =>
    new ApiException(
      HttpStatus.UNAUTHORIZED,
      'INVALID_MFA_CODE',
      'Código inválido ou já utilizado. Confira e tente novamente.',
    ),

  csrfRejected: () =>
    new ApiException(
      HttpStatus.FORBIDDEN,
      'CSRF_REJECTED',
      'Requisição rejeitada por motivos de segurança.',
    ),

  mfaAlreadyEnabled: () =>
    new ApiException(
      HttpStatus.CONFLICT,
      'MFA_ALREADY_ENABLED',
      'A verificação em duas etapas já está ativa.',
    ),

  /** 404 em vez de 403 quando ha risco de enumeracao (familias, convites). */
  notFound: () =>
    new ApiException(
      HttpStatus.NOT_FOUND,
      'NOT_FOUND',
      'Recurso não encontrado.',
    ),

  forbidden: () =>
    new ApiException(
      HttpStatus.FORBIDDEN,
      'FORBIDDEN',
      'Você não tem permissão para realizar esta ação.',
    ),

  lastAdminRequired: () =>
    new ApiException(
      HttpStatus.CONFLICT,
      'LAST_ADMIN_REQUIRED',
      'A família precisa de pelo menos um administrador ativo. Transfira a administração antes.',
    ),

  alreadyMember: () =>
    new ApiException(
      HttpStatus.CONFLICT,
      'ALREADY_MEMBER',
      'Esta pessoa já faz parte da família.',
    ),

  invitePending: () =>
    new ApiException(
      HttpStatus.CONFLICT,
      'INVITE_ALREADY_PENDING',
      'Já existe um convite pendente para este e-mail.',
    ),

  inviteNotPending: () =>
    new ApiException(
      HttpStatus.CONFLICT,
      'INVITE_NOT_PENDING',
      'Este convite não está mais pendente.',
    ),

  mfaNotConfigured: () =>
    new ApiException(
      HttpStatus.CONFLICT,
      'MFA_NOT_CONFIGURED',
      'Inicie a configuração da verificação em duas etapas antes de ativá-la.',
    ),
};
