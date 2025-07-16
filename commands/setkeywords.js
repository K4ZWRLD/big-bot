const { SlashCommandBuilder, PermissionsBitField } = require('discord.js');
const { getConfig, updateConfig } = require('../keywordRoleHandler');

module.exports = {
  data: new SlashCommandBuilder()
    .setName('setkeywords')
    .setDescription('Set keywords to watch in user custom statuses (comma separated)')
    .addStringOption(option =>
      option.setName('keywords')
        .setDescription('Comma-separated keywords')
        .setRequired(true)
    ),
  async execute(interaction) {
    if (!interaction.member.permissions.has(PermissionsBitField.Flags.ManageRoles)) {
      return interaction.reply({ content: 'You need Manage Roles permission to use this.', ephemeral: true });
    }

    const keywordsInput = interaction.options.getString('keywords');
    const keywords = keywordsInput.split(',').map(k => k.trim().toLowerCase()).filter(Boolean);

    const config = getConfig();

    if (!config[interaction.guild.id]) config[interaction.guild.id] = {};
    config[interaction.guild.id].keywords = keywords;

    updateConfig(config);

    await interaction.reply({ content: `Keywords set to: ${keywords.join(', ')}`, ephemeral: true });
  }
};
