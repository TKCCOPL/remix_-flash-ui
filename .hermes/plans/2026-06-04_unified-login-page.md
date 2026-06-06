# 统一登录页重构实施计划

> **分支**: `feature/unified-login-page` (基于 `main`)
> **目标**: 将分散的 Admin 登录页和 OAuth 弹窗合并为一个分栏式登录页，仿照 CareerCompass 设计风格

**架构**: 左右分栏布局 — 左侧品牌装饰区（始终深色），右侧表单区（跟随主题）。表单区包含 Admin 用户名密码登录 + GitHub/Gitee OAuth 登录。

**Tech Stack**: React 19, Tailwind CSS 4, React Router 7, Framer Motion

---

## Task 1: 更新 i18n 文案 — 合并 login + oauth 登录文案

**Objective**: 为统一登录页准备 i18n key，合并原有 `login` 和 `oauth` 中与登录页相关的文案

**Files:**
- Modify: `frontend/i18n.ts:293-299` (zh `login` section)
- Modify: `frontend/i18n.ts:606-612` (en `login` section)

**Step 1: 更新中文 login 文案**

将 `frontend/i18n.ts:293-299` 的 `login` 对象改为：

```typescript
login: {
  title: '欢迎回来',
  subtitle: '登录以继续访问',
  username: '用户名',
  password: '密码',
  submit: '登录',
  error: '账号或密码错误',
  divider: '或者',
  backToHome: '← 返回首页',
},
```

**Step 2: 更新英文 login 文案**

将 `frontend/i18n.ts:606-612` 的 `login` 对象改为：

```typescript
login: {
  title: 'Welcome back',
  subtitle: 'Sign in to continue',
  username: 'Username',
  password: 'Password',
  submit: 'Sign In',
  error: 'Invalid credentials',
  divider: 'or',
  backToHome: '← Back to home',
},
```

**Step 3: 验证**

确认 `oauth` section 中的 `github`, `gitee`, `loginPrompt` 保持不变（这些仍在评论区使用）。

---

## Task 2: 重写 Login.tsx — 分栏式统一登录页

**Objective**: 实现仿 CareerCompass 的左右分栏登录页，上半部分 admin 表单，下半部分 OAuth 按钮

**Files:**
- Rewrite: `frontend/pages/Login.tsx`

**Step 1: 重写 Login.tsx 完整代码**

替换整个文件为以下内容：

