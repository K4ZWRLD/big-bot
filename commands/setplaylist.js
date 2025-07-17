const { SlashCommandBuilder } = require('discord.js');
const { updateGuildConfig } = require('../dailySpotify');

module.exports = {
  data: new SlashCommandBuilder()
    .setName('setplaylist')
    .setDescription('Set the Spotify playlist to use')
    .addStringOption(opt =>
      opt.setName('url').setDescription('Spotify playlist URL').setRequired(true)),
  async execute(interaction) {
    const url = interaction.options.getString('url');
    if (!url.includes('spotify.com/playlist/')) {
      return interaction.reply({ content: '❌ Invalid Spotify playlist URL.', flags: 64 });
    }

    updateGuildConfig(interaction.guild.id, { playlist: url });
    interaction.reply({ content: '✅ Playlist set!', flags: 64 });
  }
};
