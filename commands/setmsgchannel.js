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
    .setDescription('Configure the channel and message format for keyword role alerts')
    .addChannelOption(option =>
      option.setName('channel')
        .setDescription('Channel where role notifications will be sent')
        .setRequired(true)
    )
    .addStringOption(option =>
      option.setName('message')
        .setDescription('Template (use {user}, {role}, and optionally {keyword})')
        .setRequired(true)
        .setMaxLength(2000)
    ),

  category: 'Keyword Roles',

  async execute(interaction) {
    if (!interaction.memberPermissions.has(PermissionsBitField.Flags.ManageRoles)) {
      return interaction.reply({
        content: '❌ You need the **Manage Roles** permission to use this command.',
        flags: MessageFlags.Ephemeral
      });
    }

    const channel = interaction.options.getChannel('channel');
    const message = interaction.options.getString('message');

    // Validate selected channel
    if (
      !channel ||
      typeof channel.id !== 'string' ||
      ![ChannelType.GuildText, ChannelType.GuildAnnouncement].includes(channel.type)
    ) {
      return interaction.reply({
        content: '❌ Please choose a valid **text-based** channel.',
        flags: MessageFlags.Ephemeral
      });
    }

    // Retrieve and update config
    const config = getConfig();
    const guildId = interaction.guild.id;
    if (!config[guildId]) config[guildId] = {};

    config[guildId].channelId = channel.id;
    config[guildId].message = message;
    config[guildId].lastUpdated = Date.now(); // Optional timestamp tracker

    updateConfig(config);

    return interaction.reply({
      content: `✅ Notifications will be sent in ${channel} using this template:\n\`\`\`\n${message}\n\`\`\``,
      flags: MessageFlags.Ephemeral
    });
  }
};
