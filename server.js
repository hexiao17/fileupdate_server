const express = require('express');
const cors = require('cors');
const session = require('express-session');
const crypto = require('crypto');
const multer = require('multer');
const path = require('path');
const fs = require('fs');
const jwt = require('jsonwebtoken');
const { v4: uuidv4 } = require('uuid');
require('dotenv').config();
const storage = require('./storage');

const app = express();
const PORT = process.env.PORT || 3000;
const JWT_SECRET = process.env.JWT_SECRET || 'your-secret-key-change-in-production';
const ADMIN_PASSWORD = process.env.ADMIN_PASSWORD || 'admin123';
const SESSION_SECRET = process.env.SESSION_SECRET || crypto.randomBytes(24).toString('hex');

// 确保必要的目录存在
const uploadsDir = path.join(__dirname, 'uploads');
if (!fs.existsSync(uploadsDir)) {
  fs.mkdirSync(uploadsDir, { recursive: true });
}

// 中间件
const allowedOrigin = process.env.CORS_ORIGIN;
if (allowedOrigin) {
  app.use(cors({ origin: allowedOrigin, credentials: true }));
} else {
  // 默认关闭跨域浏览器访问，只允许同源调用，更安全
  app.use(cors({ origin: false }));
}
app.use(express.json({ limit: '10mb' }));
// 确保正确处理multipart/form-data的字符编码
app.use(express.urlencoded({ extended: true, limit: '10mb' }));
app.use(
  session({
    name: 'sid',
    secret: SESSION_SECRET,
    resave: false,
    saveUninitialized: false,
    cookie: {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: process.env.NODE_ENV === 'production' ? 'strict' : 'lax',
      maxAge: 60 * 60 * 1000 // 1小时
    }
  })
);
app.use(express.static('public'));

// 设置API响应的字符编码
app.use('/api', (req, res, next) => {
  res.setHeader('Content-Type', 'application/json; charset=utf-8');
  next();
});

app.use('/vendor/chart.js', express.static(path.join(__dirname, 'node_modules/chart.js/dist')));

// 文件名解码函数
function decodeFileName(fileName) {
  if (!fileName) return 'unnamed-file';

  try {
    // 尝试多种解码方式处理中文文件名
    let decodedName = fileName;
    console.log('🔍 原始文件名:', Buffer.from(fileName, 'binary').toString('utf8') || fileName);
    console.log('🔍 文件名字节 (hex):', Buffer.from(fileName).toString('hex'));

    // 处理RFC 6266编码的文件名 (filename*=UTF-8''...)
    const rfc6266Match = fileName.match(/filename\*=UTF-8''(.+)/i);
    if (rfc6266Match) {
      console.log('📋 检测到RFC 6266编码');
      decodedName = decodeURIComponent(rfc6266Match[1]);
    } else {
      // 处理普通的URL编码
      try {
        const urlDecoded = decodeURIComponent(fileName);
        if (urlDecoded !== fileName) {
          console.log('🔗 检测到URL编码');
          decodedName = urlDecoded;
        }
      } catch (e) {
        // 如果解码失败，保持原样
        console.log('❌ URL解码失败，保持原样');
        decodedName = fileName;
      }
    }

    // 处理可能的字符编码问题
    // 检查是否包含UTF-8字节序列但被当作Latin-1处理的情况
    if (/[\x80-\xFF]/.test(decodedName)) {
      try {
        console.log('🌍 检测到可能的编码问题，尝试UTF-8解码');
        // 如果原始文件名包含UTF-8字节序列，尝试直接当作UTF-8处理
        const buffer = Buffer.from(fileName, 'binary');
        const utf8Decoded = buffer.toString('utf8');
        console.log('🔄 UTF-8解码结果:', utf8Decoded);
        // 验证UTF-8解码是否成功（不包含替换字符）
        if (!/[\uFFFD]/.test(utf8Decoded) && utf8Decoded !== fileName) {
          decodedName = utf8Decoded;
          console.log('✅ UTF-8解码成功');
        } else {
          console.log('⚠️ UTF-8解码未带来改进');
        }
      } catch (e) {
        console.log('❌ UTF-8解码异常:', e.message);
        // 保持原样
      }
    }

    // 处理multipart/form-data中的编码问题
    // 有些客户端会发送Latin-1编码的UTF-8字节
    if (/[^\x00-\x7F]/.test(decodedName) === false && /[\x80-\xFF]/.test(fileName)) {
      try {
        console.log('🔄 尝试Latin-1到UTF-8转换');
        // 将原始字节当作UTF-8解码
        const buffer = Buffer.from(fileName, 'binary');
        decodedName = buffer.toString('utf8');
        console.log('✅ Latin-1转换结果:', decodedName);
      } catch (e) {
        console.log('❌ Latin-1转换失败');
        // 保持原样
      }
    }

    console.log('🎯 最终解码结果:', decodedName);
    return decodedName;
  } catch (error) {
    console.warn('文件名解码失败:', error.message, '原始文件名:', fileName);
    return fileName; // 返回原始文件名作为fallback
  }
}

