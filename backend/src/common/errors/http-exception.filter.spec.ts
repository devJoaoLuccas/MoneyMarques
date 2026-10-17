import {
  ArgumentsHost,
  BadRequestException,
  ForbiddenException,
  Logger,
  NotFoundException,
  PayloadTooLargeException,
} from '@nestjs/common';
import { Prisma } from '../../generated/prisma/client';
import { ApiErrors } from './api-exception';
import { HttpExceptionFilter } from './http-exception.filter';

interface Capturado {
  status: number;
  body: { code: string; message: string; statusCode: number };
}

function executar(erro: unknown): Capturado {
  const resultado: Partial<Capturado> = {};
  const response = {
    setHeader: jest.fn(),
    status: (status: number) => {
      resultado.status = status;
      return response;
    },
    json: (body: Capturado['body']) => {
      resultado.body = body;
    },
  };
  const host = {
    switchToHttp: () => ({ getResponse: () => response }),
  } as unknown as ArgumentsHost;
  new HttpExceptionFilter().catch(erro, host);
  return resultado as Capturado;
}

const SEGREDOS =
  /prisma|select |insert |table|column|constraint|stack|at object|unexpected token|cannot (get|post)|econn|password|localhost/i;

describe('HttpExceptionFilter: mensagens legiveis e sem detalhe tecnico', () => {
  let logError: jest.SpyInstance;

  beforeEach(() => {
    logError = jest
      .spyOn(Logger.prototype, 'error')
      .mockImplementation(() => undefined);
    jest.spyOn(Logger.prototype, 'warn').mockImplementation(() => undefined);
  });
  afterEach(() => jest.restoreAllMocks());

  it('preserva os erros da aplicacao (ApiException) como estao', () => {
    const { status, body } = executar(ApiErrors.invalidInviteCode());
    expect(status).toBe(400);
    expect(body.code).toBe('INVALID_INVITE_CODE');
    expect(body.message).toMatch(/Código inválido/);
  });

  it.each([
    [new NotFoundException('Cannot GET /api/xyz'), 404, 'NOT_FOUND'],
    [new ForbiddenException('Forbidden resource'), 403, 'FORBIDDEN'],
    [
      new BadRequestException('Unexpected token } in JSON at position 12'),
      400,
      'BAD_REQUEST',
    ],
    [
      new PayloadTooLargeException('request entity too large'),
      413,
      'PAYLOAD_TOO_LARGE',
    ],
  ])(
    'excecao do framework %#: troca o texto tecnico por um amigavel',
    (erro, statusEsperado, codigo) => {
      const { status, body } = executar(erro);
      expect(status).toBe(statusEsperado);
      expect(body.code).toBe(codigo);
      expect(body.message).not.toMatch(SEGREDOS);
      expect(body.message).toMatch(/[áéíóúãõç]|\bnão\b|\bvocê\b|\bdados\b/i);
    },
  );

  it('erro de middleware (JSON malformado) vira 400 amigavel', () => {
    const erro = Object.assign(
      new SyntaxError('Unexpected token } in JSON at position 3'),
      {
        status: 400,
        type: 'entity.parse.failed',
      },
    );
    const { status, body } = executar(erro);
    expect(status).toBe(400);
    expect(body.message).not.toMatch(SEGREDOS);
  });

  it('erro de middleware de corpo grande vira 413 amigavel', () => {
    const { status, body } = executar(
      Object.assign(new Error('request entity too large'), { status: 413 }),
    );
    expect(status).toBe(413);
    expect(body.message).toBe('Os dados enviados são grandes demais.');
  });

  describe('banco de dados', () => {
    const conhecido = (
      code: string,
      message = 'Unique constraint failed on the fields: (`email_hmac`)',
    ) =>
      new Prisma.PrismaClientKnownRequestError(message, {
        code,
        clientVersion: 'test',
      });

    it('violacao de unicidade vira 409 sem expor o campo', () => {
      const { status, body } = executar(conhecido('P2002'));
      expect(status).toBe(409);
      expect(body.message).toBe('Este registro já existe.');
      expect(JSON.stringify(body)).not.toMatch(SEGREDOS);
      expect(JSON.stringify(body)).not.toContain('email_hmac');
    });

    it('chave estrangeira vira 409 amigavel', () => {
      const { status, body } = executar(
        conhecido('P2003', 'Foreign key constraint failed on `familia_uid`'),
      );
      expect(status).toBe(409);
      expect(JSON.stringify(body)).not.toContain('familia_uid');
    });

    it('registro inexistente vira 404', () => {
      expect(
        executar(
          conhecido(
            'P2025',
            'An operation failed because it depends on records',
          ),
        ).status,
      ).toBe(404);
    });

    it('banco fora do ar vira 503 sem host nem porta', () => {
      const { status, body } = executar(
        conhecido('P1001', "Can't reach database server at `localhost:5432`"),
      );
      expect(status).toBe(503);
      expect(body.code).toBe('SERVICE_UNAVAILABLE');
      expect(JSON.stringify(body)).not.toMatch(SEGREDOS);
    });

    it('falha de rede do driver vira 503', () => {
      expect(
        executar(
          Object.assign(new Error('connect ECONNREFUSED 127.0.0.1:5432'), {
            code: 'ECONNREFUSED',
          }),
        ).status,
      ).toBe(503);
    });

    it('codigo de banco desconhecido vira erro generico (500)', () => {
      const { status, body } = executar(
        conhecido('P9999', 'SELECT * FROM usuario WHERE...'),
      );
      expect(status).toBe(500);
      expect(JSON.stringify(body)).not.toMatch(SEGREDOS);
    });
  });

  it('erro inesperado: mensagem generica, detalhe so no log', () => {
    const erro = new Error(
      'TypeError: cannot read properties of undefined (reading "senha")',
    );
    const { status, body } = executar(erro);
    expect(status).toBe(500);
    expect(body.message).toBe(
      'Ocorreu um erro inesperado. Tente novamente em instantes.',
    );
    expect(JSON.stringify(body)).not.toContain('senha');
    expect(logError).toHaveBeenCalledTimes(1);
  });

  it('valor nao-Error lancado tambem fica generico', () => {
    const { status, body } = executar('boom: segredo');
    expect(status).toBe(500);
    expect(JSON.stringify(body)).not.toContain('segredo');
  });
});
