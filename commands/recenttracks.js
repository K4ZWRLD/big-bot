const { SlashCommandBuilder } = require('discord.js');
const { getListeningHistory } = require('../scrobbleLogger');

module.exports = {
  data: new SlashCommandBuilder()
    .setName('recenttracks')
    .setDescription('Shows your recently played tracks')
    .addUserOption(opt =>
      opt.setName('user')
        .setDescription('Select a user to view their track history')
    ),
  async execute(interaction) {
    const user = interaction.options.getUser('user') || interaction.user;
    const history = getListeningHistory(user.id);

    const latest = history.slice(-10).reverse();
    const formatted = latest.map((h, i) => `**${i + 1}.** ${h.track} — ${h.artist}`);

    await interaction.reply({
      content: formatted.length
        ? `🕒 **Recent Tracks for ${user.username}:**\n${formatted.join('\n')}`
        : `❌ No listening history found for ${user.username}.`,
      flags: 64
    });
  }
};
