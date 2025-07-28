const { SlashCommandBuilder } = require('discord.js');
const { saveDailySpotifyConfig } = require('../utils/dailySpotify');

module.exports = {
  data: new SlashCommandBuilder()
    .setName('setdailysongmessage')
    .setDescription('Customize the daily song message')
    .addStringOption(opt =>
      opt.setName('message').setDescription('Message with variables').setRequired(true)
    )
    .addBooleanOption(opt =>
      opt.setName('useembed').setDescription('Use an embed instead of plain text?')
    ),
  category: 'Spotify',

  async execute(interaction) {
    const guildId = interaction.guildId;
    const message = interaction.options.getString('message');
    const useEmbed = interaction.options.getBoolean('useembed') ?? false;

    // Save both the message and embed toggle
    saveDailySpotifyConfig(guildId, 'message', message);
    saveDailySpotifyConfig(guildId, 'embedEnabled', useEmbed);

    await interaction.reply({ content: '✅ Daily song message and embed preference updated.', flags: 64 });
  }
};
