const fs = require('fs');
const path = require('path');

const ROOT_DIR = path.join(__dirname, '..');
const CONFIG_PATH = path.join(__dirname, 'database.json');
const EXAMPLE_PATH = path.join(__dirname, 'database.example.json');

const defaultConfig = {
  driver: 'json',
  sqlite: {
    filename: path.join(ROOT_DIR, 'data', 'fileupdate.sqlite'),
    pragma: {
      journal_mode: 'wal',
      synchronous: 'normal'
    }
  },
  json: {
    baseDir: ROOT_DIR
  }
};

function deepMerge(target, source) {
  if (!source) return target;
  const output = { ...target };
  Object.keys(source).forEach(key => {
    if (source[key] && typeof source[key] === 'object' && !Array.isArray(source[key])) {
      output[key] = deepMerge(target[key] || {}, source[key]);
    } else {
      output[key] = source[key];
    }
  });
  return output;
}

function loadConfig() {
  let config = { ...defaultConfig };

  if (fs.existsSync(CONFIG_PATH)) {
    const userConfig = JSON.parse(fs.readFileSync(CONFIG_PATH, 'utf8'));
    config = deepMerge(config, userConfig);
  }

  return config;
}

module.exports = loadConfig();

