const { SlashCommandBuilder, PermissionFlagsBits } = require('discord.js');

module.exports = {
  data: new SlashCommandBuilder()
    .setName('boringbot')
    .setDescription('Manage Anti-Boring Bot settings')
    .addSubcommand(sub =>
      sub.setName('setup')
        .setDescription('Set channel and inactivity time (minutes)')
        .addChannelOption(opt => opt.setName('channel').setDescription('Channel to monitor').setRequired(true).addChannelTypes(0)) // 0 == GUILD_TEXT
        .addIntegerOption(opt => opt.setName('minutes').setDescription('Inactivity threshold (minutes)').setRequired(true))
    )
    .addSubcommand(sub =>
      sub.setName('toggle')
        .setDescription('Enable or disable the bot in this server')
        .addBooleanOption(opt => opt.setName('enabled').setDescription('Enable or disable').setRequired(true))
    ),
  async execute(interaction, { config, saveConfig }) {
    if (!interaction.member.permissions.has(PermissionFlagsBits.ManageGuild)) {
      return interaction.reply({ content: 'You need Manage Server permission to run this.', ephemeral: true });
    }

    const sub = interaction.options.getSubcommand();

    if (sub === 'setup') {
      const channel = interaction.options.getChannel('channel');
      const minutes = interaction.options.getInteger('minutes');
      config[interaction.guild.id] = config[interaction.guild.id] || {};
      config[interaction.guild.id].channelId = channel.id;
      config[interaction.guild.id].inactivity = minutes * 60000;
      config[interaction.guild.id].enabled = true;
      saveConfig();
      return interaction.reply({ content: `✅ Set channel to <#${channel.id}> with inactivity ${minutes} minutes. Bot enabled.`, ephemeral: true });
    }

    if (sub === 'toggle') {
      const enabled = interaction.options.getBoolean('enabled');
      config[interaction.guild.id] = config[interaction.guild.id] || {};
      config[interaction.guild.id].enabled = enabled;
      saveConfig();
      return interaction.reply({ content: `Bot is now ${enabled ? 'enabled' : 'disabled'}.`, ephemeral: true });
    }
  },
};
