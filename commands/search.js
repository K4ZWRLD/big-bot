const { SlashCommandBuilder } = require('discord.js');
const axios = require('axios');

let spotifyToken = null;
let tokenExpiresAt = 0;

async function getSpotifyToken(clientId, clientSecret) {
  if (spotifyToken && Date.now() < tokenExpiresAt) {
    return spotifyToken;
  }

  const params = new URLSearchParams();
  params.append('grant_type', 'client_credentials');

  const auth = Buffer.from(`${clientId}:${clientSecret}`).toString('base64');

  const res = await axios.post('https://accounts.spotify.com/api/token', params, {
    headers: {
      Authorization: `Basic ${auth}`,
      'Content-Type': 'application/x-www-form-urlencoded',
    },
  });

  spotifyToken = res.data.access_token;
  tokenExpiresAt = Date.now() + (res.data.expires_in - 60) * 1000;
  return spotifyToken;
}

module.exports = {
  data: new SlashCommandBuilder()
    .setName('search')
    .setDescription('🔍 Search for Spotify tracks by name')
    .addStringOption(option =>
      option.setName('query')
        .setDescription('Song, artist, or album to search for')
        .setRequired(true)
    ),

  category: 'Spotify',

  async execute(interaction) {
    const query = interaction.options.getString('query');
    const clientId = process.env.SPOTIFY_CLIENT_ID;
    const clientSecret = process.env.SPOTIFY_CLIENT_SECRET;

    if (!clientId || !clientSecret) {
      return interaction.reply({
        content: '❌ Spotify API credentials are not set.',
        ephemeral: true
      });
    }

    await interaction.deferReply();

    try {
      const token = await getSpotifyToken(clientId, clientSecret);

      const response = await axios.get('https://api.spotify.com/v1/search', {
        headers: { Authorization: `Bearer ${token}` },
        params: {
          q: query,
          type: 'track',
          limit: 5,
        },
      });

      const tracks = response.data.tracks.items;
      if (!tracks.length) {
        return interaction.editReply('⚠️ No tracks found.');
      }

      const embed = {
        title: `🎵 Spotify Search Results: "${query}"`,
        description: tracks.map((track, i) => {
          const artists = track.artists.map(a => a.name).join(', ');
          return `**${i + 1}. [${track.name}](${track.external_urls.spotify})** by ${artists}`;
        }).join('\n\n'),
        color: 0x1DB954,
        footer: { text: 'Powered by Spotify' }
      };

      interaction.editReply({ embeds: [embed] });
    } catch (error) {
      console.error('Spotify search error:', error.response?.data || error.message);
      interaction.editReply('❌ Failed to search Spotify. Try again later.');
    }
  },
};
