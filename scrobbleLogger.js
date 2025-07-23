const axios = require('axios');
const fs = require('fs');
const { loadTokens, refreshToken } = require('./spotifyOAuth');

const XP_FILE = './xp.json';
const LISTENING_HISTORY_FILE = './listening_history.json';

// ... rest of your code ...

function loadXP() {
  if (!fs.existsSync(XP_FILE)) fs.writeFileSync(XP_FILE, '{}');
  return JSON.parse(fs.readFileSync(XP_FILE));
}

function saveXP(data) {
  fs.writeFileSync(XP_FILE, JSON.stringify(data, null, 2));
}

function loadListeningHistory() {
  if (!fs.existsSync(LISTENING_HISTORY_FILE)) fs.writeFileSync(LISTENING_HISTORY_FILE, '{}');
  return JSON.parse(fs.readFileSync(LISTENING_HISTORY_FILE));
}

function saveListeningHistory(data) {
  fs.writeFileSync(LISTENING_HISTORY_FILE, JSON.stringify(data, null, 2));
}

function getListeningHistory(userId) {
  const data = loadListeningHistory();
  return data[userId] || [];
}

async function fetchAndLogCurrentlyPlaying(discordUserId) {
  const tokensData = loadSpotifyTokens();
  let tokens = tokensData[discordUserId];
  if (!tokens) {
    console.log(`No tokens found for user ${discordUserId}`);
    return;
  }

  // Refresh if token expired or about to expire (1 min buffer)
  if (Date.now() > (tokens.expires_at - 60 * 1000)) {
    const refreshed = await refreshAccessToken(discordUserId);
    if (refreshed) {
      const updatedTokensData = loadSpotifyTokens();
      tokens = updatedTokensData[discordUserId];
    } else {
      console.log(`Could not refresh token for user ${discordUserId}, skipping fetch.`);
      return;
    }
  }

  try {
    const resp = await axios.get('https://api.spotify.com/v1/me/player/currently-playing', {
      headers: { Authorization: `Bearer ${tokens.access_token}` },
    });

    if (resp.status === 204 || !resp.data || !resp.data.item) {
      // No track playing
      return;
    }

    const track = resp.data.item;
    const artistNames = track.artists.map(a => a.name).join(', ');
    const trackName = track.name;

    // Save to listening history
    const listeningHistory = loadListeningHistory();

    if (!listeningHistory[discordUserId]) listeningHistory[discordUserId] = [];

    listeningHistory[discordUserId].push({
      artist: artistNames,
      track: trackName,
      timestamp: Date.now(),
    });

    saveListeningHistory(listeningHistory);

    // Award XP
    const xpData = loadXP();
    xpData[discordUserId] = (xpData[discordUserId] || 0) + 5;
    saveXP(xpData);

    console.log(`Logged scrobble for ${discordUserId}: ${artistNames} - ${trackName}`);
  } catch (e) {
    console.error(`Failed to fetch currently playing for ${discordUserId}:`, e.message);
  }
}

module.exports = {
  fetchAndLogCurrentlyPlaying,
  getListeningHistory,
};
