const { SlashCommandBuilder } = require('discord.js');
const { updateGuildConfig } = require('../dailySpotify');

module.exports = {
  data: new SlashCommandBuilder()
    .setName('setdailysongtime')
    .setDescription('Set the daily song send time (cron format)')
    .addStringOption(opt =>
      opt.setName('cron')
        .setDescription('e.g. 0 10 * * * for 10am daily')
        .setRequired(true)),
  async execute(interaction) {
    const cron = interaction.options.getString('cron');
    updateGuildConfig(interaction.guild.id, { time: cron });
    interaction.reply({ content: '✅ Daily time set! (e.g. 0 10 * * * = 10am)', flags: 64 });
  }
};
