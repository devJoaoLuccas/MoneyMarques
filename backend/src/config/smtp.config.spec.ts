import { parseSmtpConfig } from './smtp.config';

describe('parseSmtpConfig (envio de e-mail via nodemailer)', () => {
  it('retorna null quando SMTP_HOST nao esta definido (SMTP nao configurado)', () => {
    expect(parseSmtpConfig({})).toBeNull();
    expect(parseSmtpConfig({ SMTP_HOST: '   ' })).toBeNull();
  });

  it('le host, porta, credenciais e remetente', () => {
    expect(
      parseSmtpConfig({
        SMTP_HOST: 'smtp.exemplo.com',
        SMTP_PORT: '587',
        SMTP_USER: 'usuario',
        SMTP_PASSWORD: 'segredo',
        MAIL_FROM: 'Money Marques <no-reply@exemplo.com>',
      }),
    ).toEqual({
      host: 'smtp.exemplo.com',
      port: 587,
      secure: false,
      auth: { user: 'usuario', pass: 'segredo' },
      from: 'Money Marques <no-reply@exemplo.com>',
    });
  });

  it('usa TLS implicito por padrao na porta 465 e permite sobrescrever com SMTP_SECURE', () => {
    const base = { SMTP_HOST: 'h', MAIL_FROM: 'a@b.com' };
    expect(parseSmtpConfig({ ...base, SMTP_PORT: '465' })?.secure).toBe(true);
    expect(parseSmtpConfig({ ...base, SMTP_PORT: '587' })?.secure).toBe(false);
    expect(
      parseSmtpConfig({ ...base, SMTP_PORT: '2525', SMTP_SECURE: 'true' })
        ?.secure,
    ).toBe(true);
  });

  it('aceita servidor sem autenticacao', () => {
    const config = parseSmtpConfig({
      SMTP_HOST: 'localhost',
      SMTP_PORT: '1025',
      MAIL_FROM: 'a@b.com',
    });
    expect(config?.auth).toBeUndefined();
  });

  it('exige MAIL_FROM quando o SMTP esta configurado', () => {
    expect(() => parseSmtpConfig({ SMTP_HOST: 'h' })).toThrow(/MAIL_FROM/);
  });

  it('exige usuario e senha juntos', () => {
    expect(() =>
      parseSmtpConfig({ SMTP_HOST: 'h', MAIL_FROM: 'a@b.com', SMTP_USER: 'u' }),
    ).toThrow(/SMTP_PASSWORD/);
  });

  it('rejeita porta invalida', () => {
    expect(() =>
      parseSmtpConfig({
        SMTP_HOST: 'h',
        MAIL_FROM: 'a@b.com',
        SMTP_PORT: 'abc',
      }),
    ).toThrow(/SMTP_PORT/);
  });
});
