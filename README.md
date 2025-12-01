# 应用发布服务器

一个简单易用的应用发布服务器，支持通过Token进行身份验证的自动发布功能。

## 功能特性

- 🔐 **Token管理**: 管理员可以生成、查看和管理发布Token
- 📦 **自动发布**: 通过Token验证后自动上传和发布应用
- 📊 **发布历史**: 查看所有发布记录和下载历史版本
- 🎨 **现代化UI**: 美观易用的Web管理界面
- 🔒 **安全认证**: 基于Token的身份验证机制

## 快速开始

### 1. 安装依赖

```bash
npm install
```

### 2. 配置环境变量

复制 `.env.example` 为 `.env` 并修改配置：

```bash
cp .env.example .env
```

编辑 `.env` 文件，设置：
- `PORT`: 服务器端口（默认: 3000）
- `JWT_SECRET`: JWT密钥（生产环境请使用强随机字符串）
- `ADMIN_PASSWORD`: 管理员密码

### 2.5 配置数据库驱动

- 复制 `config/database.example.json` 为 `config/database.json`
- `driver` 支持：
  - `sqlite`：默认推荐，用于本地/测试环境（需安装 `better-sqlite3`）
  - `json`：沿用旧版 JSON 文件存储，适合快速试用
- `sqlite.filename` 可自定义数据库文件路径，例如 `./data/fileupdate.sqlite`
- 也可以通过环境变量覆盖：
  - `DB_DRIVER=sqlite` / `json`
  - `DB_SQLITE_FILE=./data/dev.sqlite`
  - `DB_JSON_BASEDIR=./`

### 3. 启动服务器（本机运行）

```bash
npm start
```

或使用开发模式（自动重启）：

```bash
npm run dev
```

### 3.1 使用 Docker 启动服务器（推荐用于复杂环境）

#### 构建镜像

```bash
docker build -t fileupdate-server .
```

#### 运行容器（简单方式）

```bash
docker run -d \
  --name fileupdate-server \
  -p 3000:3000 \
  -v $(pwd)/data:/usr/src/app/data \
  -v $(pwd)/uploads:/usr/src/app/uploads \
  -e NODE_ENV=production \
  -e ADMIN_PASSWORD=your-strong-admin-password \
  -e JWT_SECRET=your-strong-jwt-secret \
  -e SESSION_SECRET=your-strong-session-secret \
  fileupdate-server
```

#### 使用 docker-compose（推荐）

```bash
docker-compose up -d
```

> 说明：
> - `./data` 与 `./uploads` 会挂载到容器内，保证数据与上传文件在容器重建后仍然存在  
> - 请务必在生产环境中自行设置强随机的 `ADMIN_PASSWORD` / `JWT_SECRET` / `SESSION_SECRET`

### 4. 访问管理界面

打开浏览器访问: `http://localhost:3000`

首次访问时会提示输入管理员密码（默认: `admin123`）

### 5. 查看统计报表

- 管理端切换到“统计报表”标签页，即可查看应用概览、累计下载、发布趋势，以及下载最多的文件
- 报表数据来自 `/api/admin/stats/summary` 接口，仅管理员可访问
- 若需二次开发，可直接请求该接口，将 JSON 数据接入 BI 或监控平台

## 使用指南

### 生成Token

1. 在管理界面点击"Token管理"标签
2. 填写Token名称和描述
3. 选择有效期（可选）
4. 点击"生成Token"
5. **重要**: 复制并保存Token，它只会显示一次

### 发布应用

#### 方式一：通过Web界面（手动发布，无需Token）

1. 点击"发布应用"标签
2. 填写版本号和描述
3. 选择要发布的文件（支持多选）
4. 点击"发布"

#### 方式二：通过API（需要Token验证，适用于CI/CD）

