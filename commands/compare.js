const { SlashCommandBuilder } = require('discord.js');
const { getListeningHistory } = require('../scrobbleLogger');

module.exports = {
  data: new SlashCommandBuilder()
    .setName('compare')
    .setDescription('Compare top tracks with another user')
    .addUserOption(opt => opt.setName('user').setDescription('User to compare with').setRequired(true)),
  async execute(interaction) {
    const user1 = interaction.user.id;
    const user2 = interaction.options.getUser('user').id;

    const hist1 = getListeningHistory(user1);
    const hist2 = getListeningHistory(user2);

    const tracks1 = new Set(hist1.map(h => `${h.track} - ${h.artist}`));
    const tracks2 = new Set(hist2.map(h => `${h.track} - ${h.artist}`));

    const shared = [...tracks1].filter(t => tracks2.has(t)).slice(0, 10);

    await interaction.reply({
      content: shared.length
        ? `📀 Shared Top Tracks:\n${shared.map(t => `• ${t}`).join('\n')}`
        : 'You have no tracks in common.',
      ephemeral: true
    });
  }
};
