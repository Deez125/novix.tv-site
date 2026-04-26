import { useState, useEffect, useRef } from 'react';
import { useAuth } from '../lib/auth';
import { IoMdEye, IoMdEyeOff } from 'react-icons/io';

const Wordmark = () => (
  <span className="wordmark" style={{ fontSize: '1.5rem' }}>
    novix<span className="wordmark-dot">.</span>tv
  </span>
);

const GoogleG = () => (
  <svg className="w-5 h-5" viewBox="0 0 24 24" aria-hidden="true">
    <path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"/>
    <path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"/>
    <path fill="#FBBC05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"/>
    <path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"/>
  </svg>
);

const inputStyle = {
  background: 'var(--bg-elev)',
  border: '1px solid var(--hairline-strong)',
  color: 'var(--fg)',
};

function PasswordInput({ value, onChange, required, placeholder, visible, onToggle, onFocus, onBlur, tabIndex }) {
  return (
    <div className="relative">
      <input
        type={visible ? 'text' : 'password'}
        value={value}
        onChange={onChange}
        required={required}
        placeholder={placeholder}
        tabIndex={tabIndex}
        className="w-full pl-4 pr-11 py-3 rounded-lg text-sm focus:outline-none transition-colors"
        style={inputStyle}
        onFocus={onFocus}
        onBlur={onBlur}
      />
      <button
        type="button"
        onClick={onToggle}
        tabIndex={-1}
        aria-label={visible ? 'Hide password' : 'Show password'}
        className="absolute right-3 top-1/2 -translate-y-1/2 p-1 rounded transition-colors"
        style={{ color: 'var(--fg-muted)' }}
        onMouseEnter={(e) => (e.currentTarget.style.color = 'var(--fg)')}
        onMouseLeave={(e) => (e.currentTarget.style.color = 'var(--fg-muted)')}
      >
        {visible ? <IoMdEyeOff className="w-4 h-4" /> : <IoMdEye className="w-4 h-4" />}
      </button>
    </div>
  );
}

