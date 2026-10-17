import { canTransitionInvite, InviteStatus } from './invite-state';

const all: InviteStatus[] = [
  'PENDENTE',
  'ACEITO',
  'RECUSADO',
  'EXPIRADO',
  'REVOGADO',
];

describe('maquina de estados do convite (FAM-005)', () => {
  it.each(['ACEITO', 'RECUSADO', 'EXPIRADO', 'REVOGADO'] as const)(
    'PENDENTE pode ir para %s',
    (to) => {
      expect(canTransitionInvite('PENDENTE', to)).toBe(true);
    },
  );

  it.each(['ACEITO', 'RECUSADO', 'EXPIRADO', 'REVOGADO'] as const)(
    '%s e final: nenhuma transicao sai dele',
    (from) => {
      for (const to of all) {
        expect(canTransitionInvite(from, to)).toBe(false);
      }
    },
  );

  it('PENDENTE para PENDENTE e invalido', () => {
    expect(canTransitionInvite('PENDENTE', 'PENDENTE')).toBe(false);
  });
});
