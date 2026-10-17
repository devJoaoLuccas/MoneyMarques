import { testDatabaseUrl } from './test-database';

// Executado antes de cada arquivo de teste: isola o ambiente do .env real.
process.env.DATABASE_URL = testDatabaseUrl();
process.env.NODE_ENV = 'test';
process.env.FRONTEND_URL = 'http://localhost:5173';
process.env.TOKEN_HASH_PEPPER = 'pepper-de-teste-com-mais-de-32-caracteres';
process.env.MFA_ENCRYPTION_KEY = 'ab'.repeat(32);
process.env.MFA_ISSUER = 'Money Marques Teste';
process.env.EMAIL_HMAC_KEY = 'hmac-de-teste-com-mais-de-32-caracteres!';
process.env.EMAIL_ENCRYPTION_KEY = 'cd'.repeat(32);
