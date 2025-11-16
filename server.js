const express = require('express');
const cors = require('cors');
const multer = require('multer');
const path = require('path');
const fs = require('fs');
const jwt = require('jsonwebtoken');
const { v4: uuidv4 } = require('uuid');
require('dotenv').config();

const app = express();
const PORT = process.env.PORT || 3000;
const JWT_SECRET = process.env.JWT_SECRET || 'your-secret-key-change-in-production';
const ADMIN_PASSWORD = process.env.ADMIN_PASSWORD || 'admin123';

// 确保必要的目录存在
const uploadsDir = path.join(__dirname, 'uploads');
const tokensFile = path.join(__dirname, 'tokens.json');
const releasesFile = path.join(__dirname, 'releases.json');
const appsFile = path.join(__dirname, 'apps.json');

[uploadsDir].forEach(dir => {
  if (!fs.existsSync(dir)) {
    fs.mkdirSync(dir, { recursive: true });
  }
});

// 初始化数据文件
if (!fs.existsSync(tokensFile)) {
  fs.writeFileSync(tokensFile, JSON.stringify([], null, 2));
}
if (!fs.existsSync(releasesFile)) {
  fs.writeFileSync(releasesFile, JSON.stringify([], null, 2));
}
if (!fs.existsSync(appsFile)) {
  fs.writeFileSync(appsFile, JSON.stringify([], null, 2));
}

// 中间件
app.use(cors());
app.use(express.json());
app.use(express.static('public'));

// 文件上传配置
const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    cb(null, uploadsDir);
  },
  filename: (req, file, cb) => {
    const uniqueName = `${Date.now()}-${file.originalname}`;
    cb(null, uniqueName);
  }
});

const upload = multer({ 
  storage: storage,
  limits: { fileSize: 100 * 1024 * 1024 } // 100MB限制
});

// 工具函数
function readTokens() {
  try {
    const data = fs.readFileSync(tokensFile, 'utf8');
    return JSON.parse(data);
  } catch (error) {
    return [];
  }
}

function writeTokens(tokens) {
  fs.writeFileSync(tokensFile, JSON.stringify(tokens, null, 2));
}

function readReleases() {
  try {
    const data = fs.readFileSync(releasesFile, 'utf8');
    return JSON.parse(data);
  } catch (error) {
    return [];
  }
}

function writeReleases(releases) {
  fs.writeFileSync(releasesFile, JSON.stringify(releases, null, 2));
}

function readApps() {
  try {
    const data = fs.readFileSync(appsFile, 'utf8');
    return JSON.parse(data);
  } catch (error) {
    return [];
  }
}

function writeApps(apps) {
  fs.writeFileSync(appsFile, JSON.stringify(apps, null, 2));
}

function verifyToken(token) {
  const tokens = readTokens();
  return tokens.find(t => t.token === token && t.active);
}

// Token验证中间件
function authenticateToken(req, res, next) {
  const token = req.headers['authorization']?.replace('Bearer ', '') || 
                req.query.token || 
                req.body.token;

  if (!token) {
    return res.status(401).json({ error: '缺少token' });
  }

  const tokenData = verifyToken(token);
  if (!tokenData) {
    return res.status(403).json({ error: '无效或已禁用的token' });
  }

  req.tokenData = tokenData;
  next();
}

// 管理员验证中间件
function authenticateAdmin(req, res, next) {
  const password = req.headers['x-admin-password'] || req.body.password;
  
  if (password !== ADMIN_PASSWORD) {
    return res.status(401).json({ error: '管理员密码错误' });
  }
  
  next();
}

// API路由

// 健康检查
app.get('/api/health', (req, res) => {
  res.json({ status: 'ok', message: '服务器运行正常' });
});

