# CodeCreatures CareerCompass 精确对齐实现计划

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** 按 CareerCompass 原版 `animated-characters.tsx` 的精确参数重写 `CodeCreatures.tsx`，修复鼠标追踪、角色姿态、动画触发逻辑

**Architecture:** 保留 4 角色架构（Purple/Gray/Orange/Yellow），将鼠标追踪从固定中心点改为基于 DOM ref 的 `getBoundingClientRect()` 计算，精确对齐原版的眼睛位置、body skew、过渡时间

**Tech Stack:** React 19, Tailwind CSS 4, CSS transitions/transforms, TypeScript

**参考源码:** CareerCompass `src/components/ui/animated-characters.tsx` (465行)

**缩放比:** 550×400 → 260×190 (ratio: 0.473)

---

## 文件结构

| 文件 | 操作 | 职责 |
|------|------|------|
| `frontend/components/CodeCreatures.tsx` | 重写 | 4 角色动画组件，鼠标追踪、眨眼、姿态变换 |
| `frontend/pages/Login.tsx` | 不改 | 已正确传递所有 props |

---

## Task 1: 重写主组件 — 鼠标追踪改为 DOM ref

**Files:**
- Rewrite: `frontend/components/CodeCreatures.tsx:1-50` (imports + types + helpers)

**目标:** 删除顶层 `mousePos` state 和固定中心点计算，改为每角色独立 ref + `getBoundingClientRect()`

- [ ] **Step 1: 重写 imports、types、颜色常量、calculatePosition**

替换文件开头到 `calculatePosition` 函数（第1-61行）：

```tsx
import { useState, useEffect, useRef } from 'react';

type CodeCreaturesProps = {
  isTyping?: boolean;
  focusedField?: 'username' | 'password' | null;
  showPassword?: boolean;
  submitting?: boolean;
  loginSuccess?: boolean;
  passwordLength?: number;
};

// CareerCompass exact palette
const C = {
  purple: '#6C3FF5',
  gray: '#2D2D2D',
  orange: '#FF9B6B',
  yellow: '#E8D754',
  pupil: '#2D2D2D',
};

// ── Position calculation (per-character, DOM-ref based) ──

type PositionResult = {
  bodySkew: number;
  faceX: number;
  faceY: number;
};

function calculatePosition(
  mouseX: number,
  mouseY: number,
  ref: React.RefObject<HTMLDivElement | null>
): PositionResult {
  if (!ref.current) return { faceX: 0, faceY: 0, bodySkew: 0 };

  const rect = ref.current.getBoundingClientRect();
  const centerX = rect.left + rect.width / 2;
  const centerY = rect.top + rect.height / 3;

  const deltaX = mouseX - centerX;
  const deltaY = mouseY - centerY;

  const faceX = Math.max(-15, Math.min(15, deltaX / 20));
  const faceY = Math.max(-10, Math.min(10, deltaY / 30));
  const bodySkew = Math.max(-6, Math.min(6, -deltaX / 120));

  return { faceX, faceY, bodySkew };
}
```

- [ ] **Step 2: 验证无 TypeScript 错误**

Run: `cd /root/.hermes/remix_-flash-ui && npx tsc --noEmit --pretty 2>&1 | head -30`
Expected: 类型错误（因为后续组件还未更新），但无语法错误

- [ ] **Step 3: Commit**

```bash
git add frontend/components/CodeCreatures.tsx
git commit -m "refactor: rewrite calculatePosition to use DOM refs
```

---

## Task 2: 重写 EyeBall 和 Pupil 子组件

**Files:**
- Rewrite: `frontend/components/CodeCreatures.tsx:63-174`

**目标:** 精确对齐原版的 EyeBall/Pupil 实现，过渡时间改为 0.1s（与原版一致）

- [ ] **Step 1: 重写 EyeBall 组件**

替换第63-126行：

