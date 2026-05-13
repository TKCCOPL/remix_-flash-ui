# Admin Backend API Refactor Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** 让 React Admin 后台改为调用 FastAPI+SQLite，并将后端改为纯 API（移除模板渲染路径），同时做最小但清晰的代码整理。

**Architecture:** 后端拆分为 routers/services/repositories/schemas，统一 `/api` 前缀与 Cookie 会话鉴权；前端新增 `src/api` 请求层，`Login/Admin/AdminEdit` 全部改为 API 驱动。前台页面保持现状，不切换数据源。

**Tech Stack:** React 19 + TypeScript + Vite，FastAPI + sqlite3，Python unittest + fastapi.testclient，npm build，uvicorn。

---

## File Structure（先锁定边界）

- Create: `week10_0504-0510/blog_web/blog/routers/__init__.py`
- Create: `week10_0504-0510/blog_web/blog/routers/auth_router.py`
- Create: `week10_0504-0510/blog_web/blog/routers/posts_router.py`
- Create: `week10_0504-0510/blog_web/blog/services/__init__.py`
- Create: `week10_0504-0510/blog_web/blog/services/auth_service.py`
- Create: `week10_0504-0510/blog_web/blog/services/posts_service.py`
- Create: `week10_0504-0510/blog_web/blog/repositories/__init__.py`
- Create: `week10_0504-0510/blog_web/blog/repositories/posts_repository.py`
- Create: `week10_0504-0510/blog_web/blog/schemas.py`
- Create: `week10_0504-0510/blog_web/blog/tests/__init__.py`
- Create: `week10_0504-0510/blog_web/blog/tests/test_admin_api_workflow.py`
- Create: `week10_0504-0510/blog_web/src/api/client.ts`
- Create: `week10_0504-0510/blog_web/src/api/auth.ts`
- Create: `week10_0504-0510/blog_web/src/api/posts.ts`
- Modify: `week10_0504-0510/blog_web/blog/main.py`
- Modify: `week10_0504-0510/blog_web/src/pages/Login.tsx`
- Modify: `week10_0504-0510/blog_web/src/pages/Admin.tsx`
- Modify: `week10_0504-0510/blog_web/src/pages/AdminEdit.tsx`
- Modify: `week10_0504-0510/blog_web/INTRODUCTION.md`
- Delete: `week10_0504-0510/blog_web/blog/templates/`（目录下全部模板）
- Delete: `week10_0504-0510/blog_web/blog/static/editor.js`

### Task 1: 后端 API 分层与纯 API 化

**Files:**
- Create: `week10_0504-0510/blog_web/blog/tests/test_admin_api_workflow.py`
- Create: `week10_0504-0510/blog_web/blog/routers/auth_router.py`
- Create: `week10_0504-0510/blog_web/blog/routers/posts_router.py`
- Create: `week10_0504-0510/blog_web/blog/services/auth_service.py`
- Create: `week10_0504-0510/blog_web/blog/services/posts_service.py`
- Create: `week10_0504-0510/blog_web/blog/repositories/posts_repository.py`
- Create: `week10_0504-0510/blog_web/blog/schemas.py`
- Modify: `week10_0504-0510/blog_web/blog/main.py`

- [ ] **Step 1: 写失败的后端工作流测试（登录 + CRUD + 未登录 401）**

```python
# week10_0504-0510/blog_web/blog/tests/test_admin_api_workflow.py
import unittest
from fastapi.testclient import TestClient
from main import app


class AdminApiWorkflowTest(unittest.TestCase):
    def setUp(self):
        self.client = TestClient(app)

    def test_me_requires_login(self):
        r = self.client.get("/api/auth/me")
        self.assertEqual(r.status_code, 401)

    def test_login_and_crud(self):
        login = self.client.post("/api/auth/login", data={"username": "admin", "password": "123456"})
        self.assertEqual(login.status_code, 200)
        cookies = login.cookies

        create = self.client.post("/api/posts", json={"title": "t1", "content": "c1", "category": "cat"}, cookies=cookies)
        self.assertEqual(create.status_code, 200)
        post_id = create.json()["id"]

        list_r = self.client.get("/api/posts", cookies=cookies)
        self.assertEqual(list_r.status_code, 200)
        self.assertTrue(any(p["id"] == post_id for p in list_r.json()))

        update = self.client.put(f"/api/posts/{post_id}", json={"title": "t2"}, cookies=cookies)
        self.assertEqual(update.status_code, 200)

        delete = self.client.delete(f"/api/posts/{post_id}", cookies=cookies)
        self.assertEqual(delete.status_code, 200)
```

- [ ] **Step 2: 运行测试确认当前失败**

Run: `cd week10_0504-0510\blog_web\blog && python -m unittest tests.test_admin_api_workflow -v`  
Expected: FAIL（缺少 `/api/auth/me`、`/api/auth/login` 或 API 前缀不匹配）

- [ ] **Step 3: 实现最小后端分层与 API 路由**

