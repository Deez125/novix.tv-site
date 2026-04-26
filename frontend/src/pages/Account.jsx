import { useState, useEffect } from 'react';
import { useAuth, startPlexAuth, checkPlexAuth } from '../lib/auth';
import { supabase } from '../lib/supabase';
import IptvTestModal from '../components/IptvTestModal';
import PlexServerSelectionModal from '../components/PlexServerSelectionModal';
import { IoMdInformationCircleOutline } from 'react-icons/io';

const API_BASE = import.meta.env.VITE_API_URL || 'http://localhost:8787';

const Wordmark = () => (
  <span className="wordmark" style={{ fontSize: '1.25rem' }}>
    novix<span className="wordmark-dot">.</span>tv
  </span>
);

const inputStyle = {
  background: 'var(--bg-elev)',
  border: '1px solid var(--hairline-strong)',
  color: 'var(--fg)',
};

const onFocus = (e) => (e.target.style.borderColor = 'var(--accent)');
const onBlur  = (e) => (e.target.style.borderColor = 'var(--hairline-strong)');

function StatusDot({ active }) {
  return (
    <span
      className="inline-block w-1.5 h-1.5 rounded-full mr-1.5"
      style={{
        background: active ? 'var(--accent-bright)' : 'var(--fg-dim)',
        boxShadow: active ? '0 0 8px var(--accent)' : 'none',
        transition: 'all 0.2s ease',
      }}
    />
  );
}

function StatusBadge({ active, label }) {
  return (
    <span
      className="inline-flex items-center text-[11px] uppercase tracking-wider font-medium px-2 py-1 rounded-full"
      style={{
        background: active ? 'rgba(110,168,255,0.10)' : 'rgba(255,255,255,0.04)',
        color: active ? 'var(--accent-bright)' : 'var(--fg-dim)',
        transition: 'all 0.2s ease',
      }}
    >
      <StatusDot active={active} />
      {label}
    </span>
  );
}

function ConnectionRow({ icon, name, statusText, badge, expanded, children, action }) {
  return (
    <div
      className="rounded-xl px-5 py-4"
      style={{
        background: 'var(--bg-elev)',
        transition: 'background 0.2s ease',
      }}
    >
      <div className="flex items-center justify-between gap-4">
        <div className="flex items-center gap-4 min-w-0">
          <img src={icon} alt={name} className="w-10 h-10 rounded-lg flex-shrink-0" />
          <div className="min-w-0">
            <div className="font-medium text-sm" style={{ color: 'var(--fg)' }}>{name}</div>
            <div className="text-xs mt-0.5 truncate" style={{ color: 'var(--fg-muted)' }}>
              {statusText}
            </div>
          </div>
        </div>
        <div className="flex items-center gap-3 flex-shrink-0">
          {badge}
          {action}
        </div>
      </div>

      <div
        className="auth-collapse"
        style={{
          maxHeight: expanded ? '600px' : '0',
          opacity: expanded ? 1 : 0,
          marginTop: expanded ? '1.25rem' : '0',
        }}
      >
        {children}
      </div>
    </div>
  );
}

function FormField({ label, required, optional, hint, children }) {
  return (
    <div>
      <label className="block text-xs font-medium uppercase tracking-wider mb-2" style={{ color: 'var(--fg-muted)' }}>
        {label}
        {required && <span style={{ color: 'var(--danger)' }}> *</span>}
        {optional && <span style={{ color: 'var(--fg-dim)' }}> (optional)</span>}
      </label>
      {children}
      {hint && <p className="mt-1.5 text-xs" style={{ color: 'var(--fg-dim)' }}>{hint}</p>}
    </div>
  );
}

function TextInput(props) {
  return (
    <input
      {...props}
      className="w-full px-4 py-2.5 rounded-lg text-sm focus:outline-none transition-colors"
      style={inputStyle}
      onFocus={onFocus}
      onBlur={onBlur}
    />
  );
}

