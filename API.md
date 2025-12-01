# API 接口文档

## 基础信息

- **Base URL**: `http://localhost:3000` (开发环境)
- **Content-Type**: `application/json` (除文件上传接口外)
- **文件上传**: `multipart/form-data`

## 认证方式

### 管理员认证
管理员 API 需要在请求头中提供管理员密码：
```
x-admin-password: YOUR_ADMIN_PASSWORD
```

默认管理员密码：`admin123`（可通过环境变量 `ADMIN_PASSWORD` 修改）

### Token 认证
发布 API 需要提供有效的 token，支持以下三种方式：

1. **Authorization Header**（推荐）:
   ```
   Authorization: Bearer YOUR_TOKEN
   ```

2. **Query 参数**:
   ```
   POST /api/publish?token=YOUR_TOKEN
   ```

3. **请求体**（仅限非文件上传请求）:
   ```json
   {
     "token": "YOUR_TOKEN"
   }
   ```

---

## 1. 健康检查

### GET /api/health

检查服务器运行状态。

**请求示例**:
```bash
curl http://localhost:3000/api/health
```

**响应示例**:
```json
{
  "status": "ok",
  "message": "服务器运行正常"
}
```

---

## 2. Token 管理 API（管理员）

### 2.1 创建 Token

**POST** `/api/admin/tokens`

创建新的 API Token。

**请求头**:
```
x-admin-password: YOUR_ADMIN_PASSWORD
Content-Type: application/json
```

**请求体**:
```json
{
  "name": "Token名称",           // 可选，默认为 "未命名Token"
  "description": "Token描述",    // 可选，默认为空字符串
  "expiresIn": "365d"           // 可选，JWT过期时间，默认为 "365d"
}
```

**响应示例**:
```json
{
  "success": true,
  "token": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...",
  "tokenData": {
    "id": "uuid",
    "name": "Token名称",
    "description": "Token描述",
    "createdAt": "2024-01-01T00:00:00.000Z",
    "lastUsed": null,
    "active": true,
    "usageCount": 0
  }
}
```

**错误响应**:
- `401`: 管理员密码错误
  ```json
  {
    "error": "管理员密码错误"
  }
  ```

---

### 2.2 获取所有 Tokens

**GET** `/api/admin/tokens`

获取所有 Token 列表（不返回完整 token，只显示前20个字符）。

**请求头**:
```
x-admin-password: YOUR_ADMIN_PASSWORD
```

**响应示例**:
```json
[
  {
    "id": "uuid",
    "token": "eyJhbGciOiJIUzI1NiIs...",
    "name": "Token名称",
    "description": "Token描述",
    "createdAt": "2024-01-01T00:00:00.000Z",
    "lastUsed": "2024-01-02T00:00:00.000Z",
    "active": true,
    "usageCount": 5
  }
]
```

---

### 2.3 禁用 Token

**DELETE** `/api/admin/tokens/:id`

禁用指定的 Token（软删除，将 `active` 设置为 `false`）。

**请求头**:
```
x-admin-password: YOUR_ADMIN_PASSWORD
```

**路径参数**:
- `id`: Token 的 ID

**响应示例**:
```json
{
  "success": true,
  "message": "Token已禁用"
}
```

**错误响应**:
- `404`: Token 不存在
  ```json
  {
    "error": "Token不存在"
  }
  ```

---

## 3. 应用管理 API（管理员）

### 3.1 创建应用

**POST** `/api/admin/apps`

创建新的应用。

**请求头**:
```
x-admin-password: YOUR_ADMIN_PASSWORD
Content-Type: application/json
```

**请求体**:
```json
{
  "appId": "my-app",              // 必填，只能包含字母、数字、连字符和下划线
  "name": "我的应用",              // 必填
  "description": "应用描述"        // 可选
}
```

