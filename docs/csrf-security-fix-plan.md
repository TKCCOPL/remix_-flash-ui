# CSRF 安全加固修复计划

## 概述

基于深度审查发现的 5 个安全问题，结合 OWASP、NIST SP 800-57、Django/itsdangerous 等业界最佳实践，制定以下修复方案。

## 修复清单

### Fix 1: CSRF 密钥轮换机制 (P1)

**问题**: 单一 `CSRF_SECRET`，更换密钥时所有用户瞬间 403。
**方案**: 引入 `CSRF_SECRETS` 列表，第一个用于签名，全部用于验证。
**来源**: Django `SECRET_KEY_FALLBACKS`，itsdangerous `Serializer([old, new])`。

**修改文件**: `backend/middleware.py`

**环境变量**:
- `CSRF_SECRET` — 主密钥（签名 + 验证）
- `CSRF_SECRET_FALLBACKS` — 旧密钥（仅验证），逗号分隔

**逻辑**:
1. 读取 `CSRF_SECRET`，如果为空则随机生成并 warning
2. 读取 `CSRF_SECRET_FALLBACKS`，按逗号分割为列表
3. 合并: `CSRF_SECRETS = [primary] + fallbacks`
4. `_sign_token`: 仅用 `CSRF_SECRETS[0]`（最新密钥）签名
5. `_verify_token`: 遍历 `CSRF_SECRETS` 全部尝试验证，任一匹配即通过

**风险评估**: 低。`CSRF_SECRET` 向后兼容（仍是主密钥），新增 `CSRF_SECRET_FALLBACKS` 可选。

---

### Fix 2: 生产环境强制要求 CSRF_SECRET + 密钥长度验证 (P1/P2)

**问题**: CSRF_SECRET 未配置时静默降级为随机密钥；弱密钥可被暴力破解。
**方案**: 密钥长度 ≥ 32 字符（NIST SP 800-57: HMAC-SHA256 ≥ 256 bits）。
**来源**: NIST SP 800-57，Pydantic BaseSettings 验证模式。

**修改文件**: `backend/middleware.py`

**逻辑**:
1. 新增 `_validate_csrf_secret(secret, source)` 函数
2. 如果 `len(secret) < 32` → `logger.critical` + `sys.exit(1)`
3. 在确定 `_primary` 和所有 `_fallbacks` 后调用验证
4. 随机 fallback（`secrets.token_hex(32)`）是 64 字符，自动通过

**注意**: 未配置时的随机 fallback 保留（长度 64，自动满足 ≥ 32），日志级别从 `critical` 降为 `warning`。

---

### Fix 3: `__Host-` Cookie 前缀 (P2)

**问题**: 缺少 `__Host-` 前缀，子域可注入同名 cookie（纵深防御不足）。
**方案**: HTTPS 环境使用 `__Host-csrf_token`，HTTP 回退到 `csrf_token`。
**来源**: CanIUse 97% 覆盖率，jrmcgarvey/host-csrf，Security StackExchange #248385。

**修改文件**: `backend/middleware.py` + `frontend/api/client.ts`

**后端逻辑**:
1. 新增 `_cookie_name(is_secure: bool) -> str` 函数
2. HTTPS: 返回 `__Host-csrf_token`（强制 `secure=True, path=/, no domain`）
3. HTTP: 返回 `csrf_token`（`secure=False, path=/`）
4. 验证时: 先查 `__Host-` 名，再查普通名（过渡期兼容）

**前端逻辑**:
1. 提取 `getCsrfCookieName()` 函数，根据 `window.location.protocol` 返回对应 cookie 名
2. `ensureCsrfCookie()` 和 `apiFetch` 中统一调用此函数

---

### Fix 4: 首次 POST 竞态条件修复 (P2)

**问题**: 用户首次 POST 时 CSRF cookie 可能未设置，导致 403。
**方案**: `apiFetch` 中自动预检 + 403 自动重试（仅一次）。
**来源**: Laravel Sanctum，Axios interceptor pattern。

**修改文件**: `frontend/api/client.ts`

**逻辑**:
1. 新增 `ensureCsrfCookie()` — 检查 cookie 是否存在，不存在则 HEAD 请求触发设置
2. 新增 `_handleResponse<T>(response)` — 提取响应处理逻辑（避免代码重复）
3. 在非 safe method 请求前调用 `ensureCsrfCookie()`
4. 如果收到 403 且 detail 包含 "CSRF" → 刷新 cookie → 重试一次
5. 重试仅一次，不递归

---

### Fix 5: 测试修复 (P2)

**修改文件**: `backend/tests/test_middleware.py` + `backend/tests/conftest.py`

**新增测试**:
- 密钥轮换: 用旧密钥签名的 token 仍能通过验证
- 弱密钥拒绝: `len < 32` 启动失败
- `__Host-` 前缀: HTTPS 请求使用带前缀的 cookie 名
- 多 fallback 密钥验证
- 空 fallback 列表兼容

---

### Fix 6: 配置更新 (P3)

**修改文件**: `backend/.env.example`

添加 `CSRF_SECRET_FALLBACKS` 说明。

---

## 不在本次范围

| 项目 | 原因 |
|---|---|
| BaseHTTPMiddleware → ASGI migration | 改动大，影响面广，单独 PR |
| CSRF token 绑定认证状态 | 低风险，当前行为可接受 |

## 验证步骤

1. `pytest tests/test_middleware.py` — 所有 CSRF 测试通过
2. `pytest` — 全量测试通过
3. `npm run build` — 前端构建通过
4. 手动验证:
   - HTTP 模式: `csrf_token` cookie 正常工作
   - HTTPS 模式: `__Host-csrf_token` cookie 正常工作
   - 密钥轮换: 旧密钥签名的 token 仍能验证
   - 首次 POST: 无 403 错误
