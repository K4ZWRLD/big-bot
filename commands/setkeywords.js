const { SlashCommandBuilder, PermissionsBitField } = require('discord.js');
const { getConfig, updateConfig } = require('../keywordRoleHandler');

module.exports = {
  data: new SlashCommandBuilder()
    .setName('setkeywords')
    .setDescription('Set keywords to watch in user custom statuses (comma separated)')
    .addStringOption(option =>
      option.setName('keywords')
        .setDescription('Comma-separated list of keywords (e.g., anime,valorant,coding)')
        .setRequired(true)
    ),

  category: 'Keyword Roles',

  async execute(interaction) {
    if (!interaction.member.permissions.has(PermissionsBitField.Flags.ManageRoles)) {
      return interaction.reply({
        content: '❌ You need the **Manage Roles** permission to use this command.',
        ephemeral: true
      });
    }

    const input = interaction.options.getString('keywords');
    const keywords = input
      .split(',')
      .map(k => k.trim().toLowerCase())
      .filter(Boolean);

    const config = getConfig();
    if (!config[interaction.guild.id]) config[interaction.guild.id] = {};

    config[interaction.guild.id].keywords = keywords;
    updateConfig(config);

    return interaction.reply({
      content: `✅ Keywords updated: \`${keywords.join(', ')}\``,
      ephemeral: true
    });
  }
};
