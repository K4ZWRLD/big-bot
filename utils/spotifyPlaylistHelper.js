const fs = require('fs');
const path = require('path');
const fetch = require('node-fetch');
const playlistDataPath = path.join(__dirname, '../playlist_settings.json');
const tokenPath = path.join(__dirname, '../config/spotify_tokens.json');

function loadJson(file) {
  try {
    return JSON.parse(fs.readFileSync(file, 'utf-8'));
  } catch {
    return {};
  }
}

function saveJson(file, data) {
  fs.writeFileSync(file, JSON.stringify(data, null, 2));
}

// Refresh the access token if expired
async function getAccessToken() {
  const tokens = loadJson(tokenPath);
  const ownerId = Object.keys(tokens)[0];
  const tokenData = tokens[ownerId];

  if (!tokenData) throw new Error('No Spotify token available.');

  // If token expired, refresh it
  const now = Date.now();
  if (now >= tokenData.expiresAt) {
    const res = await fetch('https://accounts.spotify.com/api/token', {
      method: 'POST',
      headers: {
        Authorization:
          'Basic ' +
          Buffer.from(`${process.env.SPOTIFY_CLIENT_ID}:${process.env.SPOTIFY_CLIENT_SECRET}`).toString('base64'),
        'Content-Type': 'application/x-www-form-urlencoded',
      },
      body: new URLSearchParams({
        grant_type: 'refresh_token',
        refresh_token: tokenData.refresh_token,
      }),
    });

    if (!res.ok) throw new Error('Failed to refresh Spotify token.');
    const json = await res.json();

    tokenData.access_token = json.access_token;
    tokenData.expiresAt = now + json.expires_in * 1000;
    tokens[ownerId] = tokenData;
    saveJson(tokenPath, tokens);
  }

  return tokenData.access_token;
}

async function fetchPlaylistTracks(playlistId) {
  const accessToken = await getAccessToken();
  let tracks = [];
  let url = `https://api.spotify.com/v1/playlists/${playlistId}/tracks?limit=100`;

  while (url) {
    const res = await fetch(url, {
      headers: {
        Authorization: `Bearer ${accessToken}`,
      },
    });
    if (!res.ok) throw new Error('Failed to fetch playlist tracks.');

    const json = await res.json();
    tracks = tracks.concat(json.items.map(i => i.track).filter(Boolean));
    url = json.next;
  }

  return tracks.map(track => ({
    id: track.id,
    name: track.name,
    artists: track.artists.map(a => a.name),
    url: track.external_urls.spotify,
    thumbnail: track.album?.images?.[0]?.url,
  }));
}

async function getNextRandomTrack(setting) {
  const allTracks = await fetchPlaylistTracks(setting.playlistId);
  const playedIds = new Set(setting.history || []);
  const remainingTracks = allTracks.filter(t => !playedIds.has(t.id));

  let nextTrack;
  if (remainingTracks.length > 0) {
    nextTrack = remainingTracks[Math.floor(Math.random() * remainingTracks.length)];
  } else {
    // Reset history if all tracks played
    setting.history = [];
    nextTrack = allTracks[Math.floor(Math.random() * allTracks.length)];
  }

  return nextTrack;
}

module.exports = {
  fetchPlaylistTracks,
  getNextRandomTrack,
};
