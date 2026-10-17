import { execSync } from 'node:child_process';
import { join } from 'node:path';
import { Client } from 'pg';
import {
  adminDatabaseUrl,
  TEST_DATABASE_NAME,
  testDatabaseUrl,
} from './test-database';

/**
 * Recria o banco de TESTE do zero e aplica todas as migrations nele, para que
 * cada execucao seja deterministica. Nunca toca no banco de desenvolvimento:
 * o nome vem da constante TEST_DATABASE_NAME.
 */
export default async function globalSetup(): Promise<void> {
  const admin = new Client({ connectionString: adminDatabaseUrl() });
  await admin.connect();
  try {
    await admin.query(
      `DROP DATABASE IF EXISTS ${TEST_DATABASE_NAME} WITH (FORCE)`,
    );
    await admin.query(`CREATE DATABASE ${TEST_DATABASE_NAME}`);
  } finally {
    await admin.end();
  }

  execSync('npx prisma migrate deploy', {
    cwd: join(__dirname, '..', '..'),
    env: { ...process.env, DATABASE_URL: testDatabaseUrl() },
    stdio: 'pipe',
  });
}
