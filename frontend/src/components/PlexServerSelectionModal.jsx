import { useState, useEffect } from 'react';
import { IoMdHome, IoMdGlobe, IoMdSwap, IoMdCheckmark, IoMdClose } from 'react-icons/io';

export default function PlexServerSelectionModal({ isOpen, onClose, plexAuthToken, onServerSelected }) {
  const [servers, setServers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [selectedServer, setSelectedServer] = useState(null);
  const [selectedConnection, setSelectedConnection] = useState(null);
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    if (isOpen) {
      const t = requestAnimationFrame(() => setMounted(true));
      if (plexAuthToken) fetchServers();
      return () => cancelAnimationFrame(t);
    } else {
      setMounted(false);
    }
  }, [isOpen, plexAuthToken]);

  // Lock body scroll while open
  useEffect(() => {
    if (isOpen) {
      const prev = document.body.style.overflow;
      document.body.style.overflow = 'hidden';
      return () => { document.body.style.overflow = prev; };
    }
  }, [isOpen]);

  // Esc to close
  useEffect(() => {
    if (!isOpen) return;
    const onKey = (e) => { if (e.key === 'Escape') onClose(); };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [isOpen, onClose]);

  const fetchServers = async () => {
    try {
      setLoading(true);
      setError('');
      const response = await fetch(
        `${import.meta.env.VITE_API_URL || 'http://localhost:8787'}/api/plex/servers?auth_token=${encodeURIComponent(plexAuthToken)}`
      );
      if (!response.ok) throw new Error('Failed to fetch Plex servers');
      const data = await response.json();
      setServers(data.servers || []);

      if (data.servers && data.servers.length === 1) {
        const server = data.servers[0];
        setSelectedServer(server);
        if (server.connections?.length > 0) setSelectedConnection(server.connections[0]);
      }
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  const handleSelectServer = (server) => {
    setSelectedServer(server);
    if (server.connections?.length > 0) setSelectedConnection(server.connections[0]);
    else setSelectedConnection(null);
  };

  const handleConfirm = () => {
    if (selectedServer && selectedConnection) {
      onServerSelected({
        serverUrl: selectedConnection.uri,
        serverName: selectedServer.name,
        serverMachineId: selectedServer.clientIdentifier,
      });
      onClose();
    }
  };

  if (!isOpen) return null;

  const ConnectionTypeBadge = ({ conn }) => {
    if (conn.local) {
      return (
        <span className="inline-flex items-center gap-1 text-[10px] uppercase tracking-wider font-medium" style={{ color: 'var(--accent-bright)' }}>
          <IoMdHome className="w-3 h-3" /> Local
        </span>
      );
    }
    if (conn.relay) {
      return (
        <span className="inline-flex items-center gap-1 text-[10px] uppercase tracking-wider font-medium" style={{ color: '#f0b96b' }}>
          <IoMdSwap className="w-3 h-3" /> Relay
        </span>
      );
    }
    return (
      <span className="inline-flex items-center gap-1 text-[10px] uppercase tracking-wider font-medium" style={{ color: 'var(--fg-muted)' }}>
        <IoMdGlobe className="w-3 h-3" /> Remote
      </span>
    );
  };

  return (
    <div
      className="fixed inset-0 flex items-center justify-center z-[200] p-4"
      style={{
        background: 'rgba(0, 0, 0, 0.65)',
        backdropFilter: 'blur(8px)',
        opacity: mounted ? 1 : 0,
        transition: 'opacity 0.2s ease',
      }}
      onClick={onClose}
    >
      <div
        className="w-full max-w-xl flex flex-col rounded-2xl overflow-hidden"
        style={{
          background: 'var(--surface)',
          maxHeight: '85vh',
          boxShadow: '0 30px 60px -10px rgba(0,0,0,0.7), 0 18px 36px -10px rgba(0,0,0,0.5)',
          opacity: mounted ? 1 : 0,
          transform: mounted ? 'scale(1) translateY(0)' : 'scale(0.96) translateY(8px)',
          transition: 'opacity 0.22s ease, transform 0.28s cubic-bezier(0.2, 0.9, 0.3, 1.1)',
        }}
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="px-7 pt-6 pb-5 flex items-start justify-between">
          <div>
            <div className="eyebrow mb-2" style={{ fontSize: '0.65rem' }}>Plex</div>
            <h2 className="text-xl font-semibold tracking-tight" style={{ color: 'var(--fg)', letterSpacing: '-0.02em' }}>
              Select your server
            </h2>
            <p className="text-sm mt-1.5" style={{ color: 'var(--fg-muted)' }}>
              Choose which Plex server to connect to novix.tv
            </p>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 rounded-md transition-colors"
            style={{ color: 'var(--fg-muted)' }}
            onMouseEnter={(e) => { e.currentTarget.style.background = 'var(--surface-hover)'; e.currentTarget.style.color = 'var(--fg)'; }}
            onMouseLeave={(e) => { e.currentTarget.style.background = 'transparent'; e.currentTarget.style.color = 'var(--fg-muted)'; }}
            aria-label="Close"
          >
            <IoMdClose className="w-5 h-5" />
          </button>
        </div>

        <div className="border-t hairline" />

        {/* Content */}
        <div className="px-7 py-5 overflow-y-auto flex-1">
          {loading ? (
            <div className="flex flex-col items-center justify-center py-16 gap-3">
              <div
                className="w-8 h-8 rounded-full animate-spin"
                style={{ border: '2px solid rgba(255,255,255,0.1)', borderTopColor: 'var(--accent-bright)' }}
              />
              <p className="text-sm" style={{ color: 'var(--fg-muted)' }}>Finding your servers…</p>
            </div>
          ) : error ? (
            <div className="text-center py-12">
              <p className="text-sm mb-5" style={{ color: 'var(--danger)' }}>{error}</p>
              <button onClick={fetchServers} className="btn-primary">Retry</button>
            </div>
          ) : servers.length === 0 ? (
            <div className="text-center py-16">
              <p className="text-sm" style={{ color: 'var(--fg-muted)' }}>
                No Plex servers found.
                <br />
                <span style={{ color: 'var(--fg-dim)' }}>Make sure Plex Media Server is running.</span>
              </p>
            </div>
          ) : (
            <div className="space-y-2.5">
              {servers.map((server) => {
                const isSelected = selectedServer?.clientIdentifier === server.clientIdentifier;
                return (
                  <div
                    key={server.clientIdentifier}
                    onClick={() => handleSelectServer(server)}
                    className="rounded-xl px-5 py-4 cursor-pointer transition-all"
                    style={{
                      background: isSelected ? 'rgba(110,168,255,0.06)' : 'var(--bg-elev)',
                      boxShadow: isSelected ? '0 0 0 1px var(--accent)' : '0 0 0 1px transparent',
                    }}
                  >
                    <div className="flex items-center justify-between gap-3">
                      <div className="flex items-center gap-3.5 min-w-0">
                        <img src="/icons/plex.svg" alt="Plex" className="w-9 h-9 rounded-lg flex-shrink-0" />
                        <div className="min-w-0">
                          <div className="font-medium text-sm truncate" style={{ color: 'var(--fg)' }}>
                            {server.name}
                          </div>
                          <div className="text-xs mt-0.5" style={{ color: 'var(--fg-muted)' }}>
                            {server.owned ? 'Owned by you' : 'Shared with you'} · {server.connections.length} connection{server.connections.length !== 1 ? 's' : ''}
                          </div>
                        </div>
                      </div>
                      <div
                        className="w-5 h-5 rounded-full flex items-center justify-center flex-shrink-0 transition-all"
                        style={{
                          background: isSelected ? 'var(--accent)' : 'transparent',
                          border: isSelected ? 'none' : '1.5px solid var(--hairline-strong)',
                          transform: isSelected ? 'scale(1)' : 'scale(0.92)',
                        }}
                      >
                        {isSelected && <IoMdCheckmark className="w-3.5 h-3.5" style={{ color: 'var(--bg)' }} />}
                      </div>
                    </div>

                    {/* Connections list (multi) */}
                    <div
                      className="auth-collapse"
                      style={{
                        maxHeight: isSelected && server.connections.length > 1 ? '400px' : '0',
                        opacity: isSelected && server.connections.length > 1 ? 1 : 0,
                        marginTop: isSelected && server.connections.length > 1 ? '1rem' : '0',
                      }}
                    >
                      <div className="text-[11px] uppercase tracking-wider font-medium mb-2" style={{ color: 'var(--fg-muted)' }}>
                        Available connections
                      </div>
                      <div className="space-y-1.5">
                        {server.connections.map((conn, idx) => {
                          const isConnSelected = selectedConnection?.uri === conn.uri;
                          return (
                            <div
                              key={idx}
                              onClick={(e) => { e.stopPropagation(); setSelectedConnection(conn); }}
                              className="px-3 py-2 rounded-lg cursor-pointer transition-all"
                              style={{
                                background: isConnSelected ? 'rgba(110,168,255,0.08)' : 'rgba(255,255,255,0.02)',
                                boxShadow: isConnSelected ? 'inset 0 0 0 1px var(--accent)' : 'inset 0 0 0 1px transparent',
                              }}
                            >
                              <div className="flex items-start justify-between gap-3">
                                <div
                                  className="text-xs font-mono min-w-0 flex-1 leading-relaxed"
                                  style={{
                                    color: isConnSelected ? 'var(--fg)' : 'var(--fg-muted)',
                                    wordBreak: 'break-all',
                                  }}
                                >
                                  {conn.uri}
                                </div>
                                <div className="flex-shrink-0 mt-0.5">
                                  <ConnectionTypeBadge conn={conn} />
                                </div>
                              </div>
                            </div>
                          );
                        })}
                      </div>
                    </div>

                    {/* Single connection inline */}
                    {isSelected && server.connections.length === 1 && (
                      <div className="mt-3 px-3 py-2 rounded-lg flex items-start justify-between gap-3" style={{ background: 'rgba(255,255,255,0.02)' }}>
                        <div
                          className="text-xs font-mono min-w-0 flex-1 leading-relaxed"
                          style={{ color: 'var(--fg-muted)', wordBreak: 'break-all' }}
                        >
                          {server.connections[0].uri}
                        </div>
                        <div className="flex-shrink-0 mt-0.5">
                          <ConnectionTypeBadge conn={server.connections[0]} />
                        </div>
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          )}
        </div>

        <div className="border-t hairline" />

        {/* Footer */}
        <div className="px-7 py-4 flex items-center justify-between">
          <button
            onClick={onClose}
            className="text-sm font-medium px-3 py-1.5 rounded-md transition-colors"
            style={{ color: 'var(--fg-muted)' }}
            onMouseEnter={(e) => { e.currentTarget.style.background = 'var(--surface-hover)'; e.currentTarget.style.color = 'var(--fg)'; }}
            onMouseLeave={(e) => { e.currentTarget.style.background = 'transparent'; e.currentTarget.style.color = 'var(--fg-muted)'; }}
          >
            Cancel
          </button>
          <button
            onClick={handleConfirm}
            disabled={!selectedServer || !selectedConnection}
            className="btn-primary disabled:opacity-40 disabled:cursor-not-allowed"
            style={{ padding: '0.6rem 1.2rem', fontSize: '0.875rem' }}
          >
            Connect to server
          </button>
        </div>
      </div>
    </div>
  );
}