```tsx
// ── EyeBall: white sclera + pupil ──

function EyeBall({
  size = 18,
  pupilSize = 7,
  maxDistance = 5,
  isBlinking = false,
  forceLookX,
  forceLookY,
}: {
  size?: number;
  pupilSize?: number;
  maxDistance?: number;
  isBlinking?: boolean;
  forceLookX?: number;
  forceLookY?: number;
}) {
  const [mouseX, setMouseX] = useState(0);
  const [mouseY, setMouseY] = useState(0);
  const eyeRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const handle = (e: MouseEvent) => {
      setMouseX(e.clientX);
      setMouseY(e.clientY);
    };
    window.addEventListener('mousemove', handle);
    return () => window.removeEventListener('mousemove', handle);
  }, []);

  const calculatePupilPosition = () => {
    if (!eyeRef.current) return { x: 0, y: 0 };

    if (forceLookX !== undefined && forceLookY !== undefined) {
      return { x: forceLookX, y: forceLookY };
    }

    const eye = eyeRef.current.getBoundingClientRect();
    const eyeCenterX = eye.left + eye.width / 2;
    const eyeCenterY = eye.top + eye.height / 2;

    const deltaX = mouseX - eyeCenterX;
    const deltaY = mouseY - eyeCenterY;
    const distance = Math.min(Math.sqrt(deltaX ** 2 + deltaY ** 2), maxDistance);

    const angle = Math.atan2(deltaY, deltaX);
    const x = Math.cos(angle) * distance;
    const y = Math.sin(angle) * distance;

    return { x, y };
  };

  const pupilPosition = calculatePupilPosition();

  return (
    <div
      ref={eyeRef}
      className="rounded-full flex items-center justify-center transition-all duration-150"
      style={{
        width: size,
        height: isBlinking ? 2 : size,
        backgroundColor: 'white',
        overflow: 'hidden',
      }}
    >
      {!isBlinking && (
        <div
          className="rounded-full"
          style={{
            width: pupilSize,
            height: pupilSize,
            backgroundColor: C.pupil,
            transform: `translate(${pupilPosition.x}px, ${pupilPosition.y}px)`,
            transition: 'transform 0.1s ease-out',
          }}
        />
      )}
    </div>
  );
}
```

- [ ] **Step 2: 重写 Pupil 子组件**

替换原 Pupil 组件（第130-174行）：

```tsx
// ── Pupil: no sclera, just a dot ──

function Pupil({
  size = 12,
  maxDistance = 5,
  forceLookX,
  forceLookY,
}: {
  size?: number;
  maxDistance?: number;
  forceLookX?: number;
  forceLookY?: number;
}) {
  const [mouseX, setMouseX] = useState(0);
  const [mouseY, setMouseY] = useState(0);
  const pupilRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const handle = (e: MouseEvent) => {
      setMouseX(e.clientX);
      setMouseY(e.clientY);
    };
    window.addEventListener('mousemove', handle);
    return () => window.removeEventListener('mousemove', handle);
  }, []);

  const calculatePupilPosition = () => {
    if (!pupilRef.current) return { x: 0, y: 0 };

    if (forceLookX !== undefined && forceLookY !== undefined) {
      return { x: forceLookX, y: forceLookY };
    }

    const pupil = pupilRef.current.getBoundingClientRect();
    const pupilCenterX = pupil.left + pupil.width / 2;
    const pupilCenterY = pupil.top + pupil.height / 2;

    const deltaX = mouseX - pupilCenterX;
    const deltaY = mouseY - pupilCenterY;
    const distance = Math.min(Math.sqrt(deltaX ** 2 + deltaY ** 2), maxDistance);

    const angle = Math.atan2(deltaY, deltaX);
    const x = Math.cos(angle) * distance;
    const y = Math.sin(angle) * distance;

    return { x, y };
  };

  const pupilPosition = calculatePupilPosition();

  return (
    <div
      ref={pupilRef}
      className="rounded-full shrink-0"
      style={{
        width: size,
        height: size,
        backgroundColor: C.pupil,
        transform: `translate(${pupilPosition.x}px, ${pupilPosition.y}px)`,
        transition: 'transform 0.1s ease-out',
      }}
    />
  );
}
```

- [ ] **Step 3: 验证无 TypeScript 错误**

Run: `cd /root/.hermes/remix_-flash-ui && npx tsc --noEmit --pretty 2>&1 | head -30`

- [ ] **Step 4: Commit**

```bash
git add frontend/components/CodeCreatures.tsx
git commit -m "refactor: rewrite EyeBall/Pupil with DOM-ref based tracking
```

---

## Task 3: 重写 Purple 角色 — 精确姿态 + 眼睛位置

**Files:**
- Rewrite: `frontend/components/CodeCreatures.tsx` (Purple 组件)

