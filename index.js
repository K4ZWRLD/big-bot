const { Client, Collection, GatewayIntentBits, Partials, Events, InteractionType } = require('discord.js');
const fs = require('fs');
const path = require('path');
const cron = require('node-cron');
const express = require('express');

const config = require('./config.json');
const { handleSpotifyOAuth, refreshSpotifyTokens } = require('./spotifyOAuth');
const { fetchAndLogCurrentlyPlaying } = require('./scrobbleLogger');
const { handlePresenceUpdate } = require('./presenceHandler');
const { loadDailyConfig, getGuildDailyConfig, sendDailySpotifyMessage } = require('./utils/dailySpotify');

const client = new Client({
  intents: [
    GatewayIntentBits.Guilds,
    GatewayIntentBits.GuildMessages,
    GatewayIntentBits.GuildPresences,
    GatewayIntentBits.MessageContent,
  ],
  partials: [Partials.Channel],
});

client.commands = new Collection();

// Load shared bot data from project root
const xpPath = path.join(__dirname, 'xp.json');
const eventsPath = path.join(__dirname, 'events.json');

if (!fs.existsSync(xpPath)) fs.writeFileSync(xpPath, '{}');
if (!fs.existsSync(eventsPath)) fs.writeFileSync(eventsPath, '{}');

const xpData = require(xpPath);
const customEvents = require(eventsPath);

const saveXpData = () => fs.writeFileSync(xpPath, JSON.stringify(xpData, null, 2));
const saveEvents = () => fs.writeFileSync(eventsPath, JSON.stringify(customEvents, null, 2));

// 🔧 Shared context for commands
const commandContext = {
  xpData,
  customEvents,
  saveXpData,
  saveEvents,
  client,
  commands: client.commands,
};

// Load all valid commands
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

// 🟢 Bot Ready Handler
client.once(Events.ClientReady, async () => {
  console.log(`🤖 Logged in as ${client.user.tag}`);
  client.user.setPresence({
    activities: [{ name: 'Spotify vibes', type: 2 }],
    status: 'dnd',
  });

  // Register slash commands globally
  await client.application.commands.set(commands.map(c => c.data));

  // Start daily playlist messages
  loadDailyConfig();
  for (const [guildId, guildConfig] of Object.entries(getGuildDailyConfig())) {
    if (!guildConfig.channel || !guildConfig.playlist || !guildConfig.time) continue;
    cron.schedule(guildConfig.time, async () => {
      const channel = await client.channels.fetch(guildConfig.channel).catch(() => null);
      if (channel) await sendDailySpotifyMessage(client, guildId, channel);
    }, { timezone: 'America/Chicago' });
  }

  // Refresh Spotify tokens periodically
  cron.schedule('*/50 * * * *', refreshSpotifyTokens);
});

// ⚙️ Interaction Handler
client.on(Events.InteractionCreate, async interaction => {
  if (interaction.type !== InteractionType.ApplicationCommand) return;

  const command = client.commands.get(interaction.commandName);
  if (!command) return;

  try {
    await command.execute(interaction, commandContext);
  } catch (err) {
    console.error('Error executing command:', err);
    await interaction.reply({
      content: '❌ There was an error executing that command.',
      flags: 64,
    }).catch(() => {});
  }
});

// 🎧 Presence Handler
client.on(Events.PresenceUpdate, (oldPresence, newPresence) => {
  handlePresenceUpdate(oldPresence, newPresence);
  fetchAndLogCurrentlyPlaying(newPresence.userId);
});

// 🌐 Spotify OAuth Server
const app = express();
handleSpotifyOAuth(app);

const PORT = process.env.PORT || 3000;
app.listen(PORT, '0.0.0.0', () => console.log(`🌐 OAuth server running on port ${PORT}`));

// 🔐 Log in
client.login(config.token);
