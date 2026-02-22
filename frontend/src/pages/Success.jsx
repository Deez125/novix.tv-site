import { useEffect, useState } from 'react';

const API_BASE = import.meta.env.VITE_API_URL || 'http://localhost:8787';

export default function Success() {
  const [status, setStatus] = useState('processing'); // processing, success, error
  const [error, setError] = useState('');

  useEffect(() => {
    const processSuccess = async () => {
      const params = new URLSearchParams(window.location.search);
      const sessionId = params.get('session_id');

      if (!sessionId) {
        setStatus('success'); // No session ID means direct visit, just show success
        return;
      }

      try {
        const response = await fetch(`${API_BASE}/api/checkout/success?session_id=${sessionId}`);
        const data = await response.json();

        if (!response.ok) {
          throw new Error(data.error || 'Failed to process checkout');
        }

        setStatus('success');
      } catch (err) {
        setError(err.message);
        setStatus('error');
      }
    };

    processSuccess();
  }, []);

  const goHome = () => {
    window.history.pushState({}, '', '/');
    window.dispatchEvent(new PopStateEvent('popstate'));
  };

  const goToAccount = () => {
    window.history.pushState({}, '', '/account');
    window.dispatchEvent(new PopStateEvent('popstate'));
  };

  return (
    <div className="min-h-screen bg-slate-950 text-white flex items-center justify-center p-4">
      <div className="w-full max-w-md text-center">
        {/* Header */}
        <div className="mb-8">
          <button onClick={goHome} className="text-3xl font-bold mb-2">
            <span className="text-violet-400">Panda</span>TV
          </button>
        </div>

        {/* Card */}
        <div className="bg-slate-800/50 rounded-lg border border-slate-700 p-8">
          {status === 'processing' && (
            <>
              <div className="w-16 h-16 border-4 border-slate-600 border-t-violet-400 rounded-full animate-spin mx-auto mb-4"></div>
              <h2 className="text-xl font-semibold mb-2">Setting up your access...</h2>
              <p className="text-slate-400">This will only take a moment.</p>
            </>
          )}

          {status === 'success' && (
            <>
              <div className="w-16 h-16 bg-violet-500/20 rounded-full flex items-center justify-center mx-auto mb-4">
                <svg className="w-8 h-8 text-violet-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                </svg>
              </div>
              <h2 className="text-xl font-semibold mb-2">Welcome to PandaTV!</h2>
              <p className="text-slate-400 mb-6">
                Your subscription is now active. Head to your account to connect your Plex library and start streaming.
              </p>
              <div className="space-y-3">
                <button
                  onClick={goToAccount}
                  className="block w-full px-4 py-3 bg-violet-600 hover:bg-violet-500 font-semibold rounded-lg transition"
                >
                  Go to Account Settings
                </button>
                <button
                  onClick={goHome}
                  className="block w-full px-4 py-3 bg-slate-700 hover:bg-slate-600 font-semibold rounded-lg transition"
                >
                  Back to Home
                </button>
              </div>
            </>
          )}

          {status === 'error' && (
            <>
              <div className="w-16 h-16 bg-red-500/20 rounded-full flex items-center justify-center mx-auto mb-4">
                <svg className="w-8 h-8 text-red-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                </svg>
              </div>
              <h2 className="text-xl font-semibold mb-2">Something went wrong</h2>
              <p className="text-slate-400 mb-4">{error}</p>
              <p className="text-slate-500 text-sm">
                Don't worry - if your payment went through, your subscription is still active.
                Contact support if you don't receive access within a few minutes.
              </p>
            </>
          )}
        </div>
      </div>
    </div>
  );
}
