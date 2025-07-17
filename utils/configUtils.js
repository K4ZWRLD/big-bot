// utils/configUtils.js
const fs = require('fs');
const path = require('path');

const configPath = path.join(__dirname, '..', 'config.json');

function loadConfig() {
  if (!fs.existsSync(configPath)) return {};
  try {
    return JSON.parse(fs.readFileSync(configPath, 'utf-8'));
  } catch (err) {
    console.error('Failed to read config.json:', err);
    return {};
  }
}

function saveConfig(config) {
  try {
    fs.writeFileSync(configPath, JSON.stringify(config, null, 2), 'utf-8');
  } catch (err) {
    console.error('Failed to save config.json:', err);
  }
}

module.exports = {
  loadConfig,
  saveConfig
};
