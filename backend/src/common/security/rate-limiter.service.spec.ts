import { RateLimiterService } from './rate-limiter.service';

describe('RateLimiterService (RN-AUTH-004)', () => {
  let now: number;
  let limiter: RateLimiterService;
  const rule = { limit: 3, windowMs: 60_000 };

  beforeEach(() => {
    now = 1_000_000;
    limiter = new RateLimiterService(() => now);
  });

  it('nao bloqueia abaixo do limite', () => {
    limiter.record('k', rule.windowMs);
    limiter.record('k', rule.windowMs);
    expect(limiter.check('k', rule).blocked).toBe(false);
  });

  it('bloqueia ao atingir o limite e informa quando liberar', () => {
    for (let i = 0; i < 3; i++) {
      limiter.record('k', rule.windowMs);
      now += 1_000;
    }
    const status = limiter.check('k', rule);
    expect(status.blocked).toBe(true);
    expect(status.retryAfterSeconds).toBe(57);
  });

  it('libera depois que a janela expira', () => {
    for (let i = 0; i < 3; i++) limiter.record('k', rule.windowMs);
    now += rule.windowMs + 1;
    expect(limiter.check('k', rule).blocked).toBe(false);
  });

  it('isola chaves diferentes', () => {
    for (let i = 0; i < 3; i++) limiter.record('a', rule.windowMs);
    expect(limiter.check('b', rule).blocked).toBe(false);
  });

  it('clear zera o contador de uma chave', () => {
    for (let i = 0; i < 3; i++) limiter.record('k', rule.windowMs);
    limiter.clear('k');
    expect(limiter.check('k', rule).blocked).toBe(false);
  });
});
