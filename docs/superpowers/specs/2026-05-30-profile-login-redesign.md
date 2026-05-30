# 个人主页与登录优化设计文档

**日期:** 2026-05-30
**状态:** 已确认
**作者:** Claude Code

## 概述

本文档描述了 XiaoC Blog 的前端登录页优化、个人主页重构以及相关 bug 修复的设计方案。

## 设计目标

1. 优化登录退出逻辑
2. 重新设计个人主页，集成收藏和评论功能
3. 修复收藏页空页面 bug
4. 修复登录页 Gitee 图标错误

## 设计决策

### 1. 登录页设计

**决策：分离登录模式**

- **管理员登录**：保持在 `/login` 页面（用户名/密码）
- **OAuth 登录**：保持在弹窗模式（GitHub/Gitee）
- 两种登录方式职责清晰，互不干扰

**修改内容：**
- 修复 `OAuthMenu.tsx` 中的 Gitee SVG 图标
- 优化 `UserMenu.tsx` 的退出登录逻辑

### 2. 个人主页设计

**决策：简洁现代风格**

采用 Tailwind UI 和 Linear 的设计理念：
- 清晰的视觉层次
- 充足的留白
- 微阴影效果
- 圆角卡片

**页面结构：**

```
┌─────────────────────────────────┐
│         用户卡片                │
│  ┌──────┐                      │
│  │ 头像 │  用户名              │
│  │      │  登录方式     [退出] │
│  └──────┘                      │
│  ┌─────────┐ ┌─────────┐      │
│  │ 12 收藏 │ │ 8 评论  │      │
│  └─────────┘ └─────────┘      │
│  ┌─────────────────────────┐  │
│  │       编辑资料          │  │
│  └─────────────────────────┘  │
├─────────────────────────────────┤
│  [收藏文章] [我的评论]         │
├─────────────────────────────────┤
│         内容列表                │
│  ┌─────────────────────────┐  │
│  │ 📄 文章标题              │  │
│  │    摘要内容...           │  │
│  │    2024-01-15            │  │
│  └─────────────────────────┘  │
│  ┌─────────────────────────┐  │
│  │ 📄 另一篇文章            │  │
│  │    摘要内容...           │  │
│  │    2024-01-10            │  │
│  └─────────────────────────┘  │
└─────────────────────────────────┘
```

### 3. 用户卡片设计

**决策：全宽按钮 + 图标退出**

- 用户头像 + 用户名 + 登录方式
- 统计数据：收藏数、评论数
- 编辑资料按钮（全宽）
- 退出登录图标按钮（右上角）

### 4. 标签页设计

**决策：双标签页**

- **收藏文章**：显示用户收藏的文章列表
- **我的评论**：显示用户发表的评论历史

### 5. 空状态设计

**收藏为空时：**
- 收藏图标
- 提示文字："还没有收藏的文章"
- 引导文字："浏览文章时点击收藏按钮，就可以在这里找到它们"
- 行动按钮："去浏览文章"

**评论为空时：**
- 评论图标
- 提示文字："还没有发表过评论"
- 引导文字："阅读文章时留下你的想法"
- 行动按钮："去浏览文章"

## 组件拆分

### 新建组件

| 组件 | 路径 | 说明 |
|------|------|------|
| `UserCard` | `frontend/components/UserCard.tsx` | 用户信息卡片 |
| `ProfileTabs` | `frontend/components/ProfileTabs.tsx` | 标签页切换 |
| `FavoritesList` | `frontend/components/FavoritesList.tsx` | 收藏列表 |
| `CommentsList` | `frontend/components/CommentsList.tsx` | 评论列表 |
| `EmptyState` | `frontend/components/EmptyState.tsx` | 空状态提示 |

### 修改文件

| 文件 | 修改内容 |
|------|----------|
| `Profile.tsx` | 重构为新设计 |
| `UserMenu.tsx` | 优化退出逻辑，移除收藏链接 |
| `OAuthMenu.tsx` | 修复 Gitee SVG 图标 |
| `i18n.ts` | 添加新翻译 |
| `App.tsx` | 移除 /favorites 路由 |

