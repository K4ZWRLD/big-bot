const fs = require('fs');
const axios = require('axios');
const express = require('express');
const tokensPath = './data/spotify_tokens.json';

function loadTokens() {
  if (!fs.existsSync(tokensPath)) return {};
  return JSON.parse(fs.readFileSync(tokensPath, 'utf8'));
}

function saveTokens(tokens) {
  fs.writeFileSync(tokensPath, JSON.stringify(tokens, null, 2));
}

async function refreshToken(discordUserId) {
  const tokens = loadTokens();
  const tokenData = tokens[discordUserId];

  if (!tokenData?.refresh_token) return null;

  const body = new URLSearchParams({
    grant_type: 'refresh_token',
    refresh_token: tokenData.refresh_token,
    client_id: process.env.SPOTIFY_CLIENT_ID,
    client_secret: process.env.SPOTIFY_CLIENT_SECRET,
  });

  try {
    const res = await axios.post('https://accounts.spotify.com/api/token', body.toString(), {
      headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    });

    tokens[discordUserId] = {
      ...tokenData,
      access_token: res.data.access_token,
      expires_at: Date.now() + res.data.expires_in * 1000,
      refresh_token: res.data.refresh_token || tokenData.refresh_token
    };

    saveTokens(tokens);
    return res.data.access_token;
  } catch (err) {
    console.error('Error refreshing token for user', discordUserId, err.response?.data || err.message);
    return null;
  }
}

async function refreshSpotifyTokens() {
  const tokens = loadTokens();
  for (const discordUserId in tokens) {
    if (Date.now() >= (tokens[discordUserId].expires_at || 0)) {
      await refreshToken(discordUserId);
    }
  }
}

function handleSpotifyOAuth(app) {
  // Step 1: Redirect to Spotify auth
  app.get('/auth/spotify', (req, res) => {
    const discordUserId = req.query.user;
    const scopes = [
      'user-read-private',
      'user-read-email',
      'user-read-playback-state',
      'user-read-currently-playing',
      'user-read-recently-played',
      'user-library-read'
    ].join(' ');
    const redirectUri = encodeURIComponent(process.env.SPOTIFY_REDIRECT_URI);
    const clientId = process.env.SPOTIFY_CLIENT_ID;

    const authUrl = `https://accounts.spotify.com/authorize?` +
      `response_type=code&client_id=${clientId}&scope=${scopes}&redirect_uri=${redirectUri}&state=${discordUserId}`;

    res.redirect(authUrl);
  });

  // Step 2: Handle callback after Spotify authorization
  app.get('/auth/spotify/callback', async (req, res) => {
    const code = req.query.code;
    const discordUserId = req.query.state;

    if (!code || !discordUserId) {
      return res.status(400).send('Missing authorization code or Discord user ID');
    }

    try {
      const tokenBody = new URLSearchParams({
        grant_type: 'authorization_code',
        code,
        redirect_uri: process.env.SPOTIFY_REDIRECT_URI,
        client_id: process.env.SPOTIFY_CLIENT_ID,
        client_secret: process.env.SPOTIFY_CLIENT_SECRET,
      });

      const tokenRes = await axios.post('https://accounts.spotify.com/api/token', tokenBody.toString(), {
        headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
      });

      const { access_token, refresh_token, expires_in } = tokenRes.data;

      const userRes = await axios.get('https://api.spotify.com/v1/me', {
        headers: { Authorization: `Bearer ${access_token}` }
      });

      const spotifyUserId = userRes.data.id;

      const tokens = loadTokens();
      tokens[discordUserId] = {
        access_token,
        refresh_token,
        expires_at: Date.now() + expires_in * 1000,
        spotify_id: spotifyUserId,
        discord_id: discordUserId
      };
      saveTokens(tokens);

      console.log(`Linked Discord ID: ${discordUserId} → Spotify ID: ${spotifyUserId}`);
      res.send('✅ Spotify authorization successful! You can close this window.');
    } catch (err) {
      console.error('Spotify OAuth error:', err.response?.data || err.message);
      res.status(500).send('Error during Spotify OAuth process');
    }
  });
}

module.exports = {
  loadSpotifyTokens: loadTokens,
  saveSpotifyTokens: saveTokens,
  refreshAccessToken: refreshToken,
  refreshSpotifyTokens,
  handleSpotifyOAuth,
};
