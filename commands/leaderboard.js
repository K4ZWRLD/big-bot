const { SlashCommandBuilder, ActionRowBuilder, ButtonBuilder, ButtonStyle, ComponentType } = require('discord.js');

const PAGE_SIZE = 10;

module.exports = {
  data: new SlashCommandBuilder()
    .setName('leaderboard')
    .setDescription('Show XP leaderboard for this server'),

  category: 'XP',

  async execute(interaction, { xpData }) {
    const guild = interaction.guild;

    // Filter only users who are in this guild
    // And have XP recorded
    const guildMemberIds = new Set(guild.members.cache.map(m => m.id));

    // Filter xpData entries for users in this guild
    const filtered = Object.entries(xpData).filter(([userId]) => guildMemberIds.has(userId));

    if (filtered.length === 0) {
      return interaction.reply({ content: 'No XP data for this server yet.', flags: 64 });
    }

    // Sort descending by XP
    const sorted = filtered.sort((a, b) => b[1] - a[1]);

    let page = 0;
    const maxPage = Math.floor((sorted.length - 1) / PAGE_SIZE);

    const generateEmbed = (page) => {
      const start = page * PAGE_SIZE;
      const pageItems = sorted.slice(start, start + PAGE_SIZE);

      let desc = '';
      for (let i = 0; i < pageItems.length; i++) {
        const [userId, xp] = pageItems[i];
        desc += `**#${start + i + 1}** <@${userId}> — ${xp} XP\n`;
      }

      return {
        content: `🏆 **XP Leaderboard:** (Page ${page + 1} / ${maxPage + 1})\n${desc}`,
      };
    };

    const row = new ActionRowBuilder().addComponents(
      new ButtonBuilder()
        .setCustomId('prev')
        .setLabel('⬅️ Previous')
        .setStyle(ButtonStyle.Primary)
        .setDisabled(true),
      new ButtonBuilder()
        .setCustomId('next')
        .setLabel('Next ➡️')
        .setStyle(ButtonStyle.Primary)
        .setDisabled(maxPage === 0),
    );

    const reply = await interaction.reply({
      ...generateEmbed(page),
      components: [row],
      flags: 64,
      fetchReply: true,
    });

    if (maxPage === 0) return; // No pagination needed

    const collector = reply.createMessageComponentCollector({
      componentType: ComponentType.Button,
      time: 60000,
    });

    collector.on('collect', async (i) => {
      if (i.user.id !== interaction.user.id) {
        return i.reply({ content: "You can't use these buttons.", flags: 64, ephemeral: true });
      }

      if (i.customId === 'next' && page < maxPage) {
        page++;
      } else if (i.customId === 'prev' && page > 0) {
        page--;
      }

      row.components[0].setDisabled(page === 0);
      row.components[1].setDisabled(page === maxPage);

      await i.update({
        ...generateEmbed(page),
        components: [row],
      });
    });

    collector.on('end', async () => {
      row.components.forEach(btn => btn.setDisabled(true));
      await interaction.editReply({ components: [row] });
    });
  },
};
