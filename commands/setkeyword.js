const {
  SlashCommandBuilder,
  PermissionsBitField,
  ChannelType
} = require('discord.js');
const { getConfig, updateConfig } = require('../keywordRoleHandler');

module.exports = {
  data: new SlashCommandBuilder()
    .setName('setupkeyword')
    .setDescription('Configure keyword-based role automation')
    .addSubcommand(sub =>
      sub.setName('keywords')
        .setDescription('Set keywords to detect in user statuses')
        .addStringOption(option =>
          option.setName('list')
            .setDescription('Comma-separated keywords')
            .setRequired(true)
        )
    )
    .addSubcommand(sub =>
      sub.setName('channel')
        .setDescription('Set the notification channel and message template')
        .addChannelOption(option =>
          option.setName('target')
            .setDescription('Text channel for alerts')
            .setRequired(true)
        )
        .addStringOption(option =>
          option.setName('message')
            .setDescription('Template using {user}, {role}, {keyword}')
            .setRequired(true)
        )
    )
    .addSubcommand(sub =>
      sub.setName('map')
        .setDescription('Map a keyword to a specific role')
        .addStringOption(option =>
          option.setName('keyword')
            .setDescription('Keyword to assign')
            .setRequired(true)
        )
        .addRoleOption(option =>
          option.setName('role')
            .setDescription('Role to assign when keyword is found')
            .setRequired(true)
        )
    ),

  category: 'Keyword Roles',

  async execute(interaction) {
    const guildId = interaction.guild.id;
    const config = getConfig();
    if (!config[guildId]) config[guildId] = {};

    if (!interaction.memberPermissions.has(PermissionsBitField.Flags.ManageRoles)) {
      return interaction.reply({
        content: '❌ You need the **Manage Roles** permission to use this command.',
        ephemeral: true
      });
    }

    const sub = interaction.options.getSubcommand();

    switch (sub) {
      case 'keywords': {
        const raw = interaction.options.getString('list');
        const keywords = [...new Set(
          raw.split(',').map(k => k.trim().toLowerCase()).filter(Boolean)
        )];
        config[guildId].keywords = keywords;
        updateConfig(config);
        return interaction.reply({
          content: `✅ Keywords set: \`${keywords.join(', ')}\``,
          ephemeral: true
        });
      }

      case 'channel': {
        const channel = interaction.options.getChannel('target');
        const message = interaction.options.getString('message');

        if (
          !channel ||
          ![ChannelType.GuildText, ChannelType.GuildAnnouncement].includes(channel.type)
        ) {
          return interaction.reply({
            content: '❌ Please choose a valid **text-based** channel.',
            ephemeral: true
          });
        }

        config[guildId].channelId = channel.id;
        config[guildId].message = message;
        updateConfig(config);

        return interaction.reply({
          content: `✅ Alerts will be sent in ${channel} using:\n\`\`\`\n${message}\n\`\`\``,
          ephemeral: true
        });
      }

      case 'map': {
        const keyword = interaction.options.getString('keyword').toLowerCase();
        const role = interaction.options.getRole('role');

        if (!config[guildId].roleMap) config[guildId].roleMap = {};
        config[guildId].roleMap[keyword] = role.id;
        updateConfig(config);

        return interaction.reply({
          content: `✅ Keyword \`${keyword}\` now maps to role ${role}`,
          ephemeral: true
        });
      }

      default:
        return interaction.reply({ content: '⚠️ Unknown subcommand.', ephemeral: true });
    }
  }
};