**目标:** 实现原版的密码隐藏"守护"倾斜、打字键盘倾斜、精确眼睛位置映射

- [ ] **Step 1: 重写 Purple 组件**

替换原 Purple 组件（第178-246行）：

```tsx
// ── Purple: tall rectangle, back-left ──

function Purple({
  isTyping,
  showPassword,
  passwordLength,
  isBlinking,
  isLookingAtEachOther,
  isPeeking,
  bodySkew,
  faceX,
  faceY,
}: {
  isTyping: boolean;
  showPassword: boolean;
  passwordLength: number;
  isBlinking: boolean;
  isLookingAtEachOther: boolean;
  isPeeking: boolean;
  bodySkew: number;
  faceX: number;
  faceY: number;
}) {
  const isHidingPassword = passwordLength > 0 && !showPassword;
  const isPasswordVisible = passwordLength > 0 && showPassword;

  // Body height: grow when typing or hiding password
  const height = (isTyping || isHidingPassword) ? 190 : 170;

  // Body transform: exact CareerCompass logic
  const bodyTransform = isPasswordVisible
    ? 'skewX(0deg)'
    : (isTyping || isHidingPassword)
      ? `skewX(${(bodySkew || 0) - 12}deg) translateX(19px)`
      : `skewX(${bodySkew || 0}deg)`;

  // Eye container position per state
  let eyeLeft: number;
  let eyeTop: number;
  if (isPasswordVisible) {
    eyeLeft = 20;
    eyeTop = 35;
  } else if (isLookingAtEachOther) {
    eyeLeft = 55;
    eyeTop = 65;
  } else {
    eyeLeft = 45 + faceX;
    eyeTop = 40 + faceY;
  }

  // Eye look direction
  let flx: number | undefined;
  let fly: number | undefined;
  if (isPasswordVisible) {
    flx = isPeeking ? 4 : -4;
    fly = isPeeking ? 5 : -4;
  } else if (isLookingAtEachOther) {
    flx = 3;
    fly = 4;
  } else {
    flx = undefined; // use mouse tracking
    fly = undefined;
  }

  return (
    <div
      ref={undefined} // ref set by parent wrapper
      style={{
        width: 85,
        height,
        backgroundColor: C.purple,
        borderRadius: '10px 10px 0 0',
        position: 'relative',
        zIndex: 1,
        transformOrigin: 'bottom center',
        transform: bodyTransform,
        transition: 'all 0.7s ease-in-out',
      }}
    >
      <div
        className="absolute flex"
        style={{
          left: eyeLeft,
          top: eyeTop,
          gap: 15,
          transition: 'all 0.7s ease-in-out',
        }}
      >
        <EyeBall size={18} pupilSize={7} maxDistance={5} isBlinking={isBlinking} forceLookX={flx} forceLookY={fly} />
        <EyeBall size={18} pupilSize={7} maxDistance={5} isBlinking={isBlinking} forceLookX={flx} forceLookY={fly} />
      </div>
    </div>
  );
}
```

- [ ] **Step 2: 验证无 TypeScript 错误**

Run: `cd /root/.hermes/remix_-flash-ui && npx tsc --noEmit --pretty 2>&1 | head -30`

- [ ] **Step 3: Commit**

```bash
git add frontend/components/CodeCreatures.tsx
git commit -m "refactor: precise Purple posture and eye positions

- Password hiding: skewX-12 + translateX(19px) guard posture
- Typing: keyboard-leaning skew
- Eye positions: idle(45+fx,40+fy), password(20,35), lookingAtEachOther(55,65)
- Gap: 15px (scaled from 32px)
- Transition: 0.7s ease-in-out
```

---

## Task 4: 重写 Gray 角色 — 对视动画 + 精确参数

**Files:**
- Rewrite: `frontend/components/CodeCreatures.tsx` (Gray 组件)

**目标:** 实现原版的 1.5 倍 skew 对视动画、精确眼睛位置

- [ ] **Step 1: 重写 Gray 组件**

替换原 Gray 组件（第248-305行）：

