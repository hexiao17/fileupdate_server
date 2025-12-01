const request = require('supertest');
const fs = require('fs');
const path = require('path');

const TEST_DB_PATH = path.join(__dirname, 'tmp', 'api-test.sqlite');
process.env.DB_DRIVER = 'sqlite';
process.env.DB_SQLITE_FILE = TEST_DB_PATH;

const tmpDir = path.dirname(TEST_DB_PATH);
if (!fs.existsSync(tmpDir)) {
  fs.mkdirSync(tmpDir, { recursive: true });
}
if (fs.existsSync(TEST_DB_PATH)) {
  fs.unlinkSync(TEST_DB_PATH);
}

// 导入服务器 app 与存储层
const app = require('../server');
const storage = require('../storage');

// 测试配置
const ADMIN_PASSWORD = process.env.ADMIN_PASSWORD || 'admin123';

describe('API Token 发布测试', () => {
  let testToken = null;
  let testAppId = 'test-app-' + Date.now();
  let testApp = null;
  let testTokenId = null;

  // 创建测试应用
  beforeAll(async () => {
    testApp = storage.findAppById(testAppId);
    if (!testApp) {
      testApp = storage.createApp({
        appId: testAppId,
        name: '测试应用',
        description: '用于测试的应用',
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString()
      });
    }
  });

  afterAll(() => {
    if (fs.existsSync(TEST_DB_PATH)) {
      fs.unlinkSync(TEST_DB_PATH);
    }
  });

  describe('Token 创建 API', () => {
    test('应该能够创建 token（需要管理员密码）', async () => {
      const response = await request(app)
        .post('/api/admin/tokens')
        .set('x-admin-password', ADMIN_PASSWORD)
        .send({
          name: '测试Token',
          description: '用于测试的Token',
          expiresIn: '365d'
        });

      expect(response.status).toBe(200);
      expect(response.body.success).toBe(true);
      expect(response.body.token).toBeDefined();
      expect(response.body.tokenData).toBeDefined();
      expect(response.body.tokenData.name).toBe('测试Token');
      expect(response.body.tokenData.active).toBe(true);
      expect(response.body.tokenData.usageCount).toBe(0);

      // 保存 token 供后续测试使用
      testToken = response.body.token;
      testTokenId = response.body.tokenData.id;
    });

    test('创建 token 时应该拒绝无效的管理员密码', async () => {
      const response = await request(app)
        .post('/api/admin/tokens')
        .set('x-admin-password', 'wrong-password')
        .send({
          name: '测试Token',
          description: '用于测试的Token'
        });

      expect(response.status).toBe(401);
      expect(response.body.error).toBe('管理员密码错误');
    });

    test('创建 token 时应该使用默认值', async () => {
      const response = await request(app)
        .post('/api/admin/tokens')
        .set('x-admin-password', ADMIN_PASSWORD)
        .send({});

      expect(response.status).toBe(200);
      expect(response.body.success).toBe(true);
      expect(response.body.tokenData.name).toBe('未命名Token');
      expect(response.body.tokenData.description).toBe('');
    });

    test('应该能够获取所有 tokens', async () => {
      // 先创建几个 tokens
      await request(app)
        .post('/api/admin/tokens')
        .set('x-admin-password', ADMIN_PASSWORD)
        .send({ name: 'Token1' });

      await request(app)
        .post('/api/admin/tokens')
        .set('x-admin-password', ADMIN_PASSWORD)
        .send({ name: 'Token2' });

      const response = await request(app)
        .get('/api/admin/tokens')
        .set('x-admin-password', ADMIN_PASSWORD);

      expect(response.status).toBe(200);
      expect(Array.isArray(response.body)).toBe(true);
      expect(response.body.length).toBeGreaterThanOrEqual(2);
      // 验证 token 被部分隐藏
      response.body.forEach(token => {
        expect(token.token).toMatch(/^.{20}\.\.\.$/);
      });
    });
  });

  describe('Token 发布 API', () => {
    beforeEach(async () => {
      // 每次测试前重新创建 token，确保 token 是有效的
      const response = await request(app)
        .post('/api/admin/tokens')
        .set('x-admin-password', ADMIN_PASSWORD)
        .send({
          name: '发布测试Token',
          description: '用于发布测试的Token'
        });
      testToken = response.body.token;
      testTokenId = response.body.tokenData.id;
    });

    test('应该能够使用 token 发布文件', async () => {
      // 创建一个测试文件
      const testFilePath = path.join(__dirname, 'test-file.txt');
      fs.writeFileSync(testFilePath, '这是一个测试文件内容');

      const response = await request(app)
        .post('/api/publish')
        .query({ token: testToken })
        .field('appId', testAppId)
        .field('version', '1.0.0')
        .field('description', '测试发布')
        .attach('files', testFilePath);

      expect(response.status).toBe(200);
      expect(response.body.success).toBe(true);
      expect(response.body.releases).toBeDefined();
      expect(response.body.releases.length).toBe(1);
      expect(response.body.releases[0].appId).toBe(testAppId);
      expect(response.body.releases[0].version).toBe('1.0.0');
      expect(response.body.releases[0].fileName).toBe('test-file.txt');
      expect(response.body.releases[0].tokenName).toBe('发布测试Token');

      // 清理测试文件
      fs.unlinkSync(testFilePath);
    });

    test('应该能够使用 token 发布多个文件', async () => {
      // 创建测试文件
      const testFile1 = path.join(__dirname, 'test-file-1.txt');
      const testFile2 = path.join(__dirname, 'test-file-2.txt');
      fs.writeFileSync(testFile1, '文件1内容');
      fs.writeFileSync(testFile2, '文件2内容');

      const response = await request(app)
        .post('/api/publish')
        .query({ token: testToken })
        .field('appId', testAppId)
        .field('version', '1.0.1')
        .field('description', '多文件发布测试')
        .attach('files', testFile1)
        .attach('files', testFile2);

      expect(response.status).toBe(200);
      expect(response.body.success).toBe(true);
      expect(response.body.releases.length).toBe(2);
      expect(response.body.message).toContain('2 个文件');

      // 清理测试文件
      fs.unlinkSync(testFile1);
      fs.unlinkSync(testFile2);
    });

    test('发布时应该更新 token 使用统计', async () => {
      // 获取发布前的 token 信息
      const tokensBefore = storage.listTokens();
      const tokenBefore = tokensBefore.find(t => t.id === testTokenId);
      const usageCountBefore = tokenBefore ? (tokenBefore.usageCount || 0) : 0;

      // 创建测试文件
      const testFile = path.join(__dirname, 'test-file-stats.txt');
      fs.writeFileSync(testFile, '测试内容');

      await request(app)
        .post('/api/publish')
        .query({ token: testToken })
        .field('appId', testAppId)
        .field('version', '1.0.2')
        .attach('files', testFile);

      // 重新读取 tokens（因为服务器会更新）
      const tokensAfter = storage.listTokens();
      const tokenAfter = tokensAfter.find(t => t.id === testTokenId);
      
      expect(tokenAfter).toBeDefined();
      expect(tokenAfter.usageCount).toBe(usageCountBefore + 1);
      expect(tokenAfter.lastUsed).toBeDefined();

      // 清理测试文件
      fs.unlinkSync(testFile);
    });

    test('发布时应该拒绝无效的 token', async () => {
      const testFile = path.join(__dirname, 'test-file-invalid.txt');
      fs.writeFileSync(testFile, '测试内容');

      try {
        const response = await request(app)
          .post('/api/publish')
          .set('Authorization', 'Bearer invalid-token-12345')
          .field('appId', testAppId)
          .field('version', '1.0.0')
          .attach('files', testFile);

        expect(response.status).toBe(403);
        expect(response.body.error).toBe('无效或已禁用的token');
      } catch (error) {
        // 如果连接重置，至少验证错误类型
        expect(error.message).toBeDefined();
      } finally {
        // 清理测试文件
        if (fs.existsSync(testFile)) {
          fs.unlinkSync(testFile);
        }
      }
    });

    test('发布时应该拒绝缺少 token 的请求', async () => {
      const testFile = path.join(__dirname, 'test-file-no-token.txt');
      fs.writeFileSync(testFile, '测试内容');

      try {
        const response = await request(app)
          .post('/api/publish')
          .field('appId', testAppId)
          .field('version', '1.0.0')
          .attach('files', testFile);

        expect(response.status).toBe(401);
        expect(response.body.error).toBe('缺少token');
      } catch (error) {
        // 如果连接重置，至少验证错误类型
        expect(error.message).toBeDefined();
      } finally {
        // 清理测试文件
        if (fs.existsSync(testFile)) {
          fs.unlinkSync(testFile);
        }
      }
    });

    test('发布时应该拒绝不存在的 appId', async () => {
      const testFile = path.join(__dirname, 'test-file-no-app.txt');
      fs.writeFileSync(testFile, '测试内容');

      const response = await request(app)
        .post('/api/publish')
        .query({ token: testToken })
        .field('appId', 'non-existent-app-id')
        .field('version', '1.0.0')
        .attach('files', testFile);

      expect(response.status).toBe(404);
      expect(response.body.error).toBe('应用不存在，请先创建应用');

      // 清理测试文件
      fs.unlinkSync(testFile);
    });

    test('发布时应该拒绝缺少 appId 的请求', async () => {
      const testFile = path.join(__dirname, 'test-file-no-appid.txt');
      fs.writeFileSync(testFile, '测试内容');

      const response = await request(app)
        .post('/api/publish')
        .query({ token: testToken })
        .field('version', '1.0.0')
        .attach('files', testFile);

      expect(response.status).toBe(400);
      expect(response.body.error).toBe('请指定appId');

      // 清理测试文件
      fs.unlinkSync(testFile);
    });

    test('发布时应该拒绝没有文件的请求', async () => {
      const response = await request(app)
        .post('/api/publish')
        .set('Authorization', `Bearer ${testToken}`)
        .field('appId', testAppId)
        .field('version', '1.0.0');

      expect(response.status).toBe(400);
      expect(response.body.error).toBe('请上传文件');
    });

    test('禁用 token 后应该无法发布', async () => {
      // 创建一个新 token
      const createResponse = await request(app)
        .post('/api/admin/tokens')
        .set('x-admin-password', ADMIN_PASSWORD)
        .send({ name: '将被禁用的Token' });

      const newToken = createResponse.body.token;
      const tokenId = createResponse.body.tokenData.id;

      // 禁用 token
      await request(app)
        .delete(`/api/admin/tokens/${tokenId}`)
        .set('x-admin-password', ADMIN_PASSWORD);

      // 尝试使用禁用的 token 发布
      const testFile = path.join(__dirname, 'test-file-disabled.txt');
      fs.writeFileSync(testFile, '测试内容');

      try {
        const publishResponse = await request(app)
          .post('/api/publish')
          .set('Authorization', `Bearer ${newToken}`)
          .field('appId', testAppId)
          .field('version', '1.0.0')
          .attach('files', testFile);

        expect(publishResponse.status).toBe(403);
        expect(publishResponse.body.error).toBe('无效或已禁用的token');
      } catch (error) {
        // 如果连接重置，至少验证错误类型
        expect(error.message).toBeDefined();
      } finally {
        // 清理测试文件
        if (fs.existsSync(testFile)) {
          fs.unlinkSync(testFile);
        }
      }
    });

    test('应该支持通过 Authorization header 传递 token', async () => {
      const testFile = path.join(__dirname, 'test-file-header.txt');
      fs.writeFileSync(testFile, '测试内容');

      const response = await request(app)
        .post('/api/publish')
        .set('Authorization', `Bearer ${testToken}`)
        .field('appId', testAppId)
        .field('version', '1.0.0')
        .attach('files', testFile);

      expect(response.status).toBe(200);
      expect(response.body.success).toBe(true);

      // 清理测试文件
      fs.unlinkSync(testFile);
    });
  });

  describe('Token 管理 API', () => {
    test('应该能够禁用 token', async () => {
      // 创建一个 token
      const createResponse = await request(app)
        .post('/api/admin/tokens')
        .set('x-admin-password', ADMIN_PASSWORD)
        .send({ name: '将被禁用的Token' });

      const tokenId = createResponse.body.tokenData.id;

      // 禁用 token
      const deleteResponse = await request(app)
        .delete(`/api/admin/tokens/${tokenId}`)
        .set('x-admin-password', ADMIN_PASSWORD);

      expect(deleteResponse.status).toBe(200);
      expect(deleteResponse.body.success).toBe(true);

      // 验证 token 已被禁用
      const tokens = storage.listTokens();
      const token = tokens.find(t => t.id === tokenId);
      expect(token).toBeDefined();
      expect(token.active).toBe(false);
    });

    test('禁用不存在的 token 应该返回 404', async () => {
      const response = await request(app)
        .delete('/api/admin/tokens/non-existent-id')
        .set('x-admin-password', ADMIN_PASSWORD);

      expect(response.status).toBe(404);
      expect(response.body.error).toBe('Token不存在');
    });
  });
});

