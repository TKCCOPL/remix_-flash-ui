# OAuth 配置指南

## 1. GitHub OAuth App 配置

### 创建 GitHub OAuth App

1. 访问 https://github.com/settings/developers
2. 点击 "New OAuth App"
3. 填写信息：
   - **Application name**: `XiaoC Blog` (或你喜欢的名称)
   - **Homepage URL**: `http://localhost:3000` (开发环境) 或你的域名
   - **Authorization callback URL**: `http://localhost:8000/api/oauth/github/callback`
4. 点击 "Register application"
5. 记录 **Client ID**
6. 点击 "Generate a new client secret"，记录 **Client Secret**

### 配置环境变量

在 `backend/.env` 文件中添加：

```bash
GITHUB_CLIENT_ID=你的Client_ID
GITHUB_CLIENT_SECRET=你的Client_Secret
GITHUB_REDIRECT_URI=http://localhost:8000/api/oauth/github/callback
```

---

## 2. Gitee OAuth App 配置

### 创建 Gitee OAuth App

1. 访问 https://gitee.com/oauth/applications
2. 点击 "创建应用"
3. 填写信息：
   - **应用名称**: `XiaoC Blog`
   - **应用描述**: `个人博客系统`
   - **应用主页**: `http://localhost:3000`
   - **回调地址**: `http://localhost:8000/api/oauth/gitee/callback`
4. 点击 "创建"
5. 记录 **Client ID** (应用ID)
6. 记录 **Client Secret** (应用密钥)

### 配置环境变量

在 `backend/.env` 文件中添加：

```bash
GITEE_CLIENT_ID=你的应用ID
GITEE_CLIENT_SECRET=你的应用密钥
GITEE_REDIRECT_URI=http://localhost:8000/api/oauth/gitee/callback
```

---

## 3. 生成 Guest JWT Secret

运行以下命令生成随机密钥：

```bash
python3 -c "import secrets; print(secrets.token_hex(32))"
```

将生成的密钥添加到 `backend/.env`：

```bash
GUEST_JWT_SECRET=生成的密钥
```

---

## 4. 完整的 .env 配置示例

```bash
# Admin Credentials
ADMIN_USER=admin
ADMIN_PASS=your_strong_password_here

# Security Keys
SECRET_KEY=your_random_64_char_string_here
CSRF_SECRET=your_random_64_char_string_here

# CORS
ALLOWED_ORIGINS=http://localhost:3000,http://127.0.0.1:3000

# GitHub OAuth
GITHUB_CLIENT_ID=your_github_client_id
GITHUB_CLIENT_SECRET=your_github_client_secret
GITHUB_REDIRECT_URI=http://localhost:8000/api/oauth/github/callback

# Gitee OAuth
GITEE_CLIENT_ID=your_gitee_client_id
GITEE_CLIENT_SECRET=your_gitee_client_secret
GITEE_REDIRECT_URI=http://localhost:8000/api/oauth/gitee/callback

# Guest JWT
GUEST_JWT_SECRET=your_guest_jwt_secret_here
```

---

## 5. 测试 OAuth 登录

1. 启动后端：
   ```bash
   cd backend && uvicorn main:app --reload --host 0.0.0.0 --port 8000
   ```

2. 启动前端：
   ```bash
   npm run dev
   ```

3. 访问 http://localhost:3000

4. 点击导航栏的 "登录" 按钮

5. 选择 GitHub 或 Gitee 登录

6. 完成 OAuth 授权后，应该会自动跳转回博客并显示已登录状态

---

## 6. 常见问题

### Q: OAuth 登录后显示 403 错误

A: 检查 CSRF token 是否正确传递。确保前端请求包含 `credentials: 'include'`。

### Q: OAuth 回调失败

A: 检查回调 URL 是否与 OAuth App 配置一致。注意端口号和协议（http/https）。

### Q: 登录后用户信息不显示

A: 检查浏览器控制台是否有 CORS 错误。确保 `ALLOWED_ORIGINS` 包含前端地址。
