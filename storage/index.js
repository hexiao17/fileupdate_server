const config = require('../config/database');
const JsonAdapter = require('./adapters/json');
const SqliteAdapter = require('./adapters/sqlite');

function createAdapter() {
  const driver = (config.driver || 'json').toLowerCase();
  if (driver === 'sqlite') {
    return new SqliteAdapter(config.sqlite);
  }
  return new JsonAdapter(config.json);
}

const adapter = createAdapter();

module.exports = {
  // Tokens
  listTokens: () => adapter.listTokens(),
  createToken: data => adapter.createToken(data),
  disableToken: id => adapter.disableToken(id),
  findTokenByToken: token => adapter.findTokenByToken(token),
  touchTokenUsage: id => adapter.touchTokenUsage(id),

  // Apps
  listApps: () => adapter.listApps(),
  findAppById: appId => adapter.findAppById(appId),
  createApp: data => adapter.createApp(data),
  updateApp: (appId, data) => adapter.updateApp(appId, data),
  deleteApp: appId => adapter.deleteApp(appId),

  // Releases
  listReleases: filters => adapter.listReleases(filters),
  createReleases: entries => adapter.createReleases(entries),
  findReleaseById: id => adapter.findReleaseById(id),
  incrementReleaseDownload: id => adapter.incrementReleaseDownload(id),
  findLatestRelease: appId => adapter.findLatestRelease(appId),
  updateRelease: (id, data) => adapter.updateRelease(id, data),
  deleteRelease: id => adapter.deleteRelease(id)
};

