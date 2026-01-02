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

### 2.6 开发环境配置

项目支持专门的开发环境配置，包含热重载和调试工具：

#### 开发环境文件
- `docker-compose.dev.yml` - 开发环境Docker配置
- `Dockerfile.dev` - 开发环境镜像构建文件
- `nodemon.json` - 热重载配置文件
- `dev.sh` / `dev.bat` - 快速启动脚本

#### 开发环境特性
- ✅ 源代码热重载（修改代码自动重启）
- ✅ 实时日志输出
- ✅ 调试工具集成（git、vim、htop等）
- ✅ UTF-8字符编码支持
- ✅ 完整的数据持久化

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
# 生产镜像
docker build -t fileupdate-server .

# 开发镜像（包含开发工具和热重载）
docker build -f Dockerfile.dev -t fileupdate-server:dev .
```

#### 运行容器（简单方式）

```bash
# 生产环境
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

# 开发环境（支持热重载）
docker run -it \
  --name fileupdate-server-dev \
  -p 3000:3000 \
  -v $(pwd):/usr/src/app \
  -v /usr/src/app/node_modules \
  -e NODE_ENV=development \
  fileupdate-server:dev
```

#### 使用 docker-compose（推荐）

```bash
# 生产模式（后台运行）
docker-compose up -d
```

#### 本地开发环境（推荐用于开发）

```bash
# 安装依赖
npm install

# 启动开发服务器（热重载）
npm run dev

# 或直接运行
node server.js
```

#### Docker开发环境（可选）

```bash
# 开发模式（实时日志 + 热重载）
docker-compose -f docker-compose.dev.yml up

# 开发模式（后台运行）
docker-compose -f docker-compose.dev.yml up -d

# 查看开发环境日志
docker-compose -f docker-compose.dev.yml logs -f
```

> 说明：
> - `./data` 与 `./uploads` 会挂载到容器内，保证数据与上传文件在容器重建后仍然存在
> - 本地开发环境更简单直接，支持完整的热重载和调试
> - Docker开发环境适合容器化部署测试，但本地开发更高效
> - 请务必在生产环境中自行设置强随机的 `ADMIN_PASSWORD` / `JWT_SECRET` / `SESSION_SECRET`

### 4. 访问管理界面

打开浏览器访问: `http://localhost:3000`

首次访问时会提示输入管理员密码（默认: `admin123`）

### 5. 查看统计报表

- 管理端切换到“统计报表”标签页，即可查看应用概览、累计下载、发布趋势，以及下载最多的文件
- 报表数据来自 `/api/admin/stats/summary` 接口，仅管理员可访问
- 若需二次开发，可直接请求该接口，将 JSON 数据接入 BI 或监控平台

## 内外网部署指南

### 外网环境打包步骤

#### 1. 准备代码和依赖
```bash
# 克隆或复制代码到外网环境
git clone <your-repo> fileupdate-server
cd fileupdate-server

# 安装依赖
npm install --production
```

#### 2. 构建生产镜像
```bash
# 构建生产镜像
docker build -t fileupdate-server:latest .

# 验证镜像
docker images fileupdate-server:latest
```

#### 3. 导出镜像（推荐使用自动化脚本）
```bash
# Linux/macOS
chmod +x export-image.sh
./export-image.sh v1.0.0

# Windows
export-image.bat v1.0.0

# 或手动导出
mkdir -p export
docker save fileupdate-server:latest -o export/fileupdate-server-v1.0.0.tar
cd export
# Linux/macOS
sha256sum fileupdate-server-v1.0.0.tar > fileupdate-server-v1.0.0.tar.sha256
# Windows (PowerShell)
Get-FileHash fileupdate-server-v1.0.0.tar -Algorithm SHA256 > fileupdate-server-v1.0.0.tar.sha256
cp ../docker-compose.yml .
```

#### 4. 验证导出文件
```bash
# 检查导出目录
ls -la export/

# 验证文件完整性
cd export
sha256sum -c fileupdate-server-v1.0.0.tar.sha256
```

### 内网环境部署步骤

#### 1. 传输文件到内网
```bash
# 将export目录下的所有文件传输到内网服务器
# 使用U盘、SCP、FTP等安全方式传输
scp export/* user@inner-network-server:/path/to/deployment/
```

#### 2. 内网验证和加载
```bash
# 进入部署目录
cd /path/to/deployment

# 验证文件完整性
sha256sum -c fileupdate-server-v1.0.0.tar.sha256

# 加载Docker镜像
docker load -i fileupdate-server-v1.0.0.tar

# 验证镜像加载成功
docker images | grep fileupdate-server
```

#### 3. 配置内网环境
```bash
# 创建必要的目录
mkdir -p data uploads

# 编辑docker-compose.yml，设置内网环境变量
vim docker-compose.yml
```

