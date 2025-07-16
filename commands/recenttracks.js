const { SlashCommandBuilder } = require('discord.js');
const { getListeningHistory } = require('../scrobbleLogger');

module.exports = {
  data: new SlashCommandBuilder()
    .setName('recenttracks')
    .setDescription('Shows your recently played tracks')
    .addStringOption(opt =>
      opt.setName('user')
        .setDescription('Discord user ID to check (optional)')
    ),
  async execute(interaction) {
    const userId = interaction.options.getString('user') || interaction.user.id;
    const history = getListeningHistory(userId);

    const latest = history.slice(-10).reverse();
    const formatted = latest.map((h, i) => `**${i + 1}.** ${h.track} — ${h.artist}`);

    await interaction.reply({
      content: formatted.length ? `🕒 Recent Tracks:\n${formatted.join('\n')}` : 'No listening history found.',
      flags: 64
    });
  }
};
