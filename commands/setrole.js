const { SlashCommandBuilder, PermissionsBitField } = require('discord.js');
const { getConfig, updateConfig } = require('../keywordRoleHandler');

module.exports = {
  data: new SlashCommandBuilder()
    .setName('setrole')
    .setDescription('Set the role to assign when keywords are found in a user\'s custom status')
    .addRoleOption(option =>
      option.setName('role')
        .setDescription('The role to assign automatically')
        .setRequired(true)
    ),

  category: 'Status Rewards',

  async execute(interaction) {
    if (!interaction.member.permissions.has(PermissionsBitField.Flags.ManageRoles)) {
      return interaction.reply({
        content: '❌ You need the **Manage Roles** permission to use this command.',
        ephemeral: true,
      });
    }

    const role = interaction.options.getRole('role');
    const config = getConfig();

    if (!config[interaction.guild.id]) config[interaction.guild.id] = {};
    config[interaction.guild.id].roleId = role.id;

    updateConfig(config);

    return interaction.reply({
      content: `✅ The keyword role has been set to **${role.name}**.`,
      ephemeral: true,
    });
  }
};
