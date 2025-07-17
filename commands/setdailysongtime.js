const { SlashCommandBuilder } = require('discord.js');
const { saveJson, loadJson } = require('../../utils/json');

module.exports = {
  data: new SlashCommandBuilder()
    .setName('setdailysongtime')
    .setDescription('Set the time the daily song is posted (24h)')
    .addStringOption(opt =>
      opt.setName('time')
        .setDescription('Format: HH:MM (e.g. 10:30)')
        .setRequired(true)
    ),
  category: 'Spotify',

  async execute(interaction) {
    const config = loadJson('./config/dailySpotify.json');
    config.time = interaction.options.getString('time');
    saveJson('./config/dailySpotify.json', config);
    await interaction.reply({ content: `✅ Time set to ${config.time}.`, flags: 64 });
  }
};
