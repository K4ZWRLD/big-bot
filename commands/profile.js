const { SlashCommandBuilder, EmbedBuilder } = require('discord.js');
const fs = require('fs');

function loadScrobbles() {
  if (!fs.existsSync('./scrobbles.json')) return {};
  return JSON.parse(fs.readFileSync('./scrobbles.json'));
}

module.exports = {
  data: new SlashCommandBuilder()
    .setName('profile')
    .setDescription('Show your Spotify listening stats'),
  category: 'Spotify',

  async execute(interaction) {
    const userId = interaction.user.id;
    const scrobbles = loadScrobbles();

    if (!scrobbles[userId] || scrobbles[userId].length === 0) {
      return interaction.reply({ content: 'No scrobble data found. Listen to some music first!', flags: 64 });
    }

    // Count plays per artist and track
    const artistCount = {};
    const trackCount = {};

    for (const scrobble of scrobbles[userId]) {
      artistCount[scrobble.artistNames] = (artistCount[scrobble.artistNames] || 0) + 1;
      trackCount[scrobble.trackName] = (trackCount[scrobble.trackName] || 0) + 1;
    }

    // Sort and get top 5 artists & tracks
    const topArtists = Object.entries(artistCount)
      .sort((a, b) => b[1] - a[1])
      .slice(0, 5)
      .map(([artist, count]) => `${artist} (${count})`)
      .join('\n');

    const topTracks = Object.entries(trackCount)
      .sort((a, b) => b[1] - a[1])
      .slice(0, 5)
      .map(([track, count]) => `${track} (${count})`)
      .join('\n');

    const embed = new EmbedBuilder()
      .setTitle(`${interaction.user.username}'s Spotify Stats`)
      .addFields(
        { name: 'Top Artists', value: topArtists || 'None', inline: true },
        { name: 'Top Tracks', value: topTracks || 'None', inline: true },
      )
      .setColor('Green')
      .setTimestamp();

    await interaction.reply({ embeds: [embed], flags: 64 });
  },
};