function Spinner({ size = 'sm' }) {
  const px = size === 'sm' ? 'w-4 h-4' : 'w-5 h-5';
  return (
    <div
      className={`${px} rounded-full animate-spin`}
      style={{
        border: '2px solid rgba(255,255,255,0.15)',
        borderTopColor: 'var(--accent-bright)',
      }}
    />
  );
}

export default function Account() {
  const { user, signOut } = useAuth();
  const [userData, setUserData] = useState(null);
  const [plexConnection, setPlexConnection] = useState(null);
  const [iptvConnection, setIptvConnection] = useState(null);
  const [jellyfinConnection, setJellyfinConnection] = useState(null);
  const [embyConnection, setEmbyConnection] = useState(null);
  const [loading, setLoading] = useState(true);
  const [mounted, setMounted] = useState(false);

  // Plex
  const [plexConnecting, setPlexConnecting] = useState(false);
  const [plexError, setPlexError] = useState('');
  const [pollInterval, setPollInterval] = useState(null);
  const [showServerSelection, setShowServerSelection] = useState(false);
  const [plexAuthData, setPlexAuthData] = useState(null);

  // IPTV
  const [showIptvForm, setShowIptvForm] = useState(false);
  const [iptvType, setIptvType] = useState('m3u');
  const [iptvError, setIptvError] = useState('');
  const [showIptvTestModal, setShowIptvTestModal] = useState(false);
  const [iptvForm, setIptvForm] = useState({
    provider_name: '', m3u_url: '',
    xtream_host: '', xtream_username: '', xtream_password: '',
  });

  // Jellyfin
  const [showJellyfinForm, setShowJellyfinForm] = useState(false);
  const [jellyfinConnecting, setJellyfinConnecting] = useState(false);
  const [jellyfinError, setJellyfinError] = useState('');
  const [jellyfinForm, setJellyfinForm] = useState({ server_url: '', username: '', password: '' });

  // Emby
  const [showEmbyForm, setShowEmbyForm] = useState(false);
  const [embyConnecting, setEmbyConnecting] = useState(false);
  const [embyError, setEmbyError] = useState('');
  const [embyForm, setEmbyForm] = useState({ server_url: '', username: '', password: '' });

  useEffect(() => {
    const t = requestAnimationFrame(() => setMounted(true));
    return () => cancelAnimationFrame(t);
  }, []);

  useEffect(() => { if (user) fetchUserData(); }, [user]);

  const fetchUserData = async () => {
    try {
      const { data: userDataResult, error: userError } = await supabase
        .from('users').select('*').eq('auth_id', user.id).single();

      if (userError) {
        console.error('Error fetching user data:', userError);
      } else {
        setUserData(userDataResult);

        const fetchOne = async (table, setter) => {
          const { data, error } = await supabase
            .from(table).select('*').eq('user_id', userDataResult.id).single();
          if (error && error.code !== 'PGRST116') console.error(`Error fetching ${table}:`, error);
          else setter(data);
        };

        await Promise.all([
          fetchOne('plex_connections', setPlexConnection),
          fetchOne('iptv_connections', setIptvConnection),
          fetchOne('jellyfin_connections', setJellyfinConnection),
          fetchOne('emby_connections', setEmbyConnection),
        ]);
      }
    } catch (err) {
      console.error('Error:', err);
    } finally {
      setLoading(false);
    }
  };

  // ─────────── Plex ───────────
  const connectPlex = async () => {
    setPlexError('');
    setPlexConnecting(true);
    try {
      const data = await startPlexAuth();
      window.open(data.auth_url, '_blank', 'width=600,height=700');

      const interval = setInterval(async () => {
        try {
          const checkData = await checkPlexAuth(data.pin_id, data.pin_code);
          if (checkData.authorized) {
            clearInterval(interval);
            setPollInterval(null);
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
          }
        } catch (err) {
          console.error('Poll error:', err);
        }
      }, 2000);
      setPollInterval(interval);

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

  const handleServerSelected = async (serverInfo) => {
    try {
      if (!plexAuthData) return setPlexError('Missing authentication data');
      const { data: userRecord, error: userError } = await supabase
        .from('users').select('id').eq('auth_id', plexAuthData.userId).single();
      if (userError) return setPlexError('Failed to save Plex connection');

      const response = await fetch(`${API_BASE}/api/plex/save-server`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
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
      if (!response.ok) throw new Error('Failed to save Plex server');

      setPlexAuthData(null);
      setShowServerSelection(false);
      await fetchUserData();
    } catch (err) {
      setPlexError(err.message);
    }
  };

  const disconnectPlex = async () => {
    if (pollInterval) { clearInterval(pollInterval); setPollInterval(null); }
    try {
      const { data: userRecord } = await supabase.from('users').select('id').eq('auth_id', user.id).single();
      if (!userRecord) return;
      await supabase.from('plex_connections').delete().eq('user_id', userRecord.id);
      setPlexConnection(null);
      await fetchUserData();
    } catch (err) { console.error('Error:', err); }
  };

  // ─────────── IPTV ───────────
  const saveIptvConnection = async () => {
    try {
      const { data: userRecord, error: userError } = await supabase
        .from('users').select('id').eq('auth_id', user.id).single();
      if (userError) return false;

      const connectionData = {
        user_id: userRecord.id,
        provider_name: iptvForm.provider_name.trim() || (iptvType === 'm3u' ? 'M3U Playlist' : 'Xtream Provider'),
        connection_type: iptvType,
        connected_at: new Date().toISOString(),
      };
      if (iptvType === 'm3u') {
        Object.assign(connectionData, {
          m3u_url: iptvForm.m3u_url.trim(),
          xtream_host: null, xtream_username: null, xtream_password: null,
        });
      } else {
        Object.assign(connectionData, {
          xtream_host: iptvForm.xtream_host.trim(),
          xtream_username: iptvForm.xtream_username.trim(),
          xtream_password: iptvForm.xtream_password.trim(),
          m3u_url: null,
        });
      }

      const { error } = await supabase.from('iptv_connections').upsert(connectionData, { onConflict: 'user_id' });
      if (error) return false;

      setShowIptvForm(false);
      setIptvForm({ provider_name: '', m3u_url: '', xtream_host: '', xtream_username: '', xtream_password: '' });
      await fetchUserData();
      return true;
    } catch (err) { return false; }
  };

  const openIptvTestModal = () => {
    setIptvError('');
    if (iptvType === 'm3u') {
      if (!iptvForm.m3u_url.trim()) return setIptvError('M3U URL is required');
      try { new URL(iptvForm.m3u_url); } catch { return setIptvError('Please enter a valid URL'); }
    } else {
      if (!iptvForm.xtream_host.trim() || !iptvForm.xtream_username.trim() || !iptvForm.xtream_password.trim()) {
        return setIptvError('Host, username, and password are required');
      }
    }
    setShowIptvTestModal(true);
  };

  const connectIptv = (e) => { e.preventDefault(); openIptvTestModal(); };

  const disconnectIptv = async () => {
    try {
      const { data: userRecord } = await supabase.from('users').select('id').eq('auth_id', user.id).single();
      if (!userRecord) return;
      await supabase.from('iptv_connections').delete().eq('user_id', userRecord.id);
      setIptvConnection(null);
      setShowIptvForm(false);
    } catch (err) { console.error('Error:', err); }
  };

  // ─────────── Jellyfin ───────────
  const connectJellyfin = async (e) => {
    e.preventDefault();
    setJellyfinError('');
    setJellyfinConnecting(true);
    const { server_url, username, password } = jellyfinForm;
    if (!server_url.trim() || !username.trim()) {
      setJellyfinError('Server URL and username are required');
      setJellyfinConnecting(false);
      return;
    }
    const normalizedUrl = server_url.trim().replace(/\/$/, '');
    try {
      const response = await fetch(`${API_BASE}/api/jellyfin/auth`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ server_url: normalizedUrl, username: username.trim(), password: password || '' }),
      });
      const result = await response.json();
      if (!response.ok) throw new Error(result.error || 'Connection failed');

      const { data: userRecord, error: userError } = await supabase
        .from('users').select('id').eq('auth_id', user.id).single();
      if (userError) throw new Error('Failed to get user record');

      const { error } = await supabase.from('jellyfin_connections').upsert({
        user_id: userRecord.id,
        server_url: normalizedUrl,
        server_name: result.serverName,
        username: username.trim(),
        access_token: result.accessToken,
        user_id_on_server: result.userId,
        connected_at: new Date().toISOString(),
      }, { onConflict: 'user_id' });
      if (error) throw new Error('Failed to save connection');

      setShowJellyfinForm(false);
      setJellyfinForm({ server_url: '', username: '', password: '' });
      await fetchUserData();
    } catch (err) {
      setJellyfinError(err.message || 'Failed to connect to Jellyfin server');
    } finally {
      setJellyfinConnecting(false);
    }
  };

  const disconnectJellyfin = async () => {
    try {
      const { data: userRecord } = await supabase.from('users').select('id').eq('auth_id', user.id).single();
      if (!userRecord) return;
      await supabase.from('jellyfin_connections').delete().eq('user_id', userRecord.id);
      setJellyfinConnection(null);
      setShowJellyfinForm(false);
    } catch (err) { console.error('Error:', err); }
  };

  // ─────────── Emby ───────────
  const connectEmby = async (e) => {
    e.preventDefault();
    setEmbyError('');
    setEmbyConnecting(true);
    const { server_url, username, password } = embyForm;
    if (!server_url.trim() || !username.trim()) {
      setEmbyError('Server URL and username are required');
      setEmbyConnecting(false);
      return;
    }
    const normalizedUrl = server_url.trim().replace(/\/$/, '');
    try {
      const response = await fetch(`${API_BASE}/api/emby/auth`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ server_url: normalizedUrl, username: username.trim(), password: password || '' }),
      });
      const result = await response.json();
      if (!response.ok) throw new Error(result.error || 'Connection failed');

      const { data: userRecord, error: userError } = await supabase
        .from('users').select('id').eq('auth_id', user.id).single();
      if (userError) throw new Error('Failed to get user record');

      const { error } = await supabase.from('emby_connections').upsert({
        user_id: userRecord.id,
        server_url: normalizedUrl,
        server_name: result.serverName,
        username: username.trim(),
        access_token: result.accessToken,
        user_id_on_server: result.userId,
        connected_at: new Date().toISOString(),
      }, { onConflict: 'user_id' });
      if (error) throw new Error('Failed to save connection');

      setShowEmbyForm(false);
      setEmbyForm({ server_url: '', username: '', password: '' });
      await fetchUserData();
    } catch (err) {
      setEmbyError(err.message || 'Failed to connect to Emby server');
    } finally {
      setEmbyConnecting(false);
    }
  };

  const disconnectEmby = async () => {
    try {
      const { data: userRecord } = await supabase.from('users').select('id').eq('auth_id', user.id).single();
      if (!userRecord) return;
      await supabase.from('emby_connections').delete().eq('user_id', userRecord.id);
      setEmbyConnection(null);
      setShowEmbyForm(false);
    } catch (err) { console.error('Error:', err); }
  };

  const navigate = (path) => {
    window.history.pushState({}, '', path);
    window.dispatchEvent(new PopStateEvent('popstate'));
  };

  const handleLogout = async () => {
    try {
      await signOut();
      navigate('/');
    } catch (err) { console.error(err); }
  };

  if (!user) {
    return (
      <div className="min-h-screen text-white flex items-center justify-center" style={{ background: 'var(--bg)' }}>
        <div className="text-center">
          <h1 className="text-2xl font-semibold mb-4 tracking-tight">Not signed in</h1>
          <button onClick={() => navigate('/')} className="btn-primary">Go to home</button>
        </div>
      </div>
    );
  }

  const plexConnected = !!plexConnection?.plex_user_id;

  // ─────────── Render ───────────
  const PrimaryBtn = ({ onClick, disabled, children }) => (
    <button
      onClick={onClick}
      disabled={disabled}
      className="btn-primary"
      style={{ padding: '0.55rem 1.1rem', fontSize: '0.85rem' }}
    >
      {children}
    </button>
  );

  const GhostBtn = ({ onClick, children, danger }) => (
    <button
      onClick={onClick}
      className="text-xs font-medium px-3 py-1.5 rounded-md transition-colors"
      style={{ color: danger ? 'var(--danger)' : 'var(--fg-muted)' }}
      onMouseEnter={(e) => (e.currentTarget.style.background = 'var(--surface-hover)')}
      onMouseLeave={(e) => (e.currentTarget.style.background = 'transparent')}
    >
      {children}
    </button>
  );

  return (
    <div className="min-h-screen text-white" style={{ background: 'var(--bg)' }}>
      {/* Header */}
      <nav className="sticky top-0 z-40" style={{ background: 'var(--bg)', borderBottom: '1px solid var(--hairline)' }}>
        <div className="max-w-3xl mx-auto px-6 py-4 flex items-center justify-between">
          <button onClick={() => navigate('/')} className="flex items-center">
            <Wordmark />
          </button>
          <button
            onClick={() => navigate('/')}
            className="btn-ghost text-sm"
          >
            ← Back
          </button>
        </div>
      </nav>

      {/* Content */}
      <div className={`max-w-3xl mx-auto px-6 py-12 ${mounted ? 'auth-enter' : 'auth-enter-pre'}`}>
        <div className="mb-12">
          <div className="eyebrow mb-3">Account</div>
          <h1 className="text-4xl font-bold tracking-tight" style={{ letterSpacing: '-0.025em' }}>
            Settings
          </h1>
        </div>

        {/* ─────────── Profile ─────────── */}
        <section className="mb-14">
          <div className="flex items-center justify-between mb-5">
            <h2 className="text-xs uppercase tracking-[0.18em] font-medium" style={{ color: 'var(--fg-muted)' }}>
              Profile
            </h2>
          </div>
          <div className="flex items-center gap-5">
            {user.user_metadata?.avatar_url || user.user_metadata?.picture ? (
              <img
                src={user.user_metadata?.avatar_url || user.user_metadata?.picture}
                alt=""
                className="w-14 h-14 rounded-full"
              />
            ) : (
              <div className="w-14 h-14 rounded-full flex items-center justify-center text-xl font-semibold"
                   style={{ background: 'rgba(110,168,255,0.12)', color: 'var(--accent-bright)' }}>
                {user.email?.charAt(0).toUpperCase() || 'U'}
              </div>
            )}
            <div className="flex-1 min-w-0">
              <div className="text-base font-medium truncate" style={{ color: 'var(--fg)' }}>
                {user.user_metadata?.full_name || user.user_metadata?.name || user.email}
              </div>
              <div className="text-sm truncate" style={{ color: 'var(--fg-muted)' }}>{user.email}</div>
              <div className="text-xs mt-1" style={{ color: 'var(--fg-dim)' }}>
                Signed in via {user.app_metadata?.provider || 'email'}
              </div>
            </div>
            <GhostBtn onClick={handleLogout} danger>Sign out</GhostBtn>
          </div>
        </section>

        {/* Section divider */}
        <div className="border-t hairline mb-10" />

        {/* ─────────── Connected Services ─────────── */}
        <section>
          <div className="flex items-center justify-between mb-5">
            <h2 className="text-xs uppercase tracking-[0.18em] font-medium" style={{ color: 'var(--fg-muted)' }}>
              Connected services
            </h2>
          </div>

          {/* Info note */}
          <div
            className="rounded-lg px-4 py-3 mb-5 flex items-start gap-3"
            style={{ background: 'rgba(110,168,255,0.06)' }}
          >
            <IoMdInformationCircleOutline
              className="w-5 h-5 flex-shrink-0 mt-0.5"
              style={{ color: 'var(--accent-bright)' }}
            />
            <p className="text-xs leading-relaxed" style={{ color: 'var(--fg-muted)' }}>
              <span style={{ color: 'var(--fg)' }} className="font-medium">
                Jellyfin & Emby servers must be publicly accessible.
              </span>{' '}
              Local servers (192.168.x.x, localhost) won't work directly. Use{' '}
              <a href="https://developers.cloudflare.com/cloudflare-one/connections/connect-networks/"
                 target="_blank" rel="noopener noreferrer"
                 className="hover:underline" style={{ color: 'var(--accent-bright)' }}>
                Cloudflare Tunnel
              </a>,{' '}
              <a href="https://tailscale.com/kb/1223/funnel"
                 target="_blank" rel="noopener noreferrer"
                 className="hover:underline" style={{ color: 'var(--accent-bright)' }}>
                Tailscale Funnel
              </a>, or a reverse proxy to expose your server.
            </p>
          </div>

          <div className="space-y-3">
            {/* ─────────── Plex ─────────── */}
            <ConnectionRow
              icon={plexConnected && plexConnection?.plex_avatar_url ? plexConnection.plex_avatar_url : '/icons/plex.svg'}
              name="Plex"
              statusText={
                plexConnected
                  ? `${plexConnection.plex_username}${plexConnection.plex_server_name ? ` • ${plexConnection.plex_server_name}` : ''}`
                  : (plexConnecting ? 'Awaiting authorization in popup…' : 'Not connected')
              }
              badge={plexConnected ? <StatusBadge active label="Linked" /> : null}
              expanded={!!plexError}
              action={
                plexConnected ? (
                  <GhostBtn onClick={disconnectPlex} danger>Disconnect</GhostBtn>
                ) : (
                  <PrimaryBtn onClick={connectPlex} disabled={plexConnecting}>
                    {plexConnecting ? <span className="flex items-center gap-2"><Spinner /> Connecting</span> : 'Connect'}
                  </PrimaryBtn>
                )
              }
            >
              {plexError && (
                <div className="text-sm rounded-lg px-3 py-2"
                     style={{ background: 'rgba(239,106,106,0.08)', color: 'var(--danger)' }}>
                  {plexError}
                </div>
              )}
            </ConnectionRow>

            {/* ─────────── Jellyfin ─────────── */}
            <ConnectionRow
              icon="/icons/jellyfin.svg"
              name="Jellyfin"
              statusText={
                jellyfinConnection
                  ? `${jellyfinConnection.username} • ${jellyfinConnection.server_name || 'Server'}`
                  : 'Not connected'
              }
              badge={jellyfinConnection ? <StatusBadge active label="Linked" /> : null}
              expanded={showJellyfinForm && !jellyfinConnection}
              action={
                jellyfinConnection ? (
                  <GhostBtn onClick={disconnectJellyfin} danger>Disconnect</GhostBtn>
                ) : (
                  <PrimaryBtn onClick={() => setShowJellyfinForm(!showJellyfinForm)}>
                    {showJellyfinForm ? 'Cancel' : 'Connect'}
                  </PrimaryBtn>
                )
              }
            >
              <form onSubmit={connectJellyfin} className="space-y-4">
                <FormField label="Server URL" required hint="The URL of your Jellyfin server (include port if needed)">
                  <TextInput
                    type="url" value={jellyfinForm.server_url}
                    onChange={(e) => setJellyfinForm({ ...jellyfinForm, server_url: e.target.value })}
                    placeholder="https://your-server:8096"
                  />
                </FormField>
                <FormField label="Username" required>
                  <TextInput
                    type="text" value={jellyfinForm.username}
                    onChange={(e) => setJellyfinForm({ ...jellyfinForm, username: e.target.value })}
                    placeholder="Your Jellyfin username"
                  />
                </FormField>
                <FormField label="Password">
                  <TextInput
                    type="password" value={jellyfinForm.password}
                    onChange={(e) => setJellyfinForm({ ...jellyfinForm, password: e.target.value })}
                    placeholder="Leave empty if none"
                  />
                </FormField>
                {jellyfinError && (
                  <div className="text-sm rounded-lg px-3 py-2"
                       style={{ background: 'rgba(239,106,106,0.08)', color: 'var(--danger)' }}>
                    {jellyfinError}
                  </div>
                )}
                <button type="submit" disabled={jellyfinConnecting} className="btn-primary w-full">
                  {jellyfinConnecting
                    ? <span className="flex items-center justify-center gap-2"><Spinner /> Testing connection…</span>
                    : 'Test & connect'}
                </button>
              </form>
            </ConnectionRow>

            {/* ─────────── Emby ─────────── */}
            <ConnectionRow
              icon="/icons/emby.svg"
              name="Emby"
              statusText={
                embyConnection
                  ? `${embyConnection.username} • ${embyConnection.server_name || 'Server'}`
                  : 'Not connected'
              }
              badge={embyConnection ? <StatusBadge active label="Linked" /> : null}
              expanded={showEmbyForm && !embyConnection}
              action={
                embyConnection ? (
                  <GhostBtn onClick={disconnectEmby} danger>Disconnect</GhostBtn>
                ) : (
                  <PrimaryBtn onClick={() => setShowEmbyForm(!showEmbyForm)}>
                    {showEmbyForm ? 'Cancel' : 'Connect'}
                  </PrimaryBtn>
                )
              }
            >
              <form onSubmit={connectEmby} className="space-y-4">
                <FormField label="Server URL" required hint="The URL of your Emby server (include port if needed)">
                  <TextInput
                    type="url" value={embyForm.server_url}
                    onChange={(e) => setEmbyForm({ ...embyForm, server_url: e.target.value })}
                    placeholder="https://your-server:8096"
                  />
                </FormField>
                <FormField label="Username" required>
                  <TextInput
                    type="text" value={embyForm.username}
                    onChange={(e) => setEmbyForm({ ...embyForm, username: e.target.value })}
                    placeholder="Your Emby username"
                  />
                </FormField>
                <FormField label="Password">
                  <TextInput
                    type="password" value={embyForm.password}
                    onChange={(e) => setEmbyForm({ ...embyForm, password: e.target.value })}
                    placeholder="Leave empty if none"
                  />
                </FormField>
                {embyError && (
                  <div className="text-sm rounded-lg px-3 py-2"
                       style={{ background: 'rgba(239,106,106,0.08)', color: 'var(--danger)' }}>
                    {embyError}
                  </div>
                )}
                <button type="submit" disabled={embyConnecting} className="btn-primary w-full">
                  {embyConnecting
                    ? <span className="flex items-center justify-center gap-2"><Spinner /> Testing connection…</span>
                    : 'Test & connect'}
                </button>
              </form>
            </ConnectionRow>

            {/* ─────────── IPTV ─────────── */}
            <ConnectionRow
              icon="/icons/iptv.svg"
              name="IPTV Provider"
              statusText={
                iptvConnection
                  ? `${iptvConnection.provider_name} • ${iptvConnection.connection_type.toUpperCase()}`
                  : 'Not connected'
              }
              badge={iptvConnection ? <StatusBadge active label="Linked" /> : null}
              expanded={showIptvForm && !iptvConnection}
              action={
                iptvConnection ? (
                  <GhostBtn onClick={disconnectIptv} danger>Disconnect</GhostBtn>
                ) : (
                  <PrimaryBtn onClick={() => setShowIptvForm(!showIptvForm)}>
                    {showIptvForm ? 'Cancel' : 'Connect'}
                  </PrimaryBtn>
                )
              }
            >
              <form onSubmit={connectIptv} className="space-y-4">
                {/* Type toggle */}
                <div className="flex gap-2 p-1 rounded-lg" style={{ background: 'var(--bg)' }}>
                  {[
                    { id: 'm3u', label: 'M3U Playlist' },
                    { id: 'xtream', label: 'Xtream Codes' },
                  ].map(({ id, label }) => (
                    <button
                      key={id} type="button"
                      onClick={() => setIptvType(id)}
                      className="flex-1 py-2 rounded-md text-xs font-medium transition-all"
                      style={{
                        background: iptvType === id ? 'var(--surface)' : 'transparent',
                        color: iptvType === id ? 'var(--fg)' : 'var(--fg-muted)',
                      }}
                    >
                      {label}
                    </button>
                  ))}
                </div>

                <FormField label="Provider name" optional>
                  <TextInput
                    type="text" value={iptvForm.provider_name}
                    onChange={(e) => setIptvForm({ ...iptvForm, provider_name: e.target.value })}
                    placeholder="My IPTV Provider"
                  />
                </FormField>

                {iptvType === 'm3u' && (
                  <FormField label="M3U URL" required hint="Full URL to your M3U or M3U8 playlist file">
                    <TextInput
                      type="url" value={iptvForm.m3u_url}
                      onChange={(e) => setIptvForm({ ...iptvForm, m3u_url: e.target.value })}
                      placeholder="http://example.com/playlist.m3u"
                    />
                  </FormField>
                )}

                {iptvType === 'xtream' && (
                  <>
                    <FormField label="Server URL" required>
                      <TextInput
                        type="text" value={iptvForm.xtream_host}
                        onChange={(e) => setIptvForm({ ...iptvForm, xtream_host: e.target.value })}
                        placeholder="http://provider.com:8080"
                      />
                    </FormField>
                    <FormField label="Username" required>
                      <TextInput
                        type="text" value={iptvForm.xtream_username}
                        onChange={(e) => setIptvForm({ ...iptvForm, xtream_username: e.target.value })}
                        placeholder="Your username"
                      />
                    </FormField>
                    <FormField label="Password" required hint="Xtream Codes API credentials from your IPTV provider">
                      <TextInput
                        type="password" value={iptvForm.xtream_password}
                        onChange={(e) => setIptvForm({ ...iptvForm, xtream_password: e.target.value })}
                        placeholder="Your password"
                      />
                    </FormField>
                  </>
                )}

                {iptvError && (
                  <div className="text-sm rounded-lg px-3 py-2"
                       style={{ background: 'rgba(239,106,106,0.08)', color: 'var(--danger)' }}>
                    {iptvError}
                  </div>
                )}

                <button type="submit" className="btn-primary w-full">
                  Test & save connection
                </button>
              </form>
            </ConnectionRow>
          </div>
        </section>
      </div>

      <IptvTestModal
        isOpen={showIptvTestModal}
        onClose={() => setShowIptvTestModal(false)}
        iptvType={iptvType}
        iptvForm={iptvForm}
        onSave={saveIptvConnection}
      />

      <PlexServerSelectionModal
        isOpen={showServerSelection}
        onClose={() => { setShowServerSelection(false); setPlexAuthData(null); }}
        plexAuthToken={plexAuthData?.plexToken}
        onServerSelected={handleServerSelected}
      />
    </div>
  );
}