// 管理员：生成token
app.post('/api/admin/tokens', authenticateAdmin, (req, res) => {
  const { name, description, expiresIn } = req.body;
  const token = jwt.sign({ id: uuidv4(), name }, JWT_SECRET, { expiresIn: expiresIn || '365d' });
  
  const tokens = readTokens();
  const tokenData = {
    id: uuidv4(),
    token,
    name: name || '未命名Token',
    description: description || '',
    createdAt: new Date().toISOString(),
    lastUsed: null,
    active: true,
    usageCount: 0
  };
  
  tokens.push(tokenData);
  writeTokens(tokens);
  
  res.json({ 
    success: true, 
    token,
    tokenData: { ...tokenData, token: undefined } // 不返回完整token，只返回元数据
  });
});

// 管理员：获取所有tokens
app.get('/api/admin/tokens', authenticateAdmin, (req, res) => {
  const tokens = readTokens();
  // 不返回完整token，只返回元数据
  const tokensWithoutSecret = tokens.map(t => ({
    ...t,
    token: t.token.substring(0, 20) + '...' // 只显示前20个字符
  }));
  res.json(tokensWithoutSecret);
});

// 管理员：删除/禁用token
app.delete('/api/admin/tokens/:id', authenticateAdmin, (req, res) => {
  const { id } = req.params;
  const tokens = readTokens();
  const index = tokens.findIndex(t => t.id === id);
  
  if (index === -1) {
    return res.status(404).json({ error: 'Token不存在' });
  }
  
  tokens[index].active = false;
  writeTokens(tokens);
  
  res.json({ success: true, message: 'Token已禁用' });
});

// 应用管理API

// 管理员：创建应用
app.post('/api/admin/apps', authenticateAdmin, (req, res) => {
  const { appId, name, description } = req.body;
  
  if (!appId || !name) {
    return res.status(400).json({ error: 'appId和name是必填项' });
  }
  
  // appId只能包含字母、数字、连字符和下划线
  if (!/^[a-zA-Z0-9_-]+$/.test(appId)) {
    return res.status(400).json({ error: 'appId只能包含字母、数字、连字符和下划线' });
  }
  
  const apps = readApps();
  if (apps.find(a => a.appId === appId)) {
    return res.status(400).json({ error: 'appId已存在' });
  }
  
  const app = {
    appId,
    name,
    description: description || '',
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString()
  };
  
  apps.push(app);
  writeApps(apps);
  
  res.json({ success: true, app });
});

// 管理员：获取所有应用
app.get('/api/admin/apps', authenticateAdmin, (req, res) => {
  const apps = readApps();
  res.json(apps);
});

// 管理员：更新应用
app.put('/api/admin/apps/:appId', authenticateAdmin, (req, res) => {
  const { appId } = req.params;
  const { name, description } = req.body;
  
  const apps = readApps();
  const appIndex = apps.findIndex(a => a.appId === appId);
  
  if (appIndex === -1) {
    return res.status(404).json({ error: '应用不存在' });
  }
  
  if (name) apps[appIndex].name = name;
  if (description !== undefined) apps[appIndex].description = description;
  apps[appIndex].updatedAt = new Date().toISOString();
  
  writeApps(apps);
  res.json({ success: true, app: apps[appIndex] });
});

// 管理员：删除应用
app.delete('/api/admin/apps/:appId', authenticateAdmin, (req, res) => {
  const { appId } = req.params;
  
  const apps = readApps();
  const appIndex = apps.findIndex(a => a.appId === appId);
  
  if (appIndex === -1) {
    return res.status(404).json({ error: '应用不存在' });
  }
  
  apps.splice(appIndex, 1);
  writeApps(apps);
  
  res.json({ success: true, message: '应用已删除' });
});

// 公开：获取所有应用列表（用于客户端选择）
app.get('/api/apps', (req, res) => {
  const apps = readApps();
  res.json(apps.map(app => ({
    appId: app.appId,
    name: app.name,
    description: app.description
  })));
});

