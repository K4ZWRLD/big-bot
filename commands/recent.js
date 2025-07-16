const { SlashCommandBuilder } = require('discord.js');
const { getRecentTracks } = require('../utils/spotify');

module.exports = {
  data: new SlashCommandBuilder()
    .setName('recent')
    .setDescription('Show your 5 most recently played Spotify tracks'),
  category: 'Spotify',

  async execute(interaction) {
    const tokens = require('../spotify_tokens.json');
    const userId = interaction.user.id;

    if (!tokens[userId]) {
      return interaction.reply({
        content: `You haven't linked your Spotify account yet. Use: \`${process.env.SERVER_URL}/login?user=${userId}\``,
        flags: 64
      });
    }

    const recent = await getRecentTracks(tokens[userId]);
    if (!recent?.length) {
      return interaction.reply({ content: 'No recent tracks found.', flags: 64 });
    }

    const list = recent.map((t, i) => `**${i + 1}.** [${t.name}](${t.url}) by ${t.artist}`).join('\n');
    return interaction.reply({
      embeds: [{
        title: '🎧 Recent Tracks',
        description: list,
        color: 0x1DB954
      }],
      flags: 64
    });
  }
};
