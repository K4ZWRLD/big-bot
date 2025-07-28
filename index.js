const { Client, Collection, GatewayIntentBits, Partials, Events, InteractionType } = require('discord.js');
const fs = require('fs');
const path = require('path');
const cron = require('node-cron');
const express = require('express');
const { handleSpotifyOAuth, refreshSpotifyTokens } = require('./spotifyOAuth');
const { fetchAndLogCurrentlyPlaying } = require('./scrobbleLogger');
const { handlePresenceUpdate } = require('./presenceHandler');
const { loadDailyConfig, getGuildDailyConfig, getNextTrack, sendDailySpotifyMessage } = require('./utils/dailySpotify');
const config = require('./config.json');
const xpData = require('./data/xp.json');
const customEvents = require('./data/events.json');

const saveXpData = () => fs.writeFileSync('./data/xp.json', JSON.stringify(xpData, null, 2));
const saveEvents = () => fs.writeFileSync('./data/events.json', JSON.stringify(customEvents, null, 2));

const commandContext = {
  xpData,
  customEvents,
  saveXpData,
  saveEvents,
  client: client,
  commands: client.commands,
};
const client = new Client({
  intents: [
    GatewayIntentBits.Guilds,
    GatewayIntentBits.GuildMessages,
    GatewayIntentBits.GuildPresences,
    GatewayIntentBits.MessageContent
  ],
  partials: [Partials.Channel]
});

client.commands = new Collection();

// Load commands safely
const commandFiles = fs.readdirSync('./commands').filter(file => file.endsWith('.js'));
const commands = [];
for (const file of commandFiles) {
  const command = require(`./commands/${file}`);
  if (command?.data?.name && typeof command.execute === 'function') {
    client.commands.set(command.data.name, command);
    commands.push(command);
  } else {
    console.warn(`⚠️ Skipped invalid command file: ${file}`);
  }
}

// Register slash commands
client.once(Events.ClientReady, async () => {
  console.log(`🤖 Logged in as ${client.user.tag}`);
  client.user.setPresence({ activities: [{ name: 'Spotify vibes', type: 2 }], status: 'dnd' });

  // Register commands globally
  await client.application.commands.set(commands.map(c => c.data));

  // Schedule the daily Spotify song send per guild
  loadDailyConfig();
  for (const [guildId, guildConfig] of Object.entries(getGuildDailyConfig())) {
    if (!guildConfig.channel || !guildConfig.playlist || !guildConfig.time) continue;
    cron.schedule(guildConfig.time, async () => {
      const channel = await client.channels.fetch(guildConfig.channel).catch(() => null);
      if (channel) await sendDailySpotifyMessage(client, guildId, channel);
    }, { timezone: 'America/Chicago' }); // Default CST
  }

  // Periodically refresh Spotify tokens (every 50 minutes)
  cron.schedule('*/50 * * * *', refreshSpotifyTokens);
});

// Handle interactions
client.on(Events.InteractionCreate, async interaction => {
  if (interaction.type !== InteractionType.ApplicationCommand) return;

  const command = client.commands.get(interaction.commandName);
  if (!command) return;

  try {
    // Some commands (like help) expect full command list
    if (command.data.name === 'help') {
      await command.execute(interaction, client.commands);
    } else {
      await command.execute(interaction);
    }
  } catch (err) {
    console.error('Error executing command:', err);
    await interaction.reply({
      content: '❌ There was an error executing that command.',
      flags: 64
    }).catch(() => {});
  }
});

// Spotify scrobbling and boredom/XP handling
client.on(Events.PresenceUpdate, (oldPresence, newPresence) => {
  handlePresenceUpdate(oldPresence, newPresence);
  fetchAndLogCurrentlyPlaying(newPresence.userId);
});

// Spotify OAuth Express server
const app = express();
handleSpotifyOAuth(app);

const PORT = process.env.PORT || 3000;
app.listen(PORT, '0.0.0.0', () => console.log(`🌐 OAuth server running on port ${PORT}`));

client.login(config.token);
