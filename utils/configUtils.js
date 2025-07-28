const fs = require('fs');
const fsp = require('fs').promises;
const path = require('path');

const configPath = path.join(__dirname, '..', 'config.json');

// 🔒 Sync methods
function loadConfig() {
  if (!fs.existsSync(configPath)) fs.writeFileSync(configPath, '{}');

  try {
    return JSON.parse(fs.readFileSync(configPath, 'utf-8'));
  } catch (err) {
    console.error(`❌ Failed to read config.json:`, err);
    return {};
  }
}

function saveConfig(config) {
  try {
    fs.writeFileSync(configPath, JSON.stringify(config, null, 2), 'utf-8');
  } catch (err) {
    console.error(`❌ Failed to save config.json:`, err);
  }
}

// ⚡️ Async variants
async function loadConfigAsync() {
  try {
    await fsp.access(configPath).catch(() => fsp.writeFile(configPath, '{}'));
    const data = await fsp.readFile(configPath, 'utf-8');
    return JSON.parse(data);
  } catch (err) {
    console.error(`❌ Failed to async read config.json:`, err);
    return {};
  }
}

async function saveConfigAsync(config) {
  try {
    await fsp.writeFile(configPath, JSON.stringify(config, null, 2), 'utf-8');
  } catch (err) {
    console.error(`❌ Failed to async save config.json:`, err);
  }
}

module.exports = {
  loadConfig,
  saveConfig,
  loadConfigAsync,
  saveConfigAsync,
};
