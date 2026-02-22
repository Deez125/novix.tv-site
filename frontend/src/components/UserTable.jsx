import { useState } from 'react';
import StatusBadge from './StatusBadge';

export default function UserTable({ users, onCheckout, onKick, onDelete, onUpdate }) {
  const [editingId, setEditingId] = useState(null);
  const [editData, setEditData] = useState({});
  const [loadingAction, setLoadingAction] = useState(null);

  const formatDate = (dateStr) => {
    if (!dateStr) return '-';
    return new Date(dateStr).toLocaleDateString('en-US', {
      month: 'short',
      day: 'numeric',
      year: 'numeric',
    });
  };

  const handleCheckout = async (user) => {
    setLoadingAction(`checkout-${user.id}`);
    try {
      const result = await onCheckout(user.id);
      await navigator.clipboard.writeText(result.checkout_url);
      alert('Checkout URL copied to clipboard!');
    } catch (err) {
      alert(`Error: ${err.message}`);
    } finally {
      setLoadingAction(null);
    }
  };

  const handleKick = async (user) => {
    if (!confirm(`Are you sure you want to kick ${user.display_name} from Plex?`)) return;
    setLoadingAction(`kick-${user.id}`);
    try {
      await onKick(user.id);
    } catch (err) {
      alert(`Error: ${err.message}`);
    } finally {
      setLoadingAction(null);
    }
  };

  const handleDelete = async (user) => {
    if (!confirm(`Are you sure you want to delete ${user.display_name}? This cannot be undone.`)) return;
    setLoadingAction(`delete-${user.id}`);
    try {
      await onDelete(user.id);
    } catch (err) {
      alert(`Error: ${err.message}`);
    } finally {
      setLoadingAction(null);
    }
  };

  const startEdit = (user) => {
    setEditingId(user.id);
    setEditData({
      display_name: user.display_name,
      email: user.email,
      plex_username: user.plex_username,
      tier: user.tier,
    });
  };

  const saveEdit = async () => {
    setLoadingAction(`edit-${editingId}`);
    try {
      await onUpdate(editingId, editData);
      setEditingId(null);
    } catch (err) {
      alert(`Error: ${err.message}`);
    } finally {
      setLoadingAction(null);
    }
  };

  const cancelEdit = () => {
    setEditingId(null);
    setEditData({});
  };

  return (
    <div className="bg-slate-800/50 rounded-lg border border-slate-700 overflow-hidden">
      <div className="overflow-x-auto">
        <table className="w-full">
          <thead>
            <tr className="border-b border-slate-700">
              <th className="text-left px-4 py-3 text-sm font-medium text-slate-400">Name</th>
              <th className="text-left px-4 py-3 text-sm font-medium text-slate-400">Email</th>
              <th className="text-left px-4 py-3 text-sm font-medium text-slate-400">Plex Username</th>
              <th className="text-left px-4 py-3 text-sm font-medium text-slate-400">Tier</th>
              <th className="text-left px-4 py-3 text-sm font-medium text-slate-400">Status</th>
              <th className="text-left px-4 py-3 text-sm font-medium text-slate-400">Period End</th>
              <th className="text-left px-4 py-3 text-sm font-medium text-slate-400">Actions</th>
            </tr>
          </thead>
          <tbody>
            {users.map((user) => (
              <tr key={user.id} className="border-b border-slate-700/50 hover:bg-slate-700/30">
                {editingId === user.id ? (
                  <>
                    <td className="px-4 py-3">
                      <input
                        type="text"
                        value={editData.display_name}
                        onChange={(e) => setEditData({ ...editData, display_name: e.target.value })}
                        className="bg-slate-900 border border-slate-600 rounded px-2 py-1 w-full text-sm"
                      />
                    </td>
                    <td className="px-4 py-3">
                      <input
                        type="email"
                        value={editData.email}
                        onChange={(e) => setEditData({ ...editData, email: e.target.value })}
                        className="bg-slate-900 border border-slate-600 rounded px-2 py-1 w-full text-sm"
                      />
                    </td>
                    <td className="px-4 py-3">
                      <input
                        type="text"
                        value={editData.plex_username}
                        onChange={(e) => setEditData({ ...editData, plex_username: e.target.value })}
                        className="bg-slate-900 border border-slate-600 rounded px-2 py-1 w-full text-sm"
                      />
                    </td>
                    <td className="px-4 py-3">
                      <select
                        value={editData.tier}
                        onChange={(e) => setEditData({ ...editData, tier: e.target.value })}
                        className="bg-slate-900 border border-slate-600 rounded px-2 py-1 text-sm"
                      >
                        <option value="hd">HD</option>
                        <option value="4k">4K</option>
                      </select>
                    </td>
                    <td className="px-4 py-3">
                      <StatusBadge status={user.subscription_status} />
                    </td>
                    <td className="px-4 py-3 font-mono text-sm text-slate-400">
                      {formatDate(user.current_period_end)}
                    </td>
                    <td className="px-4 py-3">
                      <div className="flex gap-2">
                        <button
                          onClick={saveEdit}
                          disabled={loadingAction === `edit-${user.id}`}
                          className="px-2 py-1 text-xs bg-emerald-600 hover:bg-emerald-500 rounded disabled:opacity-50"
                        >
                          Save
                        </button>
                        <button
                          onClick={cancelEdit}
                          className="px-2 py-1 text-xs bg-slate-600 hover:bg-slate-500 rounded"
                        >
                          Cancel
                        </button>
                      </div>
                    </td>
                  </>
                ) : (
                  <>
                    <td className="px-4 py-3 font-medium">{user.display_name}</td>
                    <td className="px-4 py-3 text-sm text-slate-400">{user.email}</td>
                    <td className="px-4 py-3 font-mono text-sm">{user.plex_username}</td>
                    <td className="px-4 py-3 text-sm uppercase">{user.tier}</td>
                    <td className="px-4 py-3">
                      <StatusBadge status={user.subscription_status} />
                    </td>
                    <td className="px-4 py-3 font-mono text-sm text-slate-400">
                      {formatDate(user.current_period_end)}
                    </td>
                    <td className="px-4 py-3">
                      <div className="flex gap-2 flex-wrap">
                        {user.subscription_status === 'pending' && (
                          <button
                            onClick={() => handleCheckout(user)}
                            disabled={loadingAction === `checkout-${user.id}`}
                            className="px-2 py-1 text-xs bg-emerald-600 hover:bg-emerald-500 rounded disabled:opacity-50"
                          >
                            {loadingAction === `checkout-${user.id}` ? '...' : 'Checkout'}
                          </button>
                        )}
                        {['active', 'past_due'].includes(user.subscription_status) && user.plex_user_id && (
                          <button
                            onClick={() => handleKick(user)}
                            disabled={loadingAction === `kick-${user.id}`}
                            className="px-2 py-1 text-xs bg-amber-600 hover:bg-amber-500 rounded disabled:opacity-50"
                          >
                            {loadingAction === `kick-${user.id}` ? '...' : 'Kick'}
                          </button>
                        )}
                        <button
                          onClick={() => startEdit(user)}
                          className="px-2 py-1 text-xs bg-slate-600 hover:bg-slate-500 rounded"
                        >
                          Edit
                        </button>
                        <button
                          onClick={() => handleDelete(user)}
                          disabled={loadingAction === `delete-${user.id}`}
                          className="px-2 py-1 text-xs bg-red-600 hover:bg-red-500 rounded disabled:opacity-50"
                        >
                          {loadingAction === `delete-${user.id}` ? '...' : 'Delete'}
                        </button>
                      </div>
                    </td>
                  </>
                )}
              </tr>
            ))}
            {users.length === 0 && (
              <tr>
                <td colSpan={7} className="px-4 py-8 text-center text-slate-500">
                  No users yet. Add your first user above.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}