// 管理员：获取发布历史（支持按应用筛选）
app.get('/api/admin/releases', authenticateAdmin, (req, res) => {
  const { appId } = req.query;
  const releases = readReleases();
  let filteredReleases = releases;
  
  if (appId) {
    filteredReleases = releases.filter(r => r.appId === appId);
  }
  
  res.json(filteredReleases.reverse()); // 最新的在前
});

// 公开：获取发布历史（普通用户可见，不需要管理员密码）
app.get('/api/releases', (req, res) => {
  const { appId } = req.query;
  const releases = readReleases();
  let filteredReleases = releases.filter(r => r.status === 'success');
  
  if (appId) {
    filteredReleases = filteredReleases.filter(r => r.appId === appId);
  }
  
  // 只返回公开信息，不包含token信息
  const publicReleases = filteredReleases.map(r => ({
    id: r.id,
    appId: r.appId,
    appName: r.appName,
    version: r.version,
    description: r.description,
    fileName: r.fileName,
    fileSize: r.fileSize,
    uploadedAt: r.uploadedAt,
    downloadCount: r.downloadCount || 0,
    downloadUrl: `/api/download/${r.id}`
  }));
  
  res.json(publicReleases.reverse()); // 最新的在前
});

// 管理员：手动发布（不需要token，需要管理员密码）
app.post('/api/admin/publish', authenticateAdmin, upload.array('files'), (req, res) => {
  console.log('收到手动发布请求，文件数量:', req.files ? req.files.length : 0);
  if (!req.files || req.files.length === 0) {
    return res.status(400).json({ error: '请上传文件' });
  }

  const { appId, version, description } = req.body;
  
  if (!appId) {
    return res.status(400).json({ error: '请指定appId' });
  }
  
  // 验证应用是否存在
  const apps = readApps();
  const app = apps.find(a => a.appId === appId);
  if (!app) {
    return res.status(404).json({ error: '应用不存在，请先创建应用' });
  }

  // 记录发布历史（每个文件一条记录）
  const releases = readReleases();
  const uploadedReleases = [];

  req.files.forEach(file => {
    const release = {
      id: uuidv4(),
      appId: appId,
      appName: app.name,
      version: version || '未指定版本',
      description: description || '',
      fileName: file.originalname,
      filePath: file.filename,
      fileSize: file.size,
      tokenName: '手动发布',
      tokenId: null,
      uploadedAt: new Date().toISOString(),
      status: 'success',
      downloadCount: 0
    };
    
    releases.push(release);
    uploadedReleases.push({
      ...release,
      downloadUrl: `/api/download/${release.id}`
    });
  });
  
  writeReleases(releases);

  res.json({
    success: true,
    message: `成功发布 ${uploadedReleases.length} 个文件`,
    releases: uploadedReleases
  });
});

// API发布：上传文件（需要token验证）
app.post('/api/publish', authenticateToken, upload.array('files'), (req, res) => {
  if (!req.files || req.files.length === 0) {
    return res.status(400).json({ error: '请上传文件' });
  }

  const { appId, version, description } = req.body;
  const tokenData = req.tokenData;
  
  if (!appId) {
    return res.status(400).json({ error: '请指定appId' });
  }
  
  // 验证应用是否存在
  const apps = readApps();
  const app = apps.find(a => a.appId === appId);
  if (!app) {
    return res.status(404).json({ error: '应用不存在，请先创建应用' });
  }

  // 更新token使用信息
  const tokens = readTokens();
  const tokenIndex = tokens.findIndex(t => t.id === tokenData.id);
  if (tokenIndex !== -1) {
    tokens[tokenIndex].lastUsed = new Date().toISOString();
    tokens[tokenIndex].usageCount = (tokens[tokenIndex].usageCount || 0) + 1;
    writeTokens(tokens);
  }

  // 记录发布历史（每个文件一条记录）
  const releases = readReleases();
  const uploadedReleases = [];

  req.files.forEach(file => {
    const release = {
      id: uuidv4(),
      appId: appId,
      appName: app.name,
      version: version || '未指定版本',
      description: description || '',
      fileName: file.originalname,
      filePath: file.filename,
      fileSize: file.size,
      tokenName: tokenData.name,
      tokenId: tokenData.id,
      uploadedAt: new Date().toISOString(),
      status: 'success',
      downloadCount: 0
    };
    
    releases.push(release);
    uploadedReleases.push({
      ...release,
      downloadUrl: `/api/download/${release.id}`
    });
  });
  
  writeReleases(releases);

  res.json({
    success: true,
    message: `成功发布 ${uploadedReleases.length} 个文件`,
    releases: uploadedReleases
  });
});

