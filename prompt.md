# Plex OAuth & API Integration Guide

This document explains how to implement Plex OAuth authentication and API integration in a web application. Use this as a reference for implementing Plex sign-in functionality.

## Overview

Plex uses a PIN-based OAuth flow where:
1. Your app requests a PIN from Plex
2. User is redirected to Plex to authorize the PIN
3. Your app polls for authorization status
4. Once authorized, you receive an auth token with user info

## Architecture

- **Frontend**: Initiates auth flow, opens Plex popup, polls for completion
- **Backend**: Handles PIN creation, polling, and token exchange with Plex API

---

## Backend Implementation (Cloudflare Worker / Node.js)

### Required Headers for All Plex API Calls

```javascript
const PLEX_HEADERS = {
  'Accept': 'application/json',
  'X-Plex-Client-Identifier': 'your-app-identifier', // Unique ID for your app
  'X-Plex-Product': 'Your App Name',
  'X-Plex-Version': '1.0.0',
  'X-Plex-Device': 'Web',
  'X-Plex-Platform': 'Web',
};
```

### Step 1: Create PIN Endpoint

Create an endpoint that generates a Plex PIN for the OAuth flow:

```javascript
// POST /api/plex/auth/start
async function startPlexAuth(request, env) {
  const response = await fetch('https://plex.tv/api/v2/pins', {
    method: 'POST',
    headers: {
      ...PLEX_HEADERS,
      'Content-Type': 'application/json',
      'X-Plex-Client-Identifier': env.PLEX_CLIENT_ID || 'your-app-id',
    },
    body: JSON.stringify({ strong: true }),
  });

  if (!response.ok) {
    return new Response(JSON.stringify({ error: 'Failed to create Plex PIN' }), {
      status: 500,
      headers: { 'Content-Type': 'application/json' },
    });
  }

  const data = await response.json();

  // Build the authorization URL that users will visit
  const authAppUrl = new URL('https://app.plex.tv/auth#!');
  authAppUrl.searchParams.set('clientID', env.PLEX_CLIENT_ID || 'your-app-id');
  authAppUrl.searchParams.set('code', data.code);
  authAppUrl.searchParams.set('context[device][product]', 'Your App Name');
  authAppUrl.searchParams.set('forwardUrl', env.FRONTEND_URL || 'http://localhost:5173');

  return new Response(JSON.stringify({
    pin_id: data.id,
    pin_code: data.code,
    auth_url: authAppUrl.toString(),
  }), {
    headers: { 'Content-Type': 'application/json' },
  });
}
```

### Step 2: Check PIN Status Endpoint

Create an endpoint to poll for authorization completion:

```javascript
// POST /api/plex/auth/check
async function checkPlexAuth(request, env) {
  const { pin_id, pin_code } = await request.json();

  if (!pin_id || !pin_code) {
    return new Response(JSON.stringify({ error: 'Missing pin_id or pin_code' }), {
      status: 400,
      headers: { 'Content-Type': 'application/json' },
    });
  }

  // Check if PIN has been authorized
  const pinResponse = await fetch(`https://plex.tv/api/v2/pins/${pin_id}`, {
    headers: {
      ...PLEX_HEADERS,
      'X-Plex-Client-Identifier': env.PLEX_CLIENT_ID || 'your-app-id',
      'code': pin_code,
    },
  });

  if (!pinResponse.ok) {
    return new Response(JSON.stringify({ error: 'Failed to check PIN status' }), {
      status: 500,
      headers: { 'Content-Type': 'application/json' },
    });
  }

  const pinData = await pinResponse.json();

  // If no authToken yet, user hasn't authorized
  if (!pinData.authToken) {
    return new Response(JSON.stringify({ authorized: false }), {
      headers: { 'Content-Type': 'application/json' },
    });
  }

  // PIN is authorized - fetch user details
  const userResponse = await fetch('https://plex.tv/api/v2/user', {
    headers: {
      ...PLEX_HEADERS,
      'X-Plex-Token': pinData.authToken,
    },
  });

  if (!userResponse.ok) {
    return new Response(JSON.stringify({ error: 'Failed to fetch user info' }), {
      status: 500,
      headers: { 'Content-Type': 'application/json' },
    });
  }

  const userData = await userResponse.json();

  return new Response(JSON.stringify({
    authorized: true,
    plex_user: {
      id: userData.id,
      username: userData.username,
      email: userData.email,
      thumb: userData.thumb, // Profile picture URL
    },
    auth_token: pinData.authToken, // Store securely if needed for API calls
  }), {
    headers: { 'Content-Type': 'application/json' },
  });
}
```

---

## Frontend Implementation (React)

### Auth Library (lib/auth.js)

```javascript
const API_BASE = import.meta.env.VITE_API_URL || 'http://localhost:8787';

