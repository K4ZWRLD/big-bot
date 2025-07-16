const { SlashCommandBuilder } = require('discord.js');
const { getListeningHistory } = require('../scrobbleLogger');

module.exports = {
  data: new SlashCommandBuilder()
    .setName('topartists')
    .setDescription('Shows your top artists')
    .addStringOption(opt =>
      opt.setName('user')
        .setDescription('Discord user ID to check (optional)')
    ),
  async execute(interaction) {
    const userId = interaction.options.getString('user') || interaction.user.id;
    const history = getListeningHistory(userId);

    const artistCounts = {};
    for (const entry of history) {
      artistCounts[entry.artist] = (artistCounts[entry.artist] || 0) + 1;
    }

    const sorted = Object.entries(artistCounts).sort((a, b) => b[1] - a[1]);
    const top = sorted.slice(0, 10).map(([artist, count], i) => `**${i+1}.** ${artist} (${count})`);

    await interaction.reply({
      content: top.length ? `🎨 Top Artists:\n${top.join('\n')}` : 'No listening history found.',
      ephemeral: true
    });
  }
};
