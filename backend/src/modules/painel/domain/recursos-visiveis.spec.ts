import type { ResourceGrant } from '../../family/domain/access-policy';
import {
  selecionarRecursosVisiveis,
  type RecursoCandidato,
} from './recursos-visiveis';

const EU = 'u-eu';
const OUTRO = 'u-outro';

const conta = (
  uid: string,
  titularUid: string,
  visibilidade: RecursoCandidato['visibilidade'],
): RecursoCandidato => ({ uid, titularUid, visibilidade });

const recursos = [
  conta('minha-privada', EU, 'PRIVADO'),
  conta('minha-compartilhada', EU, 'COMPARTILHADO'),
  conta('outro-privada', OUTRO, 'PRIVADO'),
  conta('outro-compartilhada', OUTRO, 'COMPARTILHADO'),
  conta('outro-restrita-com-grant', OUTRO, 'RESTRITO'),
  conta('outro-restrita-sem-grant', OUTRO, 'RESTRITO'),
];

const grant: ResourceGrant = {
  podeVisualizar: true,
  podeCriar: false,
  podeEditar: false,
  podeExcluir: false,
};
const concessoes = new Map([['outro-restrita-com-grant', grant]]);

const uids = (visao: 'pessoal' | 'familiar', papel = 'INTEGRANTE' as const) =>
  selecionarRecursosVisiveis({
    recursos,
    usuarioUid: EU,
    papel,
    visao,
    concessoes,
  }).map((r) => r.uid);

describe('selecionarRecursosVisiveis (autoriza antes de agregar)', () => {
  it('visao pessoal: apenas o que e do usuario, privado ou nao', () => {
    expect(uids('pessoal')).toEqual(['minha-privada', 'minha-compartilhada']);
  });

  it('visao familiar: so compartilhado/autorizado; o privado do proprio usuario fica de fora', () => {
    expect(uids('familiar')).toEqual([
      'minha-compartilhada',
      'outro-compartilhada',
      'outro-restrita-com-grant',
    ]);
  });

  it('privado de outro integrante nunca aparece, nem para o administrador', () => {
    expect(uids('familiar', 'ADMINISTRADOR' as never)).not.toContain(
      'outro-privada',
    );
    expect(uids('pessoal', 'ADMINISTRADOR' as never)).not.toContain(
      'outro-privada',
    );
  });

  it('restrito sem concessao ativa e negado', () => {
    expect(uids('familiar')).not.toContain('outro-restrita-sem-grant');
  });

  it('concessao sem pode_visualizar nao libera o restrito', () => {
    const semVisualizar = new Map([
      ['outro-restrita-com-grant', { ...grant, podeVisualizar: false }],
    ]);
    const resultado = selecionarRecursosVisiveis({
      recursos,
      usuarioUid: EU,
      papel: 'INTEGRANTE',
      visao: 'familiar',
      concessoes: semVisualizar,
    }).map((r) => r.uid);
    expect(resultado).not.toContain('outro-restrita-com-grant');
  });
});
