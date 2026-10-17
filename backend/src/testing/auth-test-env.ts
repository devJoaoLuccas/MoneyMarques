/** Ambiente valido e minimo para construir AuthConfig em testes unitarios. */
export const authTestEnv = {
  FRONTEND_URL: 'http://localhost:5173',
  TOKEN_HASH_PEPPER: 'p'.repeat(40),
  MFA_ENCRYPTION_KEY: 'a'.repeat(64),
  EMAIL_HMAC_KEY: 'e'.repeat(40),
  EMAIL_ENCRYPTION_KEY: 'c'.repeat(64),
};