// 下载文件
app.get('/api/download/:id', (req, res) => {
  const { id } = req.params;
  const releases = readReleases();
  const releaseIndex = releases.findIndex(r => r.id === id);
  
  if (releaseIndex === -1) {
    return res.status(404).json({ error: '文件不存在' });
  }
  
  const release = releases[releaseIndex];
  const filePath = path.join(uploadsDir, release.filePath);
  if (!fs.existsSync(filePath)) {
    return res.status(404).json({ error: '文件已丢失' });
  }
  
  // 增加下载次数
  releases[releaseIndex].downloadCount = (releases[releaseIndex].downloadCount || 0) + 1;
  writeReleases(releases);
  
  res.download(filePath, release.fileName);
});

// 获取指定应用的最新发布
app.get('/api/latest/:appId', (req, res) => {
  const { appId } = req.params;
  const releases = readReleases();
  const appReleases = releases.filter(r => r.appId === appId && r.status === 'success');
  
  if (appReleases.length === 0) {
    return res.status(404).json({ error: `应用 ${appId} 暂无发布` });
  }
  
  // 按版本号排序，获取最新的
  const latest = appReleases.sort((a, b) => {
    // 简单的版本比较（可以改进为语义化版本比较）
    return new Date(b.uploadedAt) - new Date(a.uploadedAt);
  })[0];
  
  res.json({
    ...latest,
    downloadUrl: `/api/download/${latest.id}`
  });
});

// 获取指定应用的所有版本（按时间倒序）
app.get('/api/versions/:appId', (req, res) => {
  const { appId } = req.params;
  const releases = readReleases();
  const appReleases = releases
    .filter(r => r.appId === appId && r.status === 'success')
    .sort((a, b) => new Date(b.uploadedAt) - new Date(a.uploadedAt))
    .map(r => ({
      ...r,
      downloadUrl: `/api/download/${r.id}`
    }));
  
  res.json(appReleases);
});

// 兼容旧接口：获取最新发布（如果没有appId，返回所有应用的最新发布）
app.get('/api/latest', (req, res) => {
  const releases = readReleases();
  const activeReleases = releases.filter(r => r.status === 'success');
  
  if (activeReleases.length === 0) {
    return res.status(404).json({ error: '暂无发布' });
  }
  
  // 按应用分组，获取每个应用的最新版本
  const apps = readApps();
  const latestByApp = {};
  
  activeReleases.forEach(release => {
    if (!release.appId) {
      // 兼容旧数据（没有appId的发布）
      return;
    }
    if (!latestByApp[release.appId] || 
        new Date(release.uploadedAt) > new Date(latestByApp[release.appId].uploadedAt)) {
      latestByApp[release.appId] = release;
    }
  });
  
  res.json(Object.values(latestByApp).map(r => ({
    ...r,
    downloadUrl: `/api/download/${r.id}`
  })));
});

// 启动服务器
app.listen(PORT, () => {
  console.log(`🚀 应用发布服务器运行在 http://localhost:${PORT}`);
  console.log(`📝 管理界面: http://localhost:${PORT}`);
  console.log(`🔑 默认管理员密码: ${ADMIN_PASSWORD}`);
  console.log(`⚠️  请在生产环境中修改 ADMIN_PASSWORD 和 JWT_SECRET`);
  console.log(`📋 已注册路由: POST /api/admin/publish`);
});

