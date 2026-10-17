import { Logger } from '@nestjs/common';
import { randomUUID } from 'node:crypto';
import { mkdir, writeFile } from 'node:fs/promises';
import { join } from 'node:path';
import { MailMessage, MailPort } from './mail.port';

/**
 * Adaptador de DESENVOLVIMENTO: grava cada e-mail como arquivo de texto (e HTML, quando houver) em
 * uma pasta local (ignorada pelo git), sem enviar nada. Nao e um SMTP e nao
 * deve ser usado em producao. Os links com token ficam apenas nesses
 * arquivos, nunca nos logs (RN-AUTH-003).
 */
export class FileOutboxMailer extends MailPort {
  private readonly logger = new Logger(FileOutboxMailer.name);

  constructor(private readonly directory: string) {
    super();
  }

  async send(message: MailMessage): Promise<void> {
    await mkdir(this.directory, { recursive: true });
    const base = `${Date.now()}-${randomUUID().slice(0, 8)}`;
    const content = `To: ${message.to}\nSubject: ${message.subject}\n\n${message.text}\n`;
    await writeFile(join(this.directory, `${base}.txt`), content, 'utf8');
    if (message.html) {
      // Previa abrivel no navegador: mostra o e-mail como sera exibido.
      await writeFile(
        join(this.directory, `${base}.html`),
        message.html,
        'utf8',
      );
    }
    this.logger.log(`E-mail de desenvolvimento gravado em ${base}`);
  }
}
