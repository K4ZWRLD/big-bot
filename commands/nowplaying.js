const { SlashCommandBuilder, EmbedBuilder } = require('discord.js');
const axios = require('axios');
const fs = require('fs');

const TOKENS_PATH = './data/spotify_tokens.json';
function loadTokens() {
  if (!fs.existsSync(TOKENS_PATH)) return {};
  return JSON.parse(fs.readFileSync(TOKENS_PATH));
}

function saveTokens(data) {
  fs.writeFileSync(TOKENS_PATH, JSON.stringify(data, null, 2));
}

async function refreshAccessToken(clientId, clientSecret, tokenObj) {
  const params = new URLSearchParams({
    grant_type: 'refresh_token',
    refresh_token: tokenObj.refresh_token,
  });

  const auth = Buffer.from(`${clientId}:${clientSecret}`).toString('base64');

  const res = await axios.post('https://accounts.spotify.com/api/token', params.toString(), {
    headers: {
      Authorization: `Basic ${auth}`,
      'Content-Type': 'application/x-www-form-urlencoded',
    },
  });

  return {
    ...tokenObj,
    access_token: res.data.access_token,
    expires_at: Date.now() + res.data.expires_in * 1000,
    refresh_token: res.data.refresh_token || tokenObj.refresh_token
  };
}

module.exports = {
  data: new SlashCommandBuilder()
    .setName('nowplaying')
    .setDescription('Show your currently playing Spotify track'),

  category: 'Spotify',

  async execute(interaction) {
    const discordUserId = interaction.user.id;
    const tokens = loadTokens();

    const tokenObj = tokens[discordUserId];
    if (!tokenObj) {
      return interaction.reply({
        content: `You need to link your Spotify account first. Please [click here to login](${process.env.SERVER_URL}/auth/spotify?user=${discordUserId})`,
  flags: 64,
      });
    }

    let access_token = tokenObj.access_token;
    if (Date.now() > tokenObj.expires_at) {
      try {
        const refreshed = await refreshAccessToken(
          process.env.SPOTIFY_CLIENT_ID,
          process.env.SPOTIFY_CLIENT_SECRET,
          tokenObj
        );
        access_token = refreshed.access_token;
        tokens[discordUserId] = refreshed;
        saveTokens(tokens);
      } catch (e) {
        console.error('Failed to refresh token:', e.response?.data || e.message);
        return interaction.reply({
          content: 'Failed to refresh Spotify token. Please link your account again.',
          flags: 64,
        });
      }
    }

    try {
      const res = await axios.get('https://api.spotify.com/v1/me/player/currently-playing', {
        headers: { Authorization: `Bearer ${access_token}` },
      });

      if (res.status === 204 || !res.data || !res.data.item) {
        return interaction.reply({ content: 'No track is currently playing.', flags: 64 });
      }

      const track = res.data.item;
      const artists = track.artists.map((a) => a.name).join(', ');
      const embed = new EmbedBuilder()
        .setTitle(track.name)
        .setURL(track.external_urls.spotify)
        .setDescription(`by **${artists}**`)
        .setThumbnail(track.album.images[0]?.url)
        .setColor(0x1DB954)
        .setTimestamp();

      interaction.reply({ embeds: [embed] });
    } catch (e) {
      console.error('Spotify API error:', e.response?.data || e.message);
      interaction.reply({ content: 'Failed to get currently playing track.', flags: 64 });
    }
  },
};