内网环境的 `docker-compose.yml` 配置：
```yaml
version: "3.9"

services:
  fileupdate-server:
    image: fileupdate-server:latest  # 使用已加载的本地镜像
    container_name: fileupdate-server
    restart: unless-stopped
    environment:
      - NODE_ENV=production
      - PORT=3000
      - LANG=en_US.UTF-8
      - LANGUAGE=en_US.UTF-8
      - LC_ALL=en_US.UTF-8
      - LC_CTYPE=UTF-8
      - MAX_FILE_SIZE=209715200  # 200MB
      # 内网环境的安全配置
      - ADMIN_PASSWORD=your-intranet-admin-password
      - JWT_SECRET=your-intranet-jwt-secret
      - SESSION_SECRET=your-intranet-session-secret
    ports:
      - "3000:3000"
    volumes:
      - ./data:/usr/src/app/data
      - ./uploads:/usr/src/app/uploads
```

#### 4. 启动服务
```bash
# 启动服务
docker-compose up -d

# 验证服务运行状态
docker-compose ps

# 查看启动日志
docker-compose logs -f fileupdate-server
```

#### 5. 验证部署
```bash
# 测试API
curl http://localhost:3000/api/health

# 访问管理界面
# 打开浏览器访问: http://your-inner-server:3000
```

### 故障排除

#### 镜像加载失败
```bash
# 检查tar文件是否损坏
file fileupdate-server-v1.0.0.tar

# 重新传输文件
# 确保传输过程中没有文件损坏
```

#### 容器启动失败
```bash
# 查看详细错误日志
docker-compose logs fileupdate-server

# 检查端口占用
netstat -tlnp | grep :3000

# 检查磁盘空间
df -h
```

#### 中文文件名问题
```bash
# 确保环境变量正确设置
docker exec fileupdate-server env | grep LANG

# 检查容器内的字符编码
docker exec fileupdate-server sh -c "locale"
```

### 版本管理和更新部署

#### 构建新版本
```bash
# 在外网环境
# 1. 更新代码和版本号
git pull
# 编辑 package.json 中的 version 字段

# 2. 构建新镜像
docker build -t fileupdate-server:v1.1.0 .

# 3. 导出新版本
./export-image.sh v1.1.0
```

#### 内网更新部署
```bash
# 1. 传输新版本文件到内网
scp export/fileupdate-server-v1.1.0.tar* user@inner-server:/path/to/deployment/

# 2. 内网加载新镜像
docker load -i fileupdate-server-v1.1.0.tar

# 3. 备份当前数据（可选）
cp -r data data.backup
cp -r uploads uploads.backup

# 4. 停止当前服务
docker-compose down

# 5. 更新docker-compose.yml中的镜像版本
# 编辑 image: fileupdate-server:v1.1.0

# 6. 启动新版本
docker-compose up -d

# 7. 验证更新
curl http://localhost:3000/api/health
docker-compose logs -f fileupdate-server
```

### 部署检查清单

#### 外网打包前检查
- [ ] 代码已更新到最新版本
- [ ] package.json版本号已更新
- [ ] 所有依赖已安装
- [ ] Docker镜像构建成功
- [ ] 镜像功能测试通过

#### 内网部署前检查
- [ ] 所有导出文件已传输完成
- [ ] 文件校验和验证通过
- [ ] Docker镜像加载成功
- [ ] docker-compose.yml配置正确
- [ ] 环境变量设置安全
- [ ] 数据目录权限正确

#### 部署后验证
- [ ] 服务启动成功
- [ ] API接口响应正常
- [ ] 管理界面可访问
- [ ] 文件上传功能正常
- [ ] 中文文件名显示正确
- [ ] 数据库连接正常

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
├── server.js              # 服务器主文件
├── package.json           # 项目配置
├── .env                  # 环境变量（需创建）
├── docker-compose.yml     # Docker生产环境配置
├── docker-compose.dev.yml # Docker开发环境配置
├── Dockerfile            # 生产环境镜像构建
├── Dockerfile.dev        # 开发环境镜像构建
├── export-image.sh       # 镜像导出脚本 (Linux/macOS)
├── export-image.bat      # 镜像导出脚本 (Windows)
├── nodemon.json          # 热重载配置
├── tokens.json           # Token存储（自动生成）
├── releases.json         # 发布记录（自动生成）
├── uploads/              # 上传文件存储目录（自动生成）
├── data/                 # 数据库存储目录（自动生成）
├── logs/                 # 日志文件目录（自动生成）
├── export/               # 镜像导出目录（运行脚本时自动创建）
└── public/               # 前端静态文件
    ├── index.html        # 管理界面
    ├── style.css         # 样式文件
    └── app.js            # 前端逻辑
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

