const fs = require('fs');
const path = require('path');
const { getPlaylistTracks } = require('../spotifyAPI'); // <- You must implement this
const { EmbedBuilder } = require('discord.js');

const configPath = path.join(__dirname, '../config/dailySpotify.json');
function loadConfig() {
  if (!fs.existsSync(configPath)) return {};
  return JSON.parse(fs.readFileSync(configPath));
}

function saveConfig(data) {
  fs.writeFileSync(configPath, JSON.stringify(data, null, 2));
}

function getRandomUnused(tracks, used) {
  const unused = tracks.filter(t => !used.includes(t.id));
  if (!unused.length) return null;
  return unused[Math.floor(Math.random() * unused.length)];
}

function interpolate(template, data) {
  return template
    .replace(/{track}/g, data.name)
    .replace(/{artist}/g, data.artist)
    .replace(/{url}/g, data.url)
    .replace(/{cover}/g, data.cover)
    .replace(/{date}/g, new Date().toLocaleDateString('en-US'))
    .replace(/{day}/g, new Date().toLocaleDateString('en-US', { weekday: 'long' }))
    .replace(/{time}/g, new Date().toLocaleTimeString('en-US'));
}

async function sendDailySongs(client) {
  const config = loadConfig();

  for (const botId in config) {
    const entry = config[botId];
    if (!entry.playlist || !entry.channel) continue;

    const channel = await client.channels.fetch(entry.channel).catch(() => null);
    if (!channel) continue;

    const tracks = await getPlaylistTracks(entry.playlist);
    const used = entry.usedTracks || [];
    let track = getRandomUnused(tracks, used);

    // Reset if all used
    if (!track) {
      entry.usedTracks = [];
      track = getRandomUnused(tracks, []);
    }

    if (!track) continue;

    entry.usedTracks.push(track.id);
    saveConfig(config);

    const msg = entry.template ? interpolate(entry.template, track) : `🎶 Today's song: **${track.name}** by **${track.artist}**\n<${track.url}>`;

    if (msg.includes('{cover}')) {
      const embed = new EmbedBuilder()
        .setColor('Random')
        .setTitle(track.name)
        .setURL(track.url)
        .setAuthor({ name: track.artist })
        .setImage(track.cover);

      await channel.send({ content: interpolate(entry.template, track).replace(/{cover}/g, ''), embeds: [embed] });
    } else {
      await channel.send(msg);
    }
  }
}

module.exports = { sendDailySongs };
