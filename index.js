// --- Express OAuth Server for Spotify ---
const express = require('express');
const axios = require('axios');
const querystring = require('querystring');
const fs = require('fs');

const app = express();
const PORT = process.env.PORT || 3000;
const TOKENS_PATH = './spotify_tokens.json';

function loadSpotifyTokens() {
  if (!fs.existsSync(TOKENS_PATH)) return {};
  return JSON.parse(fs.readFileSync(TOKENS_PATH));
}
function saveSpotifyTokens(data) {
  fs.writeFileSync(TOKENS_PATH, JSON.stringify(data, null, 2));
}

app.get('/login', (req, res) => {
  const discordUserId = req.query.user;
  if (!discordUserId) return res.status(400).send('Missing Discord user ID');

  const scope = 'user-read-currently-playing user-read-playback-state';
  const authUrl = `https://accounts.spotify.com/authorize?${querystring.stringify({
    response_type: 'code',
    client_id: process.env.SPOTIFY_CLIENT_ID,
    scope,
    redirect_uri: process.env.SPOTIFY_REDIRECT_URI,
    state: discordUserId,
  })}`;
  res.redirect(authUrl);
});

app.get('/callback', async (req, res) => {
  const { code, state: discordUserId } = req.query;
  if (!code || !discordUserId) return res.status(400).send('Missing code or state');

  try {
    const resp = await axios.post(
      'https://accounts.spotify.com/api/token',
      querystring.stringify({
        grant_type: 'authorization_code',
        code,
        redirect_uri: process.env.SPOTIFY_REDIRECT_URI,
      }),
      {
        headers: {
          Authorization:
            'Basic ' +
            Buffer.from(
              `${process.env.SPOTIFY_CLIENT_ID}:${process.env.SPOTIFY_CLIENT_SECRET}`
            ).toString('base64'),
          'Content-Type': 'application/x-www-form-urlencoded',
        },
      }
    );

    const { access_token, refresh_token, expires_in } = resp.data;
    const tokens = loadSpotifyTokens();
    tokens[discordUserId] = {
      access_token,
      refresh_token,
      expires_at: Date.now() + expires_in * 1000,
    };
    saveSpotifyTokens(tokens);

    res.send('✅ Spotify linked! Return to Discord and use `/nowplaying`.');
  } catch (err) {
    console.error('Spotify token exchange failed:', err.response?.data || err.message);
    res.status(500).send('Failed to exchange token.');
  }
});

// Global Express error handler
app.use((err, req, res, next) => {
  console.error('Express error:', err);
  res.status(500).send('Internal server error');
});

app.listen(PORT, () => console.log(`✅ OAuth server running on port ${PORT}`));


// --- Discord Bot Setup ---
const path = require('path');
const {
  Client,
  GatewayIntentBits,
  Partials,
  Collection,
  REST,
  Routes,
} = require('discord.js');

const client = new Client({
  intents: [
    GatewayIntentBits.Guilds,
    GatewayIntentBits.GuildMessages,
    GatewayIntentBits.MessageContent,
    GatewayIntentBits.GuildMessageReactions,
  ],
  partials: [Partials.Message, Partials.Channel, Partials.Reaction],
});

function loadJson(file) {
  if (!fs.existsSync(file)) fs.writeFileSync(file, '{}');
  return JSON.parse(fs.readFileSync(file));
}
function saveJson(file, data) {
  fs.writeFileSync(file, JSON.stringify(data, null, 2));
}

const config = loadJson('./config.json');
const xpData = loadJson('./xp.json');
const customEvents = loadJson('./events.json');

client.commands = new Collection();
const commandsData = [];

function loadCommands(dir) {
  for (const file of fs.readdirSync(dir)) {
    const full = path.join(dir, file);
    if (fs.lstatSync(full).isDirectory()) loadCommands(full);
    else if (file.endsWith('.js')) {
      const cmd = require(full);
      if (cmd.data && cmd.execute && !client.commands.has(cmd.data.name)) {
        client.commands.set(cmd.data.name, cmd);
        commandsData.push(cmd.data.toJSON());
      }
    }
  }
}
loadCommands(path.join(__dirname, 'commands'));

let pendingReactions = [];
let lastActivity = {};