```tsx
// ── Gray: medium rectangle, back-right ──

function Gray({
  isTyping,
  showPassword,
  passwordLength,
  isBlinking,
  isLookingAtEachOther,
  bodySkew,
  faceX,
  faceY,
}: {
  isTyping: boolean;
  showPassword: boolean;
  passwordLength: number;
  isBlinking: boolean;
  isLookingAtEachOther: boolean;
  bodySkew: number;
  faceX: number;
  faceY: number;
}) {
  const isPasswordVisible = passwordLength > 0 && showPassword;
  const isHidingPassword = passwordLength > 0 && !showPassword;

  // Body transform: exact CareerCompass logic
  const bodyTransform = isPasswordVisible
    ? 'skewX(0deg)'
    : isLookingAtEachOther
      ? `skewX(${(bodySkew || 0) * 1.5 + 10}deg) translateX(9px)`
      : (isTyping || isHidingPassword)
        ? `skewX(${(bodySkew || 0) * 1.5}deg)`
        : `skewX(${bodySkew || 0}deg)`;

  // Eye container position per state
  let eyeLeft: number;
  let eyeTop: number;
  if (isPasswordVisible) {
    eyeLeft = 10;
    eyeTop = 28;
  } else if (isLookingAtEachOther) {
    eyeLeft = 32;
    eyeTop = 12;
  } else {
    eyeLeft = 26 + faceX;
    eyeTop = 32 + faceY;
  }

  // Eye look direction
  let flx: number | undefined;
  let fly: number | undefined;
  if (isPasswordVisible) {
    flx = -4;
    fly = -4;
  } else if (isLookingAtEachOther) {
    flx = 0;
    fly = -4;
  } else {
    flx = undefined;
    fly = undefined;
  }

  return (
    <div
      style={{
        width: 57,
        height: 147,
        backgroundColor: C.gray,
        borderRadius: '8px 8px 0 0',
        position: 'relative',
        zIndex: 2,
        transformOrigin: 'bottom center',
        transform: bodyTransform,
        transition: 'all 0.7s ease-in-out',
      }}
    >
      <div
        className="absolute flex"
        style={{
          left: eyeLeft,
          top: eyeTop,
          gap: 11,
          transition: 'all 0.7s ease-in-out',
        }}
      >
        <EyeBall size={16} pupilSize={6} maxDistance={4} isBlinking={isBlinking} forceLookX={flx} forceLookY={fly} />
        <EyeBall size={16} pupilSize={6} maxDistance={4} isBlinking={isBlinking} forceLookX={flx} forceLookY={fly} />
      </div>
    </div>
  );
}
```

- [ ] **Step 2: 验证无 TypeScript 错误**

Run: `cd /root/.hermes/remix_-flash-ui && npx tsc --noEmit --pretty 2>&1 | head -30`

- [ ] **Step 3: Commit**

```bash
git add frontend/components/CodeCreatures.tsx
git commit -m "refactor: precise Gray looking-at-each-other animation

- 1.5x bodySkew + 10deg offset + translateX(9px) when looking
- Typing: 1.5x bodySkew lean
- Eye positions: idle(26+fx,32+fy), password(10,28), looking(32,12)
- Gap: 11px (scaled from 24px)
```

---

## Task 5: 重写 Orange 角色 — 眼睛跟随 + forceLook

**Files:**
- Rewrite: `frontend/components/CodeCreatures.tsx` (Orange 组件)

**目标:** 添加 faceX/Y 跟随、密码可见时的 forceLook

- [ ] **Step 1: 重写 Orange 组件**

替换原 Orange 组件（第307-352行）：

```tsx
// ── Orange: semi-circle, front-left ──

function Orange({
  showPassword,
  passwordLength,
  bodySkew,
  faceX,
  faceY,
}: {
  showPassword: boolean;
  passwordLength: number;
  bodySkew: number;
  faceX: number;
  faceY: number;
}) {
  const isPasswordVisible = passwordLength > 0 && showPassword;

  // Eye container position per state
  const eyeLeft = isPasswordVisible ? 50 : 82 + faceX;
  const eyeTop = isPasswordVisible ? 85 : 90 + faceY;

  // Force look when password visible
  const flx = isPasswordVisible ? -5 : undefined;
  const fly = isPasswordVisible ? -4 : undefined;

  return (
    <div
      style={{
        width: 114,
        height: 95,
        backgroundColor: C.orange,
        borderRadius: '57px 57px 0 0',
        position: 'relative',
        zIndex: 3,
        transformOrigin: 'bottom center',
        transform: isPasswordVisible ? 'skewX(0deg)' : `skewX(${bodySkew || 0}deg)`,
        transition: 'all 0.7s ease-in-out',
      }}
    >
      <div
        className="absolute flex"
        style={{
          left: eyeLeft,
          top: eyeTop,
          gap: 15,
          transition: 'all 0.2s ease-out',
        }}
      >
        <Pupil size={12} maxDistance={5} forceLookX={flx} forceLookY={fly} />
        <Pupil size={12} maxDistance={5} forceLookX={flx} forceLookY={fly} />
      </div>
    </div>
  );
}
```

