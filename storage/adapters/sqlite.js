const fs = require('fs');
const path = require('path');
const Database = require('better-sqlite3');

class SqliteAdapter {
  constructor(config = {}) {
    const rootDir = path.join(__dirname, '..', '..');
    const filename = path.resolve(rootDir, config.filename || path.join('data', 'fileupdate.sqlite'));
    const dir = path.dirname(filename);

    if (!fs.existsSync(dir)) {
      fs.mkdirSync(dir, { recursive: true });
    }

    this.db = new Database(filename);
    this.applyPragmas(config.pragma || {});
    this.bootstrap();
  }

  applyPragmas(pragma) {
    Object.entries(pragma).forEach(([key, value]) => {
      try {
        this.db.pragma(`${key}=${value}`);
      } catch (err) {
        // ignore invalid pragma
      }
    });
  }

  bootstrap() {
    const appTable = `
      CREATE TABLE IF NOT EXISTS apps (
        appId TEXT PRIMARY KEY,
        name TEXT NOT NULL,
        description TEXT,
        createdAt TEXT NOT NULL,
        updatedAt TEXT NOT NULL
      );`;

    const tokenTable = `
      CREATE TABLE IF NOT EXISTS tokens (
        id TEXT PRIMARY KEY,
        token TEXT NOT NULL,
        name TEXT NOT NULL,
        description TEXT,
        createdAt TEXT NOT NULL,
        lastUsed TEXT,
        active INTEGER DEFAULT 1,
        usageCount INTEGER DEFAULT 0
      );`;

    const releaseTable = `
      CREATE TABLE IF NOT EXISTS releases (
        id TEXT PRIMARY KEY,
        appId TEXT,
        appName TEXT,
        version TEXT,
        description TEXT,
        fileName TEXT NOT NULL,
        filePath TEXT NOT NULL,
        fileSize INTEGER,
        tokenName TEXT,
        tokenId TEXT,
        uploadedAt TEXT NOT NULL,
        status TEXT DEFAULT 'success',
        downloadCount INTEGER DEFAULT 0
      );`;

    this.db.exec(`${appTable}${tokenTable}${releaseTable}`);
  }

  normalizeToken(row) {
    if (!row) return null;
    return { ...row, active: row.active === 1 };
  }

  // Tokens
  listTokens() {
    return this.db
      .prepare('SELECT * FROM tokens ORDER BY datetime(createdAt) DESC')
      .all()
      .map(row => this.normalizeToken(row));
  }

  createToken(tokenData) {
    const payload = {
      ...tokenData,
      active: tokenData.active ? 1 : 0
    };
    const stmt = this.db.prepare(`
      INSERT INTO tokens (id, token, name, description, createdAt, lastUsed, active, usageCount)
      VALUES (@id, @token, @name, @description, @createdAt, @lastUsed, @active, @usageCount)
    `);
    stmt.run(payload);
    return tokenData;
  }

  disableToken(id) {
    this.db.prepare('UPDATE tokens SET active = 0 WHERE id = ?').run(id);
    return this.normalizeToken(
      this.db.prepare('SELECT * FROM tokens WHERE id = ?').get(id) || null
    );
  }

  findTokenByToken(token) {
    return this.normalizeToken(
      this.db.prepare('SELECT * FROM tokens WHERE token = ?').get(token) || null
    );
  }

  touchTokenUsage(id) {
    const now = new Date().toISOString();
    this.db.prepare('UPDATE tokens SET lastUsed = ?, usageCount = usageCount + 1 WHERE id = ?').run(now, id);
    return this.normalizeToken(
      this.db.prepare('SELECT * FROM tokens WHERE id = ?').get(id) || null
    );
  }

  // Apps
  listApps() {
    return this.db.prepare('SELECT * FROM apps ORDER BY datetime(createdAt) DESC').all();
  }

  findAppById(appId) {
    return this.db.prepare('SELECT * FROM apps WHERE appId = ?').get(appId) || null;
  }

  createApp(app) {
    this.db.prepare(`
      INSERT INTO apps (appId, name, description, createdAt, updatedAt)
      VALUES (@appId, @name, @description, @createdAt, @updatedAt)
    `).run(app);
    return app;
  }

  updateApp(appId, data) {
    const payload = { ...data, updatedAt: new Date().toISOString(), appId };
    this.db.prepare(`
      UPDATE apps SET
        name = COALESCE(@name, name),
        description = COALESCE(@description, description),
        updatedAt = @updatedAt
      WHERE appId = @appId
    `).run(payload);
    return this.findAppById(appId);
  }

  deleteApp(appId) {
    const result = this.db.prepare('DELETE FROM apps WHERE appId = ?').run(appId);
    return result.changes > 0;
  }

  // Releases
  listReleases(filters = {}) {
    const conditions = [];
    const params = {};

    if (filters.appId) {
      conditions.push('appId = @appId');
      params.appId = filters.appId;
    }

    if (filters.status) {
      conditions.push('(status = @status OR status IS NULL)');
      params.status = filters.status;
    }

    const whereClause = conditions.length ? `WHERE ${conditions.join(' AND ')}` : '';
    const sql = `SELECT * FROM releases ${whereClause} ORDER BY datetime(uploadedAt) DESC`;
    return this.db.prepare(sql).all(params);
  }

  createReleases(entries) {
    const insert = this.db.prepare(`
      INSERT INTO releases (
        id, appId, appName, version, description,
        fileName, filePath, fileSize, tokenName, tokenId,
        uploadedAt, status, downloadCount
      ) VALUES (
        @id, @appId, @appName, @version, @description,
        @fileName, @filePath, @fileSize, @tokenName, @tokenId,
        @uploadedAt, @status, @downloadCount
      )
    `);

    const insertMany = this.db.transaction(releases => {
      releases.forEach(release => insert.run(release));
    });

    insertMany(entries);
    return entries;
  }

  findReleaseById(id) {
    return this.db.prepare('SELECT * FROM releases WHERE id = ?').get(id) || null;
  }

  incrementReleaseDownload(id) {
    this.db.prepare('UPDATE releases SET downloadCount = downloadCount + 1 WHERE id = ?').run(id);
    return this.findReleaseById(id);
  }

  findLatestRelease(appId) {
    return this.db.prepare(`
      SELECT * FROM releases
      WHERE appId = ? AND (status = 'success' OR status IS NULL)
      ORDER BY datetime(uploadedAt) DESC
      LIMIT 1
    `).get(appId) || null;
  }

  updateRelease(id, data) {
    const fields = [];
    const params = { id };
    if (data.version !== undefined) {
      fields.push('version = @version');
      params.version = data.version;
    }
    if (data.description !== undefined) {
      fields.push('description = @description');
      params.description = data.description;
    }
    if (!fields.length) return null;

    fields.push('updatedAt = @updatedAt');
    params.updatedAt = new Date().toISOString();

    const sql = `UPDATE releases SET ${fields.join(', ')} WHERE id = @id`;
    const result = this.db.prepare(sql).run(params);
    if (!result.changes) {
      return null;
    }

    return this.findReleaseById(id);
  }

  deleteRelease(id) {
    const release = this.findReleaseById(id);
    if (!release) return null;
    this.db.prepare('DELETE FROM releases WHERE id = ?').run(id);
    return release;
  }
}

module.exports = SqliteAdapter;

