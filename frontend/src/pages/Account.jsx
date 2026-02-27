import { useState, useEffect } from 'react';
import { useAuth, startPlexAuth, checkPlexAuth } from '../lib/auth';
import { supabase } from '../lib/supabase';
import IptvTestModal from '../components/IptvTestModal';

export default function Account() {
  const { user, signOut } = useAuth();
  const [userData, setUserData] = useState(null);
  const [plexConnection, setPlexConnection] = useState(null);
  const [iptvConnection, setIptvConnection] = useState(null);
  const [loading, setLoading] = useState(true);

  // Plex connection state
  const [plexConnecting, setPlexConnecting] = useState(false);
  const [plexError, setPlexError] = useState('');
  const [pollInterval, setPollInterval] = useState(null);

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

            // First get the user's id from the users table
            const { data: userRecord, error: userError } = await supabase
              .from('users')
              .select('id')
              .eq('auth_id', user.id)
              .single();

            if (userError) {
              console.error('Error fetching user record:', userError);
              setPlexError('Failed to save Plex connection');
              setPlexConnecting(false);
              return;
            }

            // Upsert Plex connection to separate table
            const { error } = await supabase
              .from('plex_connections')
              .upsert({
                user_id: userRecord.id,
                plex_user_id: checkData.plex_user.id,
                plex_username: checkData.plex_user.username,
                plex_email: checkData.plex_user.email,
                plex_avatar_url: checkData.plex_user.thumb,
                plex_token: checkData.plex_user.authToken || null,
                connected_at: new Date().toISOString(),
              }, {
                onConflict: 'user_id'
              });

            if (error) {
              console.error('Error saving Plex connection:', error);
              setPlexError('Failed to save Plex connection');
            } else {
              // Refresh user data
              await fetchUserData();
            }

            setPlexConnecting(false);
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
            <div>
              <div className="text-xl font-medium">
                {user.user_metadata?.full_name || user.user_metadata?.name || user.email}
              </div>
              <div className="text-sm text-slate-400">{user.email}</div>
              <div className="text-sm text-slate-500 mt-1">
                Signed in via {user.app_metadata?.provider || 'email'}
              </div>
            </div>
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
                  <div className="w-10 h-10 bg-amber-500/20 rounded-lg flex items-center justify-center">
                    <svg className="w-5 h-5 text-amber-400" viewBox="0 0 24 24" fill="currentColor">
                      <path d="M12 2L2 12h3v8h14v-8h3L12 2zm0 3.5L18 12h-2v6H8v-6H6l6-6.5z"/>
                    </svg>
                  </div>
                )}
                <div>
                  <div className="font-medium">Plex</div>
                  <div className="text-sm text-slate-400">
                    {plexConnected ? `Connected as ${plexConnection.plex_username}` : 'Not connected'}
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
                  className="px-4 py-2 bg-amber-500 hover:bg-amber-400 text-black font-medium rounded-lg transition disabled:opacity-50"
                >
                  {plexConnecting ? 'Connecting...' : 'Connect Plex'}
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

            {!plexConnected && !plexConnecting && (
              <p className="mt-3 text-xs text-slate-500">
                Connect your Plex account to access your libraries through NovixTV
              </p>
            )}
          </div>

          {/* IPTV Connection */}
          <div className="p-4 bg-slate-900 rounded-lg border border-slate-700 mt-4">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 bg-blue-500/20 rounded-lg flex items-center justify-center">
                  <svg className="w-5 h-5 text-blue-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9.75 17L9 20l-1 1h8l-1-1-.75-3M3 13h18M5 17h14a2 2 0 002-2V5a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" />
                  </svg>
                </div>
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
                  className="px-4 py-2 bg-blue-500 hover:bg-blue-400 text-white font-medium rounded-lg transition"
                >
                  {showIptvForm ? 'Cancel' : 'Connect IPTV'}
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

            {!showIptvForm && !iptvConnection && (
              <p className="mt-3 text-xs text-slate-500">
                Connect your IPTV provider (M3U/Xtream Codes) for live TV access
              </p>
            )}
          </div>
        </div>

        {/* Subscription Section */}
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

        {/* Danger Zone */}
        <div className="bg-slate-800/50 border border-slate-700 rounded-xl p-6">
          <h2 className="text-lg font-semibold mb-4 text-red-400">Danger Zone</h2>
          <div className="flex items-center justify-between">
            <div>
              <div className="font-medium">Sign Out</div>
              <div className="text-sm text-slate-400">Sign out of your account on this device</div>
            </div>
            <button
              onClick={handleLogout}
              className="px-4 py-2 bg-red-600/20 hover:bg-red-600/30 text-red-400 border border-red-600/30 rounded-lg transition"
            >
              Sign Out
            </button>
          </div>
        </div>
      </div>

      {/* IPTV Test Modal */}
      <IptvTestModal
        isOpen={showIptvTestModal}
        onClose={() => setShowIptvTestModal(false)}
        iptvType={iptvType}
        iptvForm={iptvForm}
        onSave={saveIptvConnection}
      />
    </div>
  );
}
