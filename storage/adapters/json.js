const fs = require('fs');
const path = require('path');

class JsonAdapter {
  constructor(config = {}) {
    this.baseDir = path.resolve(config.baseDir || path.join(__dirname, '..', '..'));
    this.appsFile = path.join(this.baseDir, 'apps.json');
    this.tokensFile = path.join(this.baseDir, 'tokens.json');
    this.releasesFile = path.join(this.baseDir, 'releases.json');

    this.ensureFile(this.appsFile, []);
    this.ensureFile(this.tokensFile, []);
    this.ensureFile(this.releasesFile, []);
  }

  ensureFile(filePath, defaultValue) {
    if (!fs.existsSync(filePath)) {
      fs.writeFileSync(filePath, JSON.stringify(defaultValue, null, 2));
    }
  }

  readJson(filePath) {
    try {
      return JSON.parse(fs.readFileSync(filePath, 'utf8'));
    } catch (err) {
      return [];
    }
  }

  writeJson(filePath, data) {
    fs.writeFileSync(filePath, JSON.stringify(data, null, 2));
  }

  // Tokens
  listTokens() {
    return this.readJson(this.tokensFile);
  }

  createToken(tokenData) {
    const tokens = this.listTokens();
    tokens.push(tokenData);
    this.writeJson(this.tokensFile, tokens);
    return tokenData;
  }

  disableToken(id) {
    const tokens = this.listTokens();
    const index = tokens.findIndex(t => t.id === id);
    if (index === -1) return null;
    tokens[index].active = false;
    this.writeJson(this.tokensFile, tokens);
    return tokens[index];
  }

  findTokenByToken(token) {
    const tokens = this.listTokens();
    return tokens.find(t => t.token === token);
  }

  touchTokenUsage(id) {
    const tokens = this.listTokens();
    const index = tokens.findIndex(t => t.id === id);
    if (index === -1) return null;
    tokens[index].lastUsed = new Date().toISOString();
    tokens[index].usageCount = (tokens[index].usageCount || 0) + 1;
    this.writeJson(this.tokensFile, tokens);
    return tokens[index];
  }

  // Apps
  listApps() {
    return this.readJson(this.appsFile);
  }

  findAppById(appId) {
    return this.listApps().find(app => app.appId === appId) || null;
  }

  createApp(app) {
    const apps = this.listApps();
    apps.push(app);
    this.writeJson(this.appsFile, apps);
    return app;
  }

  updateApp(appId, data) {
    const apps = this.listApps();
    const index = apps.findIndex(app => app.appId === appId);
    if (index === -1) return null;
    apps[index] = { ...apps[index], ...data, updatedAt: new Date().toISOString() };
    this.writeJson(this.appsFile, apps);
    return apps[index];
  }

  deleteApp(appId) {
    const apps = this.listApps();
    const index = apps.findIndex(app => app.appId === appId);
    if (index === -1) return false;
    apps.splice(index, 1);
    this.writeJson(this.appsFile, apps);
    return true;
  }

  // Releases
  listReleases(filters = {}) {
    const { appId, status } = filters;
    const releases = this.readJson(this.releasesFile);
    return releases
      .filter(release => {
        if (appId && release.appId !== appId) return false;
        if (status && (release.status || 'success') !== status) return false;
        return true;
      })
      .sort((a, b) => new Date(b.uploadedAt) - new Date(a.uploadedAt));
  }

  createReleases(entries) {
    const releases = this.readJson(this.releasesFile);
    entries.forEach(entry => releases.push(entry));
    this.writeJson(this.releasesFile, releases);
    return entries;
  }

  findReleaseById(id) {
    return this.listReleases().find(release => release.id === id) || null;
  }

  updateRelease(id, data) {
    const releases = this.readJson(this.releasesFile);
    const index = releases.findIndex(r => r.id === id);
    if (index === -1) return null;
    const target = releases[index];
    if (data.version !== undefined) {
      target.version = data.version;
    }
    if (data.description !== undefined) {
      target.description = data.description;
    }
    target.updatedAt = new Date().toISOString();
    releases[index] = target;
    this.writeJson(this.releasesFile, releases);
    return target;
  }

  deleteRelease(id) {
    const releases = this.readJson(this.releasesFile);
    const index = releases.findIndex(r => r.id === id);
    if (index === -1) return null;
    const [removed] = releases.splice(index, 1);
    this.writeJson(this.releasesFile, releases);
    return removed;
  }

  incrementReleaseDownload(id) {
    const releases = this.readJson(this.releasesFile);
    const index = releases.findIndex(r => r.id === id);
    if (index === -1) return null;
    releases[index].downloadCount = (releases[index].downloadCount || 0) + 1;
    this.writeJson(this.releasesFile, releases);
    return releases[index];
  }

  findLatestRelease(appId) {
    const releases = this.listReleases({ appId, status: 'success' });
    return releases.length ? releases[0] : null;
  }
}

module.exports = JsonAdapter;

