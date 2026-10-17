import { Module } from '@nestjs/common';
import { AuditModule } from '../audit/audit.module';
import { AuthModule } from '../auth/auth.module';
import { FamilyContextGuard } from '../family/guards/family-context.guard';
import { PainelController } from './painel.controller';
import { PoliticaAcessoFinanceiro } from './politica-acesso-financeiro';
import { RepositorioFinanceiro } from './repositorio-financeiro';
import { ServicoAlertas } from './servico-alertas';
import { ServicoCartoes } from './servico-cartoes';
import { ServicoPatrimonio } from './servico-patrimonio';
import { ServicoProjecoes } from './servico-projecoes';
import { ServicoReceitasDespesas } from './servico-receitas-despesas';
import { ServicoResumoFinanceiro } from './servico-resumo-financeiro';
import { ServicoVencimentos } from './servico-vencimentos';

/** Modulo 03: Dashboard Financeiro (DASH-001 a DASH-006, RF-010). Apenas consulta dados consolidados. */
@Module({
  imports: [AuthModule, AuditModule],
  controllers: [PainelController],
  providers: [
    PoliticaAcessoFinanceiro,
    RepositorioFinanceiro,
    ServicoResumoFinanceiro,
    ServicoReceitasDespesas,
    ServicoCartoes,
    ServicoPatrimonio,
    ServicoProjecoes,
    ServicoVencimentos,
    ServicoAlertas,
    FamilyContextGuard,
  ],
})
export class PainelModule {}