```python
# week10_0504-0510/blog_web/blog/main.py
from fastapi import FastAPI
from database import init_db
from routers.auth_router import router as auth_router
from routers.posts_router import router as posts_router

app = FastAPI(title="My Personal Blog API")
init_db()
app.include_router(auth_router, prefix="/api/auth", tags=["auth"])
app.include_router(posts_router, prefix="/api/posts", tags=["posts"])
```

```python
# week10_0504-0510/blog_web/blog/routers/auth_router.py
from fastapi import APIRouter, Form, Response, Request, HTTPException
from services.auth_service import login_ok, is_logged_in

router = APIRouter()

@router.post("/login")
def login(response: Response, username: str = Form(...), password: str = Form(...)):
    if not login_ok(username, password):
        raise HTTPException(status_code=401, detail="invalid credentials")
    response.set_cookie("session", "admin_logged_in", httponly=True)
    return {"ok": True}

@router.post("/logout")
def logout(response: Response):
    response.delete_cookie("session")
    return {"ok": True}

@router.get("/me")
def me(request: Request):
    if not is_logged_in(request):
        raise HTTPException(status_code=401, detail="unauthorized")
    return {"username": "admin"}
```

```python
# week10_0504-0510/blog_web/blog/services/auth_service.py
from fastapi import Request

ADMIN_USER = "admin"
ADMIN_PASS = "123456"

def login_ok(username: str, password: str) -> bool:
    return username == ADMIN_USER and password == ADMIN_PASS

def is_logged_in(request: Request) -> bool:
    return request.cookies.get("session") == "admin_logged_in"
```

- [ ] **Step 4: 运行测试确认通过**

Run: `cd week10_0504-0510\blog_web\blog && python -m unittest tests.test_admin_api_workflow -v`  
Expected: `OK`

- [ ] **Step 5: 提交**

```bash
git add week10_0504-0510/blog_web/blog/main.py week10_0504-0510/blog_web/blog/routers week10_0504-0510/blog_web/blog/services week10_0504-0510/blog_web/blog/repositories week10_0504-0510/blog_web/blog/schemas.py week10_0504-0510/blog_web/blog/tests/test_admin_api_workflow.py
git commit -m "refactor(api): split backend to routers services repositories

Co-authored-by: Copilot <223556219+Copilot@users.noreply.github.com>"
```

### Task 2: 前端 API 层接入（替换 Admin 本地存储路径）

**Files:**
- Create: `week10_0504-0510/blog_web/src/api/client.ts`
- Create: `week10_0504-0510/blog_web/src/api/auth.ts`
- Create: `week10_0504-0510/blog_web/src/api/posts.ts`
- Modify: `week10_0504-0510/blog_web/src/pages/Login.tsx`
- Modify: `week10_0504-0510/blog_web/src/pages/Admin.tsx`
- Modify: `week10_0504-0510/blog_web/src/pages/AdminEdit.tsx`

- [ ] **Step 1: 写失败检查（TypeScript build）**

Run: `cd week10_0504-0510\blog_web && npm run build`  
Expected: 初次改动后可能 FAIL（缺失 API 类型或调用签名不匹配）

- [ ] **Step 2: 添加统一请求客户端与 API 模块**

```ts
// week10_0504-0510/blog_web/src/api/client.ts
export class ApiError extends Error {
  constructor(public status: number, message: string) {
    super(message);
  }
}

export async function apiFetch<T>(path: string, init?: RequestInit): Promise<T> {
  const res = await fetch(path, {
    credentials: 'include',
    ...init,
    headers: { 'Content-Type': 'application/json', ...(init?.headers || {}) },
  });
  if (!res.ok) {
    let message = `HTTP ${res.status}`;
    try {
      const data = await res.json();
      message = data.detail || message;
    } catch {}
    throw new ApiError(res.status, message);
  }
  return (await res.json()) as T;
}
```

```ts
// week10_0504-0510/blog_web/src/api/auth.ts
import { apiFetch } from './client';
export const authApi = {
  login: (username: string, password: string) =>
    fetch('/api/auth/login', { method: 'POST', credentials: 'include', body: new URLSearchParams({ username, password }) }),
  logout: () => apiFetch<{ ok: boolean }>('/api/auth/logout', { method: 'POST' }),
  me: () => apiFetch<{ username: string }>('/api/auth/me'),
};
```

```ts
// week10_0504-0510/blog_web/src/api/posts.ts
import { apiFetch } from './client';
export type ApiPost = { id: number; title: string; content: string; category?: string; created_at: string; updated_at: string };
export const postsApi = {
  list: (skip = 0, limit = 100) => apiFetch<ApiPost[]>(`/api/posts?skip=${skip}&limit=${limit}`),
  get: (id: string) => apiFetch<ApiPost>(`/api/posts/${id}`),
  create: (payload: { title: string; content: string; category?: string }) => apiFetch<ApiPost>('/api/posts', { method: 'POST', body: JSON.stringify(payload) }),
  update: (id: string, payload: { title?: string; content?: string; category?: string }) => apiFetch<ApiPost>(`/api/posts/${id}`, { method: 'PUT', body: JSON.stringify(payload) }),
  remove: (id: string) => apiFetch<{ detail: string }>(`/api/posts/${id}`, { method: 'DELETE' }),
};
```

