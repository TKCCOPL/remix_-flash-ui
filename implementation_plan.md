# 闪烁问题全面修复方案

修复根因分析报告中识别的 9 个闪烁问题，按优先级分批实施。

## Proposed Changes

### 批次 1: 暗色主题 FOUC + 字体闪烁（最高优先）

---

#### [MODIFY] [index.html](file:///home/freudom/%E6%96%87%E6%A1%A3/project-local/ljr/blog/remix_-flash-ui/index.html)

1. 在 `<head>` 中添加同步阻塞脚本，在首次绘制前应用暗色主题
2. 将字体从 CSS `@import` 改为 HTML `<link rel="preconnect">` + `<link rel="stylesheet">`，提升字体加载优先级

```diff
 <head>
     <meta charset="UTF-8">
     <meta name="viewport" content="width=device-width, initial-scale=1.0">
     <title>Personal Blog</title>
+    <script>
+      (function() {
+        var theme = localStorage.getItem('ui_theme');
+        if (!theme) {
+          theme = window.matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light';
+        }
+        if (theme === 'dark') {
+          document.documentElement.classList.add('dark');
+        }
+      })();
+    </script>
+    <link rel="preconnect" href="https://fonts.googleapis.com">
+    <link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
+    <link href="https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700&family=JetBrains+Mono:wght@400;500&display=swap" rel="stylesheet">
 </head>
```

#### [MODIFY] [index.css](file:///home/freudom/%E6%96%87%E6%A1%A3/project-local/ljr/blog/remix_-flash-ui/frontend/index.css)

删除 CSS 中的 `@import url(...)` 字体引入（已移至 HTML `<link>`）：

```diff
-@import url('https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700&family=JetBrains+Mono:wght@400;500&display=swap');
 @import "tailwindcss";
```

---

### 批次 2: 导航过渡 + 数据缓存（中优先）

---

#### [MODIFY] [Layout.tsx](file:///home/freudom/%E6%96%87%E6%A1%A3/project-local/ljr/blog/remix_-flash-ui/frontend/components/Layout.tsx)

用 `AnimatePresence` + `mode="wait"` 包裹 `<Outlet />`，实现路由切换淡入淡出过渡：

```diff
+import { useLocation } from 'react-router-dom';

 <main className="flex-1 flex flex-col w-full max-w-6xl mx-auto px-6 py-12">
-  <Outlet />
+  <AnimatePresence mode="wait">
+    <motion.div
+      key={location.pathname}
+      initial={{ opacity: 0 }}
+      animate={{ opacity: 1 }}
+      exit={{ opacity: 0 }}
+      transition={{ duration: 0.15 }}
+    >
+      <Outlet />
+    </motion.div>
+  </AnimatePresence>
 </main>
```

#### [NEW] [frontend/api/cache.ts](file:///home/freudom/%E6%96%87%E6%A1%A3/project-local/ljr/blog/remix_-flash-ui/frontend/api/cache.ts)

创建轻量级客户端缓存层，避免每次导航都重新 fetch：

```typescript
// Simple in-memory cache with TTL
const cache = new Map<string, { data: unknown; expiry: number }>();
const DEFAULT_TTL = 60_000; // 1 minute

export function getCached<T>(key: string): T | null {
  const entry = cache.get(key);
  if (!entry) return null;
  if (Date.now() > entry.expiry) { cache.delete(key); return null; }
  return entry.data as T;
}

export function setCache<T>(key: string, data: T, ttl = DEFAULT_TTL): void {
  cache.set(key, { data, expiry: Date.now() + ttl });
}
```

#### [MODIFY] 各页面组件 (Home/PostDetail/ArchivePage/CategoriesPage/CategoryPage)

将数据获取改为「先检查缓存 → 有缓存则 `loading = false` 直接显示 → 后台刷新」模式（stale-while-revalidate）。示例以 Home.tsx 为例：

```diff
+import { getCached, setCache } from '../api/cache';

 export default function Home() {
-  const [posts, setPosts] = useState<ApiPost[]>([]);
-  const [loading, setLoading] = useState(true);
+  const [posts, setPosts] = useState<ApiPost[]>(() => getCached<ApiPost[]>('home_posts') || []);
+  const [loading, setLoading] = useState(() => !getCached('home_posts'));

   useEffect(() => {
     let cancelled = false;
     const loadPosts = async () => {
       try {
         const response = await postsApi.list(0, 100);
         if (!cancelled) {
           setPosts(response);
+          setCache('home_posts', response);
           setError('');
         }
       } catch { /* ... */ }
       finally { if (!cancelled) setLoading(false); }
     };
     void loadPosts();
     return () => { cancelled = true; };
   }, []);
```

---

### 批次 3: 快速修复项（低优先）

---

#### [MODIFY] [CategoryPage.tsx](file:///home/freudom/%E6%96%87%E6%A1%A3/project-local/ljr/blog/remix_-flash-ui/frontend/pages/CategoryPage.tsx)

移除 useEffect 对 `t` 的依赖，避免语言切换触发无意义的 refetch：

```diff
-  }, [slug, t]);
+  }, [slug]);
```

#### [MODIFY] [HeroCanvas.tsx](file:///home/freudom/%E6%96%87%E6%A1%A3/project-local/ljr/blog/remix_-flash-ui/frontend/components/HeroCanvas.tsx)

移除未使用的 `isMobile` 和 `reducedMotion` useState，消除冗余重渲染：

```diff
-  const [isMobile, setIsMobile] = useState(() => { ... });
-  const [reducedMotion, setReducedMotion] = useState(false);
+  const isMobileRef = useRef(typeof window !== 'undefined' ? window.innerWidth < 768 : false);

   // useEffect 内部：
-  setReducedMotion(prefersReducedMotion);
-  setIsMobile(width < 768);
+  isMobileRef.current = width < 768;
```

#### [MODIFY] 各页面 framer-motion 无效动画

清理所有 `initial === animate` 的无效动画声明。两种策略：
- **方案 A**：移除 `motion.div`，改为普通 `div`（如果不需要动画效果）
- **方案 B**：改为有意义的入场动画（如 `initial={{ opacity: 0, y: 12 }}`）— 仅在缓存修复后使用

> [!IMPORTANT]
> 推荐先用方案 A（移除无效动画），等批次 2 缓存修复生效后，再考虑加入有意义的入场动画。

#### [MODIFY] [App.tsx](file:///home/freudom/%E6%96%87%E6%A1%A3/project-local/ljr/blog/remix_-flash-ui/frontend/App.tsx)

用 `React.memo` 包裹 AIAssistant，避免路由变化导致重渲染：

```diff
+import { memo } from 'react';
+const MemoizedAIAssistant = memo(AIAssistant);

 function App() {
   return (
     <BrowserRouter>
-      <AIAssistant />
+      <MemoizedAIAssistant />
       <Routes>...</Routes>
     </BrowserRouter>
   );
 }
```

---

## Verification Plan

### Automated Tests

```bash
npm run test          # 确保现有测试不被破坏
npm run build         # 确保构建通过
```

### Manual Verification

1. **暗色主题 FOUC**: 设置暗色主题 → 刷新页面 → 不应看到白色闪烁
2. **导航切换**: 首页 → 文章详情 → 返回首页 → 应有淡入淡出过渡，无白屏
3. **数据缓存**: 首页 → 其他页面 → 返回首页 → 应立即显示缓存内容
4. **语言切换**: 在 CategoryPage 切换语言 → 不应触发 loading 状态
