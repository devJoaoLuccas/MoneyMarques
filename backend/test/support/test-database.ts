import { config as loadEnv } from 'dotenv';
import { join } from 'node:path';

export const TEST_DATABASE_NAME = 'moneymarques_test';

/**
 * URL do banco de TESTE, derivada do DATABASE_URL do .env trocando apenas o
 * nome do banco. Nunca aponta para o banco de desenvolvimento.
 */
export function testDatabaseUrl(): string {
  loadEnv({ path: join(__dirname, '..', '..', '.env'), quiet: true });
  const base = process.env.DATABASE_URL;
  if (!base) throw new Error('DATABASE_URL ausente no .env do backend.');

  const url = new URL(base);
  url.pathname = `/${TEST_DATABASE_NAME}`;
  return url.toString();
}

/** Mesma conexao, apontando para o banco administrativo `postgres`. */
export function adminDatabaseUrl(): string {
  const url = new URL(testDatabaseUrl());
  url.pathname = '/postgres';
  url.search = '';
  return url.toString();
}
