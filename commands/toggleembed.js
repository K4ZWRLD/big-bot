const { SlashCommandBuilder } = require('discord.js');
const { saveDailySpotifyConfig, getDailySpotifyConfig } = require('../utils/dailySpotifyConfig');

module.exports = {
  category: 'Spotify Daily',
  data: new SlashCommandBuilder()
    .setName('toggleembed')
    .setDescription('Toggle embed mode for daily Spotify song'),

  async execute(interaction) {
    const config = await getDailySpotifyConfig();
    const newValue = !config.embedEnabled;
    await saveDailySpotifyConfig('embedEnabled', newValue);
    await interaction.reply({ content: `🖼️ Embed messages are now **${newValue ? 'enabled' : 'disabled'}**.`, flags: 64 });
  }
};
