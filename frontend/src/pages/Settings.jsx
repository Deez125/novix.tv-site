import { useState, useEffect } from 'react';
import { healthCheck, getPlexFriends, getPlexLibraries } from '../lib/api';

export default function Settings() {
  const [health, setHealth] = useState(null);
  const [friends, setFriends] = useState([]);
  const [libraries, setLibraries] = useState([]);
  const [loading, setLoading] = useState(true);
  const [errors, setErrors] = useState({});

  useEffect(() => {
    const loadSettings = async () => {
      // Health check
      try {
        const healthData = await healthCheck();
        setHealth(healthData);
      } catch (err) {
        setErrors(prev => ({ ...prev, health: err.message }));
      }

      // Plex friends
      try {
        const friendsData = await getPlexFriends();
        setFriends(Array.isArray(friendsData) ? friendsData : []);
      } catch (err) {
        setErrors(prev => ({ ...prev, friends: err.message }));
      }

      // Plex libraries
      try {
        const librariesData = await getPlexLibraries();
        setLibraries(Array.isArray(librariesData) ? librariesData : []);
      } catch (err) {
        setErrors(prev => ({ ...prev, libraries: err.message }));
      }

      setLoading(false);
    };

    loadSettings();
  }, []);

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="text-slate-400">Loading settings...</div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <h2 className="text-xl font-semibold">Settings</h2>

      {/* API Health */}
      <div className="bg-slate-800/50 rounded-lg border border-slate-700 p-4">
        <h3 className="font-medium mb-3">API Status</h3>
        {errors.health ? (
          <div className="text-red-400">Error: {errors.health}</div>
        ) : health ? (
          <div className="flex items-center gap-2">
            <span className="w-2 h-2 rounded-full bg-emerald-500"></span>
            <span className="text-emerald-400">Connected</span>
            <span className="text-slate-500 text-sm ml-2">
              Last check: {new Date(health.timestamp).toLocaleTimeString()}
            </span>
          </div>
        ) : (
          <div className="text-slate-400">Unknown</div>
        )}
      </div>

      {/* Plex Friends */}
      <div className="bg-slate-800/50 rounded-lg border border-slate-700 p-4">
        <h3 className="font-medium mb-3">
          Plex Friends
          <span className="text-slate-400 font-normal ml-2">({friends.length} shared)</span>
        </h3>
        {errors.friends ? (
          <div className="text-red-400">Error: {errors.friends}</div>
        ) : friends.length > 0 ? (
          <div className="grid grid-cols-2 md:grid-cols-3 gap-2">
            {friends.map((friend, i) => (
              <div key={friend.id || i} className="text-sm text-slate-300 font-mono">
                {friend.username || friend.title || friend.email || 'Unknown'}
              </div>
            ))}
          </div>
        ) : (
          <div className="text-slate-500">No friends shared</div>
        )}
      </div>

      {/* Plex Libraries */}
      <div className="bg-slate-800/50 rounded-lg border border-slate-700 p-4">
        <h3 className="font-medium mb-3">Plex Libraries</h3>
        {errors.libraries ? (
          <div className="text-red-400">Error: {errors.libraries}</div>
        ) : libraries.length > 0 ? (
          <div className="space-y-2">
            {libraries.map((lib) => (
              <div key={lib.key} className="flex items-center gap-3 text-sm">
                <span className="font-mono text-slate-500">#{lib.key}</span>
                <span>{lib.title}</span>
                <span className="text-slate-500">({lib.type})</span>
                <span className="text-emerald-400 font-mono">
                  {lib.itemCount?.toLocaleString() || 0} items
                </span>
              </div>
            ))}
          </div>
        ) : (
          <div className="text-slate-500">No libraries found</div>
        )}
      </div>
    </div>
  );
}
