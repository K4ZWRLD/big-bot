const { SlashCommandBuilder } = require('discord.js');
const { saveDailySpotifyConfig, getDailySpotifyConfig }  = require('../utils/dailySpotify');

module.exports = {
  category: 'Spotify Daily',
  data: new SlashCommandBuilder()
    .setName('toggleembed')
    .setDescription('Toggle embed mode for daily Spotify song'),

  async execute(interaction) {
    const guildId = interaction.guildId;
    const config = await getDailySpotifyConfig(guildId);
    const newValue = !config.embedEnabled;

    await saveDailySpotifyConfig(guildId, 'embedEnabled', newValue);

    await interaction.reply({
      content: `🖼️ Embed messages are now **${newValue ? 'enabled' : 'disabled'}**.`,
      flags: 64
    });
  }
};
