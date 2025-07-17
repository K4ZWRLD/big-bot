const {
  SlashCommandBuilder,
  ActionRowBuilder,
  StringSelectMenuBuilder,
  EmbedBuilder
} = require('discord.js');

module.exports = {
  data: new SlashCommandBuilder()
    .setName('help')
    .setDescription('Show help information for commands'),

  category: 'general',

  async execute(interaction, commandsCollection) {
    const commands = Array.from(commandsCollection.values());

    const categories = [...new Set(commands.map(cmd => cmd.category || 'Uncategorized'))];

    const options = categories.map(cat => ({
      label: cat,
      value: cat,
      description: `Show commands in ${cat} category`,
    }));

    const selectMenu = new StringSelectMenuBuilder()
      .setCustomId('help-category-select')
      .setPlaceholder('Select a command category')
      .addOptions(options);

    const row = new ActionRowBuilder().addComponents(selectMenu);

    await interaction.reply({
      content: '📚 Please select a command category:',
      components: [row],
      flags: 64 // non-ephemeral, deprecated "ephemeral: true"
    });

    const filter = i => i.customId === 'help-category-select' && i.user.id === interaction.user.id;
    const collector = interaction.channel.createMessageComponentCollector({ filter, time: 60000 });

    collector.on('collect', async i => {
      const selectedCategory = i.values[0];
      const filteredCommands = commands.filter(cmd => (cmd.category || 'Uncategorized') === selectedCategory);

      const embed = new EmbedBuilder()
        .setTitle(`${selectedCategory} Commands`)
        .setColor('Blue')
        .setDescription(
          filteredCommands
            .map(cmd => `</${cmd.data.name}:${cmd.data.name}> — ${cmd.data.description}`)
            .join('\n')
        );

      await i.update({ content: null, embeds: [embed], components: [row] });
    });

    collector.on('end', async () => {
      const disabledRow = new ActionRowBuilder().addComponents(selectMenu.setDisabled(true));
      try {
        await interaction.editReply({
          content: '📘 Help session ended.',
          components: [disabledRow]
        });
      } catch (err) {
        console.warn('Could not edit reply on collector end:', err.message);
      }
    });
  }
};
