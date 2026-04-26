import { useState, useEffect, useRef } from 'react';
import { useAuth } from '../lib/auth';
import { IoTvOutline } from 'react-icons/io5';

const API_BASE = import.meta.env.VITE_API_URL || 'http://localhost:8787';

const Wordmark = ({ size = '1.5rem' }) => (
  <span className="wordmark" style={{ fontSize: size }}>
    novix<span className="wordmark-dot">.</span>tv
  </span>
);

function CodeInput({ value, onChange, disabled, onSubmit }) {
  const inputs = useRef([]);
  const digits = value.padEnd(4, ' ').slice(0, 4).split('');

  const setDigit = (idx, char) => {
    const arr = digits.map((d) => (d === ' ' ? '' : d));
    arr[idx] = char;
    onChange(arr.join('').slice(0, 4));
  };

  const handleChange = (idx, raw) => {
    const v = raw.replace(/\D/g, '');
    if (!v) return;

    if (v.length === 1) {
      setDigit(idx, v);
      if (idx < 3) inputs.current[idx + 1]?.focus();
    } else {
      // Paste or multi-char input — distribute digits starting at idx
      const incoming = v.slice(0, 4 - idx).split('');
      const arr = digits.map((d) => (d === ' ' ? '' : d));
      incoming.forEach((c, i) => { arr[idx + i] = c; });
      const next = arr.join('').slice(0, 4);
      onChange(next);
      const nextFocus = Math.min(idx + incoming.length, 3);
      inputs.current[nextFocus]?.focus();
    }
  };

  const handleKeyDown = (idx, e) => {
    if (e.key === 'Backspace') {
      if (digits[idx] && digits[idx] !== ' ') {
        setDigit(idx, '');
      } else if (idx > 0) {
        inputs.current[idx - 1]?.focus();
        setDigit(idx - 1, '');
      }
      e.preventDefault();
    } else if (e.key === 'ArrowLeft' && idx > 0) {
      inputs.current[idx - 1]?.focus();
    } else if (e.key === 'ArrowRight' && idx < 3) {
      inputs.current[idx + 1]?.focus();
    } else if (e.key === 'Enter' && value.length === 4) {
      onSubmit?.();
    }
  };

  const handlePaste = (e) => {
    const pasted = e.clipboardData.getData('text').replace(/\D/g, '').slice(0, 4);
    if (pasted) {
      e.preventDefault();
      onChange(pasted);
      inputs.current[Math.min(pasted.length, 3)]?.focus();
    }
  };

  return (
    <div className="flex justify-center gap-3" onPaste={handlePaste}>
      {[0, 1, 2, 3].map((i) => {
        const filled = digits[i] && digits[i] !== ' ';
        return (
          <input
            key={i}
            ref={(el) => (inputs.current[i] = el)}
            type="text"
            inputMode="numeric"
            pattern="[0-9]*"
            maxLength={1}
            value={digits[i] === ' ' ? '' : digits[i]}
            onChange={(e) => handleChange(i, e.target.value)}
            onKeyDown={(e) => handleKeyDown(i, e)}
            onFocus={(e) => e.target.select()}
            disabled={disabled}
            autoFocus={i === 0}
            className="w-16 h-20 text-center text-3xl font-semibold rounded-xl focus:outline-none transition-all"
            style={{
              background: 'var(--bg-elev)',
              color: 'var(--fg)',
              boxShadow: filled
                ? 'inset 0 0 0 1px var(--accent)'
                : 'inset 0 0 0 1px var(--hairline-strong)',
              fontVariantNumeric: 'tabular-nums',
            }}
          />
        );
      })}
    </div>
  );
}

