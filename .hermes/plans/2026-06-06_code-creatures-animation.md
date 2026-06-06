# CodeCreatures 动画组件 + 登录页布局优化

> **分支**: `feature/unified-login-page` (已有统一登录页代码)
> **目标**: 为登录页左侧品牌区添加原创交互动画组件，同时优化整体布局

**架构**: 创建独立的 `CodeCreatures.tsx` 组件，纯 React + CSS 实现，无额外依赖。通过 props 接收表单状态（isTyping, focusedField, showPassword, submitting, loginSuccess），驱动角色动画。

**Tech Stack**: React 19, Tailwind CSS 4, CSS transitions/transforms

---

## Task 1: 创建 CodeCreatures.tsx 动画组件

**Objective**: 实现 3 个代码主题角色（Codey、Semicolon、Cursor），包含眼球追踪、眨眼、打字反应等动画

**Files:**
- Create: `frontend/components/CodeCreatures.tsx`

**组件 API:**

```tsx
type CodeCreaturesProps = {
  isTyping?: boolean;          // 是否正在打字
  focusedField?: 'username' | 'password' | null;  // 当前聚焦的输入框
  showPassword?: boolean;      // 密码是否可见
  submitting?: boolean;        // 是否正在提交
  loginSuccess?: boolean;      // 登录是否成功
};
```

**角色设计:**

1. **Codey `{ }`** — 高个子花括号人，紫色 (#818CF8)
   - 眼球追踪鼠标
   - 随机眨眼（3-7秒）
   - 打字时身体变高 + 微微倾斜
   - 密码聚焦时转身背对（尊重隐私）
   - 登录成功时跳跃

2. **Semicolon `;`** — 矮胖分号精灵，橙色 (#FB923C)
   - 眼球追踪鼠标
   - 打字时好奇歪头
   - 密码可见时偷看
   - 提交时紧张抖动

3. **Cursor `>_`** — 小光标，绿色 (#34D399)
   - 闪烁动画（idle: 1秒, 打字: 0.3秒）
   - 跟随聚焦的输入框位置移动
   - 登录成功时爆炸粒子效果

**Step 1: 创建组件文件**

完整的 CodeCreatures.tsx 代码（~250 行），包含：
- `EyeBall` 子组件（眼球 + 瞳孔追踪）
- `Codey` 角色（紫色花括号人）
- `Semicolon` 角色（橙色分号精灵）
- `Cursor` 角色（绿色光标）
- 主组件组合三个角色 + 管理动画状态

**Step 2: 验证组件可导入**

在 Login.tsx 中临时 import 确认无编译错误。

---

## Task 2: 优化 Login.tsx 布局 + 集成动画

**Objective**: 重构左侧品牌区布局，集成 CodeCreatures 组件，优化间距和视觉层次

**Files:**
- Modify: `frontend/pages/Login.tsx`

**布局优化点:**

1. **左侧品牌区**:
   - 标签文字移到左上角（保持现有）
   - 标语移到中上部（不与动画重叠）
   - 动画角色居中偏下（主要视觉焦点）
   - 底部版权链接（保持现有）

2. **右侧表单区**:
   - 表单整体上移，减少顶部空白
   - 标题和副标题间距收紧
   - 输入框高度从 `h-12` 微调到 `h-11`（更紧凑）
   - OAuth 按钮加 hover 缩放动效

3. **状态传递**:
   - Login.tsx 新增 `focusedField` state
   - username input: `onFocus={() => setFocusedField('username')}`
   - password input: `onFocus={() => setFocusedField('password')}`
   - 将 `isTyping`, `focusedField`, `showPassword`, `submitting` 传给 CodeCreatures

**Step 1: 添加 focusedField state**

```tsx
const [focusedField, setFocusedField] = useState<'username' | 'password' | null>(null);
```

**Step 2: 输入框绑定 onFocus/onBlur**

```tsx
<input
  onFocus={() => setFocusedField('username')}
  onBlur={() => setFocusedField(null)}
  ...
/>
```

**Step 3: 左侧品牌区替换为动画**

```tsx
{/* Tagline - moved up */}
<div className="relative z-10 mb-auto">
  <h2>记录探索<br />分享见解</h2>
  <p>一个关于软件工程、界面设计和技术探索的个人博客</p>
</div>

{/* Animation - center */}
<div className="relative z-10 flex-1 flex items-center justify-center">
  <CodeCreatures
    isTyping={focusedField !== null}
    focusedField={focusedField}
    showPassword={showPassword && focusedField === 'password'}
    submitting={submitting}
  />
</div>
```

**Step 4: 验证**

- 桌面端：左侧动画 + 右侧表单
- 移动端：只显示表单（动画 hidden）
- 暗色模式：左侧始终深色，右侧跟随主题

---

## Task 3: 提交代码

**Objective**: 提交所有改动

```bash
git add -A
git commit -m "feat: add CodeCreatures animation to login page

- Create CodeCreatures.tsx with 3 interactive characters
- Codey (purple bracket): eye tracking, blinking, body stretch
- Semicolon (orange): head tilt, peek password
- Cursor (green): blink, position follow
- Optimize login page layout spacing
- Add focusedField state for input tracking"
```

---

## 文件改动总览

| 文件 | 操作 | 行数 |
|------|------|------|
| `frontend/components/CodeCreatures.tsx` | 新建 | ~250 行 |
| `frontend/pages/Login.tsx` | 修改 | ~30 行改动 |

---

## 自审记录

### ✅ 已验证项

| 检查项 | 结果 |
|--------|------|
| Login.tsx 当前行号 | ✅ 215 行，已读取 |
| focusedField 不影响现有 auth 逻辑 | ✅ 纯 UI state |
| CodeCreatures 无外部依赖 | ✅ 纯 React + CSS |
| 移动端 `hidden lg:flex` 保持 | ✅ 动画仅桌面端 |
| dark mode 兼容 | ✅ 左侧始终深色 |
| useState import 已存在 | ✅ 无需新增 |
| useAuth 解构不变 | ✅ 不影响 |