- [ ] **Step 3: 页面改造为 API 驱动（去掉 admin_token 与 blogStore 写入）**

```tsx
// Login.tsx (核心逻辑)
const handleLogin = async (e: React.FormEvent) => {
  e.preventDefault();
  const res = await authApi.login(username, password);
  if (res.ok) navigate('/admin');
  else setError(t.login.error);
};
```

```tsx
// Admin.tsx (挂载时校验 + 拉列表)
useEffect(() => {
  authApi.me()
    .then(() => postsApi.list(0, 200).then(setPostsFromApi))
    .catch(() => navigate('/login'));
}, [navigate]);
```

```tsx
// AdminEdit.tsx (加载详情 + 保存)
if (id) await postsApi.update(id, { title, category, content });
else await postsApi.create({ title, category, content });
```

- [ ] **Step 4: 重新构建确认通过**

Run: `cd week10_0504-0510\blog_web && npm run build`  
Expected: `vite build` 成功完成

- [ ] **Step 5: 提交**

```bash
git add week10_0504-0510/blog_web/src/api week10_0504-0510/blog_web/src/pages/Login.tsx week10_0504-0510/blog_web/src/pages/Admin.tsx week10_0504-0510/blog_web/src/pages/AdminEdit.tsx
git commit -m "feat(admin): connect admin pages to backend api

Co-authored-by: Copilot <223556219+Copilot@users.noreply.github.com>"
```

### Task 3: 移除模板渲染路径与冗余文件

**Files:**
- Modify: `week10_0504-0510/blog_web/blog/main.py`
- Delete: `week10_0504-0510/blog_web/blog/templates/admin_form.html`
- Delete: `week10_0504-0510/blog_web/blog/templates/admin_list.html`
- Delete: `week10_0504-0510/blog_web/blog/templates/detail.html`
- Delete: `week10_0504-0510/blog_web/blog/templates/index.html`
- Delete: `week10_0504-0510/blog_web/blog/templates/login.html`
- Delete: `week10_0504-0510/blog_web/blog/static/editor.js`

- [ ] **Step 1: 写失败检查（确保不存在模板路由）**

```python
# 在 tests/test_admin_api_workflow.py 中补充
def test_no_template_routes(self):
    r = self.client.get("/")
    self.assertIn(r.status_code, (404, 405))
```

- [ ] **Step 2: 运行测试确认失败**

Run: `cd week10_0504-0510\blog_web\blog && python -m unittest tests.test_admin_api_workflow -v`  
Expected: FAIL（当前 `/` 仍可访问时）

- [ ] **Step 3: 删除模板路由与模板文件，保留 API 路由**

```python
# main.py 仅保留 FastAPI 初始化、init_db、include_router
# 删除 Jinja2Templates、HTMLResponse 页面路由、StaticFiles 挂载
```

- [ ] **Step 4: 运行测试确认通过**

Run: `cd week10_0504-0510\blog_web\blog && python -m unittest tests.test_admin_api_workflow -v`  
Expected: `OK`

- [ ] **Step 5: 提交**

```bash
git add week10_0504-0510/blog_web/blog/main.py week10_0504-0510/blog_web/blog/templates week10_0504-0510/blog_web/blog/static/editor.js week10_0504-0510/blog_web/blog/tests/test_admin_api_workflow.py
git commit -m "chore(api): remove server-rendered templates and keep pure api

Co-authored-by: Copilot <223556219+Copilot@users.noreply.github.com>"
```

### Task 4: 文档与最终回归

**Files:**
- Modify: `week10_0504-0510/blog_web/INTRODUCTION.md`

- [ ] **Step 1: 更新文档为“前端 + 纯 API 后端”模式**

```md
## 访问地址
- 前端开发地址：http://localhost:3000/
- 后端 API 地址：http://localhost:8000/
- OpenAPI 文档：http://localhost:8000/docs
```

- [ ] **Step 2: 后端回归**

Run: `cd week10_0504-0510\blog_web\blog && python -m unittest tests.test_admin_api_workflow -v`  
Expected: `OK`

- [ ] **Step 3: 前端回归**

Run: `cd week10_0504-0510\blog_web && npm run build`  
Expected: `vite build` 成功

- [ ] **Step 4: 提交**

```bash
git add week10_0504-0510/blog_web/INTRODUCTION.md
git commit -m "docs: align intro with api-only backend admin flow

Co-authored-by: Copilot <223556219+Copilot@users.noreply.github.com>"
```

- [ ] **Step 5: 最终检查（不提交）**

Run: `git -C week10_0504-0510\blog_web --no-pager status --short`  
Expected: 工作区干净或仅有明确待处理文件

## Self-Review

- Spec coverage:
  - Admin 接后端 API：Task 2
  - 后端纯 API：Task 1 + Task 3
  - 代码结构整理：Task 1 + Task 2 + Task 3
  - 前台保持现状：Task 2（仅改 Admin 页面）
- Placeholder scan: 无 TBD/TODO/“后续补充”类占位语句。
- Type consistency:
  - 前端统一使用 `ApiPost` 与 `/api/*` 路径；
  - 后端统一返回 401/404/422 语义，登录态统一 Cookie 会话。