- [ ] **Step 2: 验证无 TypeScript 错误**

Run: `cd /root/.hermes/remix_-flash-ui && npx tsc --noEmit --pretty 2>&1 | head -30`

- [ ] **Step 3: Commit**

```bash
git add frontend/components/CodeCreatures.tsx
git commit -m "refactor: Orange faceX/Y tracking and forceLook

- Eyes follow faceX/Y when idle/typing
- Force look (-5, -4) when password visible
- Eye gap: 15px (scaled from 32px)
- Eye transition: 0.2s ease-out (faster than body)
```

---

## Task 6: 重写 Yellow 角色 — 眼睛跟随 + 嘴巴位置

**Files:**
- Rewrite: `frontend/components/CodeCreatures.tsx` (Yellow 组件)

**目标:** 添加 faceX/Y 跟随、精确嘴巴位置

- [ ] **Step 1: 重写 Yellow 组件**

替换原 Yellow 组件（第354-413行）：

```tsx
// ── Yellow: tall rounded + mouth, front-right ──

function Yellow({
  showPassword,
  passwordLength,
  bodySkew,
  faceX,
  faceY,
}: {
  showPassword: boolean;
  passwordLength: number;
  bodySkew: number;
  faceX: number;
  faceY: number;
}) {
  const isPasswordVisible = passwordLength > 0 && showPassword;

  // Eye container position per state
  const eyeLeft = isPasswordVisible ? 20 : 52 + faceX;
  const eyeTop = isPasswordVisible ? 35 : 40 + faceY;

  // Mouth position per state
  const mouthLeft = isPasswordVisible ? 10 : 40 + faceX;
  const mouthTop = isPasswordVisible ? 88 : 88 + faceY;

  // Force look when password visible
  const flx = isPasswordVisible ? -5 : undefined;
  const fly = isPasswordVisible ? -4 : undefined;

  return (
    <div
      style={{
        width: 66,
        height: 109,
        backgroundColor: C.yellow,
        borderRadius: '33px 33px 0 0',
        position: 'relative',
        zIndex: 4,
        transformOrigin: 'bottom center',
        transform: isPasswordVisible ? 'skewX(0deg)' : `skewX(${bodySkew || 0}deg)`,
        transition: 'all 0.7s ease-in-out',
      }}
    >
      <div
        className="absolute flex"
        style={{
          left: eyeLeft,
          top: eyeTop,
          gap: 11,
          transition: 'all 0.2s ease-out',
        }}
      >
        <Pupil size={12} maxDistance={5} forceLookX={flx} forceLookY={fly} />
        <Pupil size={12} maxDistance={5} forceLookX={flx} forceLookY={fly} />
      </div>
      {/* Horizontal mouth line */}
      <div
        className="absolute rounded-full"
        style={{
          left: mouthLeft,
          top: mouthTop,
          width: 28,
          height: 3.5,
          backgroundColor: C.pupil,
          transition: 'all 0.2s ease-out',
        }}
      />
    </div>
  );
}
```

- [ ] **Step 2: 验证无 TypeScript 错误**

Run: `cd /root/.hermes/remix_-flash-ui && npx tsc --noEmit --pretty 2>&1 | head -30`

- [ ] **Step 3: Commit**

```bash
git add frontend/components/CodeCreatures.tsx
git commit -m "refactor: Yellow faceX/Y tracking and mouth position

- Eyes follow faceX/Y when idle/typing
- Force look (-5, -4) when password visible
- Mouth follows faceX/Y offset
- Eye gap: 11px (scaled from 24px)
- Eye transition: 0.2s ease-out
```

---

## Task 7: 重写主组件 — DOM ref + 递归 peeking

**Files:**
- Rewrite: `frontend/components/CodeCreatures.tsx` (main export)

**目标:** 每角色独立 ref、修复 peeking 递归触发、精确位置布局

- [ ] **Step 1: 重写主组件**