export default function Link() {
  const { user, session, loading: authLoading } = useAuth();
  const [code, setCode] = useState('');
  const [status, setStatus] = useState('idle');
  const [error, setError] = useState('');
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    const t = requestAnimationFrame(() => setMounted(true));
    return () => cancelAnimationFrame(t);
  }, []);

  const navigate = (path) => {
    window.history.pushState({}, '', path);
    window.dispatchEvent(new PopStateEvent('popstate'));
  };

  const handleSubmit = async (e) => {
    e?.preventDefault?.();
    if (code.length !== 4) {
      setError('Please enter a 4-digit code');
      setStatus('error');
      return;
    }
    setStatus('loading');
    setError('');
    try {
      const response = await fetch(`${API_BASE}/api/device/activate`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${session.access_token}`,
        },
        body: JSON.stringify({ code }),
      });
      const data = await response.json();
      if (!response.ok) throw new Error(data.error || 'Failed to activate device');

      setStatus('success');
      setTimeout(() => navigate('/'), 3000);
    } catch (err) {
      setError(err.message);
      setStatus('error');
    }
  };

  // ─────────── Auth loading ───────────
  if (authLoading) {
    return (
      <div className="min-h-screen text-white flex items-center justify-center" style={{ background: 'var(--bg)' }}>
        <div
          className="w-10 h-10 rounded-full animate-spin"
          style={{ border: '2px solid rgba(255,255,255,0.1)', borderTopColor: 'var(--accent-bright)' }}
        />
      </div>
    );
  }

  // ─────────── Not signed in ───────────
  if (!user) {
    return (
      <div className="min-h-screen text-white flex items-center justify-center p-6" style={{ background: 'var(--bg)' }}>
        <div className={`w-full max-w-sm text-center ${mounted ? 'auth-enter' : 'auth-enter-pre'}`}>
          <button onClick={() => navigate('/')} className="inline-block mb-8">
            <Wordmark />
          </button>
          <svg className="w-10 h-10 mx-auto mb-5" fill="none" stroke="currentColor" strokeWidth={1.5}
               viewBox="0 0 24 24" style={{ color: 'var(--accent-bright)' }}>
            <path strokeLinecap="round" strokeLinejoin="round"
                  d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" />
          </svg>
          <h2 className="text-2xl font-semibold tracking-tight mb-3" style={{ letterSpacing: '-0.02em' }}>
            Sign in required
          </h2>
          <p className="text-sm mb-8 leading-relaxed" style={{ color: 'var(--fg-muted)' }}>
            You need to be signed in to activate your TV device.
          </p>
          <button onClick={() => navigate('/login')} className="btn-primary">Sign in</button>
        </div>
      </div>
    );
  }

  // ─────────── Success ───────────
  if (status === 'success') {
    return (
      <div className="min-h-screen text-white flex items-center justify-center p-6" style={{ background: 'var(--bg)' }}>
        <div className="w-full max-w-sm text-center auth-enter">
          <button onClick={() => navigate('/')} className="inline-block mb-8">
            <Wordmark />
          </button>
          <div
            className="w-12 h-12 mx-auto mb-5 rounded-full flex items-center justify-center"
            style={{ background: 'rgba(110,168,255,0.12)' }}
          >
            <svg className="w-6 h-6" fill="none" stroke="currentColor" strokeWidth={2.5}
                 viewBox="0 0 24 24" style={{ color: 'var(--accent-bright)' }}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
            </svg>
          </div>
          <h2 className="text-2xl font-semibold tracking-tight mb-3" style={{ letterSpacing: '-0.02em' }}>
            Device activated
          </h2>
          <p className="text-sm leading-relaxed" style={{ color: 'var(--fg-muted)' }}>
            Your TV is now connected. Return to your TV and start watching.
          </p>
          <p className="text-xs mt-6" style={{ color: 'var(--fg-dim)' }}>
            Redirecting to home…
          </p>
        </div>
      </div>
    );
  }

  // ─────────── Main form ───────────
  return (
    <div className="min-h-screen text-white flex items-center justify-center p-6" style={{ background: 'var(--bg)' }}>
      <div className={`w-full max-w-md ${mounted ? 'auth-enter' : 'auth-enter-pre'}`}>
        <div className="text-center mb-12">
          <button onClick={() => navigate('/')} className="inline-block mb-8">
            <Wordmark />
          </button>
          <IoTvOutline className="w-7 h-7 mx-auto mb-5" style={{ color: 'var(--accent-bright)' }} />
          <h1 className="text-3xl font-semibold tracking-tight mb-3" style={{ letterSpacing: '-0.025em' }}>
            Link your TV
          </h1>
          <p className="text-sm leading-relaxed max-w-xs mx-auto" style={{ color: 'var(--fg-muted)' }}>
            Enter the 4-digit code shown on your TV screen.
          </p>
        </div>

        <form onSubmit={handleSubmit} className="space-y-6">
          <CodeInput
            value={code}
            onChange={(v) => { setCode(v); if (status === 'error') setStatus('idle'); }}
            disabled={status === 'loading'}
            onSubmit={handleSubmit}
          />

          <div
            style={{
              maxHeight: status === 'error' && error ? '64px' : '0',
              opacity: status === 'error' && error ? 1 : 0,
              overflow: 'hidden',
              transition: 'max-height 0.3s ease, opacity 0.2s ease',
            }}
          >
            <div
              className="text-sm rounded-lg px-4 py-3 text-center"
              style={{
                background: 'rgba(239,106,106,0.08)',
                color: 'var(--danger)',
              }}
            >
              {error || ' '}
            </div>
          </div>

          <button
            type="submit"
            disabled={code.length !== 4 || status === 'loading'}
            className="btn-primary w-full disabled:opacity-40 disabled:cursor-not-allowed"
          >
            {status === 'loading' ? (
              <span className="flex items-center justify-center gap-2">
                <div
                  className="w-4 h-4 rounded-full animate-spin"
                  style={{ border: '2px solid rgba(0,0,0,0.2)', borderTopColor: 'var(--bg)' }}
                />
                Activating…
              </span>
            ) : (
              'Activate device'
            )}
          </button>
        </form>

        <p className="text-xs text-center mt-10 leading-relaxed" style={{ color: 'var(--fg-dim)' }}>
          Can't find the code? Make sure your TV app is open and showing the activation screen.
        </p>

        <div className="border-t hairline mt-10 pt-6 text-center text-xs" style={{ color: 'var(--fg-muted)' }}>
          Signed in as <span style={{ color: 'var(--fg)' }}>{user.email}</span>
        </div>
      </div>
    </div>
  );
}
