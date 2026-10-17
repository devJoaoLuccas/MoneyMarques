import {
  dataCivilLocal,
  inicioDoDiaCivil,
  deslocarPeriodo,
  janelaDoMes,
  chaveDataCivil,
  periodoDaDataCivil,
  periodoDoInstante,
  primeiroDiaCivil,
  periodoValido,
  ultimoDiaCivil,
  ultimosPeriodos,
} from './periodo';

describe('periodo (fuso America/Bahia, UTC-3)', () => {
  it('valida o formato AAAA-MM', () => {
    expect(periodoValido('2026-10')).toBe(true);
    expect(periodoValido('2026-13')).toBe(false);
    expect(periodoValido('2026-00')).toBe(false);
    expect(periodoValido('2026-1')).toBe(false);
    expect(periodoValido('26-10')).toBe(false);
  });

  it('a janela do mes comeca e termina a meia-noite local (03:00 UTC)', () => {
    const { inicio, fimExclusivo } = janelaDoMes('2026-10');
    expect(inicio.toISOString()).toBe('2026-10-01T03:00:00.000Z');
    expect(fimExclusivo.toISOString()).toBe('2026-11-01T03:00:00.000Z');
  });

  it('dezembro vira janeiro do ano seguinte', () => {
    expect(janelaDoMes('2026-12').fimExclusivo.toISOString()).toBe(
      '2027-01-01T03:00:00.000Z',
    );
  });

  it('um instante de madrugada UTC ainda pertence ao mes local anterior', () => {
    expect(periodoDoInstante(new Date('2026-11-01T02:59:59.000Z'))).toBe(
      '2026-10',
    );
    expect(periodoDoInstante(new Date('2026-11-01T03:00:00.000Z'))).toBe(
      '2026-11',
    );
  });

  it('desloca periodos atravessando anos', () => {
    expect(deslocarPeriodo('2026-01', -1)).toBe('2025-12');
    expect(deslocarPeriodo('2026-11', 2)).toBe('2027-01');
  });

  it('lista os ultimos N periodos do mais antigo ao mais recente', () => {
    expect(ultimosPeriodos('2026-02', 6)).toEqual([
      '2025-09',
      '2025-10',
      '2025-11',
      '2025-12',
      '2026-01',
      '2026-02',
    ]);
  });

  it('a data civil local e a data (UTC) do dia no fuso', () => {
    expect(
      dataCivilLocal(new Date('2026-10-18T01:00:00.000Z')).toISOString(),
    ).toBe('2026-10-17T00:00:00.000Z');
  });

  it('o ultimo dia civil do periodo e o ultimo dia do mes', () => {
    expect(ultimoDiaCivil('2026-02').toISOString()).toBe(
      '2026-02-28T00:00:00.000Z',
    );
    expect(ultimoDiaCivil('2028-02').toISOString()).toBe(
      '2028-02-29T00:00:00.000Z',
    );
  });

  it('o dia civil comeca a meia-noite local', () => {
    expect(
      inicioDoDiaCivil(new Date('2026-10-01T00:00:00.000Z')).toISOString(),
    ).toBe('2026-10-01T03:00:00.000Z');
  });

  it('data civil nao sofre deslocamento de fuso', () => {
    const dia1 = new Date('2026-10-01T00:00:00.000Z');
    expect(periodoDaDataCivil(dia1)).toBe('2026-10');
    expect(chaveDataCivil(dia1)).toBe('2026-10-01');
    expect(primeiroDiaCivil('2026-10').toISOString()).toBe(dia1.toISOString());
  });
});
