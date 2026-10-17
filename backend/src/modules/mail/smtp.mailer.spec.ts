import { SmtpMailer } from './smtp.mailer';

describe('SmtpMailer', () => {
  const message = {
    to: 'ana@exemplo.com',
    subject: 'Assunto',
    text: 'Corpo com link #token=abc123',
    html: '<p>Corpo com link #token=abc123</p>',
  };

  it('envia pelo transporte usando o remetente configurado', async () => {
    const sendMail = jest.fn().mockResolvedValue({ messageId: 'id-1' });
    const mailer = new SmtpMailer(
      { sendMail },
      'Money Marques <no-reply@exemplo.com>',
    );

    await mailer.send(message);

    expect(sendMail).toHaveBeenCalledWith({
      from: 'Money Marques <no-reply@exemplo.com>',
      to: 'ana@exemplo.com',
      subject: 'Assunto',
      text: 'Corpo com link #token=abc123',
      html: '<p>Corpo com link #token=abc123</p>',
    });
  });

  it('propaga a falha do transporte para o chamador', async () => {
    const sendMail = jest.fn().mockRejectedValue(new Error('conexao recusada'));
    const mailer = new SmtpMailer({ sendMail }, 'a@b.com');

    await expect(mailer.send(message)).rejects.toThrow('conexao recusada');
  });

  it('nao grava o conteudo do e-mail (token) nos logs (RN-AUTH-003)', async () => {
    const sendMail = jest.fn().mockResolvedValue({});
    const mailer = new SmtpMailer({ sendMail }, 'a@b.com');
    const logs: string[] = [];
    jest
      .spyOn(console, 'log')
      .mockImplementation((m: string) => logs.push(String(m)));
    jest
      .spyOn(process.stdout, 'write')
      .mockImplementation((m: string | Uint8Array) => {
        logs.push(String(m));
        return true;
      });

    await mailer.send(message);

    expect(logs.join('')).not.toContain('abc123');
    jest.restoreAllMocks();
  });
});
