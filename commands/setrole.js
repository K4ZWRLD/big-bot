const { SlashCommandBuilder, PermissionsBitField } = require('discord.js');
const { getConfig, updateConfig } = require('../keywordRoleHandler');

module.exports = {
  data: new SlashCommandBuilder()
    .setName('setrole')
    .setDescription('Set the role to assign when keywords are found in status')
    .addRoleOption(option =>
      option.setName('role')
        .setDescription('Role to assign')
        .setRequired(true)
    ),
  async execute(interaction) {
    if (!interaction.member.permissions.has(PermissionsBitField.Flags.ManageRoles)) {
      return interaction.reply({ content: 'You need Manage Roles permission to use this.', ephemeral: true });
    }

    const role = interaction.options.getRole('role');
    const config = getConfig();

    if (!config[interaction.guild.id]) config[interaction.guild.id] = {};
    config[interaction.guild.id].roleId = role.id;

    updateConfig(config);

    await interaction.reply({ content: `Role set to: ${role.name}`, ephemeral: true });
  }
};
