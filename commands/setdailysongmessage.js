const { updateGuildConfig } = require('../utils/dailySpotify');

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

    updateGuildConfig(guildId, {
      message,
      embedEnabled: useEmbed
    });

    await interaction.reply({ content: '✅ Message updated.', flags: 64 });
  }
};

