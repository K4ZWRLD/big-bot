const fs = require('fs');
const axios = require('axios');
const tokensPath = './data/spotify_tokens.json';

function loadTokens() {
  if (!fs.existsSync(tokensPath)) return {};
  return JSON.parse(fs.readFileSync(tokensPath, 'utf8'));
}

function saveTokens(tokens) {
  fs.writeFileSync(tokensPath, JSON.stringify(tokens, null, 2));
}

async function refreshToken(userId) {
  const tokens = loadTokens();
  const tokenData = tokens[userId];

  if (!tokenData || !tokenData.refresh_token) return null;

  const body = new URLSearchParams({
    grant_type: 'refresh_token',
    refresh_token: tokenData.refresh_token,
    client_id: process.env.SPOTIFY_CLIENT_ID,
    client_secret: process.env.SPOTIFY_CLIENT_SECRET,
  });

  try {
    const res = await axios.post('https://accounts.spotify.com/api/token', body.toString(), {
      headers: {
        'Content-Type': 'application/x-www-form-urlencoded',
      },
    });

    const newAccessToken = res.data.access_token;
    tokens[userId].access_token = newAccessToken;
    saveTokens(tokens);

    return newAccessToken;
  } catch (err) {
    console.error('Error refreshing token for user', userId, err.response?.data || err.message);
    return null;
  }
}

module.exports = { loadTokens, saveTokens, refreshToken };
