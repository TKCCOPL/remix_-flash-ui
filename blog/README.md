# 期中大作业：个人博客系统

这是一个基于 FastAPI 和原生 SQLite3 构建的轻量级个人博客系统。完全按照作业要求实现。

## 项目分工 (请根据实际情况进行填补修改)
- **同学A (学号: xxx)**: 
  - 负责搭建 FastAPI 核心框架结构
  - 编写并测试 `/profile` 和 `/posts`（创建、列表）核心接口
  - 完成前端模板 (Jinja2) 集成及静态页面美化
- **同学B (学号: xxx)**: 
  - 负责使用 `sqlite3` 原生模块封装 `database.py` 连接与表初始化
  - 编写后台 `crud.py` 的增删改查逻辑逻辑
  - 完成文章的修改、删除接口，并打通富文本编辑器 (Quill) 图片上传功能

## 系统环境与依赖
- Python 3.8+
- 依赖项：参见 `requirements.txt`。直接使用原生 `sqlite3` 模块作为数据库底层驱动。

## 快速运行
1. **安装依赖:**
   ```bash
   pip install -r requirements.txt
   ```
2. **启动服务:**
   ```bash
   uvicorn main:app --reload --host 0.0.0.0 --port 8000
   ```
3. **访问系统:**
   - 博客首页（前台展示）: `http://localhost:8000/`
   - 管理后台登录（用户名：`admin` 密码：`123456`）: `http://localhost:8000/login`
   - 各类核心接口 API 文档 (Swagger UI 测试): `http://localhost:8000/docs`

## 核心接口列表（100%覆盖要求）
- `GET /profile`: 返回个人/团队介绍（姓名、学号、简介、兴趣）
- `POST /posts`: 创建文章（标题、内容、分类）
- `GET /posts`: 查询所有文章（支持分页 `skip`、`limit` 参数）
- `GET /posts/{id}`: 查询单篇文章
- `PUT /posts/{id}`: 更新文章内容、标题、分类等
- `DELETE /posts/{id}`: 删除文章（文件不存在返回404）

## Gitee 项目地址
*(填入你们的Gitee仓库链接)*
