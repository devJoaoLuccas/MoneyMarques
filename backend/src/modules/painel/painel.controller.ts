import { Controller, Get, Header, Query } from '@nestjs/common';
import type { AuthContext } from '../auth/auth.types';
import { CurrentAuth } from '../auth/decorators/current-auth.decorator';
import {
  CurrentFamily,
  FamilyAccess,
} from '../family/guards/family-context.guard';
import type { FamilyScope } from '../family/guards/family-context.guard';
import { periodoDoInstante } from './domain/periodo';
import { ConsultaPainelDto } from './dto/painel.dto';
import { PoliticaAcessoFinanceiro } from './politica-acesso-financeiro';
import { ServicoAlertas } from './servico-alertas';
import { ServicoCartoes } from './servico-cartoes';
import { ServicoPatrimonio } from './servico-patrimonio';
import { ServicoProjecoes } from './servico-projecoes';
import { ServicoReceitasDespesas } from './servico-receitas-despesas';
import { ServicoResumoFinanceiro } from './servico-resumo-financeiro';
import { ServicoVencimentos } from './servico-vencimentos';

/**
 * Controller fino: so HTTP. O vinculo ativo e o papel sao validados pelo
 * FamilyContextGuard a cada requisicao (a familia da rota nunca e confiada);
 * a autorizacao dos recursos financeiros fica na PoliticaAcessoFinanceiro.
 * Dado financeiro nunca fica em cache de navegador ou intermediario.
 */
@Controller('familias/:familiaUid/painel')
export class PainelController {
  constructor(
    private readonly politica: PoliticaAcessoFinanceiro,
    private readonly resumo: ServicoResumoFinanceiro,
    private readonly receitasDespesas: ServicoReceitasDespesas,
    private readonly cartoes: ServicoCartoes,
    private readonly patrimonio: ServicoPatrimonio,
    private readonly projecoes: ServicoProjecoes,
    private readonly vencimentos: ServicoVencimentos,
    private readonly alertas: ServicoAlertas,
  ) {}

  private contexto(
    scope: FamilyScope,
    auth: AuthContext,
    consulta: ConsultaPainelDto,
  ) {
    return this.politica.carregarContexto(
      scope,
      auth.usuario.uid,
      consulta.visao ?? 'pessoal',
    );
  }

  private periodo(consulta: ConsultaPainelDto, agora: Date): string {
    return consulta.periodo ?? periodoDoInstante(agora);
  }

  @FamilyAccess('VER_FAMILIA')
  @Header('Cache-Control', 'no-store')
  @Get('resumo')
  obterResumo(
    @CurrentFamily() scope: FamilyScope,
    @CurrentAuth() auth: AuthContext,
    @Query() consulta: ConsultaPainelDto,
  ) {
    return this.resumo.obter(scope, auth.usuario.uid, consulta);
  }

  @FamilyAccess('VER_FAMILIA')
  @Header('Cache-Control', 'no-store')
  @Get('receitas-despesas')
  async obterReceitasDespesas(
    @CurrentFamily() scope: FamilyScope,
    @CurrentAuth() auth: AuthContext,
    @Query() consulta: ConsultaPainelDto,
  ) {
    const ctx = await this.contexto(scope, auth, consulta);
    return this.receitasDespesas.obter(
      ctx,
      this.periodo(consulta, ctx.agora),
      consulta.categoriaUid,
    );
  }

  @FamilyAccess('VER_FAMILIA')
  @Header('Cache-Control', 'no-store')
  @Get('cartoes')
  async obterCartoes(
    @CurrentFamily() scope: FamilyScope,
    @CurrentAuth() auth: AuthContext,
    @Query() consulta: ConsultaPainelDto,
  ) {
    return this.cartoes.obter(await this.contexto(scope, auth, consulta));
  }

  @FamilyAccess('VER_FAMILIA')
  @Header('Cache-Control', 'no-store')
  @Get('patrimonio')
  async obterPatrimonio(
    @CurrentFamily() scope: FamilyScope,
    @CurrentAuth() auth: AuthContext,
    @Query() consulta: ConsultaPainelDto,
  ) {
    const ctx = await this.contexto(scope, auth, consulta);
    return this.patrimonio.obter(ctx, this.periodo(consulta, ctx.agora));
  }

  @FamilyAccess('VER_FAMILIA')
  @Header('Cache-Control', 'no-store')
  @Get('projecoes')
  async obterProjecoes(
    @CurrentFamily() scope: FamilyScope,
    @CurrentAuth() auth: AuthContext,
    @Query() consulta: ConsultaPainelDto,
  ) {
    return this.projecoes.obter(await this.contexto(scope, auth, consulta));
  }

  @FamilyAccess('VER_FAMILIA')
  @Header('Cache-Control', 'no-store')
  @Get('vencimentos')
  async obterVencimentos(
    @CurrentFamily() scope: FamilyScope,
    @CurrentAuth() auth: AuthContext,
    @Query() consulta: ConsultaPainelDto,
  ) {
    const ctx = await this.contexto(scope, auth, consulta);
    return this.vencimentos.obter(ctx, this.periodo(consulta, ctx.agora));
  }

  @FamilyAccess('VER_FAMILIA')
  @Header('Cache-Control', 'no-store')
  @Get('alertas')
  async obterAlertas(
    @CurrentFamily() scope: FamilyScope,
    @CurrentAuth() auth: AuthContext,
    @Query() consulta: ConsultaPainelDto,
  ) {
    return this.alertas.obter(await this.contexto(scope, auth, consulta));
  }
}
