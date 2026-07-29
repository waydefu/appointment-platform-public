import { RateLimitedError } from '../errors/api-error.js';
export interface RateLimiter {
  assertWithinLimit(key: string): void;
}
export interface Clock {
  now(): number;
}
interface Window {
  count: number;
  windowStart: number;
}
export class FixedWindowRateLimiter implements RateLimiter {
  private readonly windows = new Map<string, Window>();
  public constructor(
    private readonly maxRequests: number,
    private readonly windowMs: number,
    private readonly clock: Clock = { now: () => Date.now() }
  ) {}
  private lastSweptAt = Number.NEGATIVE_INFINITY;
  private sweepExpired(now: number): void {
    if (now - this.lastSweptAt < this.windowMs) return;
    this.lastSweptAt = now;
    for (const [key, window] of this.windows) {
      if (now - window.windowStart >= this.windowMs) this.windows.delete(key);
    }
  }
  public assertWithinLimit(key: string): void {
    const now = this.clock.now();
    const current = this.windows.get(key);
    if (current === undefined || now - current.windowStart >= this.windowMs) {
      this.sweepExpired(now);
      this.windows.set(key, { count: 1, windowStart: now });
      return;
    }
    if (current.count >= this.maxRequests) {
      const remainingMs = current.windowStart + this.windowMs - now;
      throw new RateLimitedError(remainingMs / 1000);
    }
    current.count += 1;
  }
  public get trackedKeyCount(): number {
    return this.windows.size;
  }
}
