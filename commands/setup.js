const { SlashCommandBuilder, PermissionFlagsBits, ChannelType } = require('discord.js');

module.exports = {
  data: new SlashCommandBuilder()
    .setName('setup')
    .setDescription('Configure Anti-Boring Bot settings')
    .addSubcommand(sub =>
      sub.setName('channel')
        .setDescription('Set the activity monitoring channel and timeout')
        .addChannelOption(opt =>
          opt.setName('channel')
            .setDescription('Channel to monitor for inactivity')
            .setRequired(true)
            .addChannelTypes(ChannelType.GuildText)
        )
        .addIntegerOption(opt =>
          opt.setName('minutes')
            .setDescription('Inactivity threshold in minutes')
            .setRequired(true)
        )
    )
    .addSubcommand(sub =>
      sub.setName('toggle')
        .setDescription('Enable or disable the Anti-Boring Bot')
        .addBooleanOption(opt =>
          opt.setName('enabled')
            .setDescription('Whether to enable or disable the bot')
            .setRequired(true)
        )
    ),

  category: 'Boredom Prevention',

  async execute(interaction, { config, saveConfig }) {
    if (!interaction.member.permissions.has(PermissionFlagsBits.ManageGuild)) {
      return interaction.reply({
        content: '❌ You need the **Manage Server** permission to use this command.',
        ephemeral: true
      });
    }

    const sub = interaction.options.getSubcommand();

    if (sub === 'channel') {
      const channel = interaction.options.getChannel('channel');
      const minutes = interaction.options.getInteger('minutes');

      config[interaction.guild.id] = config[interaction.guild.id] || {};
      config[interaction.guild.id].channelId = channel.id;
      config[interaction.guild.id].inactivity = minutes * 60000;
      config[interaction.guild.id].enabled = true;

      saveConfig();

      return interaction.reply({
        content: `✅ Anti-Boring Bot enabled!\nChannel: ${channel}\nInactivity Timeout: ${minutes} minutes`,
        ephemeral: true
      });
    }

    if (sub === 'toggle') {
      const enabled = interaction.options.getBoolean('enabled');

      config[interaction.guild.id] = config[interaction.guild.id] || {};
      config[interaction.guild.id].enabled = enabled;
      saveConfig();

      return interaction.reply({
        content: `✅ Anti-Boring Bot is now **${enabled ? 'enabled' : 'disabled'}**.`,
        ephemeral: true
      });
    }
  },
};
