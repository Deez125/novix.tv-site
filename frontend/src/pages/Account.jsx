import { useState, useEffect } from 'react';
import { useAuth } from '../lib/auth';

const API_BASE = import.meta.env.VITE_API_URL || 'http://localhost:8787';

export default function Account() {
  const { user, logout } = useAuth();
  const [subscription, setSubscription] = useState(null);
  const [loading, setLoading] = useState(true);
  const [actionLoading, setActionLoading] = useState(false);
  const [showCancelModal, setShowCancelModal] = useState(false);

  useEffect(() => {
    fetchSubscription();
  }, [user]);

  const fetchSubscription = async () => {
    if (!user) return;
    try {
      const response = await fetch(`${API_BASE}/api/user/subscription?plex_user_id=${user.id}`);
      if (response.ok) {
        const data = await response.json();
        setSubscription(data);
      }
    } catch (err) {
      console.error('Failed to fetch subscription:', err);
    } finally {
      setLoading(false);
    }
  };

  const handleChangePlan = async (newTier) => {
    if (actionLoading) return;
    setActionLoading(true);
    try {
      const response = await fetch(`${API_BASE}/api/subscription/change`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ plex_user_id: user.id, new_tier: newTier }),
      });
      const data = await response.json();
      if (response.ok) {
        await fetchSubscription();
      } else {
        alert(data.error || 'Failed to change plan');
      }
    } catch (err) {
      console.error('Failed to change plan:', err);
      alert('Failed to change plan');
    } finally {
      setActionLoading(false);
    }
  };

  const handleCancelSubscription = async () => {
    if (actionLoading) return;
    setActionLoading(true);
    try {
      const response = await fetch(`${API_BASE}/api/subscription/cancel`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ plex_user_id: user.id }),
      });
      if (response.ok) {
        setShowCancelModal(false);
        await fetchSubscription();
      } else {
        const error = await response.json();
        alert(error.error || 'Failed to cancel subscription');
      }
    } catch (err) {
      console.error('Failed to cancel subscription:', err);
      alert('Failed to cancel subscription');
    } finally {
      setActionLoading(false);
    }
  };

  const handleLogout = () => {
    logout();
    window.history.pushState({}, '', '/');
    window.dispatchEvent(new PopStateEvent('popstate'));
  };

  const goHome = () => {
    window.history.pushState({}, '', '/');
    window.dispatchEvent(new PopStateEvent('popstate'));
  };

  const goToPricing = () => {
    window.history.pushState({}, '', '/');
    window.dispatchEvent(new PopStateEvent('popstate'));
    setTimeout(() => {
      const pricingSection = document.getElementById('pricing');
      if (pricingSection) {
        pricingSection.scrollIntoView({ behavior: 'smooth' });
      }
    }, 100);
  };

  if (!user) {
    return (
      <div className="min-h-screen bg-slate-950 text-white flex items-center justify-center">
        <div className="text-center">
          <h1 className="text-2xl font-bold mb-4">Not logged in</h1>
          <button
            onClick={goHome}
            className="px-4 py-2 bg-emerald-600 hover:bg-emerald-500 rounded-lg transition"
          >
            Go to Home
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-slate-950 text-white">
      {/* Cancel Confirmation Modal */}
      {showCancelModal && (
        <div className="fixed inset-0 bg-black/70 flex items-center justify-center z-50 p-4">
          <div className="bg-slate-900 border border-slate-700 rounded-xl p-6 max-w-md w-full">
            <h3 className="text-xl font-bold text-red-400 mb-4">Cancel Subscription?</h3>
            <div className="text-slate-300 mb-6 space-y-3">
              <p>Are you sure you want to cancel your subscription?</p>
              <div className="bg-red-900/30 border border-red-700/50 rounded-lg p-4">
                <p className="text-red-400 font-medium flex items-center gap-2">
                  <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
                  </svg>
                  Warning: This action is immediate
                </p>
                <p className="text-red-300 text-sm mt-2">
                  You will lose access to PandaTV's Plex library immediately upon cancellation. This cannot be undone.
                </p>
              </div>
            </div>
            <div className="flex gap-3">
              <button
                onClick={() => setShowCancelModal(false)}
                className="flex-1 px-4 py-2 bg-slate-700 hover:bg-slate-600 rounded-lg transition"
                disabled={actionLoading}
              >
                Keep Subscription
              </button>
              <button
                onClick={handleCancelSubscription}
                className="flex-1 px-4 py-2 bg-red-600 hover:bg-red-500 rounded-lg transition disabled:opacity-50"
                disabled={actionLoading}
              >
                {actionLoading ? 'Cancelling...' : 'Yes, Cancel'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Navigation */}
      <nav className="border-b border-slate-800/50">
        <div className="max-w-4xl mx-auto px-4 py-4 flex items-center justify-between">
          <button onClick={goHome} className="text-2xl font-bold">
            <span className="text-emerald-400">Panda</span>TV
          </button>
        </div>
      </nav>

      {/* Account Content */}
      <div className="max-w-2xl mx-auto px-4 py-12">
        <h1 className="text-3xl font-bold mb-8">Account Settings</h1>

        {/* Profile & Subscription Section */}
        <div className="bg-slate-800/50 border border-slate-700 rounded-xl p-6 mb-6">
          {/* Profile */}
          <div className="flex items-center gap-4 mb-6 pb-6 border-b border-slate-700">
            {user.thumb ? (
              <img
                src={user.thumb}
                alt={user.username}
                className="w-16 h-16 rounded-full"
              />
            ) : (
              <div className="w-16 h-16 bg-emerald-500/20 rounded-full flex items-center justify-center">
                <span className="text-emerald-400 font-semibold text-2xl">
                  {user.username.charAt(0).toUpperCase()}
                </span>
              </div>
            )}
            <div>
              <div className="text-xl font-medium">{user.username}</div>
              <div className="text-slate-400">{user.email}</div>
              <div className="text-sm text-slate-500 mt-1">Connected via Plex</div>
            </div>
          </div>

          {/* Subscription */}
          <div className="mb-6">
            <h2 className="text-lg font-semibold mb-4">Subscription</h2>
            {loading ? (
              <div className="text-slate-400">Loading...</div>
            ) : subscription?.tier === 'admin' ? (
              <div>
                <div className="flex items-center gap-2 mb-3">
                  <span className="w-2 h-2 rounded-full bg-amber-500"></span>
                  <span className="text-amber-400 font-medium">Admin</span>
                </div>
                <div className="text-sm text-slate-400">
                  <p>Full access to all libraries</p>
                </div>
              </div>
            ) : subscription?.subscription_status === 'active' ? (
              <div>
                <div className="flex items-center gap-2 mb-3">
                  <span className="w-2 h-2 rounded-full bg-emerald-500"></span>
                  <span className="text-emerald-400 font-medium">Active</span>
                </div>
                <div className="text-sm text-slate-400 space-y-1 mb-4">
                  <p>Plan: {subscription.tier === '4k' ? 'PandaTV + ($30/month)' : 'PandaTV Access ($20/month)'}</p>
                  {subscription.current_period_end && (
                    <p>Next billing: {new Date(subscription.current_period_end).toLocaleDateString()}</p>
                  )}
                </div>

                {/* Plan Change Buttons */}
                <div className="flex flex-wrap gap-3">
                  {subscription.tier === 'hd' ? (
                    <button
                      onClick={() => handleChangePlan('4k')}
                      disabled={actionLoading}
                      className="px-4 py-2 bg-emerald-600 hover:bg-emerald-500 rounded-lg text-sm transition disabled:opacity-50"
                    >
                      {actionLoading ? 'Processing...' : 'Upgrade to PandaTV + ($30/month)'}
                    </button>
                  ) : (
                    <button
                      onClick={() => handleChangePlan('hd')}
                      disabled={actionLoading}
                      className="px-4 py-2 bg-slate-700 hover:bg-slate-600 rounded-lg text-sm transition disabled:opacity-50"
                    >
                      {actionLoading ? 'Processing...' : 'Downgrade to PandaTV Access ($20/month)'}
                    </button>
                  )}

                  <button
                    onClick={() => setShowCancelModal(true)}
                    disabled={actionLoading}
                    className="px-4 py-2 bg-red-600/20 hover:bg-red-600/30 text-red-400 border border-red-600/30 rounded-lg text-sm transition disabled:opacity-50"
                  >
                    Cancel Subscription
                  </button>
                </div>
              </div>
            ) : (
              <div>
                <div className="flex items-center gap-2 mb-3">
                  <span className="w-2 h-2 rounded-full bg-slate-500"></span>
                  <span className="text-slate-400 font-medium">No active subscription</span>
                </div>
                <button
                  onClick={goToPricing}
                  className="mt-2 px-4 py-2 bg-emerald-600 hover:bg-emerald-500 rounded-lg text-sm transition"
                >
                  View Plans
                </button>
              </div>
            )}
          </div>

          {/* Open Plex Button */}
          <a
            href="https://app.plex.tv"
            target="_blank"
            rel="noopener noreferrer"
            className="inline-flex items-center gap-2 px-4 py-2 bg-amber-500 hover:bg-amber-400 text-black font-medium rounded-lg transition"
          >
            <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 512 512">
              <path d="M320 0c-17.7 0-32 14.3-32 32s14.3 32 32 32h82.7L201.4 265.4c-12.5 12.5-12.5 32.8 0 45.3s32.8 12.5 45.3 0L448 109.3V192c0 17.7 14.3 32 32 32s32-14.3 32-32V32c0-17.7-14.3-32-32-32H320zM80 32C35.8 32 0 67.8 0 112V432c0 44.2 35.8 80 80 80H400c44.2 0 80-35.8 80-80V320c0-17.7-14.3-32-32-32s-32 14.3-32 32V432c0 8.8-7.2 16-16 16H80c-8.8 0-16-7.2-16-16V112c0-8.8 7.2-16 16-16H192c17.7 0 32-14.3 32-32s-14.3-32-32-32H80z"/>
            </svg>
            Open Plex
          </a>
        </div>

        {/* Sign Out Button */}
        <div className="flex justify-end">
          <button
            onClick={handleLogout}
            className="px-4 py-2 bg-red-600/20 hover:bg-red-600/30 text-red-400 border border-red-600/30 rounded-lg transition"
          >
            Sign Out
          </button>
        </div>
      </div>
    </div>
  );
}
