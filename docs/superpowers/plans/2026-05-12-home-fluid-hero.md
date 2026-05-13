# Home Fluid Hero Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** 在首页 Hero 区块实现接近 MiMo 示例的“黑色流体遮罩 + 鼠标联动”效果，保留现有中英文文案，并支持移动端弱交互与可访问性降级。

**Architecture:** 将 Hero 动效拆为独立 `FluidHero` 组件，内部使用 canvas 渲染交互层，文本与背景纹理仍由 React 结构控制。把可测试的交互逻辑提炼到纯函数模块（模式判断、blob 更新、ripple 衰减），先用单测锁定行为，再集成到页面。`Home.tsx` 仅负责接入组件，不改后端数据流。

**Tech Stack:** React 19 + TypeScript + Vite + Tailwind CSS + Framer Motion + Vitest.

---

## Scope Check

该 spec 只涉及一个子系统（首页 Hero 视觉与交互），不需要拆分为多个独立计划。

## File Structure（先锁定边界）

- Create: `week10_0504-0510/blog_web/src/components/fluid/model.ts`
- Create: `week10_0504-0510/blog_web/src/components/fluid/model.test.ts`
- Create: `week10_0504-0510/blog_web/src/components/FluidHero.tsx`
- Modify: `week10_0504-0510/blog_web/package.json`
- Modify: `week10_0504-0510/blog_web/src/pages/Home.tsx`
- Modify: `week10_0504-0510/blog_web/src/index.css`

### Task 1: 建立可测试的流体交互核心（TDD）

**Files:**
- Create: `week10_0504-0510/blog_web/src/components/fluid/model.test.ts`
- Create: `week10_0504-0510/blog_web/src/components/fluid/model.ts`
- Modify: `week10_0504-0510/blog_web/package.json`

- [ ] **Step 1: 写失败单测（模式判断 + blob 跟随 + ripple 衰减）**

```ts
// week10_0504-0510/blog_web/src/components/fluid/model.test.ts
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
```

- [ ] **Step 2: 运行单测，确认当前失败**

Run: `cd week10_0504-0510\blog_web && npm run test -- src/components/fluid/model.test.ts`  
Expected: FAIL（`Missing script: "test"` 或 `Cannot find module './model'`）

- [ ] **Step 3: 实现最小核心模块 + 测试脚本**

```ts
// week10_0504-0510/blog_web/src/components/fluid/model.ts
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
```

```json
// week10_0504-0510/blog_web/package.json (scripts/devDependencies 部分)
{
  "scripts": {
    "dev": "vite",
    "build": "vite build",
    "preview": "vite preview",
    "test": "vitest run"
  },
  "devDependencies": {
    "@types/node": "^22.14.0",
    "@vitejs/plugin-react": "^5.0.0",
    "typescript": "~5.8.2",
    "vite": "^6.2.0",
    "vitest": "^2.1.8"
  }
}
```

Run: `cd week10_0504-0510\blog_web && npm install`

- [ ] **Step 4: 重新运行单测，确认通过**

Run: `cd week10_0504-0510\blog_web && npm run test -- src/components/fluid/model.test.ts`  
Expected: PASS（3 组测试全部通过）

- [ ] **Step 5: 提交**

```bash
git add week10_0504-0510/blog_web/package.json week10_0504-0510/blog_web/package-lock.json week10_0504-0510/blog_web/src/components/fluid/model.ts week10_0504-0510/blog_web/src/components/fluid/model.test.ts
git commit -m "feat(home): add fluid hero interaction model with tests" -m "Co-authored-by: Copilot <223556219+Copilot@users.noreply.github.com>"
```

### Task 2: 实现 FluidHero 组件（Canvas 交互层 + 降级路径）

**Files:**
- Create: `week10_0504-0510/blog_web/src/components/FluidHero.tsx`
- Modify: `week10_0504-0510/blog_web/src/pages/Home.tsx`

- [ ] **Step 1: 先接入占位引用，制造失败构建检查**

```tsx
// week10_0504-0510/blog_web/src/pages/Home.tsx (顶部 import 区域)
import FluidHero from '../components/FluidHero';
```

```tsx
// week10_0504-0510/blog_web/src/pages/Home.tsx (hero section 占位)
<FluidHero badge={t.home.heroBadge} title={t.home.heroTitle} subtitle={t.home.heroSubtitle} />
```

- [ ] **Step 2: 运行构建，确认失败**

Run: `cd week10_0504-0510\blog_web && npm run build`  
Expected: FAIL（`Cannot find module '../components/FluidHero'`）

