const fs = require('fs');
const path = require('path');
const { getAccessToken } = require('../spotifyOAuth');

const CONFIG_PATH = path.join(__dirname, 'config', 'dailySpotify.json');
let config = {};
let usedTracks = {};

function loadDailyConfig() {
  if (fs.existsSync(CONFIG_PATH)) {
    config = JSON.parse(fs.readFileSync(CONFIG_PATH, 'utf8'));
  } else {
    config = {};
    saveDailyConfig();
  }

  for (const guildId of Object.keys(config)) {
    usedTracks[guildId] = new Set(config[guildId].used || []);
  }
}

function saveDailyConfig() {
  for (const guildId of Object.keys(config)) {
    config[guildId].used = [...(usedTracks[guildId] || [])];
  }
  fs.writeFileSync(CONFIG_PATH, JSON.stringify(config, null, 2));
}

function getGuildDailyConfig() {
  return config;
}

function updateGuildConfig(guildId, update) {
  if (!config[guildId]) config[guildId] = {};
  Object.assign(config[guildId], update);
  if (!usedTracks[guildId]) usedTracks[guildId] = new Set(config[guildId].used || []);
  saveDailyConfig();
}

async function getNextTrack(guildId) {
  const guildConf = config[guildId];
  if (!guildConf?.playlist) return null;

  const token = await getAccessToken();
  const playlistId = guildConf.playlist.split('/').pop().split('?')[0];

  const res = await fetch(`https://api.spotify.com/v1/playlists/${playlistId}/tracks?limit=100`, {
    headers: { Authorization: `Bearer ${token}` }
  });
  const data = await res.json();

  if (!data.items) return null;

  const allTracks = data.items.map(i => i.track).filter(Boolean);
  const availableTracks = allTracks.filter(t => !usedTracks[guildId].has(t.id));

  if (availableTracks.length === 0) {
    usedTracks[guildId] = new Set(); // reset
    saveDailyConfig();
    return getNextTrack(guildId);
  }

  const track = availableTracks[Math.floor(Math.random() * availableTracks.length)];
  usedTracks[guildId].add(track.id);
  saveDailyConfig();
  return track;
}

async function sendDailySpotifyMessage(client, guildId, channel) {
  const guildConf = config[guildId];
  const track = await getNextTrack(guildId);
  if (!track) return;

  const variables = {
    '{track}': track.name,
    '{artist}': track.artists.map(a => a.name).join(', '),
    '{url}': track.external_urls.spotify,
    '{cover}': track.album.images[0]?.url,
    '{date}': new Date().toLocaleDateString(),
    '{day}': new Date().toLocaleDateString(undefined, { weekday: 'long' }),
    '{time}': new Date().toLocaleTimeString()
  };

  const content = (guildConf.message || '🎵 **{track}** by *{artist}*\n{url}')
    .replace(/\{[^}]+\}/g, match => variables[match] || match);

  if (guildConf.embed) {
    await channel.send({
      embeds: [{
        title: `${variables['{track}']}`,
        description: `${variables['{artist}']}`,
        url: variables['{url}'],
        image: { url: variables['{cover}'] },
        footer: { text: `${variables['{day}']} • ${variables['{date}']} at ${variables['{time}']}` },
        color: 0x1DB954
      }]
    });
  } else {
    await channel.send(content);
  }
}

module.exports = {
  loadDailyConfig,
  saveDailyConfig,
  updateGuildConfig,
  getGuildDailyConfig,
  getNextTrack,
  sendDailySpotifyMessage
};
