# API Token 发布测试文档

## 测试概述

本测试套件包含了对 API Token 创建和发布功能的完整测试，确保所有功能正常工作。

## 测试覆盖范围

### 1. Token 创建 API 测试
- ✅ 能够创建 token（需要管理员密码）
- ✅ 拒绝无效的管理员密码
- ✅ 使用默认值创建 token
- ✅ 获取所有 tokens 列表

### 2. Token 发布 API 测试
- ✅ 使用 token 发布单个文件
- ✅ 使用 token 发布多个文件
- ✅ 发布时更新 token 使用统计（usageCount 和 lastUsed）
- ✅ 拒绝无效的 token
- ✅ 拒绝缺少 token 的请求
- ✅ 拒绝不存在的 appId
- ✅ 拒绝缺少 appId 的请求
- ✅ 拒绝没有文件的请求
- ✅ 禁用 token 后无法发布
- ✅ 支持通过 Authorization header 传递 token

### 3. Token 管理 API 测试
- ✅ 能够禁用 token
- ✅ 禁用不存在的 token 返回 404

## 运行测试

```bash
# 运行所有测试
npm test

# 监视模式（自动重新运行测试）
npm run test:watch
```

## 测试配置

测试使用 Jest 作为测试框架，Supertest 用于 HTTP 请求测试。

测试会在每个测试前清理发布历史，但保留 tokens 和应用数据，以确保测试的独立性。

## 测试数据

测试会自动创建测试应用（`test-app-{timestamp}`），并在测试结束后恢复原始数据。

## 注意事项

1. 测试会修改 `tokens.json` 和 `releases.json` 文件，但会在测试结束后恢复原始数据
2. 测试创建的临时文件会在测试完成后自动清理
3. 测试使用默认的管理员密码 `admin123`（可通过环境变量 `ADMIN_PASSWORD` 修改）

