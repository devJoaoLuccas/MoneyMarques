import { Injectable } from '@nestjs/common';
import * as argon2 from 'argon2';

/** Hash de senhas com Argon2id (parametros padrao da biblioteca). */
@Injectable()
export class PasswordHasher {
  private dummyHash?: Promise<string>;

  hash(senha: string): Promise<string> {
    return argon2.hash(senha, { type: argon2.argon2id });
  }

  async verify(hash: string, senha: string): Promise<boolean> {
    try {
      return await argon2.verify(hash, senha);
    } catch {
      return false;
    }
  }

  /**
   * Gasta o mesmo custo de uma verificacao real quando o usuario nao existe,
   * evitando diferenca de tempo que revele a existencia da conta (CA-004).
   */
  async burn(senha: string): Promise<void> {
    this.dummyHash ??= this.hash('senha-descartavel-para-igualar-tempo');
    await this.verify(await this.dummyHash, senha);
  }
}