替换原主组件（第415-578行）：

```tsx
// ── Main component ──

export default function CodeCreatures({
  isTyping = false,
  focusedField = null,
  showPassword = false,
  submitting = false,
  loginSuccess = false,
  passwordLength = 0,
}: CodeCreaturesProps) {
  const [blink1, setBlink1] = useState(false);
  const [blink2, setBlink2] = useState(false);
  const [isLookingAtEachOther, setIsLookingAtEachOther] = useState(false);
  const [isPeeking, setIsPeeking] = useState(false);
  const [mouseX, setMouseX] = useState(0);
  const [mouseY, setMouseY] = useState(0);
  const purpleRef = useRef<HTMLDivElement>(null);
  const grayRef = useRef<HTMLDivElement>(null);
  const orangeRef = useRef<HTMLDivElement>(null);
  const yellowRef = useRef<HTMLDivElement>(null);

  // Track mouse globally
  useEffect(() => {
    const handle = (e: MouseEvent) => {
      setMouseX(e.clientX);
      setMouseY(e.clientY);
    };
    window.addEventListener('mousemove', handle);
    return () => window.removeEventListener('mousemove', handle);
  }, []);

  // Purple blink (3-7s)
  useEffect(() => {
    let t: ReturnType<typeof setTimeout>;
    const sched = () => {
      t = setTimeout(() => {
        setBlink1(true);
        setTimeout(() => { setBlink1(false); sched(); }, 150);
      }, 3000 + Math.random() * 4000);
    };
    sched();
    return () => clearTimeout(t);
  }, []);

  // Gray blink (3-7s, offset)
  useEffect(() => {
    let t: ReturnType<typeof setTimeout>;
    const sched = () => {
      t = setTimeout(() => {
        setBlink2(true);
        setTimeout(() => { setBlink2(false); sched(); }, 150);
      }, 3500 + Math.random() * 3500);
    };
    sched();
    return () => clearTimeout(t);
  }, []);

  // Look at each other when typing starts
  useEffect(() => {
    if (isTyping) {
      setIsLookingAtEachOther(true);
      const t = setTimeout(() => setIsLookingAtEachOther(false), 800);
      return () => clearTimeout(t);
    }
    setIsLookingAtEachOther(false);
  }, [isTyping]);

  // Purple sneaky peek — recursive re-trigger
  useEffect(() => {
    if (passwordLength > 0 && showPassword) {
      const schedulePeek = () => {
        const t = setTimeout(() => {
          setIsPeeking(true);
          setTimeout(() => setIsPeeking(false), 800);
        }, 2000 + Math.random() * 3000);
        return t;
      };
      const t = schedulePeek();
      return () => clearTimeout(t);
    }
    setIsPeeking(false);
  }, [passwordLength, showPassword, isPeeking]);

  // Per-character position calculation
  const purplePos = calculatePosition(mouseX, mouseY, purpleRef);
  const grayPos = calculatePosition(mouseX, mouseY, grayRef);
  const orangePos = calculatePosition(mouseX, mouseY, orangeRef);
  const yellowPos = calculatePosition(mouseX, mouseY, yellowRef);

  const isPasswordVisible = passwordLength > 0 && showPassword;

  return (
    <>
      <style>{`
        @keyframes shake {
          0%, 100% { transform: translateX(0); }
          25% { transform: translateX(-2px) rotate(-1deg); }
          75% { transform: translateX(2px) rotate(1deg); }
        }
      `}</style>

      {/* Container: 260x190, characters grounded at bottom */}
      <div
        className="relative select-none"
        style={{
          width: 260,
          height: 190,
          animation: submitting ? 'shake 0.12s infinite' : undefined,
        }}
      >
        {/* Purple — back-left (origin: left 70, width 180 → scaled 33, 85) */}
        <div ref={purpleRef} className="absolute bottom-0" style={{ left: 33 }}>
          <Purple
            isTyping={isTyping}
            showPassword={showPassword}
            passwordLength={passwordLength}
            isBlinking={blink1}
            isLookingAtEachOther={isLookingAtEachOther}
            isPeeking={isPeeking}
            bodySkew={purplePos.bodySkew}
            faceX={purplePos.faceX}
            faceY={purplePos.faceY}
          />
        </div>
        {/* Gray — back-right (origin: left 240, width 120 → scaled 113, 57) */}
        <div ref={grayRef} className="absolute bottom-0" style={{ left: 113 }}>
          <Gray
            isTyping={isTyping}
            showPassword={showPassword}
            passwordLength={passwordLength}
            isBlinking={blink2}
            isLookingAtEachOther={isLookingAtEachOther}
            bodySkew={grayPos.bodySkew}
            faceX={grayPos.faceX}
            faceY={grayPos.faceY}
          />
        </div>
        {/* Orange — front-left (origin: left 0, width 240 → scaled 0, 114) */}
        <div ref={orangeRef} className="absolute bottom-0" style={{ left: 0 }}>
          <Orange
            showPassword={showPassword}
            passwordLength={passwordLength}
            bodySkew={orangePos.bodySkew}
            faceX={orangePos.faceX}
            faceY={orangePos.faceY}
          />
        </div>
        {/* Yellow — front-right (origin: left 310, width 140 → scaled 147, 66) */}
        <div ref={yellowRef} className="absolute bottom-0" style={{ left: 147 }}>
          <Yellow
            showPassword={showPassword}
            passwordLength={passwordLength}
            bodySkew={yellowPos.bodySkew}
            faceX={yellowPos.faceX}
            faceY={yellowPos.faceY}
          />
        </div>
      </div>
    </>
  );
}
```