## API 接口

### 现有接口

- `GET /api/users/me/favorites` — 获取收藏列表
- `POST /api/posts/:id/favorite` — 切换收藏状态
- `GET /api/posts/:id/is-favorited` — 检查是否已收藏

### 新增接口

- `GET /api/users/me/comments` — 获取用户评论列表

## 国际化

### 新增翻译键

**中文：**
```typescript
profile: {
  editProfile: '编辑资料',
  logout: '退出登录',
  favorites: '收藏文章',
  comments: '我的评论',
  noFavorites: '还没有收藏的文章',
  noFavoritesDesc: '浏览文章时点击收藏按钮，就可以在这里找到它们',
  noComments: '还没有发表过评论',
  noCommentsDesc: '阅读文章时留下你的想法',
  browseArticles: '去浏览文章',
  loginMethod: '通过 {provider} 登录',
}
```

**英文：**
```typescript
profile: {
  editProfile: 'Edit Profile',
  logout: 'Logout',
  favorites: 'Favorites',
  comments: 'My Comments',
  noFavorites: 'No favorites yet',
  noFavoritesDesc: 'Click the favorite button on articles to save them here',
  noComments: 'No comments yet',
  noCommentsDesc: 'Share your thoughts when reading articles',
  browseArticles: 'Browse Articles',
  loginMethod: 'Logged in via {provider}',
}
```

## Gitee 图标修复

当前 `OAuthMenu.tsx` 中的 Gitee SVG 图标显示错误，需要替换为正确的 Gitee 官方图标。

**正确的 Gitee SVG 路径：**
```svg
<svg viewBox="0 0 24 24" fill="currentColor">
  <path d="M11.984 0A12 12 0 0 0 0 12a12 12 0 0 0 12 12 12 12 0 0 0 12-12A12 12 0 0 0 12 0a12 12 0 0 0-.016 0zm6.09 5.33h4.984s-.67 3.66-4.656 7.16c-3.984 3.5-5.656 4.16-7.656 4.16-2 0-3.656-.67-3.656-.67V9.33s3 1.33 5.328 1.33c2.328 0 3.656-1.33 5.328-1.33h.328V5.33zM7.656 9.33v6s-2.328-.67-4.328-.67V9.33h4.328zm1.328 0h4.984v4.66s-2.328.67-4.328.67-4.328-.67-4.328-.67V9.33h3.672z"/>
</svg>
```

## 路由变更

### 移除路由

- `/favorites` — 收藏功能集成到个人主页

### 保持路由

- `/login` — 管理员登录
- `/profile` — 个人主页（重构）

## 实现优先级

1. **P0 - Bug 修复**
   - 修复 Gitee 图标
   - 修复收藏页空页面 bug

2. **P1 - 核心功能**
   - 重构个人主页
   - 实现用户卡片组件
   - 实现收藏列表组件

3. **P2 - 增强功能**
   - 实现评论列表组件
   - 实现标签页切换
   - 实现空状态组件

4. **P3 - 优化**
   - 优化退出登录逻辑
   - 添加新翻译
   - 移除旧路由

## 测试要点

1. **登录测试**
   - 管理员登录流程
   - OAuth 登录流程（GitHub/Gitee）
   - 退出登录流程

2. **个人主页测试**
   - 用户信息显示
   - 统计数据正确性
   - 标签页切换

3. **收藏功能测试**
   - 收藏列表加载
   - 空状态显示
   - 点击跳转

4. **评论功能测试**
   - 评论列表加载
   - 空状态显示
   - 点击跳转

5. **响应式测试**
   - 移动端适配
   - 不同屏幕尺寸

## 设计参考

- **设计风格**：Tailwind UI、Linear、Vercel
- **圆角**：10px-16px
- **阴影**：微阴影，层次分明
- **颜色**：Indigo (#4f46e5) 为主色调
- **字体**：Inter + JetBrains Mono
