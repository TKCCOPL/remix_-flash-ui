export type FluidMode = 'desktop' | 'mobile' | 'reduced';

export type BlobState = {
  x: number;
  y: number;
  vx: number;
  vy: number;
  radius: number;
};

export type RippleState = {
  x: number;
  y: number;
  life: number;
  strength: number;
};

export function resolveFluidMode(input: {
  width: number;
  hasTouch: boolean;
  prefersReducedMotion: boolean;
}): FluidMode {
  if (input.prefersReducedMotion) return 'reduced';
  if (input.hasTouch || input.width < 768) return 'mobile';
  return 'desktop';
}

export function stepBlob(prev: BlobState, target: { x: number; y: number }, dt: number, mode: FluidMode): BlobState {
  const stiffness = mode === 'desktop' ? 18 : 10;
  const damping = mode === 'desktop' ? 0.82 : 0.76;
  const ax = (target.x - prev.x) * stiffness;
  const ay = (target.y - prev.y) * stiffness;
  const vx = (prev.vx + ax * dt) * damping;
  const vy = (prev.vy + ay * dt) * damping;
  const x = prev.x + vx * dt;
  const y = prev.y + vy * dt;
  const radius = mode === 'desktop' ? 0.22 : 0.16;
  return { x, y, vx, vy, radius };
}

export function decayRipples(ripples: RippleState[], dt: number): RippleState[] {
  return ripples
    .map((r) => ({ ...r, life: r.life - dt * 1.4 }))
    .filter((r) => r.life > 0);
}
