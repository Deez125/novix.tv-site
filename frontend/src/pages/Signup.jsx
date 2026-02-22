import { useState, useEffect } from 'react';

const API_BASE = import.meta.env.VITE_API_URL || 'http://localhost:8787';

export default function Signup() {
  const [step, setStep] = useState('start'); // start, authorizing, ready, processing
  const [plexUser, setPlexUser] = useState(null);
  const [pinData, setPinData] = useState(null);
  const [error, setError] = useState('');
  const [pollInterval, setPollInterval] = useState(null);

  // Check for cancelled checkout
  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    if (params.get('cancelled') === 'true') {
      setError('Checkout was cancelled. You can try again below.');
      window.history.replaceState({}, '', '/signup');
    }
  }, []);

  // Start Plex auth
  const startPlexAuth = async () => {
    setError('');
    try {
      const response = await fetch(`${API_BASE}/api/plex/auth/start`, {
        method: 'POST',
      });
      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || 'Failed to start Plex auth');
      }

      setPinData(data);
      setStep('authorizing');

      // Open Plex auth in new window
      window.open(data.auth_url, '_blank', 'width=600,height=700');

      // Start polling for auth completion
      const interval = setInterval(async () => {
        try {
          const checkResponse = await fetch(
            `${API_BASE}/api/plex/auth/check?pin_id=${data.pin_id}&pin_code=${data.pin_code}`
          );
          const checkData = await checkResponse.json();

          if (checkData.authorized) {
            clearInterval(interval);
            setPollInterval(null);
            setPlexUser(checkData.plex_user);
            setStep('ready');
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
          if (step === 'authorizing') {
            setError('Plex authorization timed out. Please try again.');
            setStep('start');
          }
        }
      }, 5 * 60 * 1000);

    } catch (err) {
      setError(err.message);
    }
  };

  // Cancel auth
  const cancelAuth = () => {
    if (pollInterval) {
      clearInterval(pollInterval);
      setPollInterval(null);
    }
    setStep('start');
    setPinData(null);
    setPlexUser(null);
  };

  // Proceed to checkout
  const proceedToCheckout = async () => {
    setError('');
    setStep('processing');

    try {
      const response = await fetch(`${API_BASE}/api/signup`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          plex_user_id: plexUser.id,
          plex_username: plexUser.username,
          plex_email: plexUser.email,
          tier: 'hd',
        }),
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || 'Failed to create checkout');
      }

      // Redirect to Stripe checkout
      window.location.href = data.checkout_url;
    } catch (err) {
      setError(err.message);
      setStep('ready');
    }
  };

  return (
    <div className="min-h-screen bg-slate-950 text-white flex items-center justify-center p-4">
      <div className="w-full max-w-md">
        {/* Header */}
        <div className="text-center mb-8">
          <h1 className="text-3xl font-bold mb-2">
            <span className="text-emerald-400">PandaTV</span>
          </h1>
          <p className="text-slate-400">Subscribe to access our Plex server</p>
        </div>

        {/* Card */}
        <div className="bg-slate-800/50 rounded-lg border border-slate-700 p-6">
          {error && (
            <div className="bg-red-500/20 text-red-400 border border-red-500/30 rounded p-3 mb-4">
              {error}
            </div>
          )}

          {/* Step 1: Start */}
          {step === 'start' && (
            <div className="text-center">
              <div className="mb-6">
                <div className="w-16 h-16 bg-amber-500/20 rounded-full flex items-center justify-center mx-auto mb-4">
                  <svg className="w-8 h-8 text-amber-400" fill="currentColor" viewBox="0 0 24 24">
                    <path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm-2 15l-5-5 1.41-1.41L10 14.17l7.59-7.59L19 8l-9 9z"/>
                  </svg>
                </div>
                <h2 className="text-xl font-semibold mb-2">Sign in with Plex</h2>
                <p className="text-slate-400 text-sm">
                  Connect your Plex account to get started. You'll be redirected to Plex to authorize.
                </p>
              </div>

              <button
                onClick={startPlexAuth}
                className="w-full px-4 py-3 bg-amber-500 hover:bg-amber-400 text-black font-semibold rounded transition"
              >
                Sign in with Plex
              </button>
            </div>
          )}

          {/* Step 2: Authorizing */}
          {step === 'authorizing' && (
            <div className="text-center">
              <div className="mb-6">
                <div className="w-16 h-16 border-4 border-slate-600 border-t-emerald-400 rounded-full animate-spin mx-auto mb-4"></div>
                <h2 className="text-xl font-semibold mb-2">Waiting for Authorization</h2>
                <p className="text-slate-400 text-sm">
                  Complete the sign-in in the Plex popup window. This page will update automatically.
                </p>
              </div>

              <button
                onClick={cancelAuth}
                className="px-4 py-2 text-slate-400 hover:text-white transition"
              >
                Cancel
              </button>
            </div>
          )}

          {/* Step 3: Ready to subscribe */}
          {step === 'ready' && plexUser && (
            <div>
              <div className="flex items-center gap-4 mb-6 p-4 bg-slate-900 rounded-lg">
                {plexUser.thumb ? (
                  <img
                    src={plexUser.thumb}
                    alt={plexUser.username}
                    className="w-12 h-12 rounded-full"
                  />
                ) : (
                  <div className="w-12 h-12 bg-emerald-500/20 rounded-full flex items-center justify-center">
                    <span className="text-emerald-400 font-semibold">
                      {plexUser.username.charAt(0).toUpperCase()}
                    </span>
                  </div>
                )}
                <div>
                  <div className="font-medium">{plexUser.username}</div>
                  <div className="text-sm text-slate-400">{plexUser.email}</div>
                </div>
                <div className="ml-auto">
                  <span className="px-2 py-1 text-xs bg-emerald-500/20 text-emerald-400 rounded">
                    Connected
                  </span>
                </div>
              </div>

              <div className="mb-6">
                <h3 className="font-semibold mb-3">HD Subscription</h3>
                <div className="p-4 bg-slate-900 rounded-lg border border-slate-700">
                  <div className="flex justify-between items-center mb-2">
                    <span>Monthly access</span>
                    <span className="text-xl font-bold">$5/mo</span>
                  </div>
                  <ul className="text-sm text-slate-400 space-y-1">
                    <li>• Full HD streaming</li>
                    <li>• Access to all HD libraries</li>
                    <li>• Cancel anytime</li>
                  </ul>
                </div>
              </div>

              <button
                onClick={proceedToCheckout}
                className="w-full px-4 py-3 bg-emerald-600 hover:bg-emerald-500 font-semibold rounded transition"
              >
                Subscribe Now
              </button>

              <button
                onClick={cancelAuth}
                className="w-full mt-3 px-4 py-2 text-slate-400 hover:text-white transition"
              >
                Use a different account
              </button>
            </div>
          )}

          {/* Step 4: Processing */}
          {step === 'processing' && (
            <div className="text-center">
              <div className="w-16 h-16 border-4 border-slate-600 border-t-emerald-400 rounded-full animate-spin mx-auto mb-4"></div>
              <h2 className="text-xl font-semibold mb-2">Setting up your subscription...</h2>
              <p className="text-slate-400 text-sm">You'll be redirected to checkout shortly.</p>
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="text-center mt-6 text-slate-500 text-sm">
          Already subscribed? Access is automatic via your Plex account.
        </div>
      </div>
    </div>
  );
}
