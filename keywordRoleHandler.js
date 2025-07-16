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
  const channelId = config.channelId;
  const messageTemplate = config.message || "{user} now has the role {role} because their status contains a keyword!";

  // Find custom status activity
  const customStatus = newPresence.activities.find(act => act.type === 4);

  const statusText = customStatus?.state?.toLowerCase() || '';

  const hasKeyword = keywords.some(keyword => statusText.includes(keyword));
  const hasRole = member.roles.cache.has(roleId);

  if (hasKeyword && !hasRole) {
    try {
      await member.roles.add(roleId);
      console.log(`Added role to ${member.user.tag} in guild ${guildId}`);

      // Send message if channel and message set
      if (channelId && messageTemplate) {
        try {
          const channel = await newPresence.guild.channels.fetch(channelId);
          if (channel?.isTextBased()) {
            const msg = messageTemplate
              .replace(/{user}/g, `<@${member.id}>`)
              .replace(/{role}/g, `<@&${roleId}>`);
            await channel.send(msg);
          }
        } catch (err) {
          console.error(`Failed to send message in guild ${guildId}:`, err);
        }
      }
    } catch (err) {
      console.error(`Failed to add role in guild ${guildId}:`, err);
    }
  } else if (!hasKeyword && hasRole) {
    try {
      await member.roles.remove(roleId);
      console.log(`Removed role from ${member.user.tag} in guild ${guildId}`);

      // Optionally send a message when role is removed
      if (channelId && messageTemplate) {
        try {
          const channel = await newPresence.guild.channels.fetch(channelId);
          if (channel?.isTextBased()) {
            const msg = messageTemplate
              .replace(/{user}/g, `<@${member.id}>`)
              .replace(/{role}/g, `<@&${roleId}>`)
              .replace(/{removed}/g, 'lost'); // optional variable
            await channel.send(msg);
          }
        } catch (err) {
          console.error(`Failed to send message in guild ${guildId}:`, err);
        }
      }
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
