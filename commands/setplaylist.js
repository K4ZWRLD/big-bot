const { SlashCommandBuilder } = require('discord.js');
const { saveJson, loadJson } = require('../../utils/json');

module.exports = {
  data: new SlashCommandBuilder()
    .setName('setplaylist')
    .setDescription('Set the Spotify playlist for daily songs')
    .addStringOption(opt =>
      opt.setName('url').setDescription('Spotify playlist URL').setRequired(true)
    )
    .addStringOption(opt =>
      opt.setName('token').setDescription('Spotify OAuth Token').setRequired(true)
    ),
  category: 'Spotify',

  async execute(interaction) {
    const config = loadJson('./config/dailySpotify.json');
    config.playlist = interaction.options.getString('url');
    config.token = interaction.options.getString('token');
    saveJson('./config/dailySpotify.json', config);
    await interaction.reply({ content: '✅ Playlist and token set.', flags: 64 });
  }
};
