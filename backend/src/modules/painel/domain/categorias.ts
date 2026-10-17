import { participacaoBp } from './indicadores';

export interface ItemCategorizado {
  valorCentavos: bigint;
  categoriaUid: string | null;
  categoria: { nome: string; titularUid: string; visibilidade: string } | null;
}

export interface GrupoCategoria {
  categoriaUid: string | null;
  nome: string;
  valorCentavos: bigint;
  participacaoBp: number;
}

export const ROTULO_OUTRAS = 'Outras categorias';
export const ROTULO_SEM_CATEGORIA = 'Sem categoria';

/**
 * Agrupa por categoria. Categoria PRIVADA de outro integrante nao revela o
 * nome no agregado (cai em "Outras categorias"): agregado nao pode vazar.
 */
export function agruparPorCategoria(
  itens: readonly ItemCategorizado[],
  total: bigint,
  usuarioUid: string,
): GrupoCategoria[] {
  const grupos = new Map<
    string,
    { nome: string; uid: string | null; valor: bigint }
  >();
  for (const item of itens) {
    const { categoria, categoriaUid } = item;
    const oculta =
      categoria !== null &&
      categoria.visibilidade === 'PRIVADO' &&
      categoria.titularUid !== usuarioUid;
    const chave = oculta ? 'outras' : (categoriaUid ?? 'sem-categoria');
    const atual = grupos.get(chave) ?? {
      nome: oculta ? ROTULO_OUTRAS : (categoria?.nome ?? ROTULO_SEM_CATEGORIA),
      uid: oculta ? null : categoriaUid,
      valor: 0n,
    };
    atual.valor += item.valorCentavos;
    grupos.set(chave, atual);
  }
  return [...grupos.values()]
    .sort((a, b) => (a.valor === b.valor ? 0 : a.valor > b.valor ? -1 : 1))
    .map((g) => ({
      categoriaUid: g.uid,
      nome: g.nome,
      valorCentavos: g.valor,
      participacaoBp: participacaoBp(g.valor, total),
    }));
}
