# SEO 优化指南

> XiaoC Blog SEO 优化完整指南

---

## 目录

1. [概述](#概述)
2. [已实现的优化](#已实现的优化)
3. [部署后配置](#部署后配置)
4. [验证 SEO 效果](#验证-seo-效果)
5. [社交媒体分享测试](#社交媒体分享测试)
6. [维护指南](#维护指南)
7. [常见问题](#常见问题)

---

## 概述

本指南介绍 XiaoC Blog 的 SEO 优化功能，包括：

- Open Graph 标签（社交媒体分享）
- Twitter Card 标签（Twitter 分享）
- JSON-LD 结构化数据（搜索引擎理解）
- Sitemap.xml（搜索引擎爬取）
- Robots.txt（爬虫控制）
- 代码分割优化（性能）

**目标域名**: `https://blog.xiaocc.dev`

---

## 已实现的优化

### 1. SEO 组件

**文件**: `frontend/components/SEO.tsx`

为每个页面注入以下 meta 标签：

| 标签类型 | 标签 | 用途 |
|----------|------|------|
| **页面标题** | `<title>` | 浏览器标签页显示 |
| **Open Graph** | `og:title` | 社交媒体分享标题 |
| | `og:description` | 社交媒体分享描述 |
| | `og:type` | 内容类型（website/article/profile） |
| | `og:url` | 页面永久链接 |
| | `og:image` | 分享时显示的图片 |
| | `og:site_name` | 网站名称 |
| **Twitter Card** | `twitter:card` | 卡片类型（summary_large_image） |
| | `twitter:title` | 分享标题 |
| | `twitter:description` | 分享描述 |
| | `twitter:image` | 分享图片 |
| **JSON-LD** | `@type` | 内容类型（WebSite/Article/Person） |
| | `name` | 内容名称 |
| | `description` | 内容描述 |
| | `author` | 作者信息（文章类型） |

### 2. Sitemap.xml

**文件**: `dist/sitemap.xml`

包含所有可索引页面：

| 页面 | URL | changefreq | priority |
|------|-----|------------|----------|
| 首页 | `/` | daily | 1.0 |
| 归档 | `/archive` | daily | 0.9 |
| 分类列表 | `/categories` | weekly | 0.8 |
| 分类详情 | `/categories/{slug}` | weekly | 0.7 |
| 文章详情 | `/post/{id}` | weekly | 0.9 |
| 关于 | `/about` | monthly | 0.8 |

### 3. Robots.txt

**文件**: `frontend/public/robots.txt`

```
User-agent: *
Allow: /

Disallow: /admin
Disallow: /login

Sitemap: https://blog.xiaocc.dev/sitemap.xml
```

### 4. 代码分割

**文件**: `vite.config.ts`

自动分割为三个 chunk：

| Chunk | 包含内容 | 用途 |
|-------|----------|------|
| `react-vendor` | react, react-dom | 核心框架 |
| `framer-motion` | framer-motion | 动画库 |
| `router` | react-router-dom | 路由库 |

---

## 部署后配置

### 步骤 1: 提交 Sitemap 到 Google Search Console

1. 访问 [Google Search Console](https://search.google.com/search-console)
2. 点击「添加属性」
3. 输入域名: `blog.xiaocc.dev`
4. 选择验证方式（HTML 文件或 DNS 记录）
5. 完成验证
6. 左侧菜单 → 「Sitemap」
7. 输入: `https://blog.xiaocc.dev/sitemap.xml`
8. 点击「提交」

### 步骤 2: 提交 Sitemap 到 Bing Webmaster Tools

1. 访问 [Bing Webmaster Tools](https://www.bing.com/webmasters)
2. 添加站点: `blog.xiaocc.dev`
3. 验证所有权
4. 左侧菜单 → 「Sitemap」
5. 输入: `https://blog.xiaocc.dev/sitemap.xml`
6. 提交

### 步骤 3: 配置环境变量（可选）

如果需要自定义域名，在 `.env` 文件中设置：

```bash
SITE_URL=https://blog.xiaocc.dev
```

---

## 验证 SEO 效果

### 方法 1: 浏览器检查

1. 打开 `https://blog.xiaocc.dev`
2. 右键 → 「查看页面源代码」
3. 搜索以下标签：

```html
<!-- 页面标题 -->
<title>首页 | XiaoC'blog</title>

<!-- Open Graph -->
<meta property="og:title" content="首页">
<meta property="og:description" content="XiaoC 的个人博客...">
<meta property="og:type" content="website">
<meta property="og:url" content="https://blog.xiaocc.dev/">
<meta property="og:image" content="https://blog.xiaocc.dev/og-default.svg">
<meta property="og:site_name" content="XiaoC'blog">

<!-- Twitter Card -->
<meta name="twitter:card" content="summary_large_image">
<meta name="twitter:title" content="首页">
<meta name="twitter:description" content="XiaoC 的个人博客...">
<meta name="twitter:image" content="https://blog.xiaocc.dev/og-default.svg">

<!-- JSON-LD -->
<script type="application/ld+json">
{
  "@context": "https://schema.org",
  "@type": "WebSite",
  "name": "首页",
  "description": "XiaoC 的个人博客...",
  "url": "https://blog.xiaocc.dev/",
  "image": "https://blog.xiaocc.dev/og-default.svg"
}
</script>
```

### 方法 2: 使用 Google Rich Results Test

1. 访问 [Google Rich Results Test](https://search.google.com/test/rich-results)
2. 输入: `https://blog.xiaocc.dev/post/1`
3. 检查是否识别 Article 结构化数据

### 方法 3: 使用浏览器开发者工具

1. 打开 Chrome DevTools (F12)
2. 切换到 Network 标签
3. 刷新页面
4. 检查是否加载了 `sitemap.xml`

---

## 社交媒体分享测试

### 测试工具

- [OpenGraph.xyz](https://www.opengraph.xyz/)
- [Facebook Sharing Debugger](https://developers.facebook.com/tools/debug/)
- [Twitter Card Validator](https://cards-dev.twitter.com/validator)

### 测试步骤

1. 访问 https://www.opengraph.xyz/
2. 输入: `https://blog.xiaocc.dev`
3. 查看预览效果

### 预期效果

| 平台 | 预览内容 |
|------|----------|
| **Twitter** | 显示标题、描述、图片（1200x630） |
| **Facebook** | 显示标题、描述、图片 |
| **LinkedIn** | 显示标题、描述、图片 |
| **微信** | 显示标题、描述 |

### 文章页面测试

输入文章 URL 测试：

```
https://blog.xiaocc.dev/post/1
```

预期显示：
- 标题: 文章标题
- 描述: 文章内容前 160 字符
- 图片: 文章图片或默认图片

---

## 维护指南

### 添加新页面

如果添加新页面，需要：

1. 在页面组件中添加 SEO 组件：

```tsx
import SEO from '../components/SEO';

export default function NewPage() {
  return (
    <>
      <SEO 
        title="页面标题"
        description="页面描述"
        type="website"
      />
      {/* 页面内容 */}
    </>
  );
}
```

2. 重新构建 sitemap：

```bash
npm run build
```

### 更新默认图片

1. 替换 `frontend/public/og-default.svg`
2. 重新构建:

```bash
npm run build
```

### 修改 Sitemap 配置

编辑 `frontend/scripts/generate-sitemap.ts`：

```typescript
// 修改域名
const SITE_URL = process.env.SITE_URL || 'https://blog.xiaocc.dev';

// 添加新页面
const urls = [
  // 现有页面...
  
  // 新页面
  `<url>
    <loc>${SITE_URL}/new-page</loc>
    <changefreq>monthly</changefreq>
    <priority>0.7</priority>
  </url>`,
];
```

### 修改 Robots.txt

编辑 `frontend/public/robots.txt`：

```txt
User-agent: *
Allow: /

# 禁止爬取的页面
Disallow: /admin
Disallow: /login
Disallow: /private

# Sitemap 位置
Sitemap: https://blog.xiaocc.dev/sitemap.xml
```

---

## 常见问题

### Q1: Sitemap 生成失败

**错误信息**: `sh: 1: tsx: not found`

**解决方案**:

```bash
npm install -D tsx
npm run build
```

### Q2: OG 图片不显示

**原因**: 图片 URL 不正确或图片不存在

**解决方案**:

1. 确认图片存在于 `frontend/public/og-default.svg`
2. 使用绝对 URL: `https://blog.xiaocc.dev/og-default.svg`
3. 测试图片 URL 是否可访问

### Q3: 社交媒体分享不显示预览

**原因**: 缓存或平台未抓取最新内容

**解决方案**:

1. **Twitter**: 使用 [Twitter Card Validator](https://cards-dev.twitter.com/validator) 刷新缓存
2. **Facebook**: 使用 [Facebook Sharing Debugger](https://developers.facebook.com/tools/debug/) 刷新缓存
3. **LinkedIn**: 使用 [LinkedIn Post Inspector](https://www.linkedin.com/post-inspector/) 刷新缓存

### Q4: 搜索引擎未收录

**原因**: 新网站需要时间被发现

**解决方案**:

1. 提交 sitemap 到 Google Search Console
2. 使用 `fetch as Google` 手动提交页面
3. 在其他网站添加指向你网站的链接
4. 在社交媒体分享你的文章

### Q5: JSON-LD 验证失败

**验证工具**: [Schema.org Validator](https://validator.schema.org/)

**常见错误**:

- 缺少必要字段（name, description, url）
- 图片 URL 不可访问
- 日期格式不正确

**解决方案**: 确保所有字段都正确填写

### Q6: 页面加载变慢

**原因**: 代码分割配置或图片过大

**解决方案**:

1. 检查 `vite.config.ts` 中的 `manualChunks` 配置
2. 压缩图片（推荐使用 WebP 格式）
3. 使用 `next/image` 或类似工具自动优化图片

---

## 相关资源

- [Open Graph 协议](https://ogp.me/)
- [Twitter Card 文档](https://developer.twitter.com/en/docs/twitter-for-websites/cards/overview/abouts-cards)
- [Google Search Console](https://search.google.com/search-console)
- [Schema.org](https://schema.org/)
- [Sitemap 协议](https://www.sitemaps.org/protocol.html)

---

*指南创建时间: 2026-05-31*
*维护者: XiaoC*
