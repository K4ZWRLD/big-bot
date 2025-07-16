const { SlashCommandBuilder, PermissionFlagsBits, InteractionResponseFlags } = require('discord.js');

module.exports = {
  category: 'Anti-Boring Bot',

  data: new SlashCommandBuilder()
    .setName('boringbot')
    .setDescription('Manage Anti-Boring Bot custom events')
    .addSubcommand(sub =>
      sub.setName('event')
        .setDescription('Add or remove a custom boredom event')
        .addStringOption(opt => opt.setName('action').setDescription('Add or remove').setRequired(true).addChoices(
          { name: 'Add', value: 'add' },
          { name: 'Remove', value: 'remove' },
        ))
        .addStringOption(opt => opt.setName('text').setDescription('Text of the event').setRequired(true))
    ),

  async execute(interaction, { customEvents, saveEvents }) {
    if (!interaction.member.permissions.has(PermissionFlagsBits.ManageGuild)) {
      return interaction.reply({ content: 'You need Manage Server permission to run this.', flags: InteractionResponseFlags.Ephemeral });
    }

    const action = interaction.options.getString('action');
    const text = interaction.options.getString('text').trim();
    const guildId = interaction.guild.id;
    customEvents[guildId] = customEvents[guildId] || [];

    if (action === 'add') {
      if (customEvents[guildId].includes(text)) {
        return interaction.reply({ content: 'This event already exists.', flags: InteractionResponseFlags.Ephemeral });
      }
      customEvents[guildId].push(text);
      saveEvents();
      return interaction.reply({ content: `Added custom event: "${text}"`, flags: InteractionResponseFlags.Ephemeral });
    }

    if (action === 'remove') {
      const idx = customEvents[guildId].indexOf(text);
      if (idx === -1) {
        return interaction.reply({ content: 'Event not found.', flags: InteractionResponseFlags.Ephemeral });
      }
      customEvents[guildId].splice(idx, 1);
      saveEvents();
      return interaction.reply({ content: `Removed custom event: "${text}"`, flags: InteractionResponseFlags.Ephemeral });
    }
  },
};