// Crossfade text on change without layout jump
function Morph({ children, k }) {
  const [display, setDisplay] = useState(children);
  const [visible, setVisible] = useState(true);

  useEffect(() => {
    setVisible(false);
    const t = setTimeout(() => {
      setDisplay(children);
      setVisible(true);
    }, 130);
    return () => clearTimeout(t);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [k]);

  return (
    <span
      style={{
        display: 'inline-block',
        opacity: visible ? 1 : 0,
        transform: visible ? 'translateY(0)' : 'translateY(4px)',
        transition: 'opacity 0.18s ease, transform 0.22s cubic-bezier(0.2, 0.8, 0.2, 1)',
      }}
    >
      {display}
    </span>
  );
}

export default function Auth({ initialMode = 'login' }) {
  const { signIn, signUp, signInWithOAuth } = useAuth();
  const [mode, setMode] = useState(initialMode);
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [error, setError] = useState('');
  const [success, setSuccess] = useState(false);
  const [loading, setLoading] = useState(false);
  const [mounted, setMounted] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirm, setShowConfirm] = useState(false);

  const isSignup = mode === 'signup';

  useEffect(() => {
    const t = requestAnimationFrame(() => setMounted(true));
    return () => cancelAnimationFrame(t);
  }, []);

  // Sync URL <-> mode (without remount)
  useEffect(() => {
    const desired = isSignup ? '/signup' : '/login';
    if (window.location.pathname !== desired) {
      window.history.replaceState({}, '', desired);
    }
  }, [isSignup]);

  // Listen for browser back/forward
  useEffect(() => {
    const onPop = () => {
      const path = window.location.pathname;
      if (path === '/login') setMode('login');
      else if (path === '/signup') setMode('signup');
    };
    window.addEventListener('popstate', onPop);
    return () => window.removeEventListener('popstate', onPop);
  }, []);

  const navigate = (path) => {
    window.history.pushState({}, '', path);
    window.dispatchEvent(new PopStateEvent('popstate'));
  };

  const toggleMode = () => {
    setError('');
    setMode(isSignup ? 'login' : 'signup');
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    if (isSignup) {
      if (password !== confirmPassword) return setError('Passwords do not match');
      if (password.length < 6) return setError('Password must be at least 6 characters');
    }
    setLoading(true);
    try {
      if (isSignup) {
        await signUp(email, password);
        setSuccess(true);
      } else {
        await signIn(email, password);
        navigate('/');
      }
    } catch (err) {
      setError(err.message || (isSignup ? 'Failed to create account' : 'Failed to sign in'));
    } finally {
      setLoading(false);
    }
  };

  const handleOAuth = async (provider) => {
    setError('');
    try {
      await signInWithOAuth(provider);
    } catch (err) {
      setError(err.message || `Failed with ${provider}`);
    }
  };

  const onFocus = (e) => (e.target.style.borderColor = 'var(--accent)');
  const onBlur  = (e) => (e.target.style.borderColor = 'var(--hairline-strong)');

  if (success) {
    return (
      <div className="min-h-screen text-white flex items-center justify-center p-4"
           style={{ background: 'var(--bg)' }}>
        <div className="w-full max-w-sm text-center auth-enter">
          <button onClick={() => navigate('/')} className="inline-block mb-6">
            <Wordmark />
          </button>
          <svg className="w-10 h-10 mx-auto mb-5" fill="none" stroke="currentColor" strokeWidth={1.5}
               viewBox="0 0 24 24" style={{ color: 'var(--accent-bright)' }}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M3 8l7.89 5.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" />
          </svg>
          <h2 className="text-2xl font-semibold tracking-tight mb-3" style={{ letterSpacing: '-0.02em' }}>
            Check your email
          </h2>
          <p className="text-sm text-muted mb-8 leading-relaxed">
            We sent a confirmation link to <span className="text-white font-medium">{email}</span>.
            Click the link to verify your account.
          </p>
          <button
            onClick={() => { setSuccess(false); setMode('login'); setPassword(''); setConfirmPassword(''); }}
            className="btn-primary"
          >
            Back to sign in
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen text-white flex items-center justify-center p-4"
         style={{ background: 'var(--bg)' }}>
      <div className={`w-full max-w-sm ${mounted ? 'auth-enter' : 'auth-enter-pre'}`}>
        <div className="text-center mb-10">
          <button onClick={() => navigate('/')} className="inline-block mb-4">
            <Wordmark />
          </button>
          <h1 className="text-2xl font-semibold tracking-tight" style={{ letterSpacing: '-0.02em' }}>
            <Morph k={mode}>{isSignup ? 'Welcome' : 'Welcome back'}</Morph>
          </h1>
          <p className="text-sm text-muted mt-2">
            <Morph k={mode}>{isSignup ? 'Create your account' : 'Sign in to your account'}</Morph>
          </p>
        </div>

        <div className="space-y-5">
          <div
            style={{
              maxHeight: error ? '64px' : '0',
              opacity: error ? 1 : 0,
              overflow: 'hidden',
              transition: 'max-height 0.3s ease, opacity 0.2s ease, margin 0.3s ease',
              marginBottom: error ? '0' : '-1.25rem',
            }}
          >
            <div
              className="text-sm rounded-lg px-4 py-3"
              style={{
                background: 'rgba(255,90,90,0.08)',
                color: '#ff8a8a',
                border: '1px solid rgba(255,90,90,0.2)',
              }}
            >
              {error || ' '}
            </div>
          </div>

          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="auth-field">
              <label className="block text-xs font-medium text-muted mb-2 uppercase tracking-wider">Email</label>
              <input
                type="email" value={email} onChange={(e) => setEmail(e.target.value)} required
                placeholder="you@example.com"
                className="w-full px-4 py-3 rounded-lg text-sm focus:outline-none transition-colors"
                style={inputStyle} onFocus={onFocus} onBlur={onBlur}
              />
            </div>

            <div className="auth-field">
              <div className="flex items-center justify-between mb-2 h-4">
                <label className="block text-xs font-medium text-muted uppercase tracking-wider">Password</label>
                <button
                  type="button"
                  className="text-xs hover:underline"
                  style={{
                    color: 'var(--accent-bright)',
                    opacity: isSignup ? 0 : 1,
                    pointerEvents: isSignup ? 'none' : 'auto',
                    transition: 'opacity 0.2s ease',
                  }}
                >
                  Forgot?
                </button>
              </div>
              <PasswordInput
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                required
                placeholder={isSignup ? 'At least 6 characters' : '••••••••'}
                visible={showPassword}
                onToggle={() => setShowPassword((v) => !v)}
                onFocus={onFocus} onBlur={onBlur}
              />
            </div>

            {/* Animated confirm-password field */}
            <div
              className="auth-collapse"
              style={{
                maxHeight: isSignup ? '108px' : '0',
                opacity: isSignup ? 1 : 0,
                transform: isSignup ? 'translateY(0)' : 'translateY(-6px)',
                pointerEvents: isSignup ? 'auto' : 'none',
              }}
            >
              <label className="block text-xs font-medium text-muted mb-2 uppercase tracking-wider">
                Confirm password
              </label>
              <PasswordInput
                value={confirmPassword}
                onChange={(e) => setConfirmPassword(e.target.value)}
                required={isSignup}
                placeholder="Repeat password"
                visible={showConfirm}
                onToggle={() => setShowConfirm((v) => !v)}
                onFocus={onFocus} onBlur={onBlur}
                tabIndex={isSignup ? 0 : -1}
              />
            </div>

            <button
              type="submit" disabled={loading}
              className="btn-primary w-full disabled:opacity-50 disabled:cursor-not-allowed"
            >
              <Morph k={`${mode}-${loading}`}>
                {loading
                  ? (isSignup ? 'Creating account…' : 'Signing in…')
                  : (isSignup ? 'Create account' : 'Sign in')}
              </Morph>
            </button>
          </form>

          <div className="flex items-center gap-4 text-xs uppercase tracking-[0.18em] text-dim">
            <div className="flex-1 border-t hairline" />
            <span>or</span>
            <div className="flex-1 border-t hairline" />
          </div>

          <button
            onClick={() => handleOAuth('google')}
            className="w-full flex items-center justify-center gap-3 px-4 py-3 rounded-lg text-sm font-medium transition-colors"
            style={{
              background: '#131314',
              color: '#e3e3e3',
              border: '1px solid #1f1f20',
              fontFamily: 'Roboto, system-ui, sans-serif',
            }}
            onMouseEnter={(e) => (e.currentTarget.style.background = '#1c1c1d')}
            onMouseLeave={(e) => (e.currentTarget.style.background = '#131314')}
          >
            <GoogleG />
            Continue with Google
          </button>

          {/* Terms — only shown on signup */}
          <div
            className="auth-collapse"
            style={{
              maxHeight: isSignup ? '40px' : '0',
              opacity: isSignup ? 1 : 0,
              marginTop: isSignup ? undefined : '-1.25rem',
            }}
          >
            <p className="text-xs text-dim text-center leading-relaxed">
              By signing up, you agree to our Terms of Service and Privacy Policy.
            </p>
          </div>
        </div>

        <p className="text-center mt-8 text-sm text-muted">
          <Morph k={mode}>
            {isSignup ? 'Already have an account?' : "Don't have an account?"}
          </Morph>
          {' '}
          <button
            onClick={toggleMode}
            className="font-medium hover:underline"
            style={{ color: 'var(--accent-bright)' }}
          >
            <Morph k={mode}>{isSignup ? 'Sign in' : 'Sign up'}</Morph>
          </button>
        </p>
      </div>
    </div>
  );
}
