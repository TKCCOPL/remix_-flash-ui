import { describe, expect, it } from 'vitest';
import {
  resolveFluidMode,
  stepBlob,
  decayRipples,
  type BlobState,
  type RippleState,
} from './model';

describe('resolveFluidMode', () => {
  it('returns reduced when prefersReducedMotion is true', () => {
    expect(resolveFluidMode({ width: 1440, hasTouch: false, prefersReducedMotion: true })).toBe('reduced');
  });

  it('returns mobile on narrow touch devices', () => {
    expect(resolveFluidMode({ width: 390, hasTouch: true, prefersReducedMotion: false })).toBe('mobile');
  });

  it('returns desktop on wide pointer devices', () => {
    expect(resolveFluidMode({ width: 1440, hasTouch: false, prefersReducedMotion: false })).toBe('desktop');
  });
});

describe('stepBlob', () => {
  it('moves blob toward target with easing', () => {
    const prev: BlobState = { x: 0.2, y: 0.2, vx: 0, vy: 0, radius: 0.22 };
    const next = stepBlob(prev, { x: 0.8, y: 0.7 }, 1 / 60, 'desktop');
    expect(next.x).toBeGreaterThan(prev.x);
    expect(next.y).toBeGreaterThan(prev.y);
    expect(next.radius).toBeGreaterThanOrEqual(0.18);
  });
});

describe('decayRipples', () => {
  it('removes dead ripples and keeps alive ones', () => {
    const ripples: RippleState[] = [
      { x: 0.5, y: 0.5, life: 0.7, strength: 1 },
      { x: 0.2, y: 0.2, life: 0.01, strength: 1 },
    ];
    const next = decayRipples(ripples, 0.02);
    expect(next.length).toBe(1);
    expect(next[0].life).toBeLessThan(0.7);
  });
});
