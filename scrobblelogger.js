const axios = require('axios');
const fs = require('fs');

const DATA_FILE = './scrobbles.json';

// Load or create scrobbles data
function loadScrobbles() {
  if (!fs.existsSync(DATA_FILE)) fs.writeFileSync(DATA_FILE, '{}');
  return JSON.parse(fs.readFileSync(DATA_FILE));
}
function saveScrobbles(data) {
  fs.writeFileSync(DATA_FILE, JSON.stringify(data, null, 2));
}

// Call this periodically (e.g., every 1-2 mins) for each user with tokens
async function fetchAndLogCurrentlyPlaying(discordUserId, tokens) {
  try {
    const resp = await axios.get('https://api.spotify.com/v1/me/player/currently-playing', {
      headers: { Authorization: `Bearer ${tokens.access_token}` },
    });

    if (resp.status === 204 || !resp.data || !resp.data.item) return; // no track playing

    const track = resp.data.item;
    const artistNames = track.artists.map(a => a.name).join(', ');
    const trackName = track.name;
    const trackId = track.id;
    const timestamp = Date.now();

    let scrobbles = loadScrobbles();
    if (!scrobbles[discordUserId]) scrobbles[discordUserId] = [];

    // Avoid duplicate logs for the same track played recently (optional)
    const userScrobbles = scrobbles[discordUserId];
    if (userScrobbles.length > 0) {
      const last = userScrobbles[userScrobbles.length - 1];
      if (last.trackId === trackId && timestamp - last.timestamp < 1000 * 60 * 3) {
        // skip if same track played within last 3 minutes
        return;
      }
    }

    userScrobbles.push({
      trackId,
      trackName,
      artistNames,
      timestamp,
    });

    saveScrobbles(scrobbles);
    console.log(`Logged track for user ${discordUserId}: ${artistNames} - ${trackName}`);
  } catch (e) {
    // Handle token expired: you may want to refresh tokens here
    if (e.response && e.response.status === 401) {
      console.log(`Access token expired for user ${discordUserId}, refresh needed.`);
      // You should implement a refresh token flow here to get a new access token
    } else {
      console.error(`Failed to fetch currently playing for ${discordUserId}:`, e.message);
    }
  }
}

module.exports = { fetchAndLogCurrentlyPlaying };
