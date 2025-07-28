const axios = require('axios');
const fs = require('fs');

const TOKENS_PATH = './data/spotify_tokens.json';

function loadTokens() {
  if (!fs.existsSync(TOKENS_PATH)) return {};
  return JSON.parse(fs.readFileSync(TOKENS_PATH));
}

function saveTokens(data) {
  fs.writeFileSync(TOKENS_PATH, JSON.stringify(data, null, 2));
}

async function refreshAccessToken(discordUserId, tokenObj) {
  const { refresh_token } = tokenObj;

  const body = new URLSearchParams({
    grant_type: 'refresh_token',
    refresh_token,
  });

  const headers = {
    Authorization: 'Basic ' + Buffer.from(
      `${process.env.SPOTIFY_CLIENT_ID}:${process.env.SPOTIFY_CLIENT_SECRET}`
    ).toString('base64'),
    'Content-Type': 'application/x-www-form-urlencoded'
  };

  try {
    const res = await axios.post(
      'https://accounts.spotify.com/api/token',
      body.toString(),
      { headers }
    );

    const updatedToken = {
      ...tokenObj,
      access_token: res.data.access_token,
      expires_at: Date.now() + res.data.expires_in * 1000,
      refresh_token: res.data.refresh_token || tokenObj.refresh_token
    };

    const tokens = loadTokens();
    tokens[discordUserId] = updatedToken;
    saveTokens(tokens);

    return updatedToken.access_token;
  } catch (err) {
    console.error('Error refreshing token for Discord ID:', discordUserId, err.response?.data || err.message);
    return null;
  }
}

async function getValidAccessToken(discordUserId, tokenObj) {
  if (Date.now() >= tokenObj.expires_at) {
    return await refreshAccessToken(discordUserId, tokenObj);
  }
  return tokenObj.access_token;
}

async function getCurrentTrack(discordUserId, tokenObj) {
  const accessToken = await getValidAccessToken(discordUserId, tokenObj);

  const res = await axios.get('https://api.spotify.com/v1/me/player/currently-playing', {
    headers: { Authorization: `Bearer ${accessToken}` }
  });

  if (!res.data || !res.data.item) return null;

  const item = res.data.item;

  return {
    name: item.name,
    artist: item.artists.map(a => a.name).join(', '),
    album: item.album.name,
    image: item.album.images[0]?.url,
    url: item.external_urls.spotify,
    progress_ms: res.data.progress_ms,
    duration_ms: item.duration_ms,
    is_playing: res.data.is_playing
  };
}

async function getRecentTracks(discordUserId, tokenObj, limit = 5) {
  const accessToken = await getValidAccessToken(discordUserId, tokenObj);

  const res = await axios.get(`https://api.spotify.com/v1/me/player/recently-played?limit=${limit}`, {
    headers: { Authorization: `Bearer ${accessToken}` }
  });

  return res.data.items.map(({ track, played_at }) => ({
    name: track.name,
    artist: track.artists.map(a => a.name).join(', '),
    album: track.album.name,
    image: track.album.images[0]?.url,
    url: track.external_urls.spotify,
    played_at
  }));
}

module.exports = {
  loadTokens,
  saveTokens,
  getCurrentTrack,
  getRecentTracks,
  getValidAccessToken,
  refreshAccessToken
};
