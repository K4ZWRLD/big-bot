const fs = require('fs');
const fsp = require('fs').promises;

// 🔒 Sync versions with error resilience
function loadJson(filePath) {
  if (!fs.existsSync(filePath)) fs.writeFileSync(filePath, '{}');

  try {
    return JSON.parse(fs.readFileSync(filePath, 'utf-8'));
  } catch (err) {
    console.error(`❌ Failed to parse JSON from ${filePath}:`, err);
    return {}; // fallback to prevent crashes
  }
}

function saveJson(filePath, data) {
  try {
    fs.writeFileSync(filePath, JSON.stringify(data, null, 2), 'utf-8');
  } catch (err) {
    console.error(`❌ Failed to save JSON to ${filePath}:`, err);
  }
}

// ⚡️ Async versions for scalable I/O
async function loadJsonAsync(filePath) {
  try {
    await fsp.access(filePath).catch(() => fsp.writeFile(filePath, '{}'));
    const data = await fsp.readFile(filePath, 'utf-8');
    return JSON.parse(data);
  } catch (err) {
    console.error(`❌ Async load failed for ${filePath}:`, err);
    return {};
  }
}

async function saveJsonAsync(filePath, data) {
  try {
    await fsp.writeFile(filePath, JSON.stringify(data, null, 2), 'utf-8');
  } catch (err) {
    console.error(`❌ Async save failed for ${filePath}:`, err);
  }
}

module.exports = {
  loadJson,
  saveJson,
  loadJsonAsync,
  saveJsonAsync,
};
