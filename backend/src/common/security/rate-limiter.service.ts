export interface RateLimitRule {
  /** Numero maximo de ocorrencias permitidas dentro da janela. */
  limit: number;
  windowMs: number;
}

export interface RateLimitStatus {
  blocked: boolean;
  retryAfterSeconds: number;
}

/**
 * Limitador de janela deslizante em memoria.
 * Registrado no modulo via factory (o relogio e injetavel para testes).
 * Decisao do MVP: instancia unica, sem Redis. Ao escalar horizontalmente,
 * substituir por um armazenamento compartilhado mantendo esta interface.
 */
export class RateLimiterService {
  private readonly hits = new Map<string, number[]>();

  constructor(private readonly now: () => number = Date.now) {}

  record(key: string, windowMs: number): void {
    const current = this.prune(key, windowMs);
    current.push(this.now());
    this.hits.set(key, current);
  }

  check(key: string, rule: RateLimitRule): RateLimitStatus {
    const current = this.prune(key, rule.windowMs);
    if (current.length < rule.limit) {
      return { blocked: false, retryAfterSeconds: 0 };
    }
    // A janela libera quando a ocorrencia mais antiga relevante expirar.
    const releaseAt = current[current.length - rule.limit] + rule.windowMs;
    return {
      blocked: true,
      retryAfterSeconds: Math.max(
        1,
        Math.ceil((releaseAt - this.now()) / 1000),
      ),
    };
  }

  clear(key: string): void {
    this.hits.delete(key);
  }

  clearAll(): void {
    this.hits.clear();
  }

  private prune(key: string, windowMs: number): number[] {
    const threshold = this.now() - windowMs;
    const recent = (this.hits.get(key) ?? []).filter((t) => t > threshold);
    if (recent.length === 0) this.hits.delete(key);
    else this.hits.set(key, recent);
    return recent;
  }
}
