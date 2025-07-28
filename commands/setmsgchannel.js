const { 
  SlashCommandBuilder, 
  PermissionsBitField, 
  ChannelType, 
  MessageFlags 
} = require('discord.js');
const { getConfig, updateConfig } = require('../keywordRoleHandler');

module.exports = {
  data: new SlashCommandBuilder()
    .setName('setmsgchannel')
    .setDescription('Set the channel and message template for keyword role notifications')
    .addChannelOption(option =>
      option.setName('channel')
        .setDescription('Channel where the bot should send role notifications')
        .setRequired(true)
    )
    .addStringOption(option =>
      option.setName('message')
        .setDescription('Message template (use {user} and {role})')
        .setRequired(true)
        .setMaxLength(2000)
    ),

  category: 'Keyword Roles',

  async execute(interaction) {
    if (!interaction.memberPermissions.has(PermissionsBitField.Flags.ManageRoles)) {
      return interaction.reply({
        content: '❌ You need the **Manage Roles** permission to use this command.',
        flags: MessageFlags.Ephemeral,
      });
    }

    const channel = interaction.options.getChannel('channel');
    const message = interaction.options.getString('message');

    // Deep null & type safety
    if (
      !channel ||
      typeof channel.id !== 'string' ||
      (
        channel.type !== ChannelType.GuildText &&
        channel.type !== ChannelType.GuildAnnouncement
      )
    ) {
      return interaction.reply({
        content: '❌ Please select a valid **text-based** channel.',
        flags: MessageFlags.Ephemeral,
      });
    }

    const config = getConfig();
    if (!config[interaction.guild?.id]) config[interaction.guild.id] = {};

    config[interaction.guild.id].channelId = channel.id;
    config[interaction.guild.id].message = message;

    updateConfig(config);

    return interaction.reply({
      content: `✅ Notifications will be sent in ${channel} with the message:\n\`\`\`\n${message}\n\`\`\``,
      flags: MessageFlags.Ephemeral,
    });
  }
};
