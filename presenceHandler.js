// presenceHandler.js
const { loadConfig } = require('./utils/configUtils'); // Adjust path if needed
const { ChannelType } = require('discord.js');

async function handlePresenceUpdate(oldPresence, newPresence, client) {
  if (!newPresence?.userId || !newPresence.activities || !newPresence.guild) return;

  const config = loadConfig();
  const guildConfig = config.guilds?.[newPresence.guild.id];
  if (!guildConfig || !guildConfig.keywordRoles) return;

  const keywordRoles = guildConfig.keywordRoles; // { keyword: roleId }
  let member;

  try {
    member = await newPresence.guild.members.fetch(newPresence.userId);
  } catch (err) {
    console.error(`❌ Failed to fetch member ${newPresence.userId}:`, err);
    return;
  }

  const activityString = newPresence.activities
    .map(a => `${a.state || ''} ${a.name || ''} ${a.details || ''}`.toLowerCase())
    .join(' ');

  for (const [keyword, roleId] of Object.entries(keywordRoles)) {
    const hasKeyword = activityString.includes(keyword.toLowerCase());
    const hasRole = member.roles.cache.has(roleId);
    const role = newPresence.guild.roles.cache.get(roleId);

    if (!role) {
      console.warn(`⚠️ Role ${roleId} for keyword "${keyword}" not found in guild ${newPresence.guild.id}`);
      continue;
    }

    try {
      if (hasKeyword && !hasRole) {
        await member.roles.add(roleId);
        console.log(`✅ Added role "${role.name}" to ${member.user.tag}`);
      } else if (!hasKeyword && hasRole) {
        await member.roles.remove(roleId);
        console.log(`🔄 Removed role "${role.name}" from ${member.user.tag}`);
      }
    } catch (err) {
      console.error(`❌ Error updating role "${role.name}" for ${member.user.tag}:`, err);
    }
  }
}

module.exports = { handlePresenceUpdate };
