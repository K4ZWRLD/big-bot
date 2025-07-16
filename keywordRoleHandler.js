const fs = require('fs');
const path = require('path');

const configFile = path.join(__dirname, 'keywordRoleConfig.json');

function loadConfig() {
  if (!fs.existsSync(configFile)) return {};
  return JSON.parse(fs.readFileSync(configFile));
}
function saveConfig(config) {
  fs.writeFileSync(configFile, JSON.stringify(config, null, 2));
}

let keywordRoleConfig = loadConfig();

/**
 * Call this function in your main bot file inside
 * client.on('presenceUpdate', (oldPresence, newPresence) => { ... })
 */
async function handlePresenceUpdate(client, oldPresence, newPresence) {
  if (!newPresence || !newPresence.guild) return;

  const guildId = newPresence.guild.id;
  const config = keywordRoleConfig[guildId];
  if (!config) return; // No config for this guild

  let member = newPresence.member;
  if (!member) {
    try {
      member = await newPresence.guild.members.fetch(newPresence.userId);
    } catch {
      return; // Could not fetch member
    }
  }

  const roleId = config.roleId;
  const keywords = (config.keywords || []).map(k => k.toLowerCase());

  // Find custom status activity
  const customStatus = newPresence.activities.find(act => act.type === 4);

  const statusText = customStatus?.state?.toLowerCase() || '';

  const hasKeyword = keywords.some(keyword => statusText.includes(keyword));
  const hasRole = member.roles.cache.has(roleId);

  if (hasKeyword && !hasRole) {
    try {
      await member.roles.add(roleId);
      console.log(`Added role to ${member.user.tag} in guild ${guildId}`);
    } catch (err) {
      console.error(`Failed to add role in guild ${guildId}:`, err);
    }
  } else if (!hasKeyword && hasRole) {
    try {
      await member.roles.remove(roleId);
      console.log(`Removed role from ${member.user.tag} in guild ${guildId}`);
    } catch (err) {
      console.error(`Failed to remove role in guild ${guildId}:`, err);
    }
  }
}

function getConfig() {
  return keywordRoleConfig;
}

function updateConfig(newConfig) {
  keywordRoleConfig = newConfig;
  saveConfig(keywordRoleConfig);
}

module.exports = {
  handlePresenceUpdate,
  getConfig,
  updateConfig,
};
