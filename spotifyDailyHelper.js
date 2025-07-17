const { EmbedBuilder } = require('discord.js');
const axios = require('axios');

async function fetchPlaylistTracks(playlistUrl, accessToken) {
  const playlistId = playlistUrl.split('/playlist/')[1].split('?')[0];
  const headers = { Authorization: `Bearer ${accessToken}` };
  const response = await axios.get(`https://api.spotify.com/v1/playlists/${playlistId}/tracks`, { headers });
  return response.data.items.map(item => ({
    title: item.track.name,
    artist: item.track.artists.map(a => a.name).join(', '),
    url: item.track.external_urls.spotify,
    cover: item.track.album.images?.[0]?.url,
  }));
}

async function postDailySpotifySong(client, config) {
  if (!config.playlist || !config.channel || !config.token) throw new Error('Missing config values.');

  if (!config.songs || config.songs.length === 0) {
    config.songs = await fetchPlaylistTracks(config.playlist, config.token);
    config.history = [];
  }

  const remaining = config.songs.filter(song => !config.history.includes(song.url));
  const song = remaining[Math.floor(Math.random() * remaining.length)];

  config.history.push(song.url);
  if (config.history.length >= config.songs.length) config.history = [];

  const now = new Date();
  const timeVars = {
    '{title}': song.title,
    '{artist}': song.artist,
    '{url}': song.url,
    '{cover}': song.cover,
    '{date}': now.toLocaleDateString(),
    '{day}': now.toLocaleDateString('en-US', { weekday: 'long' }),
    '{time}': now.toLocaleTimeString(),
  };

  const message = config.message || '🎵 Today’s song: **{title}** by **{artist}**!\n{url}';
  const parsed = Object.entries(timeVars).reduce((str, [k, v]) => str.replaceAll(k, v), message);

  const channel = await client.channels.fetch(config.channel);
  if (!channel) throw new Error('Invalid channel ID.');

  if (config.embed) {
    const embed = new EmbedBuilder()
      .setTitle(song.title)
      .setURL(song.url)
      .setAuthor({ name: song.artist })
      .setImage(song.cover)
      .setFooter({ text: `${timeVars['{day}']} at ${timeVars['{time}']}` })
      .setColor('Green');

    await channel.send({ content: parsed, embeds: [embed] });
  } else {
    await channel.send({ content: parsed });
  }
}

module.exports = { fetchPlaylistTracks, postDailySpotifySong };