```tsx
import { useState, useEffect } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { useI18n } from '../context/Preferences';
import { useAuth } from '../context/AuthContext';
import { authApi } from '../api/auth';
import { ApiError } from '../api/client';

export default function Login() {
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const navigate = useNavigate();
  const t = useI18n();
  const { user, isAdmin, login: oauthLogin, refreshUser } = useAuth();

  // 已登录则跳转
  useEffect(() => {
    if (isAdmin) {
      navigate('/admin');
      return;
    }
    if (user) {
      navigate('/');
      return;
    }
    // 兜底：检查 admin session
    authApi.me()
      .then(() => navigate('/admin'))
      .catch(() => {});
  }, [navigate]);

  const handleAdminLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setSubmitting(true);
    try {
      const result = await authApi.login(username, password);
      if (!result.ok) {
        setError(t.login.error);
        return;
      }
      await refreshUser();
      navigate('/admin');
    } catch (requestError) {
      if (requestError instanceof ApiError && requestError.status === 401) {
        setError(t.login.error);
      } else if (requestError instanceof Error) {
        setError(requestError.message);
      } else {
        setError(t.login.error);
      }
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="min-h-screen grid lg:grid-cols-2">
      {/* ── 左侧品牌区（始终深色） ── */}
      <div className="relative hidden lg:flex flex-col justify-between p-12 bg-stone-900 text-white overflow-hidden">
        {/* Logo */}
        <Link to="/" className="relative z-10 flex items-center gap-2 text-lg font-semibold">
          <span className="text-white font-bold">XiaoC'</span>
          <span className="text-indigo-400">blog</span>
        </Link>

        {/* 标语 */}
        <div className="relative z-10">
          <h2 className="text-3xl font-bold leading-tight mb-4">
            记录探索<br />分享见解
          </h2>
          <p className="text-stone-400 text-sm max-w-xs">
            一个关于软件工程、界面设计和技术探索的个人博客
          </p>
        </div>

        {/* 底部链接 */}
        <div className="relative z-10 flex items-center gap-6 text-xs text-stone-500">
          <span>&copy; {new Date().getFullYear()} XiaoC'blog</span>
          <a href="https://github.com/TKCCOPL" target="_blank" rel="noopener" className="hover:text-stone-300 transition-colors">
            GitHub
          </a>
        </div>

        {/* 装饰元素 */}
        <div className="absolute inset-0 bg-grid-white/[0.03] bg-[size:24px_24px]" />
        <div className="absolute top-1/4 right-1/4 size-64 bg-indigo-500/10 rounded-full blur-3xl" />
        <div className="absolute bottom-1/3 left-1/4 size-48 bg-purple-500/10 rounded-full blur-3xl" />
      </div>

      {/* ── 右侧表单区（跟随主题） ── */}
      <div className="flex items-center justify-center p-8 bg-white dark:bg-stone-950">
        <div className="w-full max-w-[420px]">
          {/* 移动端 Logo */}
          <div className="lg:hidden flex items-center justify-center gap-2 text-lg font-bold mb-10">
            <span className="text-stone-900 dark:text-stone-100">XiaoC'</span>
            <span className="text-indigo-600 dark:text-indigo-400">blog</span>
          </div>

          {/* 标题 */}
          <div className="text-center mb-10">
            <h1 className="text-3xl font-bold tracking-tight text-stone-900 dark:text-stone-100 mb-2">
              {t.login.title}
            </h1>
            <p className="text-sm text-stone-500 dark:text-stone-400">
              {t.login.subtitle}
            </p>
          </div>

          {/* 错误提示 */}
          {error && (
            <div className="mb-6 p-4 bg-red-50 dark:bg-red-950/30 text-red-600 dark:text-red-400 text-sm rounded-xl border border-red-100 dark:border-red-900/50">
              {error}
            </div>
          )}

          {/* Admin 表单 */}
          <form onSubmit={handleAdminLogin} className="space-y-5">
            <div>
              <label className="block text-sm font-medium text-stone-700 dark:text-stone-300 mb-1.5">
                {t.login.username}
              </label>
              <input
                type="text"
                value={username}
                onChange={(e) => setUsername(e.target.value)}
                className="w-full h-12 px-4 bg-stone-50 dark:bg-stone-900 border border-stone-200 dark:border-stone-800 rounded-xl focus:ring-2 focus:ring-indigo-500 dark:focus:ring-white/10 focus:border-stone-900 transition-all outline-none text-stone-900 dark:text-stone-100"
                required
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-stone-700 dark:text-stone-300 mb-1.5">
                {t.login.password}
              </label>
              <div className="relative">
                <input
                  type={showPassword ? 'text' : 'password'}
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  className="w-full h-12 px-4 pr-10 bg-stone-50 dark:bg-stone-900 border border-stone-200 dark:border-stone-800 rounded-xl focus:ring-2 focus:ring-indigo-500 dark:focus:ring-white/10 focus:border-stone-900 transition-all outline-none text-stone-900 dark:text-stone-100"
                  required
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-stone-400 hover:text-stone-600 dark:hover:text-stone-300 transition-colors"
                  aria-label={showPassword ? 'Hide password' : 'Show password'}
                >
                  {showPassword ? (
                    <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13.875 18.825A10.05 10.05 0 0112 19c-4.478 0-8.268-2.943-9.543-7a9.97 9.97 0 011.563-3.029m5.858.908a3 3 0 114.243 4.243M9.878 9.878l4.242 4.242M9.88 9.88l-3.29-3.29m7.532 7.532l3.29 3.29M3 3l3.59 3.59m0 0A9.953 9.953 0 0112 5c4.478 0 8.268 2.943 9.542 7a10.025 10.025 0 01-4.132 5.411m0 0L21 21" /></svg>
                  ) : (
                    <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" /><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" /></svg>
                  )}
                </button>
              </div>
            </div>

            <button
              type="submit"
              disabled={submitting}
              className="w-full h-12 bg-stone-900 dark:bg-stone-100 text-white dark:text-stone-900 font-medium rounded-xl hover:bg-stone-800 dark:hover:bg-stone-200 focus:ring-4 focus:ring-stone-500/20 transition-all disabled:opacity-50"
            >
              {submitting ? `${t.login.submit}...` : t.login.submit}
            </button>
          </form>

          {/* 分割线 */}
          <div className="flex items-center gap-4 my-8">
            <div className="flex-1 h-px bg-stone-200 dark:bg-stone-800" />
            <span className="text-xs text-stone-400 dark:text-stone-500 uppercase tracking-wider">
              {t.login.divider}
            </span>
            <div className="flex-1 h-px bg-stone-200 dark:bg-stone-800" />
          </div>

          {/* OAuth 按钮 */}
          <div className="space-y-3">
            <button
              onClick={() => oauthLogin('github')}
              className="w-full h-12 flex items-center justify-center gap-3 bg-stone-900 dark:bg-stone-100 text-white dark:text-stone-900 font-medium rounded-xl hover:bg-stone-800 dark:hover:bg-stone-200 transition-colors"
            >
              <svg className="w-5 h-5" viewBox="0 0 24 24" fill="currentColor">
                <path d="M12 0C5.37 0 0 5.37 0 12c0 5.31 3.435 9.795 8.205 11.385.6.105.825-.255.825-.57 0-.285-.015-1.23-.015-2.235-3.015.555-3.795-.735-4.035-1.41-.135-.345-.72-1.41-1.23-1.695-.42-.225-1.02-.78-.015-.795.945-.015 1.62.87 1.845 1.23 1.08 1.815 2.805 1.305 3.495.99.105-.78.42-1.305.765-1.605-2.67-.3-5.46-1.335-5.46-5.925 0-1.305.465-2.385 1.23-3.225-.12-.3-.54-1.53.12-3.18 0 0 1.005-.315 3.3 1.23.96-.27 1.98-.405 3-.405s2.04.135 3 .405c2.295-1.56 3.3-1.23 3.3-1.23.66 1.65.24 2.88.12 3.18.765.84 1.23 1.905 1.23 3.225 0 4.605-2.805 5.625-5.475 5.925.435.375.81 1.095.81 2.22 0 1.605-.015 2.895-.015 3.3 0 .315.225.69.825.57A12.02 12.02 0 0024 12c0-6.63-5.37-12-12-12z" />
              </svg>
              {t.oauth.github}
            </button>

            <button
              onClick={() => oauthLogin('gitee')}
              className="w-full h-12 flex items-center justify-center gap-3 bg-red-500 text-white font-medium rounded-xl hover:bg-red-600 transition-colors"
            >
              <svg className="w-5 h-5" viewBox="0 0 24 24" fill="currentColor">
                <path d="M11.984 0A12 12 0 000 12a12 12 0 0012 12 12 12 0 0012-12A12 12 0 0012 0a12 12 0 00-.016 0zm6.09 5.333c.328 0 .593.266.592.593v1.482a.594.594 0 01-.593.592H9.777c-.982 0-1.778.796-1.778 1.778v5.63c0 .327.266.592.593.592h5.63c.982 0 1.778-.796 1.778-1.778v-.296a.593.593 0 00-.592-.593h-4.15a.592.592 0 01-.592-.592v-1.482a.593.593 0 01.593-.592h6.815c.327 0 .593.265.593.592v3.408a4 4 0 01-4 4H5.926a.593.593 0 01-.593-.593V9.778a4.444 4.444 0 014.445-4.444h8.296z" />
              </svg>
              {t.oauth.gitee}
            </button>
          </div>

          {/* 返回首页 */}
          <div className="text-center mt-8">
            <Link
              to="/"
              className="text-sm text-stone-500 dark:text-stone-400 hover:text-stone-900 dark:hover:text-stone-100 transition-colors"
            >
              {t.login.backToHome}
            </Link>
          </div>
        </div>
      </div>
    </div>
  );
}
```

