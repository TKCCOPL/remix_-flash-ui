# CodeCreatures 精确对齐 CareerCompass 优化计划

> **分支**: `feature/unified-login-page`
> **目标**: 按照 CareerCompass 原版的精确像素值、动画参数、交互逻辑重写 CodeCreatures 组件

**来源**: CareerCompass `src/components/ui/animated-characters.tsx` (465行)

---

## 核心差异分析

| 维度 | CareerCompass 原版 | 当前实现 | 差距 |
|------|-------------------|---------|------|
| 容器尺寸 | 550×400px | 240×195px | 需按比例缩放 |
| 鼠标追踪 | 每角色独立 bodySkew + faceX/Y | 仅眼球追踪 | 缺少身体跟随 |
| 过渡时间 | body 700ms, 眼睛 200ms | 600ms 统一 | 需分层 |
| eye gap | 紫/橙 32px, 灰/黄 24px | 简化 | 需精确 |
| eye 位置 | 每状态独立 left/top | 简化 | 需完整实现 |
| passwordLength | 作为 prop 传入 | 硬编码 0 | 需传入 |
| 眼睛移动 | Orange/Yellow 也跟随 faceX/Y | 静态 | 需添加 |
| 输入聚焦 | isTyping = email 或 password 聚焦 | 已实现 | ✅ 一致 |

---

## Task 1: 重写 CodeCreatures.tsx — 精确对齐原版

**Objective**: 按 CareerCompass 原版参数重写组件，保留 4 角色架构

**Files:**
- Rewrite: `frontend/components/CodeCreatures.tsx`

**关键改动:**

### 1.1 容器比例缩放

CareerCompass: 550×400 → Blog: 260×190 (缩放比 0.473)

| 角色 | 原版 left | 原版 width | 原版 height | 缩放后 left | 缩放后 width | 缩放后 height |
|------|----------|-----------|------------|------------|-------------|--------------|
| Purple | 70 | 180 | 400→440 | 33 | 85 | 189→208 |
| Black | 240 | 120 | 310 | 113 | 57 | 147 |
| Orange | 0 | 240 | 200 | 0 | 114 | 95 |
| Yellow | 310 | 140 | 230 | 147 | 66 | 109 |

### 1.2 每角色独立 bodySkew 追踪

```tsx
// 原版逻辑
const calculatePosition = (ref) => {
  const deltaX = mouseX - centerX;
  const deltaY = mouseY - (rect.top + rect.height / 3);
  const faceX = clamp(-15, 15, deltaX / 20);
  const faceY = clamp(-10, 10, deltaY / 30);
  const bodySkew = clamp(-6, 6, -deltaX / 120);
  return { faceX, faceY, bodySkew };
};
```

缩放后 faceX: ±7px, faceY: ±5px, bodySkew: ±6deg（不变）

### 1.3 眼睛状态映射（精确 left/top）

**Purple 眼睛容器:**
| 状态 | left | top |
|------|------|-----|
| idle | 21 + faceX | 19 + faceY |
| isLookingAtEachOther | 26 | 31 |
| showPassword | 9 | 17 |

**Black 眼睛容器:**
| 状态 | left | top |
|------|------|-----|
| idle | 12 + faceX | 15 + faceY |
| isLookingAtEachOther | 15 | 6 |
| showPassword | 5 | 13 |

**Orange 眼睛容器:**
| 状态 | left | top |
|------|------|-----|
| idle | 39 + faceX | 43 + faceY |
| showPassword | 24 | 40 |

**Yellow 眼睛容器:**
| 状态 | left | top |
|------|------|-----|
| idle | 25 + faceX | 19 + faceY |
| showPassword | 9 | 17 |

### 1.4 眼睛规格

| 角色 | 类型 | size | pupilSize | gap |
|------|------|------|-----------|-----|
| Purple | EyeBall | 18 | 7 | 32→15 |
| Black | EyeBall | 16 | 6 | 24→11 |
| Orange | Pupil | 12 | — | 32→15 |
| Yellow | Pupil | 12 | — | 24→11 |

### 1.5 过渡时间分层

```tsx
// body: 700ms ease-in-out
transition: 'all 0.7s ease-in-out'
// eyes (purple/black): 700ms ease-in-out
transition: 'all 0.7s ease-in-out'
// eyes (orange/yellow): 200ms ease-out
transition: 'all 0.2s ease-out'
```

### 1.6 passwordLength prop

```tsx
type CodeCreaturesProps = {
  isTyping?: boolean;
  focusedField?: 'username' | 'password' | null;
  showPassword?: boolean;
  passwordLength?: number;  // 新增
  submitting?: boolean;
  loginSuccess?: boolean;
};
```

### 1.7 Orange/Yellow 身体跟随

原版 Orange/Yellow 也有 bodySkew 跟随（虽然较 subtle）：
```tsx
// Orange
transform: showPassword ? 'skewX(0deg)' : `skewX(${bodySkew}deg)`
// Yellow  
transform: showPassword ? 'skewX(0deg)' : `skewX(${bodySkew}deg)`
```

---

## Task 2: Login.tsx 传入 passwordLength

**Objective**: 将 password.length 传给 CodeCreatures

**Files:**
- Modify: `frontend/pages/Login.tsx:83-88`

**改动:**

```tsx
<CodeCreatures
  isTyping={focusedField !== null}
  focusedField={focusedField}
  showPassword={showPassword && focusedField === 'password'}
  passwordLength={password.length}  // 新增
  submitting={submitting}
/>
```

---

## Task 3: 左侧面板布局微调

**Objective**: 让角色区域有足够空间展示缩放后的 260×190 容器

**Files:**
- Modify: `frontend/pages/Login.tsx:64`

**改动**: 确保角色区域 `flex-1` 且 `min-h-0` 允许收缩

---

## Task 4: 提交

```bash
git add -A && git commit -m "refactor: precise CareerCompass alignment for CodeCreatures

- Scale container from 550x400 to 260x190 (0.473 ratio)
- Per-character bodySkew + faceX/Y mouse tracking
- State-dependent eye positions (idle/typing/password)
- Layered transition timing (body 700ms, eyes 200ms/700ms)
- Add passwordLength prop for hiding posture
- Orange/Yellow body skew follow
- Exact eye sizes and gaps per CareerCompass spec"
```

---

## 自审记录

| 检查项 | 结果 |
|--------|------|
| Login.tsx 当前行号 | ✅ 231 行已读取 |
| passwordLength 不影响 auth 逻辑 | ✅ 纯 UI prop |
| 缩放比例计算正确 | ✅ 550→260, 400→190 |
| eye gap 缩放 | ✅ 32→15, 24→11 |
| 过渡时间与原版一致 | ✅ 700ms body, 200ms eyes |
| bodySkew clamp 范围 | ✅ ±6deg |
| forceLook 值与原版一致 | ✅ 已核对 |
