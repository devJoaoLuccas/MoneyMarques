import { IsIn, IsOptional, IsUUID, Matches } from 'class-validator';
import type { VisaoFinanceira } from '../domain/recursos-visiveis';

export const VISOES: readonly VisaoFinanceira[] = ['pessoal', 'familiar'];

export class ConsultaPainelDto {
  /** Mes civil `AAAA-MM`; padrao: o mes atual. */
  @IsOptional()
  @Matches(/^\d{4}-(0[1-9]|1[0-2])$/, { message: 'Período inválido.' })
  periodo?: string;

  @IsOptional()
  @IsIn(VISOES, { message: 'Visão inválida.' })
  visao?: VisaoFinanceira;

  /** So em receitas-despesas: filtra por categoria. */
  @IsOptional()
  @IsUUID(undefined, { message: 'Categoria inválida.' })
  categoriaUid?: string;
}