// 文件名清理函数
function sanitizeFileName(fileName) {
  if (!fileName) return 'unnamed-file';

  // 确保是字符串类型
  let cleanName = String(fileName);

  // 移除或替换危险字符，保留中文字符
  cleanName = cleanName
    .replace(/[<>:"/\\|?*\x00-\x1f]/g, '_') // 替换危险字符为单个下划线
    .replace(/\s+/g, '_') // 替换空白字符为下划线
    .replace(/_+/g, '_') // 合并连续的下划线
    .replace(/^_+|_+$/g, ''); // 移除开头和结尾的下划线

  // 限制文件名长度，避免过长的文件名
  if (cleanName.length > 100) {
    const extIndex = cleanName.lastIndexOf('.');
    if (extIndex > 0 && extIndex < cleanName.length - 1) {
      const name = cleanName.substring(0, extIndex);
      const ext = cleanName.substring(extIndex);
      // 保留扩展名，截断文件名部分，总长度不超过100
      const maxNameLength = 100 - ext.length;
      cleanName = name.substring(0, maxNameLength) + ext;
    } else {
      cleanName = cleanName.substring(0, 100);
    }
  }

  // 确保文件名不为空
  return cleanName || 'unnamed-file';
}

// 文件上传配置
const uploadStorage = multer.diskStorage({
  destination: (req, file, cb) => {
    cb(null, uploadsDir);
  },
  filename: (req, file, cb) => {
    // 正确解码文件名，确保UTF-8编码
    const decodedFileName = decodeFileName(file.originalname);
    const cleanFileName = sanitizeFileName(decodedFileName);
    const uniqueName = `${Date.now()}-${cleanFileName}`;
    cb(null, uniqueName);
  }
});

const MAX_FILE_SIZE = process.env.MAX_FILE_SIZE && !isNaN(parseInt(process.env.MAX_FILE_SIZE))
  ? parseInt(process.env.MAX_FILE_SIZE)
  : 200 * 1024 * 1024; // 默认200MB

const upload = multer({
  storage: uploadStorage,
  limits: { fileSize: MAX_FILE_SIZE },
  fileFilter: (req, file, cb) => {
    // 可以在这里添加额外的文件类型验证
    cb(null, true);
  }
});

function verifyToken(token) {
  const tokenData = storage.findTokenByToken(token);
  if (!tokenData || !tokenData.active) {
    return null;
  }
  return tokenData;
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

  try {
    // 验证JWT签名与过期时间，防止伪造/过期token继续使用
    jwt.verify(token, JWT_SECRET);
  } catch (err) {
    return res.status(403).json({ error: 'token已过期或无效' });
  }

  req.tokenData = tokenData;
  next();
}

// 管理员验证中间件
function authenticateAdmin(req, res, next) {
  const sessionAdmin = req.session?.isAdmin;
  const password = req.headers['x-admin-password'] || req.body.password;

  if (sessionAdmin) {
    return next();
  }

  if (password && password === ADMIN_PASSWORD) {
    req.session.isAdmin = true;
    return next();
  }

  // 兼容旧版本：提供密码但不希望创建 session，可以继续使用 header
  if (!password) {
    return res.status(401).json({ error: '管理员未登录或密码缺失' });
  }

  return res.status(401).json({ error: '管理员密码错误' });
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
  
  storage.createToken(tokenData);
  
  res.json({ 
    success: true, 
    token,
    tokenData: { ...tokenData, token: undefined } // 不返回完整token，只返回元数据
  });
});

// 管理员：获取所有tokens
app.get('/api/admin/tokens', authenticateAdmin, (req, res) => {
  const tokens = storage.listTokens().map(t => ({
    ...t,
    token: `${t.token.substring(0, 20)}...`
  }));
  res.json(tokens);
});

// 管理员：删除/禁用token
app.delete('/api/admin/tokens/:id', authenticateAdmin, (req, res) => {
  const { id } = req.params;
  const token = storage.disableToken(id);
  if (!token) {
    return res.status(404).json({ error: 'Token不存在' });
  }
  res.json({ success: true, message: 'Token已禁用' });
});

app.put('/api/admin/releases/:id', authenticateAdmin, (req, res) => {
  const { id } = req.params;
  const { version, description } = req.body;

  if (version === undefined && description === undefined) {
    return res.status(400).json({ error: '请至少提供version或description' });
  }

  const updated = storage.updateRelease(id, { version, description });
  if (!updated) {
    return res.status(404).json({ error: '发布记录不存在' });
  }

  res.json({ success: true, release: updated });
});

app.delete('/api/admin/releases/:id', authenticateAdmin, (req, res) => {
  const { id } = req.params;
  const release = storage.findReleaseById(id);
  if (!release) {
    return res.status(404).json({ error: '发布记录不存在' });
  }

  storage.deleteRelease(id);

  if (release.filePath) {
    const filePath = path.join(uploadsDir, release.filePath);
    if (fs.existsSync(filePath)) {
      fs.unlink(filePath, err => {
        if (err) {
          console.warn('删除文件失败:', filePath, err.message);
        }
      });
    }
  }

  res.json({ success: true });
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
  
  const existing = storage.findAppById(appId);
  if (existing) {
    return res.status(400).json({ error: 'appId已存在' });
  }
  
  const app = {
    appId,
    name,
    description: description || '',
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString()
  };
  
  storage.createApp(app);
  res.json({ success: true, app });
});

// 管理员：获取所有应用
app.get('/api/admin/apps', authenticateAdmin, (req, res) => {
  const apps = storage.listApps();
  res.json(apps);
});

// 管理员：更新应用
app.put('/api/admin/apps/:appId', authenticateAdmin, (req, res) => {
  const { appId } = req.params;
  const { name, description } = req.body;
  
  const updated = storage.updateApp(appId, { name, description });
  if (!updated) {
    return res.status(404).json({ error: '应用不存在' });
  }
  
  res.json({ success: true, app: updated });
});

// 管理员：删除应用
app.delete('/api/admin/apps/:appId', authenticateAdmin, (req, res) => {
  const { appId } = req.params;
  
  const deleted = storage.deleteApp(appId);
  if (!deleted) {
    return res.status(404).json({ error: '应用不存在' });
  }

  res.json({ success: true, message: '应用已删除' });
});

// 公开：获取所有应用列表（用于客户端选择）
app.get('/api/apps', (req, res) => {
  const apps = storage.listApps();
  res.json(apps.map(app => ({
    appId: app.appId,
    name: app.name,
    description: app.description
  })));
});

// 管理员：获取发布历史（支持按应用筛选）
app.get('/api/admin/releases', authenticateAdmin, (req, res) => {
  const { appId } = req.query;
  const releases = storage.listReleases({ appId });
  res.json(releases);
});

// 管理员：统计摘要
app.get('/api/admin/stats/summary', authenticateAdmin, (req, res) => {
  const apps = storage.listApps();
  const releases = storage.listReleases();
  const tokens = storage.listTokens();

  const totalDownloads = releases.reduce((sum, release) => sum + (release.downloadCount || 0), 0);
  const releasesByApp = releases.reduce((acc, release) => {
    const key = release.appId || '未分类';
    if (!acc[key]) acc[key] = [];
    acc[key].push(release);
    return acc;
  }, {});

  const appStats = apps.map(app => {
    const appReleases = releasesByApp[app.appId] || [];
    const latestRelease = appReleases[0] || null; // listReleases 已按时间排序
    const totalDownloadsByApp = appReleases.reduce((sum, r) => sum + (r.downloadCount || 0), 0);

    return {
      appId: app.appId,
      appName: app.name,
      totalDownloads: totalDownloadsByApp,
      totalReleases: appReleases.length,
      latestVersion: latestRelease ? latestRelease.version : null,
      lastReleaseAt: latestRelease ? latestRelease.uploadedAt : null
    };
  }).sort((a, b) => b.totalDownloads - a.totalDownloads);

  // 发布趋势（14天，若最近14天无数据则回退到最近有数据的14天窗口）
  const days = [];
  const dailyMap = {};
  const today = new Date();

  let endDate = new Date(today);
  if (releases.length) {
    const lastReleaseDate = new Date(
      releases.reduce((max, r) => {
        if (!r.uploadedAt) return max;
        const t = new Date(r.uploadedAt).getTime();
        return t > max ? t : max;
      }, 0)
    );
    const fourteenDaysAgo = new Date(today);
    fourteenDaysAgo.setDate(today.getDate() - 13);
    if (lastReleaseDate < fourteenDaysAgo) {
      endDate = lastReleaseDate;
    }
  }

  for (let i = 13; i >= 0; i--) {
    const date = new Date(endDate);
    date.setDate(endDate.getDate() - i);
    const key = date.toISOString().slice(0, 10);
    days.push(key);
    dailyMap[key] = 0;
  }

  releases.forEach(release => {
    if (!release.uploadedAt) return;
    const key = new Date(release.uploadedAt).toISOString().slice(0, 10);
    if (dailyMap[key] !== undefined) {
      dailyMap[key] += 1;
    }
  });

  const releaseTrend = days.map(date => ({
    date,
    count: dailyMap[date] || 0
  }));

  // 下载前五文件
  const topDownloads = [...releases]
    .sort((a, b) => (b.downloadCount || 0) - (a.downloadCount || 0))
    .slice(0, 5)
    .map(release => ({
      id: release.id,
      appId: release.appId,
      fileName: release.fileName,
      version: release.version,
      downloadCount: release.downloadCount || 0
    }));

  res.json({
    totals: {
      apps: apps.length,
      releases: releases.length,
      downloads: totalDownloads,
      tokens: tokens.length
    },
    apps: appStats,
    releaseTrend,
    topDownloads
  });
});

// 公开：获取发布历史（普通用户可见，不需要管理员密码）
app.get('/api/releases', (req, res) => {
  const { appId } = req.query;
  const releases = storage.listReleases({ appId, status: 'success' });
  const publicReleases = releases.map(r => ({
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
  
  res.json(publicReleases);
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
  const app = storage.findAppById(appId);
  if (!app) {
    return res.status(404).json({ error: '应用不存在，请先创建应用' });
  }

  const newReleases = req.files.map(file => ({
    id: uuidv4(),
    appId: appId,
    appName: app.name,
    version: version || '未指定版本',
    description: description || '',
    fileName: decodeFileName(file.originalname), // 使用解码后的文件名
    filePath: file.filename,
    fileSize: file.size,
    tokenName: '手动发布',
    tokenId: null,
    uploadedAt: new Date().toISOString(),
    status: 'success',
    downloadCount: 0
  }));
  
  storage.createReleases(newReleases);
  const uploadedReleases = newReleases.map(release => ({
    ...release,
    downloadUrl: `/api/download/${release.id}`
  }));

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
  const app = storage.findAppById(appId);
  if (!app) {
    return res.status(404).json({ error: '应用不存在，请先创建应用' });
  }

  storage.touchTokenUsage(tokenData.id);

  const newReleases = req.files.map(file => ({
    id: uuidv4(),
    appId: appId,
    appName: app.name,
    version: version || '未指定版本',
    description: description || '',
    fileName: decodeFileName(file.originalname), // 使用解码后的文件名
    filePath: file.filename,
    fileSize: file.size,
    tokenName: tokenData.name,
    tokenId: tokenData.id,
    uploadedAt: new Date().toISOString(),
    status: 'success',
    downloadCount: 0
  }));
  
  storage.createReleases(newReleases);
  const uploadedReleases = newReleases.map(release => ({
    ...release,
    downloadUrl: `/api/download/${release.id}`
  }));

  res.json({
    success: true,
    message: `成功发布 ${uploadedReleases.length} 个文件`,
    releases: uploadedReleases
  });
});

// 下载文件
app.get('/api/download/:id', (req, res) => {
  const { id } = req.params;
  const release = storage.findReleaseById(id);
  
  if (!release) {
    return res.status(404).json({ error: '文件不存在' });
  }
  const filePath = path.join(uploadsDir, release.filePath);
  if (!fs.existsSync(filePath)) {
    return res.status(404).json({ error: '文件已丢失' });
  }
  
  storage.incrementReleaseDownload(id);
  res.download(filePath, release.fileName);
});

// 获取指定应用的最新发布
app.get('/api/latest/:appId', (req, res) => {
  const { appId } = req.params;
  const latest = storage.findLatestRelease(appId);
  
  if (!latest) {
    return res.status(404).json({ error: `应用 ${appId} 暂无发布` });
  }

  res.json({
    ...latest,
    downloadUrl: `/api/download/${latest.id}`
  });
});

// 获取指定应用的所有版本（按时间倒序）
app.get('/api/versions/:appId', (req, res) => {
  const { appId } = req.params;
  const appReleases = storage
    .listReleases({ appId, status: 'success' })
    .map(r => ({
      ...r,
      downloadUrl: `/api/download/${r.id}`
    }));
  
  res.json(appReleases);
});

// 兼容旧接口：获取最新发布（如果没有appId，返回所有应用的最新发布）
app.get('/api/latest', (req, res) => {
  const activeReleases = storage.listReleases({ status: 'success' });
  
  if (activeReleases.length === 0) {
    return res.status(404).json({ error: '暂无发布' });
  }
  
  // 按应用分组，获取每个应用的最新版本
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

// Multer错误处理中间件
app.use((err, req, res, next) => {
  if (err instanceof multer.MulterError) {
    if (err.code === 'LIMIT_FILE_SIZE') {
      return res.status(400).json({
        error: '文件大小超过限制 (最大 200MB)'
      });
    }
    return res.status(400).json({
      error: `文件上传错误: ${err.message}`
    });
  }
  next(err);
});

// 通用错误处理中间件
app.use((err, req, res, next) => {
  console.error('服务器错误:', err);
  res.status(500).json({
    error: '服务器内部错误'
  });
});

// 导出 app 供测试使用
module.exports = app;

// 启动服务器（仅在直接运行时）
if (require.main === module) {
  app.listen(PORT, () => {
    console.log(`🚀 应用发布服务器运行在 http://localhost:${PORT}`);
    console.log(`📝 管理界面: http://localhost:${PORT}`);
    console.log('⚠️  请在生产环境中使用强随机的 ADMIN_PASSWORD 和 JWT_SECRET（不要使用示例或默认值）');
    console.log(`📋 已注册路由: POST /api/admin/publish`);
  });
}