- [ ] **Step 2: 验证完整文件无 TypeScript 错误**

Run: `cd /root/.hermes/remix_-flash-ui && npx tsc --noEmit --pretty 2>&1 | head -30`
Expected: 无错误

- [ ] **Step 3: 启动开发服务器验证视觉效果**

Run: `cd /root/.hermes/remix_-flash-ui && npm run dev &`
然后在浏览器中访问登录页面，验证：
- 鼠标移动时 4 个角色身体和眼睛跟随
- 输入时角色倾斜
- 密码隐藏时 Purple 守护姿态
- 密码可见时所有角色直立 + 眼睛向下看
- Purple 持续偷看（不是只偷看一次）
- 对视动画有身体反应

- [ ] **Step 4: Commit**

```bash
git add frontend/components/CodeCreatures.tsx
git commit -m "refactor: precise CareerCompass alignment for CodeCreatures

- Per-character DOM ref mouse tracking (getBoundingClientRect)
- Purple: guard posture (skewX-12 + translateX) on password hide
- Gray: 1.5x skew + offset on looking-at-each-other
- Orange/Yellow: faceX/Y tracking + forceLook on password
- Recursive peeking re-trigger (not single-shot)
- Exact eye positions per state (idle/password/lookingAtEachOther)
- Layered transitions: body 700ms ease-in-out, eyes 200ms ease-out
- Exact eye gaps: 15px (32→15), 11px (24→11)
```

---

## 自审记录

### 1. Spec 覆盖

| 计划要求 | 对应 Task | 状态 |
|---------|----------|------|
| 基于 DOM ref 的鼠标追踪 | Task 1 + 7 | ✅ |
| Purple 密码隐藏守护倾斜 | Task 3 | ✅ |
| Purple 打字键盘倾斜 | Task 3 | ✅ |
| Gray 对视 1.5x skew + 位移 | Task 4 | ✅ |
| peeking 递归触发 | Task 7 | ✅ |
| Orange/Yellow forceLook | Task 5 + 6 | ✅ |
| 精确眼睛位置映射 | Task 3 + 4 + 5 + 6 | ✅ |
| 分层过渡时间 | Task 3 + 4 (700ms), Task 5 + 6 (200ms) | ✅ |
| 统一 eye gap | Task 3 + 4 + 5 + 6 | ✅ |
| Login.tsx 不改 | N/A | ✅ |

### 2. 占位符扫描

无 TBD、TODO、"implement later"、"similar to Task N" 等占位符。

### 3. 类型一致性

| 符号 | Task 1 定义 | 后续使用 | 一致 |
|------|-----------|---------|------|
| `PositionResult` | `{ bodySkew, faceX, faceY }` | 所有角色组件 | ✅ |
| `calculatePosition(mouseX, mouseY, ref)` | 3 参数 | Task 7 调用 | ✅ |
| `CodeCreaturesProps` | 6 个可选 prop | Task 7 接收 | ✅ |
| `C.purple/gray/orange/yellow/pupil` | 色值常量 | 所有角色组件 | ✅ |
