const axios = require('axios');
const fs = require('fs');

const TOKENS_PATH = './spotify_tokens.json';

function loadTokens() {
  return JSON.parse(fs.readFileSync(TOKENS_PATH));
}

function saveTokens(data) {
  fs.writeFileSync(TOKENS_PATH, JSON.stringify(data, null, 2));
}

async function refreshAccessToken(userToken) {
  const { refresh_token } = userToken;

  const res = await axios.post('https://accounts.spotify.com/api/token', new URLSearchParams({
    grant_type: 'refresh_token',
    refresh_token,
  }), {
    headers: {
      Authorization: 'Basic ' + Buffer.from(
        `${process.env.SPOTIFY_CLIENT_ID}:${process.env.SPOTIFY_CLIENT_SECRET}`
      ).toString('base64'),
      'Content-Type': 'application/x-www-form-urlencoded'
    }
  });

  userToken.access_token = res.data.access_token;
  userToken.expires_at = Date.now() + res.data.expires_in * 1000;
  saveTokens({ ...loadTokens(), [userToken.id]: userToken });

  return userToken.access_token;
}

async function getValidAccessToken(userId, tokenObj) {
  if (Date.now() >= tokenObj.expires_at) {
    return await refreshAccessToken(tokenObj);
  }
  return tokenObj.access_token;
}

async function getCurrentTrack(tokenObj) {
  const accessToken = await getValidAccessToken(tokenObj.id, tokenObj);

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
    url: item.external_urls.spotify
  };
}

async function getRecentTracks(tokenObj) {
  const accessToken = await getValidAccessToken(tokenObj.id, tokenObj);

  const res = await axios.get('https://api.spotify.com/v1/me/player/recently-played?limit=5', {
    headers: { Authorization: `Bearer ${accessToken}` }
  });

  return res.data.items.map(({ track }) => ({
    name: track.name,
    artist: track.artists.map(a => a.name).join(', '),
    url: track.external_urls.spotify
  }));
}

module.exports = {
  getCurrentTrack,
  getRecentTracks
};
