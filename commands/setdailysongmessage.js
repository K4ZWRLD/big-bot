const { SlashCommandBuilder } = require('discord.js');
const { saveJson, loadJson } = require('../../utils/json');

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
    const config = loadJson('./config/dailySpotify.json');
    config.message = interaction.options.getString('message');
    config.embed = interaction.options.getBoolean('useembed') ?? false;
    saveJson('./config/dailySpotify.json', config);
    await interaction.reply({ content: '✅ Message updated.', flags: 64 });
  }
};