**响应示例**:
```json
{
  "success": true,
  "app": {
    "appId": "my-app",
    "name": "我的应用",
    "description": "应用描述",
    "createdAt": "2024-01-01T00:00:00.000Z",
    "updatedAt": "2024-01-01T00:00:00.000Z"
  }
}
```

**错误响应**:
- `400`: 参数错误
  ```json
  {
    "error": "appId和name是必填项"
  }
  ```
  ```json
  {
    "error": "appId只能包含字母、数字、连字符和下划线"
  }
  ```
  ```json
  {
    "error": "appId已存在"
  }
  ```

---

### 3.2 获取所有应用

**GET** `/api/admin/apps`

获取所有应用列表（管理员版本，包含完整信息）。

**请求头**:
```
x-admin-password: YOUR_ADMIN_PASSWORD
```

**响应示例**:
```json
[
  {
    "appId": "my-app",
    "name": "我的应用",
    "description": "应用描述",
    "createdAt": "2024-01-01T00:00:00.000Z",
    "updatedAt": "2024-01-01T00:00:00.000Z"
  }
]
```

---

### 3.3 更新应用

**PUT** `/api/admin/apps/:appId`

更新应用信息。

**请求头**:
```
x-admin-password: YOUR_ADMIN_PASSWORD
Content-Type: application/json
```

**路径参数**:
- `appId`: 应用的 ID

**请求体**:
```json
{
  "name": "新的应用名称",          // 可选
  "description": "新的描述"        // 可选
}
```

**响应示例**:
```json
{
  "success": true,
  "app": {
    "appId": "my-app",
    "name": "新的应用名称",
    "description": "新的描述",
    "createdAt": "2024-01-01T00:00:00.000Z",
    "updatedAt": "2024-01-02T00:00:00.000Z"
  }
}
```

**错误响应**:
- `404`: 应用不存在
  ```json
  {
    "error": "应用不存在"
  }
  ```

---

### 3.4 删除应用

**DELETE** `/api/admin/apps/:appId`

删除应用。

**请求头**:
```
x-admin-password: YOUR_ADMIN_PASSWORD
```

**路径参数**:
- `appId`: 应用的 ID

**响应示例**:
```json
{
  "success": true,
  "message": "应用已删除"
}
```

**错误响应**:
- `404`: 应用不存在
  ```json
  {
    "error": "应用不存在"
  }
  ```

---

## 4. 公开应用 API

### 4.1 获取应用列表

**GET** `/api/apps`

获取所有应用列表（公开版本，仅包含基本信息）。

**响应示例**:
```json
[
  {
    "appId": "my-app",
    "name": "我的应用",
    "description": "应用描述"
  }
]
```

---

## 5. 发布 API

### 5.1 管理员手动发布

**POST** `/api/admin/publish`

管理员手动发布文件（不需要 Token，需要管理员密码）。

**请求头**:
```
x-admin-password: YOUR_ADMIN_PASSWORD
Content-Type: multipart/form-data
```

**请求体** (Form Data):
- `files`: 文件（可多个，字段名必须为 `files`）
- `appId`: 应用 ID（必填）
- `version`: 版本号（可选，默认为 "未指定版本"）
- `description`: 发布描述（可选）

**请求示例** (cURL):
```bash
curl -X POST http://localhost:3000/api/admin/publish \
  -H "x-admin-password: admin123" \
  -F "files=@file1.zip" \
  -F "files=@file2.zip" \
  -F "appId=my-app" \
  -F "version=v1.0.0" \
  -F "description=发布说明"
```

**响应示例**:
```json
{
  "success": true,
  "message": "成功发布 2 个文件",
  "releases": [
    {
      "id": "uuid",
      "appId": "my-app",
      "appName": "我的应用",
      "version": "v1.0.0",
      "description": "发布说明",
      "fileName": "file1.zip",
      "filePath": "1234567890-file1.zip",
      "fileSize": 1024,
      "tokenName": "手动发布",
      "tokenId": null,
      "uploadedAt": "2024-01-01T00:00:00.000Z",
      "status": "success",
      "downloadCount": 0,
      "downloadUrl": "/api/download/uuid"
    }
  ]
}
```

