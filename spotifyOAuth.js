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
    tokens[discordUserId].access_token = newAccessToken;
    tokens[discordUserId].expires_at = Date.now() + res.data.expires_in * 1000;
    saveTokens(tokens);

    return newAccessToken;
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

// Express routes for Spotify OAuth
function handleSpotifyOAuth(app) {
  // Redirect user to Spotify authorization URL
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

  // Spotify OAuth callback
  app.get('/auth/spotify/callback', async (req, res) => {
    const code = req.query.code || null;
    const discordUserId = req.query.state;

    if (!code || !discordUserId) return res.status(400).send('Missing authorization code or user ID');

    try {
      const body = new URLSearchParams({
        grant_type: 'authorization_code',
        code,
        redirect_uri: process.env.SPOTIFY_REDIRECT_URI,
        client_id: process.env.SPOTIFY_CLIENT_ID,
        client_secret: process.env.SPOTIFY_CLIENT_SECRET,
      });

      const tokenRes = await axios.post('https://accounts.spotify.com/api/token', body.toString(), {
        headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
      });

      const accessToken = tokenRes.data.access_token;
      const refreshToken = tokenRes.data.refresh_token;
      const expiresIn = tokenRes.data.expires_in;

      const userRes = await axios.get('https://api.spotify.com/v1/me', {
        headers: { Authorization: `Bearer ${accessToken}` }
      });

      const spotifyUserId = userRes.data.id;

      const tokens = loadTokens();
      tokens[discordUserId] = {
        access_token: accessToken,
        refresh_token: refreshToken,
        expires_at: Date.now() + expiresIn * 1000,
        spotify_id: spotifyUserId
      };
      saveTokens(tokens);

      res.send('Spotify authorization successful! You can close this window.');
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