- [ ] **Step 3: 写最小可运行组件实现**

```tsx
// week10_0504-0510/blog_web/src/components/FluidHero.tsx
import { useEffect, useMemo, useRef } from 'react';
import { decayRipples, resolveFluidMode, stepBlob, type BlobState, type RippleState } from './fluid/model';

type Props = { badge: string; title: string; subtitle: string };

export default function FluidHero({ badge, title, subtitle }: Props) {
  const rootRef = useRef<HTMLDivElement | null>(null);
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const blobRef = useRef<BlobState>({ x: 0.5, y: 0.5, vx: 0, vy: 0, radius: 0.22 });
  const ripplesRef = useRef<RippleState[]>([]);
  const pointerRef = useRef({ x: 0.5, y: 0.5 });
  const mode = useMemo(
    () =>
      resolveFluidMode({
        width: typeof window === 'undefined' ? 1440 : window.innerWidth,
        hasTouch: typeof window !== 'undefined' && navigator.maxTouchPoints > 0,
        prefersReducedMotion:
          typeof window !== 'undefined' && window.matchMedia('(prefers-reduced-motion: reduce)').matches,
      }),
    []
  );

  useEffect(() => {
    if (mode === 'reduced') return;
    const root = rootRef.current;
    const canvas = canvasRef.current;
    if (!root || !canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    let rafId = 0;
    let last = performance.now();
    const onPointerMove = (event: PointerEvent) => {
      const rect = root.getBoundingClientRect();
      pointerRef.current = {
        x: (event.clientX - rect.left) / rect.width,
        y: (event.clientY - rect.top) / rect.height,
      };
      ripplesRef.current.push({ ...pointerRef.current, life: 1, strength: mode === 'desktop' ? 1 : 0.6 });
      ripplesRef.current = ripplesRef.current.slice(-8);
    };

    root.addEventListener('pointermove', onPointerMove);
    const tick = (now: number) => {
      const dt = Math.min((now - last) / 1000, 0.05);
      last = now;
      blobRef.current = stepBlob(blobRef.current, pointerRef.current, dt, mode);
      ripplesRef.current = decayRipples(ripplesRef.current, dt);
      rafId = requestAnimationFrame(tick);
    };
    rafId = requestAnimationFrame(tick);

    return () => {
      cancelAnimationFrame(rafId);
      root.removeEventListener('pointermove', onPointerMove);
    };
  }, [mode]);

  return (
    <section ref={rootRef} className="fluid-hero">
      <canvas ref={canvasRef} className="fluid-hero__canvas" aria-hidden="true" />
      <div className="fluid-hero__content">
        <span className="fluid-hero__badge">{badge}</span>
        <h1 className="fluid-hero__title">{title}</h1>
        <p className="fluid-hero__subtitle">{subtitle}</p>
      </div>
    </section>
  );
}
```

- [ ] **Step 4: 再次构建，确认通过**

Run: `cd week10_0504-0510\blog_web && npm run build`  
Expected: PASS（`vite build` 完成）

- [ ] **Step 5: 提交**

```bash
git add week10_0504-0510/blog_web/src/components/FluidHero.tsx week10_0504-0510/blog_web/src/pages/Home.tsx
git commit -m "feat(home): add fluid hero component and wire home hero" -m "Co-authored-by: Copilot <223556219+Copilot@users.noreply.github.com>"
```

### Task 3: 完善视觉层、移动弱交互和最终验收

**Files:**
- Modify: `week10_0504-0510/blog_web/src/components/fluid/model.test.ts`
- Modify: `week10_0504-0510/blog_web/src/components/fluid/model.ts`
- Modify: `week10_0504-0510/blog_web/src/components/FluidHero.tsx`
- Modify: `week10_0504-0510/blog_web/src/index.css`

- [ ] **Step 1: 先补失败测试（移动弱交互阈值与 reduced 优先级）**

```ts
// week10_0504-0510/blog_web/src/components/fluid/model.test.ts (追加)
it('mobile blob radius should be capped lower than desktop', () => {
  const desktop = stepBlob({ x: 0.5, y: 0.5, vx: 0, vy: 0, radius: 0.2 }, { x: 0.9, y: 0.9 }, 1 / 60, 'desktop');
  const mobile = stepBlob({ x: 0.5, y: 0.5, vx: 0, vy: 0, radius: 0.2 }, { x: 0.9, y: 0.9 }, 1 / 60, 'mobile');
  expect(desktop.radius).toBe(0.22);
  expect(mobile.radius).toBe(0.14);
});
```