// Implemented monitorActivity to send boredom events on inactivity
function monitorActivity() {
  setInterval(async () => {
    const now = Date.now();

    for (const guildId in config) {
      const settings = config[guildId];
      if (!settings?.enabled || !settings.channelId) continue;

      const last = lastActivity[guildId]?.time || 0;
      const inactivityLimit = settings.inactivity || 600000; // default 10 min

      if (now - last > inactivityLimit) {
        try {
          const channel = await client.channels.fetch(settings.channelId);
          if (!channel?.isTextBased()) continue;

          const events = [
            // Default boredom events
            () => '💬 Would you rather be able to fly or turn invisible?',
            () => '🧠 Trivia: What’s the only food that never spoils? (Hint: honey)',
            () => '🔤 Type a sentence without the letter E!',
            () => '🌀 The silence is creeping. Say "WAKE UP" to break the curse.',
            () => {
              const emojis = ['🍕', '🍔', '🍟', '🌮', '🥗'];
              const chosen = emojis[Math.floor(Math.random() * emojis.length)];
              return { type: 'reaction_race', emoji: chosen, reward: 15 };
            },
            () => '🎶 New vibe drop: https://youtu.be/dQw4w9WgXcQ',
            // Add custom guild events if any
            ...(customEvents[guildId] || []),
          ];

          const event = events[Math.floor(Math.random() * events.length)];
          const result = event();

          if (typeof result === 'string') {
            await channel.send(result);
          } else if (result.type === 'reaction_race') {
            const msg = await channel.send(`🎁 First to react with ${result.emoji} wins!`);
            await msg.react(result.emoji);
            pendingReactions.push({ messageId: msg.id, emoji: result.emoji, winner: null, reward: result.reward || 10 });
          }

          lastActivity[guildId] = { time: now, users: new Set() };
        } catch (e) {
          console.error('Error sending boredom event:', e);
        }
      }
    }
  }, 120000); // check every 2 minutes
}

client.once('ready', async () => {
  console.log(`Logged in as ${client.user.tag}`);

  // Register slash commands globally
  const rest = new REST({ version: '10' }).setToken(process.env.DISCORD_TOKEN);
  const appId = (await client.application.fetch()).id;

  try {
    await rest.put(Routes.applicationCommands(appId), { body: commandsData });
    console.log('Slash commands registered.');
  } catch (e) {
    console.error('Failed to register commands:', e);
  }

  monitorActivity();
});

// Slash command interaction handler
client.on('interactionCreate', async interaction => {
  if (!interaction.isChatInputCommand()) return;

  const command = client.commands.get(interaction.commandName);
  if (!command) return;

  try {
    await command.execute(interaction, {
      config,
      xpData,
      customEvents,
      saveConfig: () => saveJson('./config.json', config),
      saveXP: () => saveJson('./xp.json', xpData),
      saveEvents: () => saveJson('./events.json', customEvents),
      client,
      pendingReactions,
      lastActivity,
    });
  } catch (error) {
    console.error('Error executing command:', error);
    if (interaction.replied || interaction.deferred) {
      await interaction.followUp({ content: 'Error running command.', ephemeral: true });
    } else {
      await interaction.reply({ content: 'Error running command.', ephemeral: true });
    }
  }
});

// Track activity for inactivity detection
client.on('messageCreate', message => {
  if (message.author.bot || !message.guild) return;

  const guildConfig = config[message.guild.id];
  if (guildConfig?.channelId === message.channel.id) {
    lastActivity[message.guild.id] = lastActivity[message.guild.id] || { time: 0, users: new Set() };
    lastActivity[message.guild.id].time = Date.now();
    lastActivity[message.guild.id].users.add(message.author.id);
  }
});

// Reaction race winner handling
client.on('messageReactionAdd', async (reaction, user) => {
  if (reaction.partial) await reaction.fetch();
  if (user.bot) return;

  const pr = pendingReactions.find(pr => pr.messageId === reaction.message.id);
  if (pr && reaction.emoji.name === pr.emoji && !pr.winner) {
    pr.winner = user.id;
    reaction.message.reply(`🎉 <@${user.id}> won the reaction race!`);

    // Add XP reward for reaction race win (default 10 XP)
    xpData[user.id] = (xpData[user.id] || 0) + (pr.reward || 10);
    saveJson('./xp.json', xpData);

    pendingReactions = pendingReactions.filter(p => p.messageId !== pr.messageId);
  }
});

client.login(process.env.DISCORD_TOKEN);
module.exports.client = client;
