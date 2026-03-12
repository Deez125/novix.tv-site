import { useState, useEffect } from 'react';
import { useAuth, startPlexAuth, checkPlexAuth } from '../lib/auth';
import { supabase } from '../lib/supabase';
import IptvTestModal from '../components/IptvTestModal';
import PlexServerSelectionModal from '../components/PlexServerSelectionModal';

export default function Account() {
  const { user, signOut } = useAuth();
  const [userData, setUserData] = useState(null);
  const [plexConnection, setPlexConnection] = useState(null);
  const [iptvConnection, setIptvConnection] = useState(null);
  const [jellyfinConnection, setJellyfinConnection] = useState(null);
  const [embyConnection, setEmbyConnection] = useState(null);
  const [loading, setLoading] = useState(true);

  // Plex connection state
  const [plexConnecting, setPlexConnecting] = useState(false);
  const [plexError, setPlexError] = useState('');
  const [pollInterval, setPollInterval] = useState(null);
  const [showServerSelection, setShowServerSelection] = useState(false);
  const [plexAuthData, setPlexAuthData] = useState(null);

  // IPTV connection state
  const [showIptvForm, setShowIptvForm] = useState(false);
  const [iptvType, setIptvType] = useState('m3u'); // 'm3u' or 'xtream'
  const [iptvSaving, setIptvSaving] = useState(false);
  const [iptvError, setIptvError] = useState('');
  const [showIptvTestModal, setShowIptvTestModal] = useState(false);
  const [iptvForm, setIptvForm] = useState({
    provider_name: '',
    m3u_url: '',
    xtream_host: '',
    xtream_username: '',
    xtream_password: '',
  });

  // Jellyfin connection state
  const [showJellyfinForm, setShowJellyfinForm] = useState(false);
  const [jellyfinConnecting, setJellyfinConnecting] = useState(false);
  const [jellyfinError, setJellyfinError] = useState('');
  const [jellyfinForm, setJellyfinForm] = useState({
    server_url: '',
    username: '',
    password: '',
  });

  // Emby connection state
  const [showEmbyForm, setShowEmbyForm] = useState(false);
  const [embyConnecting, setEmbyConnecting] = useState(false);
  const [embyError, setEmbyError] = useState('');
  const [embyForm, setEmbyForm] = useState({
    server_url: '',
    username: '',
    password: '',
  });

  // Fetch user data and connections from Supabase on mount
  useEffect(() => {
    if (user) {
      fetchUserData();
    }
  }, [user]);

  const fetchUserData = async () => {
    try {
      // Fetch user data
      const { data: userDataResult, error: userError } = await supabase
        .from('users')
        .select('*')
        .eq('auth_id', user.id)
        .single();

      if (userError) {
        console.error('Error fetching user data:', userError);
      } else {
        setUserData(userDataResult);

        // Fetch Plex connection using the user's id
        const { data: plexData, error: plexFetchError } = await supabase
          .from('plex_connections')
          .select('*')
          .eq('user_id', userDataResult.id)
          .single();

        if (plexFetchError && plexFetchError.code !== 'PGRST116') {
          // PGRST116 = no rows returned, which is fine
          console.error('Error fetching Plex connection:', plexFetchError);
        } else {
          setPlexConnection(plexData);
        }

        // Fetch IPTV connection using the user's id
        const { data: iptvData, error: iptvFetchError } = await supabase
          .from('iptv_connections')
          .select('*')
          .eq('user_id', userDataResult.id)
          .single();

        if (iptvFetchError && iptvFetchError.code !== 'PGRST116') {
          console.error('Error fetching IPTV connection:', iptvFetchError);
        } else {
          setIptvConnection(iptvData);
        }

        // Fetch Jellyfin connection using the user's id
        const { data: jellyfinData, error: jellyfinFetchError } = await supabase
          .from('jellyfin_connections')
          .select('*')
          .eq('user_id', userDataResult.id)
          .single();

        if (jellyfinFetchError && jellyfinFetchError.code !== 'PGRST116') {
          console.error('Error fetching Jellyfin connection:', jellyfinFetchError);
        } else {
          setJellyfinConnection(jellyfinData);
        }

        // Fetch Emby connection using the user's id
        const { data: embyData, error: embyFetchError } = await supabase
          .from('emby_connections')
          .select('*')
          .eq('user_id', userDataResult.id)
          .single();

        if (embyFetchError && embyFetchError.code !== 'PGRST116') {
          console.error('Error fetching Emby connection:', embyFetchError);
        } else {
          setEmbyConnection(embyData);
        }
      }
    } catch (err) {
      console.error('Error:', err);
    } finally {
      setLoading(false);
    }
  };

  // Start Plex OAuth connection
  const connectPlex = async () => {
    setPlexError('');
    setPlexConnecting(true);

    try {
      const data = await startPlexAuth();

      // Open Plex auth in new window
      window.open(data.auth_url, '_blank', 'width=600,height=700');

      // Start polling for auth completion
      const interval = setInterval(async () => {
        try {
          const checkData = await checkPlexAuth(data.pin_id, data.pin_code);

          if (checkData.authorized) {
            clearInterval(interval);
            setPollInterval(null);

            console.log('Plex authorized, showing server selection modal');
            console.log('Plex user data:', checkData.plex_user);

            // Store Plex auth data and show server selection modal
            setPlexAuthData({
              userId: user.id,
              plexUserId: checkData.plex_user.id,
              plexUsername: checkData.plex_user.username,
              plexEmail: checkData.plex_user.email,
              plexAvatarUrl: checkData.plex_user.thumb,
              plexToken: checkData.plex_user.authToken || null,
            });
            setShowServerSelection(true);
            setPlexConnecting(false);
            console.log('State updated - showServerSelection should be true');
          }
        } catch (err) {
          console.error('Poll error:', err);
        }
      }, 2000);

      setPollInterval(interval);

      // Stop polling after 5 minutes
      setTimeout(() => {
        if (interval) {
          clearInterval(interval);
          setPollInterval(null);
          setPlexConnecting(false);
          setPlexError('Plex authorization timed out. Please try again.');
        }
      }, 5 * 60 * 1000);

    } catch (err) {
      setPlexError(err.message);
      setPlexConnecting(false);
    }
  };

  // Handle server selection and save to database
  const handleServerSelected = async (serverInfo) => {
    try {
      if (!plexAuthData) {
        setPlexError('Missing authentication data');
        return;
      }

      // Get user's id from the users table
      const { data: userRecord, error: userError } = await supabase
        .from('users')
        .select('id')
        .eq('auth_id', plexAuthData.userId)
        .single();

      if (userError) {
        console.error('Error fetching user record:', userError);
        setPlexError('Failed to save Plex connection');
        return;
      }

      // Call the Worker API to save the complete Plex connection with server info
      const response = await fetch(`${import.meta.env.VITE_API_URL || 'http://localhost:8787'}/api/plex/save-server`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          user_id: userRecord.id,
          plex_user_id: plexAuthData.plexUserId,
          plex_username: plexAuthData.plexUsername,
          plex_email: plexAuthData.plexEmail,
          plex_avatar_url: plexAuthData.plexAvatarUrl,
          plex_token: plexAuthData.plexToken,
          server_url: serverInfo.serverUrl,
          server_name: serverInfo.serverName,
          server_machine_id: serverInfo.serverMachineId,
        }),
      });

      if (!response.ok) {
        throw new Error('Failed to save Plex server');
      }

      // Clear auth data and refresh
      setPlexAuthData(null);
      setShowServerSelection(false);
      await fetchUserData();
    } catch (err) {
      console.error('Error saving server:', err);
      setPlexError(err.message);
    }
  };

  // Disconnect Plex account
  const disconnectPlex = async () => {
    if (pollInterval) {
      clearInterval(pollInterval);
      setPollInterval(null);
    }

    try {
      // Get user's id first
      const { data: userRecord, error: userError } = await supabase
        .from('users')
        .select('id')
        .eq('auth_id', user.id)
        .single();

      if (userError) {
        console.error('Error fetching user record:', userError);
        return;
      }

      // Delete from plex_connections table
      const { error } = await supabase
        .from('plex_connections')
        .delete()
        .eq('user_id', userRecord.id);

      if (error) {
        console.error('Error disconnecting Plex:', error);
      } else {
        setPlexConnection(null);
        await fetchUserData();
      }
    } catch (err) {
      console.error('Error:', err);
    }
  };

  const handleLogout = async () => {
    try {
      await signOut();
      window.history.pushState({}, '', '/');
      window.dispatchEvent(new PopStateEvent('popstate'));
    } catch (err) {
      console.error('Logout error:', err);
    }
  };

  const goHome = () => {
    window.history.pushState({}, '', '/');
    window.dispatchEvent(new PopStateEvent('popstate'));
  };

  // Save IPTV connection (can be called from modal or directly)
  const saveIptvConnection = async () => {
    try {
      // Get user's id first
      const { data: userRecord, error: userError } = await supabase
        .from('users')
        .select('id')
        .eq('auth_id', user.id)
        .single();

      if (userError) {
        console.error('Error fetching user record:', userError);
        return false;
      }

      // Build connection data based on type
      const connectionData = {
        user_id: userRecord.id,
        provider_name: iptvForm.provider_name.trim() || (iptvType === 'm3u' ? 'M3U Playlist' : 'Xtream Provider'),
        connection_type: iptvType,
        connected_at: new Date().toISOString(),
      };

      if (iptvType === 'm3u') {
        connectionData.m3u_url = iptvForm.m3u_url.trim();
        connectionData.xtream_host = null;
        connectionData.xtream_username = null;
        connectionData.xtream_password = null;
      } else {
        connectionData.xtream_host = iptvForm.xtream_host.trim();
        connectionData.xtream_username = iptvForm.xtream_username.trim();
        connectionData.xtream_password = iptvForm.xtream_password.trim();
        connectionData.m3u_url = null;
      }

      // Upsert IPTV connection
      const { error } = await supabase
        .from('iptv_connections')
        .upsert(connectionData, {
          onConflict: 'user_id'
        });

      if (error) {
        console.error('Error saving IPTV connection:', error);
        return false;
      }

      setShowIptvForm(false);
      setIptvForm({
        provider_name: '',
        m3u_url: '',
        xtream_host: '',
        xtream_username: '',
        xtream_password: '',
      });
      await fetchUserData();
      return true;
    } catch (err) {
      console.error('Error:', err);
      return false;
    }
  };

  // Open test modal (validates first)
  const openIptvTestModal = () => {
    setIptvError('');

    // Validate required fields based on type
    if (iptvType === 'm3u') {
      if (!iptvForm.m3u_url.trim()) {
        setIptvError('M3U URL is required');
        return;
      }
      try {
        new URL(iptvForm.m3u_url);
      } catch {
        setIptvError('Please enter a valid URL');
        return;
      }
    } else {
      if (!iptvForm.xtream_host.trim() || !iptvForm.xtream_username.trim() || !iptvForm.xtream_password.trim()) {
        setIptvError('Host, username, and password are required');
        return;
      }
    }

    setShowIptvTestModal(true);
  };

  // Connect IPTV (form submit - just opens modal)
  const connectIptv = async (e) => {
    e.preventDefault();
    openIptvTestModal();
  };
  // Disconnect IPTV
  const disconnectIptv = async () => {
    try {
      const { data: userRecord, error: userError } = await supabase
        .from('users')
        .select('id')
        .eq('auth_id', user.id)
        .single();

      if (userError) {
        console.error('Error fetching user record:', userError);
        return;
      }

      const { error } = await supabase
        .from('iptv_connections')
        .delete()
        .eq('user_id', userRecord.id);

      if (error) {
        console.error('Error disconnecting IPTV:', error);
      } else {
        setIptvConnection(null);
        setShowIptvForm(false);
      }
    } catch (err) {
      console.error('Error:', err);
    }
  };

  // Connect Jellyfin - test connection and save
  const connectJellyfin = async (e) => {
    e.preventDefault();
    setJellyfinError('');
    setJellyfinConnecting(true);

    const { server_url, username, password } = jellyfinForm;

    // Validate required fields
    if (!server_url.trim() || !username.trim()) {
      setJellyfinError('Server URL and username are required');
      setJellyfinConnecting(false);
      return;
    }

    // Normalize server URL (remove trailing slash)
    const normalizedUrl = server_url.trim().replace(/\/$/, '');

    try {
      // Test connection by authenticating with Jellyfin
      const response = await fetch(`${normalizedUrl}/Users/AuthenticateByName`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'X-Emby-Authorization': `MediaBrowser Client="NovixTV", Device="Web", DeviceId="novix-web-${Date.now()}", Version="1.0.0"`,
        },
        body: JSON.stringify({
          Username: username.trim(),
          Pw: password,
        }),
      });

      if (!response.ok) {
        if (response.status === 401) {
          throw new Error('Invalid username or password');
        }
        throw new Error(`Connection failed (${response.status})`);
      }

      const authResult = await response.json();

      // Get user's id first
      const { data: userRecord, error: userError } = await supabase
        .from('users')
        .select('id')
        .eq('auth_id', user.id)
        .single();

      if (userError) {
        throw new Error('Failed to get user record');
      }

      // Get server info for the name
      let serverName = 'Jellyfin Server';
      try {
        const serverInfoResponse = await fetch(`${normalizedUrl}/System/Info/Public`);
        if (serverInfoResponse.ok) {
          const serverInfo = await serverInfoResponse.json();
          serverName = serverInfo.ServerName || 'Jellyfin Server';
        }
      } catch {
        // Ignore error, use default name
      }

      // Save connection to database
      const connectionData = {
        user_id: userRecord.id,
        server_url: normalizedUrl,
        server_name: serverName,
        username: username.trim(),
        access_token: authResult.AccessToken,
        user_id_on_server: authResult.User?.Id,
        connected_at: new Date().toISOString(),
      };

      const { error } = await supabase
        .from('jellyfin_connections')
        .upsert(connectionData, { onConflict: 'user_id' });

      if (error) {
        throw new Error('Failed to save connection');
      }

      // Reset form and refresh
      setShowJellyfinForm(false);
      setJellyfinForm({ server_url: '', username: '', password: '' });
      await fetchUserData();

    } catch (err) {
      console.error('Jellyfin connection error:', err);
      setJellyfinError(err.message || 'Failed to connect to Jellyfin server');
    } finally {
      setJellyfinConnecting(false);
    }
  };

  // Disconnect Jellyfin
  const disconnectJellyfin = async () => {
    try {
      const { data: userRecord, error: userError } = await supabase
        .from('users')
        .select('id')
        .eq('auth_id', user.id)
        .single();

      if (userError) {
        console.error('Error fetching user record:', userError);
        return;
      }

      const { error } = await supabase
        .from('jellyfin_connections')
        .delete()
        .eq('user_id', userRecord.id);

      if (error) {
        console.error('Error disconnecting Jellyfin:', error);
      } else {
        setJellyfinConnection(null);
        setShowJellyfinForm(false);
      }
    } catch (err) {
      console.error('Error:', err);
    }
  };

  // Connect Emby - test connection and save
  const connectEmby = async (e) => {
    e.preventDefault();
    setEmbyError('');
    setEmbyConnecting(true);

    const { server_url, username, password } = embyForm;

    // Validate required fields
    if (!server_url.trim() || !username.trim()) {
      setEmbyError('Server URL and username are required');
      setEmbyConnecting(false);
      return;
    }

    // Normalize server URL (remove trailing slash)
    const normalizedUrl = server_url.trim().replace(/\/$/, '');

    try {
      // Test connection by authenticating with Emby
      const response = await fetch(`${normalizedUrl}/Users/AuthenticateByName`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'X-Emby-Authorization': `Emby Client="NovixTV", Device="Web", DeviceId="novix-web-${Date.now()}", Version="1.0.0"`,
        },
        body: JSON.stringify({
          Username: username.trim(),
          Pw: password,
        }),
      });

      if (!response.ok) {
        if (response.status === 401) {
          throw new Error('Invalid username or password');
        }
        throw new Error(`Connection failed (${response.status})`);
      }

      const authResult = await response.json();

      // Get user's id first
      const { data: userRecord, error: userError } = await supabase
        .from('users')
        .select('id')
        .eq('auth_id', user.id)
        .single();

      if (userError) {
        throw new Error('Failed to get user record');
      }

      // Get server info for the name
      let serverName = 'Emby Server';
      try {
        const serverInfoResponse = await fetch(`${normalizedUrl}/System/Info/Public`);
        if (serverInfoResponse.ok) {
          const serverInfo = await serverInfoResponse.json();
          serverName = serverInfo.ServerName || 'Emby Server';
        }
      } catch {
        // Ignore error, use default name
      }

      // Save connection to database
      const connectionData = {
        user_id: userRecord.id,
        server_url: normalizedUrl,
        server_name: serverName,
        username: username.trim(),
        access_token: authResult.AccessToken,
        user_id_on_server: authResult.User?.Id,
        connected_at: new Date().toISOString(),
      };

      const { error } = await supabase
        .from('emby_connections')
        .upsert(connectionData, { onConflict: 'user_id' });

      if (error) {
        throw new Error('Failed to save connection');
      }

      // Reset form and refresh
      setShowEmbyForm(false);
      setEmbyForm({ server_url: '', username: '', password: '' });
      await fetchUserData();

    } catch (err) {
      console.error('Emby connection error:', err);
      setEmbyError(err.message || 'Failed to connect to Emby server');
    } finally {
      setEmbyConnecting(false);
    }
  };

  // Disconnect Emby
  const disconnectEmby = async () => {
    try {
      const { data: userRecord, error: userError } = await supabase
        .from('users')
        .select('id')
        .eq('auth_id', user.id)
        .single();

      if (userError) {
        console.error('Error fetching user record:', userError);
        return;
      }

      const { error } = await supabase
        .from('emby_connections')
        .delete()
        .eq('user_id', userRecord.id);

      if (error) {
        console.error('Error disconnecting Emby:', error);
      } else {
        setEmbyConnection(null);
        setShowEmbyForm(false);
      }
    } catch (err) {
      console.error('Error:', err);
    }
  };

  if (!user) {
    return (
      <div className="min-h-screen bg-slate-950 text-white flex items-center justify-center">
        <div className="text-center">
          <h1 className="text-2xl font-bold mb-4">Not logged in</h1>
          <button
            onClick={goHome}
            className="px-4 py-2 bg-violet-600 hover:bg-violet-500 rounded-lg transition"
          >
            Go to Home
          </button>
        </div>
      </div>
    );
  }

  const plexConnected = plexConnection?.plex_user_id;

  return (
    <div className="min-h-screen bg-slate-950 text-white">
      {/* Navigation */}
      <nav className="border-b border-slate-800/50">
        <div className="max-w-4xl mx-auto px-4 py-4 flex items-center justify-between">
          <button onClick={goHome} className="text-2xl font-bold">
            <span className="text-violet-400">Novix</span>TV
          </button>
        </div>
      </nav>

      {/* Account Content */}
      <div className="max-w-2xl mx-auto px-4 py-12">
        <h1 className="text-3xl font-bold mb-8">Account Settings</h1>

        {/* Profile Section */}
        <div className="bg-slate-800/50 border border-slate-700 rounded-xl p-6 mb-6">
          <h2 className="text-lg font-semibold mb-4">Profile</h2>
          <div className="flex items-center gap-4">
            {user.user_metadata?.avatar_url || user.user_metadata?.picture ? (
              <img
                src={user.user_metadata?.avatar_url || user.user_metadata?.picture}
                alt={user.user_metadata?.full_name || user.email}
                className="w-16 h-16 rounded-full"
              />
            ) : (
              <div className="w-16 h-16 bg-violet-500/20 rounded-full flex items-center justify-center">
                <span className="text-violet-400 font-semibold text-2xl">
                  {user.email?.charAt(0).toUpperCase() || 'U'}
                </span>
              </div>
            )}
            <div className="flex-1">
              <div className="text-xl font-medium">
                {user.user_metadata?.full_name || user.user_metadata?.name || user.email}
              </div>
              <div className="text-sm text-slate-400">{user.email}</div>
              <div className="text-sm text-slate-500 mt-1">
                Signed in via {user.app_metadata?.provider || 'email'}
              </div>
            </div>
            <button
              onClick={handleLogout}
              className="px-4 py-2 text-sm text-red-400 hover:text-red-300 transition"
            >
              Sign Out
            </button>
          </div>
        </div>

        {/* Connected Accounts Section */}
        <div className="bg-slate-800/50 border border-slate-700 rounded-xl p-6 mb-6">
          <h2 className="text-lg font-semibold mb-4">Connected Accounts</h2>

          {/* Plex Connection */}
          <div className="p-4 bg-slate-900 rounded-lg border border-slate-700">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                {plexConnected && plexConnection?.plex_avatar_url ? (
                  <img
                    src={plexConnection.plex_avatar_url}
                    alt={plexConnection.plex_username}
                    className="w-10 h-10 rounded-lg"
                  />
                ) : (
                  <img src="/icons/plex.svg" alt="Plex" className="w-10 h-10 rounded-lg" />
                )}
                <div>
                  <div className="font-medium">Plex</div>
                  <div className="text-sm text-slate-400">
                    {plexConnected ? (
                      <>
                        Connected as {plexConnection.plex_username}
                        {plexConnection.plex_server_name && (
                          <div className="text-xs text-slate-500">Server: {plexConnection.plex_server_name}</div>
                        )}
                      </>
                    ) : (
                      'Not connected'
                    )}
                  </div>
                </div>
              </div>

              {plexConnected ? (
                <div className="flex items-center gap-2">
                  <span className="px-2 py-1 text-xs bg-violet-500/20 text-violet-400 rounded">
                    Connected
                  </span>
                  <button
                    onClick={disconnectPlex}
                    className="px-3 py-1.5 text-sm text-red-400 hover:text-red-300 transition"
                  >
                    Disconnect
                  </button>
                </div>
              ) : (
                <button
                  onClick={connectPlex}
                  disabled={plexConnecting}
                  className="px-4 py-2 bg-violet-600 hover:bg-violet-500 text-white font-medium rounded-lg transition disabled:opacity-50"
                >
                  {plexConnecting ? 'Connecting...' : 'Connect'}
                </button>
              )}
            </div>

            {plexError && (
              <div className="mt-3 text-sm text-red-400">
                {plexError}
              </div>
            )}

            {plexConnecting && (
              <div className="mt-3 text-sm text-slate-400 flex items-center gap-2">
                <div className="w-4 h-4 border-2 border-slate-600 border-t-violet-400 rounded-full animate-spin"></div>
                Complete the sign-in in the Plex popup window...
              </div>
            )}

          </div>

          {/* Jellyfin Connection */}
          <div className="p-4 bg-slate-900 rounded-lg border border-slate-700 mt-4">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <img src="/icons/jelllyfin.svg" alt="Jellyfin" className="w-10 h-10 rounded-lg" />
                <div>
                  <div className="font-medium">Jellyfin</div>
                  <div className="text-sm text-slate-400">
                    {jellyfinConnection
                      ? `${jellyfinConnection.username} @ ${jellyfinConnection.server_name || 'Server'}`
                      : 'Not connected'}
                  </div>
                </div>
              </div>

              {jellyfinConnection ? (
                <div className="flex items-center gap-2">
                  <span className="px-2 py-1 text-xs bg-purple-500/20 text-purple-400 rounded">
                    Connected
                  </span>
                  <button
                    onClick={disconnectJellyfin}
                    className="px-3 py-1.5 text-sm text-red-400 hover:text-red-300 transition"
                  >
                    Disconnect
                  </button>
                </div>
              ) : (
                <button
                  onClick={() => setShowJellyfinForm(!showJellyfinForm)}
                  className="px-4 py-2 bg-violet-600 hover:bg-violet-500 text-white font-medium rounded-lg transition"
                >
                  {showJellyfinForm ? 'Cancel' : 'Connect'}
                </button>
              )}
            </div>

            {/* Jellyfin Connection Form */}
            {showJellyfinForm && !jellyfinConnection && (
              <form onSubmit={connectJellyfin} className="mt-4 space-y-4">
                <div>
                  <label className="block text-sm text-slate-400 mb-1">
                    Server URL <span className="text-red-400">*</span>
                  </label>
                  <input
                    type="url"
                    value={jellyfinForm.server_url}
                    onChange={(e) => setJellyfinForm({ ...jellyfinForm, server_url: e.target.value })}
                    placeholder="http://your-server:8096"
                    className="w-full px-3 py-2 bg-slate-800 border border-slate-700 rounded-lg text-white placeholder-slate-500 focus:outline-none focus:border-purple-500"
                  />
                  <p className="mt-1 text-xs text-slate-500">
                    The URL of your Jellyfin server (include port if needed)
                  </p>
                </div>
                <div>
                  <label className="block text-sm text-slate-400 mb-1">
                    Username <span className="text-red-400">*</span>
                  </label>
                  <input
                    type="text"
                    value={jellyfinForm.username}
                    onChange={(e) => setJellyfinForm({ ...jellyfinForm, username: e.target.value })}
                    placeholder="Your Jellyfin username"
                    className="w-full px-3 py-2 bg-slate-800 border border-slate-700 rounded-lg text-white placeholder-slate-500 focus:outline-none focus:border-purple-500"
                  />
                </div>
                <div>
                  <label className="block text-sm text-slate-400 mb-1">
                    Password
                  </label>
                  <input
                    type="password"
                    value={jellyfinForm.password}
                    onChange={(e) => setJellyfinForm({ ...jellyfinForm, password: e.target.value })}
                    placeholder="Your password (leave empty if none)"
                    className="w-full px-3 py-2 bg-slate-800 border border-slate-700 rounded-lg text-white placeholder-slate-500 focus:outline-none focus:border-purple-500"
                  />
                </div>

                {jellyfinError && (
                  <div className="text-sm text-red-400">
                    {jellyfinError}
                  </div>
                )}

                <button
                  type="submit"
                  disabled={jellyfinConnecting}
                  className="w-full py-2 bg-purple-500 hover:bg-purple-400 text-white font-medium rounded-lg transition disabled:opacity-50"
                >
                  {jellyfinConnecting ? (
                    <span className="flex items-center justify-center gap-2">
                      <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin"></div>
                      Testing Connection...
                    </span>
                  ) : (
                    'Test & Connect'
                  )}
                </button>
              </form>
            )}

          </div>

          {/* Emby Connection */}
          <div className="p-4 bg-slate-900 rounded-lg border border-slate-700 mt-4">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <img src="/icons/emby.svg" alt="Emby" className="w-10 h-10 rounded-lg" />
                <div>
                  <div className="font-medium">Emby</div>
                  <div className="text-sm text-slate-400">
                    {embyConnection
                      ? `${embyConnection.username} @ ${embyConnection.server_name || 'Server'}`
                      : 'Not connected'}
                  </div>
                </div>
              </div>

              {embyConnection ? (
                <div className="flex items-center gap-2">
                  <span className="px-2 py-1 text-xs bg-green-500/20 text-green-400 rounded">
                    Connected
                  </span>
                  <button
                    onClick={disconnectEmby}
                    className="px-3 py-1.5 text-sm text-red-400 hover:text-red-300 transition"
                  >
                    Disconnect
                  </button>
                </div>
              ) : (
                <button
                  onClick={() => setShowEmbyForm(!showEmbyForm)}
                  className="px-4 py-2 bg-violet-600 hover:bg-violet-500 text-white font-medium rounded-lg transition"
                >
                  {showEmbyForm ? 'Cancel' : 'Connect'}
                </button>
              )}
            </div>

            {/* Emby Connection Form */}
            {showEmbyForm && !embyConnection && (
              <form onSubmit={connectEmby} className="mt-4 space-y-4">
                <div>
                  <label className="block text-sm text-slate-400 mb-1">
                    Server URL <span className="text-red-400">*</span>
                  </label>
                  <input
                    type="url"
                    value={embyForm.server_url}
                    onChange={(e) => setEmbyForm({ ...embyForm, server_url: e.target.value })}
                    placeholder="http://your-server:8096"
                    className="w-full px-3 py-2 bg-slate-800 border border-slate-700 rounded-lg text-white placeholder-slate-500 focus:outline-none focus:border-green-500"
                  />
                  <p className="mt-1 text-xs text-slate-500">
                    The URL of your Emby server (include port if needed)
                  </p>
                </div>
                <div>
                  <label className="block text-sm text-slate-400 mb-1">
                    Username <span className="text-red-400">*</span>
                  </label>
                  <input
                    type="text"
                    value={embyForm.username}
                    onChange={(e) => setEmbyForm({ ...embyForm, username: e.target.value })}
                    placeholder="Your Emby username"
                    className="w-full px-3 py-2 bg-slate-800 border border-slate-700 rounded-lg text-white placeholder-slate-500 focus:outline-none focus:border-green-500"
                  />
                </div>
                <div>
                  <label className="block text-sm text-slate-400 mb-1">
                    Password
                  </label>
                  <input
                    type="password"
                    value={embyForm.password}
                    onChange={(e) => setEmbyForm({ ...embyForm, password: e.target.value })}
                    placeholder="Your password (leave empty if none)"
                    className="w-full px-3 py-2 bg-slate-800 border border-slate-700 rounded-lg text-white placeholder-slate-500 focus:outline-none focus:border-green-500"
                  />
                </div>

                {embyError && (
                  <div className="text-sm text-red-400">
                    {embyError}
                  </div>
                )}

                <button
                  type="submit"
                  disabled={embyConnecting}
                  className="w-full py-2 bg-green-500 hover:bg-green-400 text-white font-medium rounded-lg transition disabled:opacity-50"
                >
                  {embyConnecting ? (
                    <span className="flex items-center justify-center gap-2">
                      <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin"></div>
                      Testing Connection...
                    </span>
                  ) : (
                    'Test & Connect'
                  )}
                </button>
              </form>
            )}

          </div>

          {/* IPTV Connection */}
          <div className="p-4 bg-slate-900 rounded-lg border border-slate-700 mt-4">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <img src="/icons/iptv.svg" alt="IPTV" className="w-10 h-10 rounded-lg" />
                <div>
                  <div className="font-medium">IPTV Provider</div>
                  <div className="text-sm text-slate-400">
                    {iptvConnection
                      ? `${iptvConnection.provider_name} (${iptvConnection.connection_type.toUpperCase()})`
                      : 'Not connected'}
                  </div>
                </div>
              </div>

              {iptvConnection ? (
                <div className="flex items-center gap-2">
                  <span className="px-2 py-1 text-xs bg-blue-500/20 text-blue-400 rounded">
                    Connected
                  </span>
                  <button
                    onClick={disconnectIptv}
                    className="px-3 py-1.5 text-sm text-red-400 hover:text-red-300 transition"
                  >
                    Disconnect
                  </button>
                </div>
              ) : (
                <button
                  onClick={() => setShowIptvForm(!showIptvForm)}
                  className="px-4 py-2 bg-violet-600 hover:bg-violet-500 text-white font-medium rounded-lg transition"
                >
                  {showIptvForm ? 'Cancel' : 'Connect'}
                </button>
              )}
            </div>

            {/* IPTV Connection Form */}
            {showIptvForm && !iptvConnection && (
              <form onSubmit={connectIptv} className="mt-4 space-y-4">
                {/* Connection Type Toggle */}
                <div className="flex gap-2">
                  <button
                    type="button"
                    onClick={() => setIptvType('m3u')}
                    className={`flex-1 py-2 px-4 rounded-lg text-sm font-medium transition ${
                      iptvType === 'm3u'
                        ? 'bg-blue-500 text-white'
                        : 'bg-slate-800 text-slate-400 hover:bg-slate-700'
                    }`}
                  >
                    M3U Playlist
                  </button>
                  <button
                    type="button"
                    onClick={() => setIptvType('xtream')}
                    className={`flex-1 py-2 px-4 rounded-lg text-sm font-medium transition ${
                      iptvType === 'xtream'
                        ? 'bg-blue-500 text-white'
                        : 'bg-slate-800 text-slate-400 hover:bg-slate-700'
                    }`}
                  >
                    Xtream Codes
                  </button>
                </div>

                {/* Provider Name (optional) */}
                <div>
                  <label className="block text-sm text-slate-400 mb-1">
                    Provider Name <span className="text-slate-600">(optional)</span>
                  </label>
                  <input
                    type="text"
                    value={iptvForm.provider_name}
                    onChange={(e) => setIptvForm({ ...iptvForm, provider_name: e.target.value })}
                    placeholder="My IPTV Provider"
                    className="w-full px-3 py-2 bg-slate-800 border border-slate-700 rounded-lg text-white placeholder-slate-500 focus:outline-none focus:border-blue-500"
                  />
                </div>

                {/* M3U Fields */}
                {iptvType === 'm3u' && (
                  <div>
                    <label className="block text-sm text-slate-400 mb-1">
                      M3U URL <span className="text-red-400">*</span>
                    </label>
                    <input
                      type="url"
                      value={iptvForm.m3u_url}
                      onChange={(e) => setIptvForm({ ...iptvForm, m3u_url: e.target.value })}
                      placeholder="http://example.com/playlist.m3u"
                      className="w-full px-3 py-2 bg-slate-800 border border-slate-700 rounded-lg text-white placeholder-slate-500 focus:outline-none focus:border-blue-500"
                    />
                    <p className="mt-1 text-xs text-slate-500">
                      Enter the full URL to your M3U or M3U8 playlist file
                    </p>
                  </div>
                )}

                {/* Xtream Codes Fields */}
                {iptvType === 'xtream' && (
                  <>
                    <div>
                      <label className="block text-sm text-slate-400 mb-1">
                        Server URL <span className="text-red-400">*</span>
                      </label>
                      <input
                        type="text"
                        value={iptvForm.xtream_host}
                        onChange={(e) => setIptvForm({ ...iptvForm, xtream_host: e.target.value })}
                        placeholder="http://provider.com:8080"
                        className="w-full px-3 py-2 bg-slate-800 border border-slate-700 rounded-lg text-white placeholder-slate-500 focus:outline-none focus:border-blue-500"
                      />
                    </div>
                    <div>
                      <label className="block text-sm text-slate-400 mb-1">
                        Username <span className="text-red-400">*</span>
                      </label>
                      <input
                        type="text"
                        value={iptvForm.xtream_username}
                        onChange={(e) => setIptvForm({ ...iptvForm, xtream_username: e.target.value })}
                        placeholder="Your username"
                        className="w-full px-3 py-2 bg-slate-800 border border-slate-700 rounded-lg text-white placeholder-slate-500 focus:outline-none focus:border-blue-500"
                      />
                    </div>
                    <div>
                      <label className="block text-sm text-slate-400 mb-1">
                        Password <span className="text-red-400">*</span>
                      </label>
                      <input
                        type="password"
                        value={iptvForm.xtream_password}
                        onChange={(e) => setIptvForm({ ...iptvForm, xtream_password: e.target.value })}
                        placeholder="Your password"
                        className="w-full px-3 py-2 bg-slate-800 border border-slate-700 rounded-lg text-white placeholder-slate-500 focus:outline-none focus:border-blue-500"
                      />
                    </div>
                    <p className="text-xs text-slate-500">
                      Enter your Xtream Codes API credentials from your IPTV provider
                    </p>
                  </>
                )}

                {/* Error Message */}
                {iptvError && (
                  <div className="text-sm text-red-400">
                    {iptvError}
                  </div>
                )}

                {/* Test & Save Button */}
                <button
                  type="submit"
                  className="w-full py-2 bg-blue-500 hover:bg-blue-400 text-white font-medium rounded-lg transition"
                >
                  Test & Save Connection
                </button>
              </form>
            )}

          </div>
        </div>

        {/* Subscription Section - Hidden for now
        <div className="bg-slate-800/50 border border-slate-700 rounded-xl p-6 mb-6">
          <h2 className="text-lg font-semibold mb-4">Subscription</h2>
          <div className="flex items-center gap-2 mb-3">
            <span className={`w-2 h-2 rounded-full ${userData?.subscription_tier === 'basic' ? 'bg-violet-500' : 'bg-slate-500'}`}></span>
            <span className={userData?.subscription_tier === 'basic' ? 'text-violet-400 font-medium' : 'text-slate-400 font-medium'}>
              {userData?.subscription_tier === 'basic' ? 'Basic Plan' : 'Free Plan'}
            </span>
          </div>
          <p className="text-sm text-slate-500 mb-4">
            {userData?.subscription_tier === 'basic'
              ? 'You have access to all premium features'
              : 'Subscribe to NovixTV to access premium features'
            }
          </p>
          {userData?.subscription_tier !== 'basic' && (
            <button
              onClick={() => {
                goHome();
                setTimeout(() => {
                  const pricingSection = document.getElementById('pricing');
                  if (pricingSection) {
                    pricingSection.scrollIntoView({ behavior: 'smooth' });
                  }
                }, 100);
              }}
              className="px-4 py-2 bg-violet-600 hover:bg-violet-500 rounded-lg text-sm transition"
            >
              View Plans
            </button>
          )}
        </div>
        */}
      </div>

      {/* IPTV Test Modal */}
      <IptvTestModal
        isOpen={showIptvTestModal}
        onClose={() => setShowIptvTestModal(false)}
        iptvType={iptvType}
        iptvForm={iptvForm}
        onSave={saveIptvConnection}
      />

      {/* Plex Server Selection Modal */}
      <PlexServerSelectionModal
        isOpen={showServerSelection}
        onClose={() => {
          setShowServerSelection(false);
          setPlexAuthData(null);
        }}
        plexAuthToken={plexAuthData?.plexToken}
        onServerSelected={handleServerSelected}
      />
    </div>
  );
}