**错误响应**:
- `400`: 缺少文件或 appId
  ```json
  {
    "error": "请上传文件"
  }
  ```
  ```json
  {
    "error": "请指定appId"
  }
  ```
- `404`: 应用不存在
  ```json
  {
    "error": "应用不存在，请先创建应用"
  }
  ```

---

### 5.2 API Token 发布

**POST** `/api/publish`

使用 Token 发布文件（需要有效的 Token）。

**认证方式**（三选一）:
1. Authorization Header: `Authorization: Bearer YOUR_TOKEN`
2. Query 参数: `?token=YOUR_TOKEN`
3. 请求体: `{ "token": "YOUR_TOKEN" }`（不推荐，因为需要 multipart/form-data）

**请求头**:
```
Content-Type: multipart/form-data
Authorization: Bearer YOUR_TOKEN  // 或使用 query 参数
```

**请求体** (Form Data):
- `files`: 文件（可多个，字段名必须为 `files`）
- `appId`: 应用 ID（必填）
- `version`: 版本号（可选，默认为 "未指定版本"）
- `description`: 发布描述（可选）

**请求示例** (cURL):
```bash
# 使用 Authorization Header（推荐）
curl -X POST http://localhost:3000/api/publish \
  -H "Authorization: Bearer YOUR_TOKEN" \
  -F "files=@file1.zip" \
  -F "appId=my-app" \
  -F "version=v1.0.0" \
  -F "description=发布说明"

# 或使用 Query 参数
curl -X POST "http://localhost:3000/api/publish?token=YOUR_TOKEN" \
  -F "files=@file1.zip" \
  -F "appId=my-app" \
  -F "version=v1.0.0"
```

**响应示例**:
```json
{
  "success": true,
  "message": "成功发布 1 个文件",
  "releases": [
    {
      "id": "uuid",
      "appId": "my-app",
      "appName": "我的应用",
      "version": "v1.0.0",
      "description": "发布说明",
      "fileName": "file1.zip",
      "filePath": "1234567890-file1.zip",
      "fileSize": 1024,
      "tokenName": "Token名称",
      "tokenId": "token-uuid",
      "uploadedAt": "2024-01-01T00:00:00.000Z",
      "status": "success",
      "downloadCount": 0,
      "downloadUrl": "/api/download/uuid"
    }
  ]
}
```

**注意**: 发布成功后会更新 Token 的使用统计（`lastUsed` 和 `usageCount`）。

**错误响应**:
- `401`: 缺少 Token
  ```json
  {
    "error": "缺少token"
  }
  ```
- `403`: Token 无效或已禁用
  ```json
  {
    "error": "无效或已禁用的token"
  }
  ```
- `400`: 缺少文件或 appId
  ```json
  {
    "error": "请上传文件"
  }
  ```
  ```json
  {
    "error": "请指定appId"
  }
  ```
- `404`: 应用不存在
  ```json
  {
    "error": "应用不存在，请先创建应用"
  }
  ```

---

## 6. 发布历史 API

### 6.1 管理员获取发布历史

**GET** `/api/admin/releases`

获取所有发布历史（管理员版本，包含完整信息）。

**请求头**:
```
x-admin-password: YOUR_ADMIN_PASSWORD
```

**查询参数**:
- `appId`: 可选，按应用 ID 筛选

**请求示例**:
```bash
# 获取所有发布历史
curl -H "x-admin-password: admin123" http://localhost:3000/api/admin/releases

# 获取指定应用的发布历史
curl -H "x-admin-password: admin123" "http://localhost:3000/api/admin/releases?appId=my-app"
```