**Step 2: 验证页面渲染**

启动 dev server，浏览器访问 `http://127.0.0.1:3000/login`，确认：
- 左侧深色品牌区在桌面端显示
- 右侧表单区正常渲染
- 移动端只显示右侧表单区
- 暗色模式正确切换

---

## Task 3: 修改 Layout.tsx — Header 登录按钮跳转

**Objective**: 将 Header 登录按钮从弹 OAuthMenu 改为 navigate 到 `/login`

**Files:**
- Modify: `frontend/components/Layout.tsx:220`
- Remove: `frontend/components/Layout.tsx:8` (OAuthMenu import)
- Remove: `frontend/components/Layout.tsx:16` (showOAuthMenu state)
- Remove: `frontend/components/Layout.tsx:282` (OAuthMenu 渲染)

**Step 1: 删除 OAuthMenu import (line 8)**

删除：
```typescript
import OAuthMenu from './OAuthMenu';
```

**Step 2: 添加 useNavigate import (line 2)**

将：
```typescript
import { Outlet, Link, useLocation } from 'react-router-dom';
```
改为：
```typescript
import { Outlet, Link, useLocation, useNavigate } from 'react-router-dom';
```

**Step 3: 添加 navigate 和删除 showOAuthMenu (line 16)**

将：
```typescript
const [showOAuthMenu, setShowOAuthMenu] = useState(false);
```
改为：
```typescript
const navigate = useNavigate();
```