// Start Plex OAuth flow - returns PIN data and auth URL
export async function startPlexAuth() {
  const response = await fetch(`${API_BASE}/api/plex/auth/start`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
  });

  if (!response.ok) {
    const data = await response.json();
    throw new Error(data.error || 'Failed to start Plex auth');
  }

  return response.json();
}

// Check if PIN has been authorized
export async function checkPlexAuth(pinId, pinCode) {
  const response = await fetch(`${API_BASE}/api/plex/auth/check`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ pin_id: pinId, pin_code: pinCode }),
  });

  if (!response.ok) {
    const data = await response.json();
    throw new Error(data.error || 'Failed to check auth status');
  }

  return response.json();
}
```

### Auth Context (React Context for managing user state)

```javascript
import { createContext, useContext, useState, useEffect } from 'react';

const AuthContext = createContext(null);

export function AuthProvider({ children }) {
  const [user, setUser] = useState(null);

  // Load user from localStorage on mount
  useEffect(() => {
    const stored = localStorage.getItem('plex_user');
    if (stored) {
      try {
        setUser(JSON.parse(stored));
      } catch (e) {
        localStorage.removeItem('plex_user');
      }
    }
  }, []);

  const login = (plexUser) => {
    setUser(plexUser);
    localStorage.setItem('plex_user', JSON.stringify(plexUser));
  };

  const logout = () => {
    setUser(null);
    localStorage.removeItem('plex_user');
  };

  return (
    <AuthContext.Provider value={{ user, login, logout }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within AuthProvider');
  }
  return context;
}
```

### Login Component

```javascript
import { useState } from 'react';
import { useAuth, startPlexAuth, checkPlexAuth } from '../lib/auth';

export default function PlexLogin() {
  const { login } = useAuth();
  const [step, setStep] = useState('idle'); // 'idle' | 'authorizing' | 'success'
  const [error, setError] = useState('');

  const handleLogin = async () => {
    setError('');

    try {
      // Step 1: Get PIN from backend
      const { pin_id, pin_code, auth_url } = await startPlexAuth();

      // Step 2: Open Plex auth in popup
      setStep('authorizing');
      window.open(auth_url, '_blank', 'width=600,height=700');

      // Step 3: Poll for authorization (every 2 seconds)
      const pollInterval = setInterval(async () => {
        try {
          const result = await checkPlexAuth(pin_id, pin_code);

          if (result.authorized) {
            clearInterval(pollInterval);
            login(result.plex_user);
            setStep('success');
          }
        } catch (err) {
          console.error('Poll error:', err);
        }
      }, 2000);

      // Stop polling after 5 minutes
      setTimeout(() => {
        clearInterval(pollInterval);
        if (step === 'authorizing') {
          setError('Authorization timed out. Please try again.');
          setStep('idle');
        }
      }, 5 * 60 * 1000);

    } catch (err) {
      setError(err.message);
      setStep('idle');
    }
  };

  return (
    <div>
      {error && <div className="error">{error}</div>}

      {step === 'idle' && (
        <button onClick={handleLogin}>
          Sign in with Plex
        </button>
      )}

      {step === 'authorizing' && (
        <div>
          <div className="spinner" />
          <p>Complete sign-in in the Plex popup window...</p>
        </div>
      )}

      {step === 'success' && (
        <p>Successfully signed in!</p>
      )}
    </div>
  );
}
```

---

## Plex Server API (Managing Friends/Shares)

Once you have a user's Plex token, you can interact with the Plex API for server management.

### Invite a User to Your Plex Server

```javascript
async function inviteUserToPlex(env, plexUserId, libraryIds = []) {
  // Step 1: Create the friend/share invitation
  const inviteUrl = new URL(`https://plex.tv/api/v2/shared_servers`);

  const response = await fetch(inviteUrl, {
    method: 'POST',
    headers: {
      'Accept': 'application/json',
      'Content-Type': 'application/json',
      'X-Plex-Token': env.PLEX_TOKEN, // Your server owner token
      'X-Plex-Client-Identifier': 'your-app-id',
    },
    body: JSON.stringify({
      machineIdentifier: env.PLEX_MACHINE_ID, // Your server's machine ID
      invitedId: plexUserId, // The user's Plex ID
      librarySectionIds: libraryIds, // Array of library IDs to share
      settings: {
        allowSync: false,
        allowCameraUpload: false,
        allowChannels: false,
        filterMovies: '',
        filterTelevision: '',
        filterMusic: '',
      },
    }),
  });

  return response.ok;
}
```

### Remove a User from Your Plex Server

```javascript
async function removeUserFromPlex(env, plexUserId) {
  const response = await fetch(`https://plex.tv/api/v2/friends/${plexUserId}`, {
    method: 'DELETE',
    headers: {
      'Accept': 'application/json',
      'X-Plex-Token': env.PLEX_TOKEN,
      'X-Plex-Client-Identifier': 'your-app-id',
    },
  });

  return response.ok;
}
```

### Update a User's Library Access

```javascript
async function updateUserLibraries(env, plexUserId, libraryIds) {
  // First, get the shared server ID for this user
  const serversResponse = await fetch(
    `https://plex.tv/api/v2/shared_servers?machineIdentifier=${env.PLEX_MACHINE_ID}`,
    {
      headers: {
        'Accept': 'application/json',
        'X-Plex-Token': env.PLEX_TOKEN,
        'X-Plex-Client-Identifier': 'your-app-id',
      },
    }
  );

  const servers = await serversResponse.json();
  const userShare = servers.find(s => s.invitedId === plexUserId);

  if (!userShare) {
    throw new Error('User share not found');
  }

  // Update the shared server with new library IDs
  const updateResponse = await fetch(
    `https://plex.tv/api/v2/shared_servers/${userShare.id}`,
    {
      method: 'PUT', // or PATCH
      headers: {
        'Accept': 'application/json',
        'Content-Type': 'application/json',
        'X-Plex-Token': env.PLEX_TOKEN,
        'X-Plex-Client-Identifier': 'your-app-id',
      },
      body: JSON.stringify({
        machineIdentifier: env.PLEX_MACHINE_ID,
        librarySectionIds: libraryIds,
      }),
    }
  );

  return updateResponse.ok;
}
```

### Get Your Plex Server's Libraries

```javascript
async function getServerLibraries(env) {
  const response = await fetch(
    `${env.PLEX_SERVER_URL}/library/sections`,
    {
      headers: {
        'Accept': 'application/json',
        'X-Plex-Token': env.PLEX_TOKEN,
      },
    }
  );

  const data = await response.json();
  return data.MediaContainer.Directory.map(lib => ({
    id: lib.key,
    title: lib.title,
    type: lib.type, // 'movie', 'show', 'music', etc.
  }));
}
```

---

## Environment Variables

### Backend
```
PLEX_TOKEN=your-plex-auth-token         # Server owner's Plex token
PLEX_SERVER_URL=http://your-server:32400 # Direct server URL
PLEX_MACHINE_ID=abc123...               # Server's machine identifier
PLEX_CLIENT_ID=your-app-unique-id       # Unique identifier for your app
FRONTEND_URL=https://your-frontend.com   # For OAuth redirect
```

### Frontend
```
VITE_API_URL=https://your-api.com       # Backend API URL
```

---

## Getting Your Plex Token & Machine ID

### Plex Token
1. Sign in to Plex web app
2. Play any media item
3. Click "Get Info" or check the XML URL
4. Look for `X-Plex-Token=` in the URL

Or use the API:
```bash
curl -X POST "https://plex.tv/users/sign_in.json" \
  -H "X-Plex-Client-Identifier: your-app" \
  -d "user[login]=your-email&user[password]=your-password"
```

### Machine Identifier
```bash
curl "http://your-server:32400/identity" \
  -H "X-Plex-Token: your-token"
```

Look for `machineIdentifier` in the response.

---

## CORS Configuration

If your backend is on a different domain, ensure CORS headers are set:

```javascript
const corsHeaders = {
  'Access-Control-Allow-Origin': 'https://your-frontend.com', // or '*' for dev
  'Access-Control-Allow-Methods': 'GET, POST, PUT, DELETE, OPTIONS',
  'Access-Control-Allow-Headers': 'Content-Type, Authorization',
};

// Handle preflight requests
if (request.method === 'OPTIONS') {
  return new Response(null, { headers: corsHeaders });
}

// Add to all responses
return new Response(body, {
  headers: { ...corsHeaders, 'Content-Type': 'application/json' },
});
```

---

## Key Points

1. **Client Identifier**: Must be consistent across all API calls for a session
2. **PIN Polling**: Poll every 2 seconds, timeout after 5 minutes
3. **Token Security**: Never expose your server owner token to the frontend
4. **User Data**: Store `plex_user_id` in your database to link Plex accounts
5. **Library IDs**: These are numeric IDs (1, 2, 3...) from your Plex server, not UUIDs
