import { Injectable } from '@nestjs/common';
import { PrismaService } from '../../../prisma/prisma.service';
import { FamilyContext } from '../auth.types';
import { EmailVaultService } from './email-vault.service';

/**
 * AUTH-005: resolve o contexto familiar apos a autenticacao completa.
 * Isto orienta a navegacao; NAO e autorizacao. O backend valida associacao e
 * papel em cada requisicao e recurso (RN-AUTH-012).
 *
 * Decisao (lacuna): convite pendente tem precedencia somente quando o usuario
 * ainda nao pertence a nenhuma familia; caso contrario os convites sao apenas
 * listados em `convitesPendentes`.
 */
@Injectable()
export class AuthContextService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly emailVault: EmailVaultService,
  ) {}

  async resolve(usuarioUid: string, email: string): Promise<FamilyContext> {
    const [memberships, invites] = await Promise.all([
      this.prisma.integranteFamilia.findMany({
        where: {
          usuarioUid,
          situacao: 'ATIVO',
          familia: { encerradaEm: null },
        },
        select: { papel: true, familia: { select: { uid: true, nome: true } } },
        orderBy: { ingressouEm: 'asc' },
      }),
      this.prisma.conviteFamilia.findMany({
        where: {
          emailDestinoHmac: this.emailVault.hmac(email),
          situacao: 'PENDENTE',
          expiraEm: { gt: new Date() },
          familia: { encerradaEm: null },
        },
        select: {
          uid: true,
          papelOferecido: true,
          familia: { select: { nome: true } },
        },
        orderBy: { criadoEm: 'asc' },
      }),
    ]);

    const familias = memberships.map((m) => ({
      uid: m.familia.uid,
      nome: m.familia.nome,
      papel: m.papel,
    }));
    const convitesPendentes = invites.map((i) => ({
      uid: i.uid,
      familiaNome: i.familia.nome,
      papelOferecido: i.papelOferecido,
    }));

    return {
      tipo: this.classify(familias.length, convitesPendentes.length),
      familias,
      convitesPendentes,
    };
  }

  private classify(families: number, invites: number): FamilyContext['tipo'] {
    if (families === 0) return invites > 0 ? 'convite_pendente' : 'sem_familia';
    return families === 1 ? 'unico' : 'multiplo';
  }
}
