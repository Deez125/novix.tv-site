import { useState, useEffect } from 'react';
import DashboardStats from '../components/DashboardStats';
import UserTable from '../components/UserTable';
import AddUserModal from '../components/AddUserModal';
import ActivityLog from '../components/ActivityLog';
import {
  getUsers,
  createUser,
  updateUser,
  deleteUser,
  createCheckout,
  kickUser,
  getActivity,
} from '../lib/api';

export default function Dashboard() {
  const [users, setUsers] = useState([]);
  const [activities, setActivities] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [showAddModal, setShowAddModal] = useState(false);

  const loadData = async () => {
    try {
      const [usersData, activityData] = await Promise.all([
        getUsers(),
        getActivity(),
      ]);
      setUsers(usersData);
      setActivities(activityData);
      setError('');
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadData();
  }, []);

  const handleCreateUser = async (data) => {
    await createUser(data);
    await loadData();
  };

  const handleUpdateUser = async (id, data) => {
    await updateUser(id, data);
    await loadData();
  };

  const handleDeleteUser = async (id) => {
    await deleteUser(id);
    await loadData();
  };

  const handleCheckout = async (id) => {
    return createCheckout(id);
  };

  const handleKick = async (id) => {
    await kickUser(id);
    await loadData();
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="text-slate-400">Loading...</div>
      </div>
    );
  }

  return (
    <div>
      {error && (
        <div className="bg-red-500/20 text-red-400 border border-red-500/30 rounded p-4 mb-6">
          {error}
        </div>
      )}

      <DashboardStats users={users} />

      <div className="flex justify-between items-center mb-4">
        <h2 className="text-xl font-semibold">Users</h2>
        <button
          onClick={() => setShowAddModal(true)}
          className="px-4 py-2 bg-emerald-600 hover:bg-emerald-500 rounded transition"
        >
          + Add User
        </button>
      </div>

      <UserTable
        users={users}
        onCheckout={handleCheckout}
        onKick={handleKick}
        onDelete={handleDeleteUser}
        onUpdate={handleUpdateUser}
      />

      <div className="mt-8">
        <ActivityLog activities={activities} />
      </div>

      <AddUserModal
        isOpen={showAddModal}
        onClose={() => setShowAddModal(false)}
        onSubmit={handleCreateUser}
      />
    </div>
  );
}
