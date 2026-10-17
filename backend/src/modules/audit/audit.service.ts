import { Injectable, Logger } from '@nestjs/common';
import { ResultadoAuditoria } from '../../generated/prisma/enums';
import { ClientInfo } from '../../common/http/client-info.decorator';
import { PrismaService } from '../../prisma/prisma.service';

/** Somente valores primitivos: impede gravar objetos brutos/payloads (RN-AUTH-003). */
export type SafeMetadata = Record<string, string | number | boolean | null>;

export interface AuditEventInput {
  acao: string;
  resultado: ResultadoAuditoria;
  client?: ClientInfo;
  usuarioUid?: string | null;
  familiaUid?: string | null;
  sessaoUid?: string | null;
  codigoHttp?: number;
  recurso?: string;
  recursoUid?: string;
  metadados?: SafeMetadata;
  /** Antes/depois de alteracoes (somente valores primitivos e nao sensiveis). */
  alteracoes?: SafeMetadata;
}

/**
 * Trilha de auditoria append-only (RF-013). Nunca receber senha, token,
 * cookie ou codigos MFA. Falha ao gravar a auditoria e registrada em log e
 * nao derruba a operacao do usuario (decisao de disponibilidade).
 */
@Injectable()
export class AuditService {
  private readonly logger = new Logger(AuditService.name);

  constructor(private readonly prisma: PrismaService) {}

  async record(event: AuditEventInput): Promise<void> {
    try {
      await this.prisma.eventoAuditoria.create({
        data: {
          acao: event.acao,
          resultado: event.resultado,
          usuarioUid: event.usuarioUid ?? null,
          familiaUid: event.familiaUid ?? null,
          sessaoUid: event.sessaoUid ?? null,
          ipOrigem: event.client?.ip ?? null,
          userAgent: event.client?.userAgent ?? null,
          metodoHttp: event.client?.metodoHttp ?? null,
          rotaHttp: event.client?.rotaHttp ?? null,
          codigoHttp: event.codigoHttp ?? null,
          recurso: event.recurso ?? null,
          recursoUid: event.recursoUid ?? null,
          metadadosSeguros: event.metadados ?? undefined,
          alteracoesSeguras: event.alteracoes ?? undefined,
        },
      });
    } catch (error) {
      this.logger.error(
        `Falha ao gravar auditoria (${event.acao}): ${
          error instanceof Error ? error.message : 'erro desconhecido'
        }`,
      );
    }
  }
}