```bash
# 单文件发布
curl -X POST http://localhost:3000/api/publish?token=YOUR_TOKEN \
  -F "files=@your-app.zip" \
  -F "version=v1.0.0" \
  -F "description=发布说明"

# 多文件发布
curl -X POST http://localhost:3000/api/publish?token=YOUR_TOKEN \
  -F "files=@file1.zip" \
  -F "files=@file2.zip" \
  -F "version=v1.0.0" \
  -F "description=发布说明"
```

### 下载最新版本

```bash
curl http://localhost:3000/api/latest
```

### 下载指定版本

```bash
curl http://localhost:3000/api/download/RELEASE_ID
```

### 手机端下载页面

- 访问地址：`http://localhost:3000/mobile.html`
- 特性：
  - 自动聚合每个应用的最新版本与历史版本
  - 适配手机触屏操作，支持一键复制/分享下载链接
  - 可添加到主屏幕，方便终端用户随时下载
- 如果需要在特定应用之间切换，可使用页面顶部的下拉框过滤

### 数据存储

- 通过 `config/database.json` 配置存储方式，默认使用 SQLite
- JSON 驱动依旧支持，会在 `apps.json`、`tokens.json`、`releases.json` 中读写
- SQLite 驱动启动时自动建表，数据位于 `data/fileupdate.sqlite`
- 测试环境会自动使用独立的 SQLite 文件，避免污染正式数据

## API文档

### 管理员API

#### 生成Token
```
POST /api/admin/tokens
Headers: x-admin-password: YOUR_PASSWORD
Body: {
  "name": "Token名称",
  "description": "描述",
  "expiresIn": "365d" // 可选
}
```

#### 获取所有Tokens
```
GET /api/admin/tokens
Headers: x-admin-password: YOUR_PASSWORD
```

#### 禁用Token
```
DELETE /api/admin/tokens/:id
Headers: x-admin-password: YOUR_PASSWORD
```

#### 获取发布历史
```
GET /api/admin/releases
Headers: x-admin-password: YOUR_PASSWORD
```

#### 获取统计摘要
```
GET /api/admin/stats/summary
Headers: x-admin-password: YOUR_PASSWORD
```

#### 更新/删除发布记录
```
PUT /api/admin/releases/:id
DELETE /api/admin/releases/:id
Headers: x-admin-password: YOUR_PASSWORD
Body(可选):
  - version: 新版本号
  - description: 新发布说明
```

### 发布API

#### 手动发布（管理员，无需Token）
```
POST /api/admin/publish
Headers: x-admin-password: YOUR_PASSWORD
Content-Type: multipart/form-data
Body:
  - files: 文件（可多个）
  - version: 版本号
  - description: 描述
```

#### API发布（需要Token）
```
POST /api/publish?token=YOUR_TOKEN
Content-Type: multipart/form-data
Body:
  - files: 文件（可多个）
  - version: 版本号
  - description: 描述
```

#### 获取最新发布
```
GET /api/latest
```

#### 下载文件
```
GET /api/download/:id
```

## 目录结构

```
fileupdate_server/
├── server.js          # 服务器主文件
├── package.json       # 项目配置
├── .env              # 环境变量（需创建）
├── tokens.json       # Token存储（自动生成）
├── releases.json     # 发布记录（自动生成）
├── uploads/          # 上传文件存储目录（自动生成）
└── public/           # 前端静态文件
    ├── index.html    # 管理界面
    ├── style.css     # 样式文件
    └── app.js        # 前端逻辑
```

## 安全建议

1. **生产环境配置**:
   - 修改默认管理员密码
   - 使用强随机JWT密钥
   - 使用HTTPS协议

2. **Token管理**:
   - 定期轮换Token
   - 及时禁用不再使用的Token
   - 为不同环境使用不同的Token

3. **服务器安全**:
   - 配置防火墙规则
   - 使用反向代理（如Nginx）
   - 定期备份数据文件

## 技术栈

- **后端**: Node.js + Express
- **认证**: JWT (jsonwebtoken)
- **文件上传**: Multer
- **前端**: 原生HTML/CSS/JavaScript

## 许可证

MIT