**Step 4: 修改 Header 登录按钮 (line 220)**

将：
```typescript
onClick={() => setShowOAuthMenu(true)}
```
改为：
```typescript
onClick={() => navigate('/login')}
```

**Step 5: 删除 OAuthMenu 渲染 (line 282)**

删除：
```typescript
<OAuthMenu open={showOAuthMenu} onClose={() => setShowOAuthMenu(false)} />
```

**Step 6: 验证**

点击 Header 登录图标，确认跳转到 `/login` 页面。

---

## Task 4: 修改 CommentSection.tsx — 评论区登录按钮跳转

**Objective**: 将评论区登录按钮从弹 OAuthMenu 改为 navigate 到 `/login`

**Files:**
- Modify: `frontend/components/CommentSection.tsx:8` (import)
- Modify: `frontend/components/CommentSection.tsx:29` (state)
- Modify: `frontend/components/CommentSection.tsx:179` (onClick)
- Modify: `frontend/components/CommentSection.tsx:322` (OAuthMenu 渲染)

**Step 1: 替换 OAuthMenu import (line 8)**

将：
```typescript
import OAuthMenu from './OAuthMenu';
```
改为：
```typescript
import { useNavigate } from 'react-router-dom';
```

**Step 2: 替换 state 为 navigate (line 29)**

将：
```typescript
const [showOAuthMenu, setShowOAuthMenu] = useState(false);
```
改为：
```typescript
const navigate = useNavigate();
```

**Step 3: 修改登录按钮 onClick (line 179)**

将：
```typescript
onClick={() => setShowOAuthMenu(true)}
```
改为：
```typescript
onClick={() => navigate('/login')}
```

**Step 4: 删除 OAuthMenu 渲染 (line 322)**

删除：
```typescript
<OAuthMenu open={showOAuthMenu} onClose={() => setShowOAuthMenu(false)} />
```

**Step 5: 验证**

在文章详情页评论区，未登录状态下点击"登录"按钮，确认跳转到 `/login`。

