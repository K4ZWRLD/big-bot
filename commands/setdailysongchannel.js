const { SlashCommandBuilder } = require('discord.js');
const { saveJson, loadJson } = require('../../utils/json');

module.exports = {
  data: new SlashCommandBuilder()
    .setName('setdailysongchannel')
    .setDescription('Set the channel where daily songs will be posted')
    .addChannelOption(opt =>
      opt.setName('channel').setDescription('Target channel').setRequired(true)
    ),
  category: 'Spotify',

  async execute(interaction) {
    const config = loadJson('./config/dailySpotify.json');
    config.channel = interaction.options.getChannel('channel').id;
    saveJson('./config/dailySpotify.json', config);
    await interaction.reply({ content: '✅ Channel set.', flags: 64 });
  }
};
