const { SlashCommandBuilder, ChannelType, PermissionFlagsBits } = require('discord.js');
const fs = require('fs');
const path = require('path');
const configPath = path.join(__dirname, '../config/dailySpotify.json');

function loadConfig() {
  if (!fs.existsSync(configPath)) fs.writeFileSync(configPath, '{}');
  return JSON.parse(fs.readFileSync(configPath));
}

function saveConfig(data) {
  fs.writeFileSync(configPath, JSON.stringify(data, null, 2));
}

module.exports = {
  data: new SlashCommandBuilder()
    .setName('setdailyplaylist')
    .setDescription('Configure the daily Spotify playlist system')
    .addSubcommand(sub =>
      sub.setName('setplaylist')
        .setDescription('Set the Spotify playlist URL to use')
        .addStringOption(opt => opt.setName('url').setDescription('Spotify playlist URL').setRequired(true)))
    .addSubcommand(sub =>
      sub.setName('setchannel')
        .setDescription('Set the channel where songs will be sent')
        .addChannelOption(opt =>
          opt.setName('channel')
            .addChannelTypes(ChannelType.GuildText)
            .setDescription('Target text channel')
            .setRequired(true)))
    .addSubcommand(sub =>
      sub.setName('settemplate')
        .setDescription('Set the message template (use variables)')
        .addStringOption(opt =>
          opt.setName('message')
            .setDescription('Message template (use {track}, {artist}, {url}, {cover}, {date}, etc.)')
            .setRequired(true)))
    .addSubcommand(sub =>
      sub.setName('settime')
        .setDescription('Set the time to send the song (CST, 24hr format)')
        .addIntegerOption(opt => opt.setName('hour').setDescription('Hour (0–23)').setRequired(true))
        .addIntegerOption(opt => opt.setName('minute').setDescription('Minute (0–59)').setRequired(true)))
    .setDefaultMemberPermissions(PermissionFlagsBits.Administrator),

  async execute(interaction) {
    const config = loadConfig();
    const ownerId = interaction.client.application.owner?.id || interaction.user.id;

    if (interaction.user.id !== ownerId) {
      return interaction.reply({ content: '❌ Only the bot owner can use this command.', flags: 64 });
    }

    const sub = interaction.options.getSubcommand();
    const botId = interaction.client.user.id;
    if (!config[botId]) config[botId] = { usedTracks: [] };

    const entry = config[botId];

    if (sub === 'setplaylist') {
      entry.playlist = interaction.options.getString('url');
      await interaction.reply({ content: '✅ Playlist set.', flags: 64 });
    }

    if (sub === 'setchannel') {
      entry.channel = interaction.options.getChannel('channel').id;
      await interaction.reply({ content: '✅ Channel set.', flags: 64 });
    }

    if (sub === 'settemplate') {
      entry.template = interaction.options.getString('message');
      await interaction.reply({ content: '✅ Message template set.', flags: 64 });
    }

    if (sub === 'settime') {
      const hour = interaction.options.getInteger('hour');
      const minute = interaction.options.getInteger('minute');
      entry.time = { hour, minute };
      await interaction.reply({ content: `✅ Send time set to ${hour.toString().padStart(2, '0')}:${minute.toString().padStart(2, '0')} CST.`, flags: 64 });
    }

    saveConfig(config);
  }
};