---

## Task 5: 删除 OAuthMenu.tsx

**Objective**: 移除不再使用的 OAuthMenu 组件

**Files:**
- Delete: `frontend/components/OAuthMenu.tsx`

**Step 1: 删除文件**

```bash
rm frontend/components/OAuthMenu.tsx
```

**Step 2: 确认无残留引用**

搜索整个 frontend 目录，确认没有其他文件 import OAuthMenu：

```bash
grep -r "OAuthMenu" frontend/
```

预期：无结果。

**Step 3: 验证构建**

```bash
npm run build
```

预期：构建成功，无编译错误。

---

## Task 6: 提交代码

**Objective**: 将所有改动提交到 feature 分支

**Step 1: 检查改动**

```bash
git status
git diff
```

**Step 2: 提交**

```bash
git add -A
git commit -m "feat: unify admin login and OAuth login into a single page

- Rewrite Login.tsx with split-screen layout (brand left, form right)
- Admin username/password form + GitHub/Gitee OAuth buttons
- Password visibility toggle
- Replace OAuthMenu popup with navigate('/login') in Layout and CommentSection
- Delete OAuthMenu.tsx component
- Merge i18n login/OAuth text keys
- Dark mode support (left panel stays dark, right follows theme)"
```

**Step 3: 推送并创建 PR**

```bash
git push origin feature/unified-login-page
gh pr create --base main --title "feat: 统一登录页" --body "将 Admin 登录和 OAuth 登录合并为一个分栏式登录页"
```

---

## 文件改动总览

| 文件 | 操作 | 改动量 |
|------|------|--------|
| `frontend/i18n.ts` | Modify | ~15 行 |
| `frontend/pages/Login.tsx` | Rewrite | 101→~180 行 |
| `frontend/components/Layout.tsx` | Modify | 5 处小改 |
| `frontend/components/CommentSection.tsx` | Modify | 4 处小改 |
| `frontend/components/OAuthMenu.tsx` | Delete | 整个文件 |

**后端零改动。**

---

## 自审记录

### ✅ 已验证项

| 检查项 | 结果 |
|--------|------|
| Layout.tsx 行号 (8, 16, 220, 282) | ✅ 与源码一致 |
| CommentSection.tsx 行号 (8, 29, 179, 322) | ✅ 与源码一致 |
| Layout.tsx `useState` import 保留 | ✅ 其他 state 仍需 useState |
| CommentSection.tsx `useState` import 保留 | ✅ comments/loading/content 等仍需 |
| Login.tsx `useAuth` 解构 `login` | ✅ AuthContext 暴露了 login 方法 |
| Login.tsx `oauthLogin` 调用方式 | ✅ 直接 `window.location.href` 重定向，不更新 React state |
| i18n key 中英文对齐 | ✅ zh/en 结构一致 |
| OAuth 按钮引用 `t.oauth.github/gitee` | ✅ oauth section 保持不变 |
| `adminTitle` 未使用 | 🔄 已从 i18n 中移除 |
| Layout 移动端无登录按钮 | ✅ 与当前行为一致（`hidden sm:flex`） |
| OAuthMenu 删除后无残留引用 | ✅ Layout + CommentSection 均已清理 |
| Tailwind v4 兼容性 (`size-64`, `bg-grid-white`) | ✅ v4 支持 |

### ⚠️ 注意事项

1. **Layout 移动端**: Header 登录按钮带 `hidden sm:flex`，移动端不可见。用户需通过评论区或直接访问 `/login`。这是现有行为，非回归。
2. **OAuth 回调**: `oauthApi.login()` 使用 `window.location.href` 整页跳转，OAuth 回调后设置 cookie 再重定向回首页。AuthContext 的 `refreshUser()` 会在首页加载时自动获取用户信息。
3. **bg-grid-white**: 需要 Tailwind CSS 4 支持背景网格图案。当前项目已使用 Tailwind v4.3.0，兼容。
