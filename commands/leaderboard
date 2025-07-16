const { SlashCommandBuilder } = require('discord.js');

module.exports = {
  data: new SlashCommandBuilder()
    .setName('leaderboard')
    .setDescription('Show XP leaderboard for this server'),
  async execute(interaction, { xpData }) {
    const guildId = interaction.guild.id;
    // Filter users by guild (for demo, XP is global, so just top overall)
    // In a real setup, you'd store XP per guild and user

    const sorted = Object.entries(xpData)
      .sort((a, b) => b[1] - a[1])
      .slice(0, 10);

    if (sorted.length === 0) {
      return interaction.reply({ content: 'No XP data yet.', ephemeral: true });
    }

    let desc = '';
    let rank = 1;
    for (const [userId, xp] of sorted) {
      desc += `**#${rank}** <@${userId}> — ${xp} XP\n`;
      rank++;
    }

    await interaction.reply({ content: `🏆 **XP Leaderboard:**\n${desc}`, ephemeral: false });
  },
};
