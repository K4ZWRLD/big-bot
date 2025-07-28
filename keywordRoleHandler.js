const fs = require('fs');
const path = require('path');
const { ChannelType } = require('discord.js');

const configFile = path.join(__dirname, 'keywordRoleConfig.json');

// Load saved config safely
function loadConfig() {
  if (!fs.existsSync(configFile)) return {};
  return JSON.parse(fs.readFileSync(configFile));
}

function saveConfig(config) {
  fs.writeFileSync(configFile, JSON.stringify(config, null, 2));
}

let keywordRoleConfig = loadConfig();

// Core presence handler
async function handlePresenceUpdate(client, oldPresence, newPresence) {
  if (!newPresence?.guild) return;

  const guildId = newPresence.guild.id;
  const config = keywordRoleConfig[guildId];
  if (!config) return;

  let member = newPresence.member;
  if (!member) {
    try {
      member = await newPresence.guild.members.fetch(newPresence.userId);
    } catch {
      return;
    }
  }

  const roleId = config.roleId;
  const role = newPresence.guild.roles.cache.get(roleId);
  if (!role) return console.warn(`⚠️ Role ${roleId} not found in guild ${guildId}`);

  const keywords = (config.keywords || []).map(k => k.toLowerCase());
  const channelId = config.channelId;
  const messageTemplate = config.message || "{user} now has the role {role} because their status contains a keyword!";

  const customStatus = newPresence.activities.find(act => act.type === 4);
  const statusText = customStatus?.state?.toLowerCase() || '';
console.log(`🕵️ Status for ${member.user.tag}:`, statusText);
  
  const hasKeyword = keywords.some(keyword => statusText.includes(keyword));
  const hasRole = member.roles.cache.has(roleId);

  if (hasKeyword && !hasRole) {
    try {
      await member.roles.add(roleId);
      console.log(`✅ Added role to ${member.user.tag} in guild ${guildId}`);

      if (channelId && messageTemplate) {
        const channel = await newPresence.guild.channels.fetch(channelId);
        if (channel?.type === ChannelType.GuildText || channel?.type === ChannelType.GuildAnnouncement) {
          const msg = messageTemplate
            .replace(/{user}/g, `<@${member.id}>`)
            .replace(/{role}/g, `<@&${roleId}>`);
          await channel.send(msg);
        }
      }
    } catch (err) {
      console.error(`❌ Failed to add role in guild ${guildId}:`, err);
    }
  } else if (!hasKeyword && hasRole) {
    try {
      await member.roles.remove(roleId);
      console.log(`🔄 Removed role from ${member.user.tag} in guild ${guildId}`);

      if (channelId && messageTemplate) {
        const channel = await newPresence.guild.channels.fetch(channelId);
        if (channel?.type === ChannelType.GuildText || channel?.type === ChannelType.GuildAnnouncement) {
          const msg = messageTemplate
            .replace(/{user}/g, `<@${member.id}>`)
            .replace(/{role}/g, `<@&${roleId}>`)
            .replace(/{removed}/g, 'lost'); // optional usage
          await channel.send(msg);
        }
      }
    } catch (err) {
      console.error(`❌ Failed to remove role in guild ${guildId}:`, err);
    }
  }
}

// Config utilities
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
