const { SlashCommandBuilder } = require('discord.js');
const { updateGuildConfig } = require('../dailySpotify');

module.exports = {
  data: new SlashCommandBuilder()
    .setName('setsongchannel')
    .setDescription('Set the channel where the daily song is sent')
    .addChannelOption(opt =>
      opt.setName('channel').setDescription('Target channel').setRequired(true)),
  async execute(interaction) {
    const channel = interaction.options.getChannel('channel');
    updateGuildConfig(interaction.guild.id, { channel: channel.id });
    interaction.reply({ content: `✅ Channel set to ${channel}`, flags: 64 });
  }
};
