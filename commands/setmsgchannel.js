const { SlashCommandBuilder, PermissionsBitField } = require('discord.js');
const { getConfig, updateConfig } = require('../keywordRoleHandler');

module.exports = {
  data: new SlashCommandBuilder()
    .setName('setmsgchannel')
    .setDescription('Set the channel and message for role assign/remove notifications')
    .addChannelOption(option =>
      option.setName('channel')
        .setDescription('Channel to send notifications in')
        .setRequired(true)
    )
    .addStringOption(option =>
      option.setName('message')
        .setDescription('Message template to send')
        .setRequired(true)
        .setMaxLength(2000)
        .setExample('Example: "{user} got the {role} role for having a keyword!"')
    ),
  async execute(interaction) {
    if (!interaction.member.permissions.has(PermissionsBitField.Flags.ManageRoles)) {
      return interaction.reply({ content: 'You need Manage Roles permission to use this.', ephemeral: true });
    }

    const channel = interaction.options.getChannel('channel');
    const message = interaction.options.getString('message');

    if (!channel.isTextBased()) {
      return interaction.reply({ content: 'Please select a text channel.', ephemeral: true });
    }

    const config = getConfig();

    if (!config[interaction.guild.id]) config[interaction.guild.id] = {};

    config[interaction.guild.id].channelId = channel.id;
    config[interaction.guild.id].message = message;

    updateConfig(config);

    await interaction.reply({ content: `Notification channel set to ${channel} with message:\n${message}`, ephemeral: true });
  }
};
