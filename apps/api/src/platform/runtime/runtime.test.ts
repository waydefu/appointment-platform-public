import { describe, expect, it } from 'vitest';
import {
  RateLimitedError,
  ServiceUnavailableError
} from '../errors/api-error.js';
import { StaticMaintenanceGate } from './maintenance-gate.js';
import { FixedWindowRateLimiter } from './rate-limiter.js';
describe('StaticMaintenanceGate', () => {
  it('passes when available and fails 503 under maintenance', () => {
    expect(() =>
      new StaticMaintenanceGate(false).assertAvailable()
    ).not.toThrow();
    expect(() =>
      new StaticMaintenanceGate(true).assertAvailable()
    ).toThrowError(ServiceUnavailableError);
  });
});
describe('FixedWindowRateLimiter', () => {
  it('allows up to the limit, then rejects within the window', () => {
    let now = 1000;
    const limiter = new FixedWindowRateLimiter(2, 1000, { now: () => now });
    expect(() => limiter.assertWithinLimit('actor_a')).not.toThrow();
    expect(() => limiter.assertWithinLimit('actor_a')).not.toThrow();
    expect(() => limiter.assertWithinLimit('actor_a')).toThrowError(
      RateLimitedError
    );
    now += 1000;
    expect(() => limiter.assertWithinLimit('actor_a')).not.toThrow();
  });
  it('tracks each key independently', () => {
    const limiter = new FixedWindowRateLimiter(1, 1000, { now: () => 500 });
    expect(() => limiter.assertWithinLimit('actor_a')).not.toThrow();
    expect(() => limiter.assertWithinLimit('actor_b')).not.toThrow();
    expect(() => limiter.assertWithinLimit('actor_a')).toThrowError(
      RateLimitedError
    );
  });
  it('does not retain a window past its own expiry', () => {
    let now = 0;
    const limiter = new FixedWindowRateLimiter(5, 1000, { now: () => now });
    for (let index = 0; index < 10000; index += 1) {
      limiter.assertWithinLimit(`one_shot_${index}`);
    }
    expect(limiter.trackedKeyCount).toBe(10000);
    now += 1000;
    limiter.assertWithinLimit('actor_a');
    expect(limiter.trackedKeyCount).toBe(1);
  });
  it('keeps a live window while sweeping expired ones', () => {
    let now = 0;
    const limiter = new FixedWindowRateLimiter(2, 1000, { now: () => now });
    limiter.assertWithinLimit('expires_first');
    now = 900;
    limiter.assertWithinLimit('still_live');
    limiter.assertWithinLimit('still_live');
    now = 1100;
    limiter.assertWithinLimit('trigger_sweep');
    expect(limiter.trackedKeyCount).toBe(2);
    expect(() => limiter.assertWithinLimit('still_live')).toThrowError(
      RateLimitedError
    );
  });
  it('sweeps at most once per window', () => {
    let now = 0;
    const limiter = new FixedWindowRateLimiter(1, 1000, { now: () => now });
    const startedAt = performance.now();
    for (let index = 0; index < 50000; index += 1) {
      now += 1;
      limiter.assertWithinLimit(`rotating_${index}`);
    }
    const elapsed = performance.now() - startedAt;
    expect(elapsed).toBeLessThan(2000);
    expect(limiter.trackedKeyCount).toBeLessThan(3000);
  });
});
