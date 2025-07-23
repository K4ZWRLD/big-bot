const { SlashCommandBuilder } = require('discord.js');
const { getListeningHistory } = require('../scrobbleLogger');

module.exports = {
  data: new SlashCommandBuilder()
    .setName('toptracks')
    .setDescription('Shows your top tracks based on listening history')
    .setDMPermission(false)
    .setDefaultMemberPermissions(0)
    .setNSFW(false)
    .addStringOption(opt =>
      opt.setName('user')
        .setDescription('User ID (optional, defaults to you)')
        .setRequired(false)
    ),

  async execute(interaction) {
    const userId = interaction.options.getString('user') || interaction.user.id;
    const history = getListeningHistory(userId);

    const trackCounts = {};
    for (const entry of history) {
      const key = `${entry.name} by ${entry.artist}`;
      trackCounts[key] = (trackCounts[key] || 0) + 1;
    }

    const sorted = Object.entries(trackCounts).sort((a, b) => b[1] - a[1]);
    const top = sorted.slice(0, 10).map(
      ([track, count], i) => `**${i + 1}.** ${track} (${count} play${count === 1 ? '' : 's'})`
    );

    await interaction.reply({
      content: top.length
        ? `🎵 **Top Tracks for <@${userId}>**\n\n${top.join('\n')}`
        : '❌ No listening history found.',
      flags: 64
    });
  },
};
