const { SlashCommandBuilder } = require('discord.js');
const { saveDailySpotifyConfig } = require('../utils/dailySpotifyConfig');

module.exports = {
  category: 'Spotify Daily',
  data: new SlashCommandBuilder()
    .setName('setdailychannel')
    .setDescription('Set the channel to send the daily Spotify song')
    .addChannelOption(opt =>
      opt.setName('channel').setDescription('Target channel').setRequired(true)
    ),

  async execute(interaction) {
    const channel = interaction.options.getChannel('channel');
    await saveDailySpotifyConfig('targetChannel', channel.id);
    await interaction.reply({ content: `📡 Daily song will now be sent in <#${channel.id}>.`, flags: 64 });
  }
};