- [ ] **Step 2: 运行测试，确认失败**

Run: `cd week10_0504-0510\blog_web && npm run test -- src/components/fluid/model.test.ts`  
Expected: FAIL（当前 mobile 半径仍为 `0.16`，与断言 `0.14` 不一致）

- [ ] **Step 3: 实现视觉细节与降级逻辑**

```css
/* week10_0504-0510/blog_web/src/index.css (新增) */
.fluid-hero {
  position: relative;
  min-height: 24rem;
  border: 1px solid oklch(0.84 0.008 250);
  overflow: hidden;
  isolation: isolate;
  background: oklch(0.98 0.005 250);
}

.fluid-hero::before {
  content: "MIMO MIMO MIMO MIMO MIMO MIMO";
  position: absolute;
  inset: 0;
  color: oklch(0.9 0.006 250);
  letter-spacing: 0.7rem;
  font-weight: 700;
  font-size: clamp(2rem, 5vw, 5rem);
  opacity: 0.55;
  pointer-events: none;
}

.fluid-hero__canvas {
  position: absolute;
  inset: 0;
  mix-blend-mode: multiply;
  pointer-events: none;
}

.fluid-hero__content {
  position: relative;
  z-index: 1;
  padding: clamp(2rem, 5vw, 5rem);
}
```

```tsx
// week10_0504-0510/blog_web/src/components/FluidHero.tsx (关键补充)
// useEffect 内补充绘制与 mobile 弱交互逻辑
const maxRipples = mode === 'desktop' ? 8 : 4;
let frame = 0;
const tick = (now: number) => {
  const dt = Math.min((now - last) / 1000, 0.05);
  last = now;
  blobRef.current = stepBlob(blobRef.current, pointerRef.current, dt, mode);
  ripplesRef.current = decayRipples(ripplesRef.current, dt).slice(-maxRipples);

  // mobile 每 2 帧绘制一次，降低刷新压力
  frame += 1;
  if (mode === 'desktop' || frame % 2 === 0) {
    const rect = root.getBoundingClientRect();
    const dpr = window.devicePixelRatio || 1;
    canvas.width = Math.floor(rect.width * dpr);
    canvas.height = Math.floor(rect.height * dpr);
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    ctx.clearRect(0, 0, rect.width, rect.height);

    ctx.fillStyle = 'rgba(24, 26, 30, 0.92)';
    ctx.beginPath();
    ctx.arc(
      blobRef.current.x * rect.width,
      blobRef.current.y * rect.height,
      blobRef.current.radius * Math.min(rect.width, rect.height),
      0,
      Math.PI * 2
    );
    ctx.fill();

    ripplesRef.current.forEach((ripple) => {
      ctx.globalAlpha = Math.max(ripple.life * 0.4, 0);
      ctx.beginPath();
      ctx.arc(
        ripple.x * rect.width,
        ripple.y * rect.height,
        (0.03 + (1 - ripple.life) * 0.08) * Math.min(rect.width, rect.height),
        0,
        Math.PI * 2
      );
      ctx.fill();
    });
    ctx.globalAlpha = 1;
  }

  rafId = requestAnimationFrame(tick);
};
```

```ts
// week10_0504-0510/blog_web/src/components/fluid/model.ts (mobile 半径调小)
const radius = mode === 'desktop' ? 0.22 : 0.14;
```

- [ ] **Step 4: 最终验证（测试 + 构建）**

Run: `cd week10_0504-0510\blog_web && npm run test -- src/components/fluid/model.test.ts`  
Expected: PASS

Run: `cd week10_0504-0510\blog_web && npm run build`  
Expected: PASS

- [ ] **Step 5: 提交**

```bash
git add week10_0504-0510/blog_web/src/components/fluid/model.test.ts week10_0504-0510/blog_web/src/components/fluid/model.ts week10_0504-0510/blog_web/src/components/FluidHero.tsx week10_0504-0510/blog_web/src/index.css
git commit -m "feat(home): polish fluid hero visuals and fallback behavior" -m "Co-authored-by: Copilot <223556219+Copilot@users.noreply.github.com>"
```

## Manual Acceptance Checklist

- 桌面端移动鼠标时，Hero 出现稳定流体遮罩与明显反差效果
- 移动端可触发弱交互，动画强度明显低于桌面端
- 切换中文/英文后，hero 文案和布局正常
- 系统开启“减少动态效果”后，Hero 自动静态化并保持可读
- 不支持交互能力时自动回退到静态样式

