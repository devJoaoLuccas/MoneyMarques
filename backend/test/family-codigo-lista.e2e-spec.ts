import {
  ApiClient,
  createTestContext,
  registerAndVerify,
  resetDatabase,
  strongPassword,
  TestContext,
} from './support/test-app';

/**
 * D-FAM-009: codigo de convite USADO aparece em "convites enviados" como um
 * convite aceito, com quem entrou. Banco real.
 */
interface Item {
  uid: string;
  origem: 'email' | 'codigo';
  nome: string | null;
  email: string;
  papel: string;
  situacao: string;
  criadoEm: string;
  respondidoEm: string | null;
}
interface Pagina {
  itens: Item[];
  pagina: number;
  tamanho: number;
  total: number;
}

describe('Convites enviados incluem codigos usados (e2e)', () => {
  let ctx: TestContext;

  beforeAll(async () => {
    ctx = await createTestContext();
  });
  afterAll(async () => {
    await ctx.app.close();
  });
  beforeEach(async () => {
    await resetDatabase(ctx.prisma);
    ctx.limiter.clearAll();
    ctx.mailbox.clear();
  });

  async function signup(email: string, nome = 'Pessoa Teste') {
    await registerAndVerify(ctx, email, { nome });
    ctx.limiter.clearAll();
    const api = new ApiClient(ctx.server);
    await api.post('/auth/login', { email, senha: strongPassword }).expect(200);
    return api;
  }

  async function familiaComAdmin() {
    const admin = await signup('admin@exemplo.com', 'Ana Admin');
    const familiaUid = (
      (await admin.post('/familias', { nome: 'Familia Silva' })).body as {
        uid: string;
      }
    ).uid;
    return { admin, familiaUid };
  }

  async function entrarPorCodigo(
    admin: ApiClient,
    familiaUid: string,
    email: string,
    nome: string,
    papel?: string,
  ) {
    const gerado = (
      await admin
        .post(`/familias/${familiaUid}/codigos-convite`, papel ? { papel } : {})
        .expect(201)
    ).body as { codigo: string };
    const pessoa = await signup(email, nome);
    await pessoa
      .post('/convites/codigo/entrar', { codigo: gerado.codigo })
      .expect(200);
    return pessoa;
  }

  const listar = async (api: ApiClient, familiaUid: string, query = '') =>
    (await api.get(`/familias/${familiaUid}/convites${query}`).expect(200))
      .body as Pagina;

  it('codigo usado vira um convite aceito com nome, e-mail, papel e datas de quem entrou', async () => {
    const { admin, familiaUid } = await familiaComAdmin();
    await entrarPorCodigo(
      admin,
      familiaUid,
      'bia@exemplo.com',
      'Bia Souza',
      'VISUALIZADOR',
    );

    const lista = await listar(admin, familiaUid);
    expect(lista.total).toBe(1);
    expect(lista.itens[0]).toMatchObject({
      origem: 'codigo',
      nome: 'Bia Souza',
      email: 'bia@exemplo.com',
      papel: 'VISUALIZADOR',
      situacao: 'ACEITO',
    });
    expect(lista.itens[0].respondidoEm).not.toBeNull();
  });

  it('codigo ainda nao usado, revogado ou expirado nao aparece', async () => {
    const { admin, familiaUid } = await familiaComAdmin();
    const ativo = (
      await admin
        .post(`/familias/${familiaUid}/codigos-convite`, {})
        .expect(201)
    ).body as { uid: string };
    expect((await listar(admin, familiaUid)).total).toBe(0);

    await admin
      .post(`/familias/${familiaUid}/codigos-convite/${ativo.uid}/revogar`)
      .expect(204);
    expect((await listar(admin, familiaUid)).total).toBe(0);
  });

  it('convive com convites por e-mail, ordenado do mais recente ao mais antigo', async () => {
    const { admin, familiaUid } = await familiaComAdmin();
    await admin
      .post(`/familias/${familiaUid}/convites`, {
        email: 'caio@exemplo.com',
        papel: 'INTEGRANTE',
      })
      .expect(201);
    await new Promise((r) => setTimeout(r, 20));
    await entrarPorCodigo(admin, familiaUid, 'bia@exemplo.com', 'Bia Souza');

    const lista = await listar(admin, familiaUid);
    expect(lista.total).toBe(2);
    expect(lista.itens.map((i) => i.origem)).toEqual(['codigo', 'email']);
    expect(lista.itens[1]).toMatchObject({
      origem: 'email',
      nome: null,
      email: 'caio@exemplo.com',
      situacao: 'PENDENTE',
    });
  });

  it('o filtro de situacao vale para os codigos: so ACEITO (ou sem filtro) os inclui', async () => {
    const { admin, familiaUid } = await familiaComAdmin();
    await entrarPorCodigo(admin, familiaUid, 'bia@exemplo.com', 'Bia Souza');
    await admin
      .post(`/familias/${familiaUid}/convites`, {
        email: 'caio@exemplo.com',
        papel: 'INTEGRANTE',
      })
      .expect(201);

    expect(
      (await listar(admin, familiaUid, '?situacao=ACEITO')).itens.map(
        (i) => i.origem,
      ),
    ).toEqual(['codigo']);
    expect(
      (await listar(admin, familiaUid, '?situacao=PENDENTE')).itens.map(
        (i) => i.origem,
      ),
    ).toEqual(['email']);
    expect((await listar(admin, familiaUid, '?situacao=REVOGADO')).total).toBe(
      0,
    );
    expect((await listar(admin, familiaUid)).total).toBe(2);
  });

  it('pagina a uniao sem repetir nem perder itens', async () => {
    const { admin, familiaUid } = await familiaComAdmin();
    await admin
      .post(`/familias/${familiaUid}/convites`, {
        email: 'a@exemplo.com',
        papel: 'INTEGRANTE',
      })
      .expect(201);
    await entrarPorCodigo(admin, familiaUid, 'b@exemplo.com', 'Bia');
    await admin
      .post(`/familias/${familiaUid}/convites`, {
        email: 'c@exemplo.com',
        papel: 'INTEGRANTE',
      })
      .expect(201);
    await entrarPorCodigo(admin, familiaUid, 'd@exemplo.com', 'Duda');
    await admin
      .post(`/familias/${familiaUid}/convites`, {
        email: 'e@exemplo.com',
        papel: 'INTEGRANTE',
      })
      .expect(201);

    const p1 = await listar(admin, familiaUid, '?tamanho=2&pagina=1');
    const p2 = await listar(admin, familiaUid, '?tamanho=2&pagina=2');
    const p3 = await listar(admin, familiaUid, '?tamanho=2&pagina=3');
    expect(p1.total).toBe(5);
    const uids = [...p1.itens, ...p2.itens, ...p3.itens].map((i) => i.uid);
    expect(uids).toHaveLength(5);
    expect(new Set(uids).size).toBe(5);
  });

  it('so administradores veem; outra familia nunca enxerga estes codigos', async () => {
    const { admin, familiaUid } = await familiaComAdmin();
    const bia = await entrarPorCodigo(
      admin,
      familiaUid,
      'bia@exemplo.com',
      'Bia Souza',
    );
    await bia.get(`/familias/${familiaUid}/convites`).expect(403);

    const outro = await signup('outro@exemplo.com');
    const outraFamilia = (
      (await outro.post('/familias', { nome: 'Outra Familia' })).body as {
        uid: string;
      }
    ).uid;
    expect((await listar(outro, outraFamilia)).total).toBe(0);
    await outro.get(`/familias/${familiaUid}/convites`).expect(404);
  });
});
