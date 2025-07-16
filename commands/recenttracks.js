const { SlashCommandBuilder } = require('discord.js');
const { getListeningHistory } = require('../scrobbleLogger');

module.exports = {
  data: new SlashCommandBuilder()
    .setName('recenttracks')
    .setDescription('🎧 Shows your recently played Spotify tracks')
    .addStringOption(opt =>
      opt.setName('user')
        .setDescription('Discord user ID to check (optional)')
    ),

  category: 'Spotify',

  async execute(interaction) {
    const userId = interaction.options.getString('user') || interaction.user.id;
    const history = getListeningHistory(userId);

    const latest = history.slice(-10).reverse();

    if (!latest.length) {
      return interaction.reply({
        content: '⚠️ No listening history found.',
        ephemeral: true
      });
    }

    const embed = {
      title: `🕒 Recent Tracks`,
      description: latest.map((h, i) => `**${i + 1}.** ${h.track} — ${h.artist}`).join('\n'),
      color: 0x1DB954,
      footer: { text: 'Pulled from Spotify listening history' }
    };

    await interaction.reply({ embeds: [embed], ephemeral: true });
  }
};
