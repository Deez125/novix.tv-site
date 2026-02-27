import { useState } from 'react';
import { useAuth } from '../lib/auth';

const API_BASE = import.meta.env.VITE_API_URL || 'http://localhost:8787';

export default function Link() {
  const { user, session, loading: authLoading } = useAuth();
  const [code, setCode] = useState('');
  const [status, setStatus] = useState('idle'); // idle, loading, success, error
  const [error, setError] = useState('');

  const handleCodeChange = (e) => {
    // Only allow digits, max 4 characters
    const value = e.target.value.replace(/\D/g, '').slice(0, 4);
    setCode(value);
  };

  const handleSubmit = async (e) => {
    e.preventDefault();

    if (code.length !== 4) {
      setError('Please enter a 4-digit code');
      return;
    }

    setStatus('loading');
    setError('');

    try {
      const response = await fetch(`${API_BASE}/api/device/activate`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${session.access_token}`
        },
        body: JSON.stringify({ code })
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || 'Failed to activate device');
      }

      setStatus('success');

      // Auto-dismiss after 3 seconds
      setTimeout(() => {
        goHome();
      }, 3000);

    } catch (err) {
      setError(err.message);
      setStatus('error');
    }
  };

  const goHome = () => {
    window.history.pushState({}, '', '/');
    window.dispatchEvent(new PopStateEvent('popstate'));
  };

  const goToLogin = () => {
    window.history.pushState({}, '', '/login');
    window.dispatchEvent(new PopStateEvent('popstate'));
  };

  // If still checking auth, show loading
  if (authLoading) {
    return (
      <div className="min-h-screen bg-slate-950 text-white flex items-center justify-center">
        <div className="w-16 h-16 border-4 border-slate-600 border-t-violet-400 rounded-full animate-spin"></div>
      </div>
    );
  }

  // If not logged in, show login prompt
  if (!user) {
    return (
      <div className="min-h-screen bg-slate-950 text-white flex items-center justify-center p-4">
        <div className="w-full max-w-md text-center">
          <div className="bg-slate-800/50 rounded-lg border border-slate-700 p-8">
            <div className="w-16 h-16 bg-violet-500/20 rounded-full flex items-center justify-center mx-auto mb-4">
              <svg className="w-8 h-8 text-violet-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" />
              </svg>
            </div>
            <h2 className="text-2xl font-bold mb-2">Sign In Required</h2>
            <p className="text-slate-400 mb-6">
              You need to be signed in to activate your TV device.
            </p>
            <button
              onClick={goToLogin}
              className="px-6 py-3 bg-violet-600 hover:bg-violet-500 rounded-lg font-semibold transition"
            >
              Sign In
            </button>
          </div>
        </div>
      </div>
    );
  }

  // Success state
  if (status === 'success') {
    return (
      <div className="min-h-screen bg-slate-950 text-white flex items-center justify-center p-4">
        <div className="w-full max-w-md text-center">
          {/* Header */}
          <div className="mb-8">
            <button onClick={goHome} className="text-3xl font-bold mb-2">
              <span className="text-violet-400">Novix</span>TV
            </button>
          </div>

          <div className="bg-slate-800/50 rounded-lg border border-slate-700 p-8">
            <div className="w-16 h-16 bg-green-500/20 rounded-full flex items-center justify-center mx-auto mb-4">
              <svg className="w-8 h-8 text-green-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
              </svg>
            </div>
            <h2 className="text-2xl font-bold mb-2">Device Activated!</h2>
            <p className="text-slate-400 mb-4">
              Your TV is now connected. You can return to your TV and start watching.
            </p>
            <p className="text-sm text-slate-500">
              Redirecting you to home...
            </p>
          </div>
        </div>
      </div>
    );
  }

  // Main activation form
  return (
    <div className="min-h-screen bg-slate-950 text-white flex items-center justify-center p-4">
      <div className="w-full max-w-md">
        {/* Header */}
        <div className="text-center mb-8">
          <button onClick={goHome} className="text-3xl font-bold mb-2">
            <span className="text-violet-400">Novix</span>TV
          </button>
          <p className="text-slate-400">Activate Your TV Device</p>
        </div>

        {/* Card */}
        <div className="bg-slate-800/50 rounded-lg border border-slate-700 p-8">
          <div className="text-center mb-6">
            <div className="w-16 h-16 bg-violet-500/20 rounded-full flex items-center justify-center mx-auto mb-4">
              <svg className="w-8 h-8 text-violet-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9.75 17L9 20l-1 1h8l-1-1-.75-3M3 13h18M5 17h14a2 2 0 002-2V5a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" />
              </svg>
            </div>
            <h2 className="text-2xl font-bold mb-2">Enter Device Code</h2>
            <p className="text-slate-400 text-sm">
              Look for the 4-digit code displayed on your TV screen
            </p>
          </div>

          <form onSubmit={handleSubmit} className="space-y-6">
            {/* Code Input */}
            <div>
              <input
                type="text"
                inputMode="numeric"
                pattern="[0-9]*"
                value={code}
                onChange={handleCodeChange}
                placeholder="0000"
                maxLength={4}
                className="w-full px-6 py-4 bg-slate-900 border-2 border-slate-700 rounded-lg text-center text-3xl font-bold tracking-widest focus:outline-none focus:border-violet-500 transition"
                autoFocus
                disabled={status === 'loading'}
              />
            </div>

            {/* Error Message */}
            {status === 'error' && error && (
              <div className="bg-red-500/20 text-red-400 border border-red-500/30 rounded-lg p-3 text-sm">
                {error}
              </div>
            )}

            {/* Submit Button */}
            <button
              type="submit"
              disabled={code.length !== 4 || status === 'loading'}
              className="w-full px-6 py-4 bg-violet-600 hover:bg-violet-500 font-semibold text-lg rounded-lg transition disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
            >
              {status === 'loading' ? (
                <>
                  <div className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
                  Activating...
                </>
              ) : (
                'Activate Device'
              )}
            </button>
          </form>

          {/* Help Text */}
          <div className="mt-6 pt-6 border-t border-slate-700">
            <p className="text-xs text-slate-500 text-center">
              Can't find the code? Make sure your TV app is open and showing the activation screen.
            </p>
          </div>
        </div>

        {/* User Info */}
        <div className="mt-6 text-center text-sm text-slate-400">
          Signed in as <span className="text-white font-medium">{user.email}</span>
        </div>
      </div>
    </div>
  );
}
