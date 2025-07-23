// presenceHandler.js
const { loadConfig } = require('./utils/configUtils'); // Adjust path if needed

async function handlePresenceUpdate(oldPresence, newPresence, client) {
  if (!newPresence || !newPresence.userId || !newPresence.activities) return;

  const config = loadConfig(); // Load your config.json or similar
  const guildConfig = config.guilds?.[newPresence.guild?.id];

  if (!guildConfig || !guildConfig.keywordRoles) return;

  const keywordRoles = guildConfig.keywordRoles; // { keyword: roleId }
  const member = await newPresence.guild.members.fetch(newPresence.userId);
  const activityString = newPresence.activities
    .map(a => `${a.state || ''} ${a.name || ''} ${a.details || ''}`.toLowerCase())
    .join(' ');

  for (const [keyword, roleId] of Object.entries(keywordRoles)) {
    const hasKeyword = activityString.includes(keyword.toLowerCase());
    const hasRole = member.roles.cache.has(roleId);

    if (hasKeyword && !hasRole) {
      await member.roles.add(roleId).catch(console.error);
    } else if (!hasKeyword && hasRole) {
      await member.roles.remove(roleId).catch(console.error);
    }
  }
}

module.exports = { handlePresenceUpdate };
