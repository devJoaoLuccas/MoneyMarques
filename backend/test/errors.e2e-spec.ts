import request from 'supertest';
import { createTestContext, TestContext } from './support/test-app';

/**
 * Erros chegam ao usuario em portugues e sem detalhe tecnico (framework,
 * leitura do corpo, banco). Cobre o caminho HTTP real, nao so o filtro.
 */
describe('Erros legiveis (e2e)', () => {
  let ctx: TestContext;

  beforeAll(async () => {
    ctx = await createTestContext();
  });
  afterAll(async () => {
    await ctx.app.close();
  });

  const tecnico =
    /cannot (get|post)|unexpected token|json|entity too large|prisma|select |stack|econn|syntaxerror/i;

  it('rota inexistente: 404 amigavel, sem "Cannot GET"', async () => {
    const res = await request(ctx.server)
      .get('/api/rota-que-nao-existe')
      .expect(404);
    expect(res.body).toMatchObject({
      statusCode: 404,
      code: 'NOT_FOUND',
      message: 'Não encontramos o que você procurou.',
    });
  });

  it('JSON malformado: 400 amigavel, sem o erro do parser', async () => {
    const res = await request(ctx.server)
      .post('/api/auth/login')
      .set('X-CSRF-Protection', '1')
      .set('Content-Type', 'application/json')
      .send('{"email": "a@b.com", ')
      .expect(400);
    expect(res.body.code).toBe('BAD_REQUEST');
    expect(res.body.message).not.toMatch(tecnico);
    expect(res.body.message).toMatch(/Não foi possível entender/);
  });

  it('corpo grande demais: 413 amigavel', async () => {
    const res = await request(ctx.server)
      .post('/api/auth/login')
      .set('X-CSRF-Protection', '1')
      .send({ email: 'a@b.com', senha: 'x'.repeat(300_000) })
      .expect(413);
    expect(res.body).toMatchObject({
      code: 'PAYLOAD_TOO_LARGE',
      message: 'Os dados enviados são grandes demais.',
    });
  });

  it('erro de banco durante a requisicao: 503 amigavel, sem nome de host nem SQL', async () => {
    const espiao = jest
      .spyOn(ctx.prisma.usuario, 'findUnique')
      .mockRejectedValue(
        Object.assign(
          new Error("Can't reach database server at `localhost:5432`"),
          {
            code: 'ECONNREFUSED',
          },
        ),
      );
    try {
      const res = await request(ctx.server)
        .post('/api/auth/login')
        .set('X-CSRF-Protection', '1')
        .send({ email: 'ana@exemplo.com', senha: 'Frase-Longa-Segura-2026' });
      expect(res.status).toBe(503);
      expect(res.body.code).toBe('SERVICE_UNAVAILABLE');
      expect(JSON.stringify(res.body)).not.toMatch(tecnico);
      expect(JSON.stringify(res.body)).not.toContain('localhost');
      expect(typeof res.body.message).toBe('string');
    } finally {
      espiao.mockRestore();
    }
  });
});
