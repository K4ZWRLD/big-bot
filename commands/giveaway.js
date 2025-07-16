const { SlashCommandBuilder, EmbedBuilder, PermissionFlagsBits } = require('discord.js');
const fs = require('fs');
const giveawaysFile = './giveaways.json';

function loadGiveaways() {
  if (!fs.existsSync(giveawaysFile)) fs.writeFileSync(giveawaysFile, '{}');
  return JSON.parse(fs.readFileSync(giveawaysFile));
}
function saveGiveaways(data) {
  fs.writeFileSync(giveawaysFile, JSON.stringify(data, null, 2));
}

function formatMessage(template, data) {
  return template
    .replace(/{prize}/g, data.prize || '')
    .replace(/{winners}/g, data.winnerMentions || '')
    .replace(/{host}/g, `<@${data.host}>`)
    .replace(/{channel}/g, `<#${data.channelId}>`)
    .replace(/{timeLeft}/g, data.timeLeft || '')
    .replace(/{guild}/g, data.guildName || '')
    .replace(/{winner}/g, data.winnerMentions || '')
    .replace(/{messageId}/g, data.messageId || '');
}

module.exports = {
  data: new SlashCommandBuilder()
    .setName('giveaway')
    .setDescription('Manage giveaways')
    .setDefaultMemberPermissions(PermissionFlagsBits.ManageGuild)
    .addSubcommand(sub =>
      sub.setName('create')
        .setDescription('Create a new giveaway')
        .addStringOption(opt => opt.setName('prize').setDescription('Prize name').setRequired(true))
        .addIntegerOption(opt => opt.setName('duration').setDescription('Duration in minutes').setRequired(true))
        .addIntegerOption(opt => opt.setName('winners').setDescription('Number of winners').setRequired(true))
        .addStringOption(opt => opt.setName('win_message').setDescription('Win message template').setRequired(false))
    )
    .addSubcommand(sub =>
      sub.setName('cancel')
        .setDescription('Cancel a giveaway')
        .addStringOption(opt => opt.setName('id').setDescription('Message ID').setRequired(true))
    )
    .addSubcommand(sub =>
      sub.setName('reroll')
        .setDescription('Reroll a giveaway')
        .addStringOption(opt => opt.setName('id').setDescription('Message ID').setRequired(true))
    )
    .addSubcommand(sub =>
      sub.setName('list')
        .setDescription('List active giveaways')
    ),

  async execute(interaction) {
    const sub = interaction.options.getSubcommand();
    const giveaways = loadGiveaways();

    if (sub === 'create') {
      const prize = interaction.options.getString('prize');
      const duration = interaction.options.getInteger('duration') * 60000;
      const winners = interaction.options.getInteger('winners');
      const winTemplate = interaction.options.getString('win_message') || '🎉 Congratulations {winners}, you won **{prize}**!';

      const embed = new EmbedBuilder()
        .setTitle('🎉 Giveaway!')
        .setDescription(`Prize: **${prize}**\nReact with 🎉 to enter!\nEnds in: ${duration / 60000} minutes\nWinners: ${winners}`)
        .setFooter({ text: `Hosted by ${interaction.user.tag}` })
        .setTimestamp(Date.now() + duration)
        .setColor('Random');

      const msg = await interaction.channel.send({ embeds: [embed] });
      await msg.react('🎉');

      giveaways[msg.id] = {
        prize,
        host: interaction.user.id,
        endAt: Date.now() + duration,
        winners,
        channelId: msg.channel.id,
        guildId: msg.guild.id,
        winMessageTemplate: winTemplate,
      };
      saveGiveaways(giveaways);

      await interaction.reply({ content: `✅ Giveaway created! [Jump to message](${msg.url})`, ephemeral: true });

      setTimeout(async () => {
        const updated = loadGiveaways();
        const data = updated[msg.id];
        if (!data) return;

        try {
          const channel = await interaction.client.channels.fetch(data.channelId);
          const giveawayMsg = await channel.messages.fetch(msg.id);
          const reactions = await giveawayMsg.reactions.cache.get('🎉')?.users.fetch();
          const entries = reactions?.filter(u => !u.bot).map(u => u.id);

          if (!entries || entries.length === 0) {
            await channel.send(`❌ No valid entries for the **${data.prize}** giveaway.`);
          } else {
            const winnersArr = entries.sort(() => 0.5 - Math.random()).slice(0, data.winners);
            const winnerMentions = winnersArr.map(id => `<@${id}>`).join(', ');

            const resultMsg = formatMessage(data.winMessageTemplate, {
              ...data,
              winnerMentions,
              timeLeft: 'Ended',
              guildName: interaction.guild.name,
              messageId: msg.id
            });

            await channel.send(resultMsg);
          }

          delete updated[msg.id];
          saveGiveaways(updated);
        } catch (e) {
          console.error('Giveaway end failed:', e);
        }
      }, duration);
    }

    else if (sub === 'cancel') {
      const id = interaction.options.getString('id');
      if (!giveaways[id]) return interaction.reply({ content: '❌ Giveaway not found.', ephemeral: true });

      delete giveaways[id];
      saveGiveaways(giveaways);
      return interaction.reply({ content: `🛑 Giveaway \`${id}\` cancelled.`, ephemeral: true });
    }

    else if (sub === 'reroll') {
      const id = interaction.options.getString('id');
      const data = giveaways[id];
      if (!data) return interaction.reply({ content: '❌ Giveaway not found.', ephemeral: true });

      try {
        const channel = await interaction.client.channels.fetch(data.channelId);
        const msg = await channel.messages.fetch(id);
        const reactions = await msg.reactions.cache.get('🎉')?.users.fetch();
        const entries = reactions?.filter(u => !u.bot).map(u => u.id);

        if (!entries || entries.length === 0) {
          return interaction.reply({ content: '❌ No valid entries to reroll.', ephemeral: true });
        }

        const winnersArr = entries.sort(() => 0.5 - Math.random()).slice(0, data.winners);
        const winnerMentions = winnersArr.map(id => `<@${id}>`).join(', ');

        const resultMsg = formatMessage(data.winMessageTemplate, {
          ...data,
          winnerMentions,
          timeLeft: 'Rerolled',
          guildName: interaction.guild.name,
          messageId: id
        });

        await channel.send(`🔁 **Giveaway reroll**\n${resultMsg}`);
        return interaction.reply({ content: '✅ Rerolled!', ephemeral: true });

      } catch (e) {
        console.error(e);
        return interaction.reply({ content: '❌ Failed to reroll.', ephemeral: true });
      }
    }

    else if (sub === 'list') {
      const active = Object.entries(giveaways).map(([id, g]) => ({
        name: `🎁 ${g.prize}`,
        value: `Ends <t:${Math.floor(g.endAt / 1000)}:R> • [Jump](https://discord.com/channels/${g.guildId}/${g.channelId}/${id})`
      }));

      const embed = new EmbedBuilder()
        .setTitle('🎊 Active Giveaways')
        .setColor('Blurple')
        .addFields(active.length ? active : [{ name: 'None', value: 'No active giveaways.' }]);

      return interaction.reply({ embeds: [embed], ephemeral: true });
    }
  },
};