**响应示例**:
```json
[
  {
    "id": "uuid",
    "appId": "my-app",
    "appName": "我的应用",
    "version": "v1.0.0",
    "description": "发布说明",
    "fileName": "file1.zip",
    "filePath": "1234567890-file1.zip",
    "fileSize": 1024,
    "tokenName": "Token名称",
    "tokenId": "token-uuid",
    "uploadedAt": "2024-01-01T00:00:00.000Z",
    "status": "success",
    "downloadCount": 5
  }
]
```

---

### 6.2 公开获取发布历史

**GET** `/api/releases`

获取发布历史（公开版本，仅包含成功发布的记录，不包含 Token 信息）。

**查询参数**:
- `appId`: 可选，按应用 ID 筛选

**请求示例**:
```bash
# 获取所有发布历史
curl http://localhost:3000/api/releases

# 获取指定应用的发布历史
curl "http://localhost:3000/api/releases?appId=my-app"
```

**响应示例**:
```json
[
  {
    "id": "uuid",
    "appId": "my-app",
    "appName": "我的应用",
    "version": "v1.0.0",
    "description": "发布说明",
    "fileName": "file1.zip",
    "fileSize": 1024,
    "uploadedAt": "2024-01-01T00:00:00.000Z",
    "downloadCount": 5,
    "downloadUrl": "/api/download/uuid"
  }
]
```

---

## 7. 下载 API

### 7.1 下载文件

**GET** `/api/download/:id`

下载指定发布 ID 的文件。

**路径参数**:
- `id`: 发布记录的 ID

**请求示例**:
```bash
curl -O http://localhost:3000/api/download/uuid
```

**响应**: 文件下载（二进制流）

**注意**: 每次下载会自动增加该文件的下载计数。

**错误响应**:
- `404`: 文件不存在
  ```json
  {
    "error": "文件不存在"
  }
  ```
  ```json
  {
    "error": "文件已丢失"
  }
  ```

---

## 8. 版本查询 API

### 8.1 获取所有应用的最新发布

**GET** `/api/latest`

获取所有应用的最新发布（每个应用一条记录）。

**请求示例**:
```bash
curl http://localhost:3000/api/latest
```

**响应示例**:
```json
[
  {
    "id": "uuid",
    "appId": "my-app",
    "appName": "我的应用",
    "version": "v1.0.0",
    "description": "发布说明",
    "fileName": "file1.zip",
    "filePath": "1234567890-file1.zip",
    "fileSize": 1024,
    "tokenName": "Token名称",
    "tokenId": "token-uuid",
    "uploadedAt": "2024-01-01T00:00:00.000Z",
    "status": "success",
    "downloadCount": 5,
    "downloadUrl": "/api/download/uuid"
  }
]
```

**错误响应**:
- `404`: 暂无发布
  ```json
  {
    "error": "暂无发布"
  }
  ```

---

### 8.2 获取指定应用的最新发布

**GET** `/api/latest/:appId`

获取指定应用的最新发布。

**路径参数**:
- `appId`: 应用的 ID

**请求示例**:
```bash
curl http://localhost:3000/api/latest/my-app
```

**响应示例**:
```json
{
  "id": "uuid",
  "appId": "my-app",
  "appName": "我的应用",
  "version": "v1.0.0",
  "description": "发布说明",
  "fileName": "file1.zip",
  "filePath": "1234567890-file1.zip",
  "fileSize": 1024,
  "tokenName": "Token名称",
  "tokenId": "token-uuid",
  "uploadedAt": "2024-01-01T00:00:00.000Z",
  "status": "success",
  "downloadCount": 5,
  "downloadUrl": "/api/download/uuid"
}
```

**错误响应**:
- `404`: 应用暂无发布
  ```json
  {
    "error": "应用 my-app 暂无发布"
  }
  ```

---

### 8.3 获取指定应用的所有版本

**GET** `/api/versions/:appId`

获取指定应用的所有版本（按时间倒序排列）。

