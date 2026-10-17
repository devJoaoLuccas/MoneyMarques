import {
  canPerformFamilyAction,
  decideResourceAccess,
  FamilyAction,
  ResourceAccessInput,
  ResourceAction,
} from './access-policy';

const adminActions: FamilyAction[] = [
  'EDITAR_FAMILIA',
  'CONVIDAR',
  'LISTAR_CONVITES',
  'REVOGAR_CONVITE',
  'ALTERAR_PAPEL',
  'REMOVER_INTEGRANTE',
];
const memberActions: FamilyAction[] = ['VER_FAMILIA', 'VER_INTEGRANTES'];

describe('canPerformFamilyAction (RN-FAM-004, CA-FAM-007)', () => {
  it.each(adminActions)('%s exige ADMINISTRADOR', (action) => {
    expect(canPerformFamilyAction('ADMINISTRADOR', action)).toBe(true);
    expect(canPerformFamilyAction('INTEGRANTE', action)).toBe(false);
    expect(canPerformFamilyAction('VISUALIZADOR', action)).toBe(false);
    expect(canPerformFamilyAction(null, action)).toBe(false);
  });

  it.each(memberActions)(
    '%s e permitida a qualquer vinculo ativo',
    (action) => {
      expect(canPerformFamilyAction('ADMINISTRADOR', action)).toBe(true);
      expect(canPerformFamilyAction('INTEGRANTE', action)).toBe(true);
      expect(canPerformFamilyAction('VISUALIZADOR', action)).toBe(true);
      expect(canPerformFamilyAction(null, action)).toBe(false);
    },
  );
});

const grant = (
  over: Partial<NonNullable<ResourceAccessInput['grant']>> = {},
) => ({
  podeVisualizar: true,
  podeCriar: false,
  podeEditar: false,
  podeExcluir: false,
  ...over,
});

const base: ResourceAccessInput = {
  papel: 'INTEGRANTE',
  isOwner: false,
  visibilidade: 'COMPARTILHADO',
  action: 'VISUALIZAR',
};

const decide = (over: Partial<ResourceAccessInput>) =>
  decideResourceAccess({ ...base, ...over });

describe('decideResourceAccess (spec secao 3, precedencia)', () => {
  it('sem vinculo ativo nega tudo, mesmo sendo proprietario', () => {
    expect(decide({ papel: null, isOwner: true })).toBe('deny');
  });

  describe('PRIVADO (RN-FAM-004): so o proprietario, nem o admin', () => {
    it('proprietario acessa', () => {
      expect(decide({ visibilidade: 'PRIVADO', isOwner: true })).toBe('allow');
    });
    it.each(['ADMINISTRADOR', 'INTEGRANTE', 'VISUALIZADOR'] as const)(
      '%s nao proprietario nega, mesmo com concessao',
      (papel) => {
        expect(decide({ visibilidade: 'PRIVADO', papel, grant: grant() })).toBe(
          'deny',
        );
      },
    );
  });

  describe('RESTRITO: proprietario + destinatarios listados', () => {
    it('proprietario acessa', () => {
      expect(decide({ visibilidade: 'RESTRITO', isOwner: true })).toBe('allow');
    });
    it('destinatario com concessao visualiza', () => {
      expect(decide({ visibilidade: 'RESTRITO', grant: grant() })).toBe(
        'allow',
      );
    });
    it('sem concessao nega', () => {
      expect(decide({ visibilidade: 'RESTRITO' })).toBe('deny');
    });
    it('concessao sem a permissao da acao nega', () => {
      expect(
        decide({ visibilidade: 'RESTRITO', grant: grant(), action: 'EDITAR' }),
      ).toBe('deny');
    });
  });

  describe('COMPARTILHADO', () => {
    it('qualquer membro ativo visualiza (inclusive VISUALIZADOR)', () => {
      expect(decide({ papel: 'VISUALIZADOR' })).toBe('allow');
      expect(decide({ papel: 'INTEGRANTE' })).toBe('allow');
      expect(decide({ papel: 'ADMINISTRADOR' })).toBe('allow');
    });
    it('leitura nao implica edicao: edicao exige pode_editar explicito (D-FAM-005)', () => {
      expect(decide({ action: 'EDITAR' })).toBe('deny');
      expect(decide({ action: 'EDITAR', grant: grant() })).toBe('deny');
      expect(
        decide({ action: 'EDITAR', grant: grant({ podeEditar: true }) }),
      ).toBe('allow');
    });
    it.each([
      ['CRIAR', 'podeCriar'],
      ['EXCLUIR', 'podeExcluir'],
    ] as const)('%s exige %s', (action, flag) => {
      expect(decide({ action })).toBe('deny');
      expect(decide({ action, grant: grant({ [flag]: true }) })).toBe('allow');
    });
    it('proprietario faz todas as acoes', () => {
      const actions: ResourceAction[] = [
        'VISUALIZAR',
        'CRIAR',
        'EDITAR',
        'EXCLUIR',
      ];
      for (const action of actions) {
        expect(decide({ isOwner: true, action })).toBe('allow');
      }
    });
  });

  describe('VISUALIZADOR nunca cria, edita ou exclui (RN-FAM-015)', () => {
    it.each(['CRIAR', 'EDITAR', 'EXCLUIR'] as const)('%s nega', (action) => {
      for (const visibilidade of [
        'PRIVADO',
        'RESTRITO',
        'COMPARTILHADO',
      ] as const) {
        expect(
          decide({
            papel: 'VISUALIZADOR',
            visibilidade,
            isOwner: true,
            action,
            grant: grant({
              podeCriar: true,
              podeEditar: true,
              podeExcluir: true,
            }),
          }),
        ).toBe('deny');
      }
    });
  });
});
