const axios = require('axios');
const querystring = require('querystring');
const fs = require('fs');
const TOKENS_PATH = './spotify_tokens.json';

function loadSpotifyTokens() {
  if (!fs.existsSync(TOKENS_PATH)) return {};
  return JSON.parse(fs.readFileSync(TOKENS_PATH));
}

function saveSpotifyTokens(data) {
  fs.writeFileSync(TOKENS_PATH, JSON.stringify(data, null, 2));
}

/**
 * Refresh Spotify access token using refresh token
 * @param {string} discordUserId
 * @returns {Promise<boolean>} true if refreshed successfully
 */
async function refreshAccessToken(discordUserId) {
  const tokens = loadSpotifyTokens();
  const tokenObj = tokens[discordUserId];
  if (!tokenObj?.refresh_token) return false;

  try {
    const resp = await axios.post(
      'https://accounts.spotify.com/api/token',
      querystring.stringify({
        grant_type: 'refresh_token',
        refresh_token: tokenObj.refresh_token,
      }),
      {
        headers: {
          Authorization:
            'Basic ' +
            Buffer.from(
              `${process.env.SPOTIFY_CLIENT_ID}:${process.env.SPOTIFY_CLIENT_SECRET}`
            ).toString('base64'),
          'Content-Type': 'application/x-www-form-urlencoded',
        },
      }
    );

    const { access_token, expires_in, refresh_token: newRefreshToken } = resp.data;

    tokens[discordUserId] = {
      ...tokenObj,
      access_token,
      expires_at: Date.now() + expires_in * 1000,
      refresh_token: newRefreshToken || tokenObj.refresh_token
    };

    saveSpotifyTokens(tokens);
    console.log(`Refreshed Spotify token for user ${discordUserId}`);
    return true;
  } catch (e) {
    console.error(`Failed to refresh token for ${discordUserId}:`, e.response?.data || e.message);
    return false;
  }
}

module.exports = {
  loadSpotifyTokens,
  saveSpotifyTokens,
  refreshAccessToken,
};