**路径参数**:
- `appId`: 应用的 ID

**请求示例**:
```bash
curl http://localhost:3000/api/versions/my-app
```

**响应示例**:
```json
[
  {
    "id": "uuid-2",
    "appId": "my-app",
    "appName": "我的应用",
    "version": "v1.1.0",
    "description": "新版本",
    "fileName": "file2.zip",
    "filePath": "1234567891-file2.zip",
    "fileSize": 2048,
    "tokenName": "Token名称",
    "tokenId": "token-uuid",
    "uploadedAt": "2024-01-02T00:00:00.000Z",
    "status": "success",
    "downloadCount": 3,
    "downloadUrl": "/api/download/uuid-2"
  },
  {
    "id": "uuid-1",
    "appId": "my-app",
    "appName": "我的应用",
    "version": "v1.0.0",
    "description": "初始版本",
    "fileName": "file1.zip",
    "filePath": "1234567890-file1.zip",
    "fileSize": 1024,
    "tokenName": "Token名称",
    "tokenId": "token-uuid",
    "uploadedAt": "2024-01-01T00:00:00.000Z",
    "status": "success",
    "downloadCount": 5,
    "downloadUrl": "/api/download/uuid-1"
  }
]
```

---

## 错误码说明

| 状态码 | 说明 |
|--------|------|
| 200 | 请求成功 |
| 400 | 请求参数错误 |
| 401 | 未授权（缺少认证信息或认证失败） |
| 403 | 禁止访问（Token 无效或已禁用） |
| 404 | 资源不存在 |
| 500 | 服务器内部错误 |

---

## 使用流程示例

### 1. 管理员创建应用和 Token

```bash
# 1. 创建应用
curl -X POST http://localhost:3000/api/admin/apps \
  -H "x-admin-password: admin123" \
  -H "Content-Type: application/json" \
  -d '{
    "appId": "my-app",
    "name": "我的应用",
    "description": "应用描述"
  }'

# 2. 创建 Token
curl -X POST http://localhost:3000/api/admin/tokens \
  -H "x-admin-password: admin123" \
  -H "Content-Type: application/json" \
  -d '{
    "name": "CI/CD Token",
    "description": "用于持续集成"
  }'
```

### 2. 使用 Token 发布文件

```bash
# 使用 Token 发布
curl -X POST http://localhost:3000/api/publish \
  -H "Authorization: Bearer YOUR_TOKEN" \
  -F "files=@app.zip" \
  -F "appId=my-app" \
  -F "version=v1.0.0" \
  -F "description=初始版本"
```

### 3. 客户端获取最新版本

```bash
# 获取最新版本
curl http://localhost:3000/api/latest/my-app

# 下载文件
curl -O http://localhost:3000/api/download/RELEASE_ID
```

---

## 注意事项

1. **文件大小限制**: 单个文件最大 100MB
2. **Token 过期**: Token 默认有效期为 365 天，可在创建时通过 `expiresIn` 参数自定义
3. **Token 安全**: 
   - 创建 Token 后请妥善保管，Token 只会显示一次
   - 建议使用 Authorization Header 方式传递 Token，避免在 URL 中暴露
4. **应用 ID 规则**: `appId` 只能包含字母、数字、连字符（`-`）和下划线（`_`）
5. **多文件发布**: 发布接口支持同时上传多个文件，每个文件会创建一条独立的发布记录
6. **下载计数**: 每次通过 `/api/download/:id` 下载文件时，会自动增加该文件的下载计数

---

## 环境变量

可以通过环境变量或 `.env` 文件配置：

- `PORT`: 服务器端口（默认: 3000）
- `ADMIN_PASSWORD`: 管理员密码（默认: admin123）
- `JWT_SECRET`: JWT 密钥（默认: your-secret-key-change-in-production）

**⚠️ 生产环境请务必修改这些默认值！**

