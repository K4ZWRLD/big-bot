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
    tokens[userId].expires_at = Date.now() + res.data.expires_in * 1000;
    saveTokens(tokens);

    return newAccessToken;
  } catch (err) {
    console.error('Error refreshing token for user', userId, err.response?.data || err.message);
    return null;
  }
}

async function refreshSpotifyTokens() {
  const tokens = loadTokens();
  for (const userId in tokens) {
    if (Date.now() >= (tokens[userId].expires_at || 0)) {
      await refreshToken(userId);
    }
  }
}

// Express routes for Spotify OAuth
function handleSpotifyOAuth(app) {
  // Redirect user to Spotify authorization URL
  app.get('/auth/spotify', (req, res) => {
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

    const authUrl = `https://accounts.spotify.com/authorize?response_type=code&client_id=${clientId}&scope=${scopes}&redirect_uri=${redirectUri}`;
    res.redirect(authUrl);
  });

  // Spotify OAuth callback
  app.get('/auth/spotify/callback', async (req, res) => {
    const code = req.query.code || null;

    if (!code) return res.status(400).send('Authorization code missing');

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

      // Get user info to identify userId
      const userRes = await axios.get('https://api.spotify.com/v1/me', {
        headers: { Authorization: `Bearer ${accessToken}` }
      });

      const userId = userRes.data.id;

      // Save tokens
      const tokens = loadTokens();
      tokens[userId] = {
        access_token: accessToken,
        refresh_token: refreshToken,
        expires_at: Date.now() + expiresIn * 1000,
        id: userId
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

