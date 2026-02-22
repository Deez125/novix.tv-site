import { useState, useEffect, useRef } from 'react';
import { useAuth, startPlexAuth as startPlexAuthApi, checkPlexAuth } from '../lib/auth';

const API_BASE = import.meta.env.VITE_API_URL || 'http://localhost:8787';

// Icons
const FilmIcon = () => (
  <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 4v16M17 4v16M3 8h4m10 0h4M3 12h18M3 16h4m10 0h4M4 20h16a1 1 0 001-1V5a1 1 0 00-1-1H4a1 1 0 00-1 1v14a1 1 0 001 1z" />
  </svg>
);

const TvIcon = () => (
  <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9.75 17L9 20l-1 1h8l-1-1-.75-3M3 13h18M5 17h14a2 2 0 002-2V5a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" />
  </svg>
);

const NoAdsIcon = () => (
  <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M18.364 18.364A9 9 0 005.636 5.636m12.728 12.728A9 9 0 015.636 5.636m12.728 12.728L5.636 5.636" />
  </svg>
);

const SparklesIcon = () => (
  <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 3v4M3 5h4M6 17v4m-2-2h4m5-16l2.286 6.857L21 12l-5.714 2.143L13 21l-2.286-6.857L5 12l5.714-2.143L13 3z" />
  </svg>
);

const CheckIcon = () => (
  <svg className="w-5 h-5 text-emerald-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
  </svg>
);

const SearchIcon = () => (
  <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
  </svg>
);

const ChevronDownIcon = () => (
  <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
  </svg>
);

const UsersIcon = () => (
  <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4.354a4 4 0 110 5.292M15 21H3v-1a6 6 0 0112 0v1zm0 0h6v-1a6 6 0 00-9-5.197M13 7a4 4 0 11-8 0 4 4 0 018 0z" />
  </svg>
);

const BellIcon = () => (
  <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 17h5l-1.405-1.405A2.032 2.032 0 0118 14.158V11a6.002 6.002 0 00-4-5.659V5a2 2 0 10-4 0v.341C7.67 6.165 6 8.388 6 11v3.159c0 .538-.214 1.055-.595 1.436L4 17h5m6 0v1a3 3 0 11-6 0v-1m6 0H9" />
  </svg>
);

// FAQ Data
const faqItems = [
  {
    question: "What is Plex?",
    answer: "Plex is a free streaming app that lets you watch content on any device - smart TVs, phones, tablets, computers, and gaming consoles. You'll use Plex to access PandaTV's library after subscribing."
  },
  {
    question: "How do I watch?",
    answer: "After subscribing, you'll receive an invite to our Plex server. Download the free Plex app on your device, sign in with your Plex account, and our library will appear automatically. It's that simple!"
  },
  {
    question: "Can I cancel anytime?",
    answer: "Absolutely! There are no contracts or commitments. You can cancel your subscription at any time from your account settings, and you won't be charged again."
  },
  {
    question: "What devices are supported?",
    answer: "Plex works on almost everything: Smart TVs (Samsung, LG, Sony, etc.), Roku, Apple TV, Fire TV, Chromecast, PlayStation, Xbox, iOS, Android, Mac, Windows, and web browsers."
  },
  {
    question: "What's the difference between HD and 4K plans?",
    answer: "The HD plan streams content at up to 1080p resolution, perfect for most viewers. The 4K plan includes our premium 4K HDR library with the highest quality available - ideal for large TVs and home theaters."
  },
  {
    question: "How many people can watch at once?",
    answer: "Individual plans include 1 simultaneous stream. Family plans (coming soon) will include 2+ simultaneous streams, perfect for households with multiple viewers."
  }
];

// FAQ Item Component
function FAQItem({ question, answer, isOpen, onClick }) {
  return (
    <div className="border-b border-slate-700/50 last:border-0">
      <button
        onClick={onClick}
        className="w-full px-6 py-5 flex items-center justify-between text-left hover:text-emerald-400 transition"
      >
        <span className="font-medium pr-4">{question}</span>
        <span className={`transform transition-transform duration-200 text-slate-400 ${isOpen ? 'rotate-180' : ''}`}>
          <ChevronDownIcon />
        </span>
      </button>
      <div className={`overflow-hidden transition-all duration-300 ease-in-out ${isOpen ? 'max-h-48 pb-5' : 'max-h-0'}`}>
        <p className="text-slate-400 text-sm leading-relaxed px-6">{answer}</p>
      </div>
    </div>
  );
}

// Subscription plans (family plans hidden for now - waitlist coming soon)
const plans = [
  {
    id: 'access',
    name: 'PandaTV Access',
    price: 20,
    quality: '1080p',
    streams: 1,
    popular: false,
    family: false,
  },
  {
    id: 'plus',
    name: 'PandaTV +',
    price: 30,
    quality: '4K',
    streams: 1,
    popular: true,
    family: false,
  },
  // Family plans - coming soon (shown in waitlist UI)
  {
    id: 'family',
    name: 'PandaTV Family',
    price: 30,
    quality: '1080p',
    streams: 2,
    family: true,
  },
  {
    id: 'family-plus',
    name: 'PandaTV Family +',
    price: 40,
    quality: '4K',
    streams: 2,
    family: true,
  },
];


export default function Home() {
  const { user, login, logout } = useAuth();
  const [selectedPlan, setSelectedPlan] = useState(null);
  const [showAuthModal, setShowAuthModal] = useState(false);
  const [authMode, setAuthMode] = useState('login'); // 'login' or 'subscribe'
  const [step, setStep] = useState('start');
  const [plexUser, setPlexUser] = useState(null);
  const [pinData, setPinData] = useState(null);
  const [error, setError] = useState('');
  const [pollInterval, setPollIntervalState] = useState(null);
  const [stats, setStats] = useState({ movies: 0, tvShows: 0 });
  const [showProfileMenu, setShowProfileMenu] = useState(false);
  const [openFaqIndex, setOpenFaqIndex] = useState(null);
  const [waitlistEmail, setWaitlistEmail] = useState('');
  const [waitlistSubmitted, setWaitlistSubmitted] = useState(false);
  const profileMenuRef = useRef(null);

  // Close profile menu when clicking outside
  useEffect(() => {
    const handleClickOutside = (e) => {
      if (profileMenuRef.current && !profileMenuRef.current.contains(e.target)) {
        setShowProfileMenu(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  // Fetch library stats on load
  useEffect(() => {
    const fetchStats = async () => {
      try {
        const response = await fetch(`${API_BASE}/api/stats`);
        if (response.ok) {
          const data = await response.json();
          setStats(data);
        }
      } catch (err) {
        console.error('Failed to fetch stats:', err);
      }
    };
    fetchStats();
  }, []);

  // Check for cancelled checkout
  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    if (params.get('cancelled') === 'true') {
      setError('Checkout was cancelled. You can try again.');
      window.history.replaceState({}, '', '/');
    }
  }, []);

  const handleSelectPlan = (plan) => {
    // If already logged in, go straight to checkout confirmation
    if (user) {
      setSelectedPlan(plan);
      setPlexUser(user);
      setShowAuthModal(true);
      setAuthMode('subscribe');
      setStep('confirm');
      setError('');
    } else {
      setSelectedPlan(plan);
      setShowAuthModal(true);
      setAuthMode('subscribe');
      setStep('start');
      setError('');
    }
  };

  const handleLoginClick = () => {
    setSelectedPlan(null);
    setShowAuthModal(true);
    setAuthMode('login');
    setStep('start');
    setError('');
  };

  const goToAccount = () => {
    setShowProfileMenu(false);
    window.history.pushState({}, '', '/account');
    window.dispatchEvent(new PopStateEvent('popstate'));
  };

  const handleLogout = () => {
    setShowProfileMenu(false);
    logout();
  };

  const closeModal = () => {
    if (pollInterval) {
      clearInterval(pollInterval);
      setPollIntervalState(null);
    }
    setShowAuthModal(false);
    setSelectedPlan(null);
    setAuthMode('login');
    setStep('start');
    setPlexUser(null);
    setPinData(null);
    setError('');
  };

  const doPlexAuth = async () => {
    setError('');
    try {
      const data = await startPlexAuthApi();

      setPinData(data);
      setStep('authorizing');

      window.open(data.auth_url, '_blank', 'width=600,height=700');

      const interval = setInterval(async () => {
        try {
          const checkData = await checkPlexAuth(data.pin_id, data.pin_code);

          if (checkData.authorized) {
            clearInterval(interval);
            setPollIntervalState(null);
            setPlexUser(checkData.plex_user);

            // If just logging in (not subscribing), save to context and close
            if (authMode === 'login') {
              login(checkData.plex_user);
              closeModal();
            } else {
              setStep('confirm');
            }
          }
        } catch (err) {
          console.error('Poll error:', err);
        }
      }, 2000);

      setPollIntervalState(interval);

      setTimeout(() => {
        clearInterval(interval);
        setPollIntervalState(null);
      }, 5 * 60 * 1000);

    } catch (err) {
      setError(err.message);
    }
  };

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
          tier: selectedPlan.quality === '4K' ? '4k' : 'hd',
        }),
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || 'Failed to create checkout');
      }

      window.location.href = data.checkout_url;
    } catch (err) {
      setError(err.message);
      setStep('confirm');
    }
  };

  const individualPlans = plans.filter(p => !p.family);

  return (
    <div className="min-h-screen bg-slate-950 text-white">
      {/* Navigation */}
      <nav className="border-b border-slate-800/50">
        <div className="max-w-6xl mx-auto px-4 py-4 flex items-center justify-between">
          <h1 className="text-2xl font-bold">
            <span className="text-emerald-400">Panda</span>TV
          </h1>
          {user ? (
            <div className="relative" ref={profileMenuRef}>
              <button
                onClick={() => setShowProfileMenu(!showProfileMenu)}
                className="flex items-center gap-2 hover:opacity-80 transition"
              >
                {user.thumb ? (
                  <img
                    src={user.thumb}
                    alt={user.username}
                    className="w-9 h-9 rounded-full border-2 border-slate-700"
                  />
                ) : (
                  <div className="w-9 h-9 bg-emerald-500/20 rounded-full flex items-center justify-center border-2 border-slate-700">
                    <span className="text-emerald-400 font-semibold">
                      {user.username.charAt(0).toUpperCase()}
                    </span>
                  </div>
                )}
                <svg className="w-4 h-4 text-slate-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                </svg>
              </button>

              {showProfileMenu && (
                <div className="absolute right-0 mt-2 w-48 bg-slate-800 border border-slate-700 rounded-lg shadow-xl z-50 py-1">
                  <div className="px-4 py-2 border-b border-slate-700">
                    <div className="font-medium text-sm">{user.username}</div>
                    <div className="text-xs text-slate-400 truncate">{user.email}</div>
                  </div>
                  <button
                    onClick={goToAccount}
                    className="w-full text-left px-4 py-2 text-sm hover:bg-slate-700 transition flex items-center gap-2"
                  >
                    <svg className="w-4 h-4 text-slate-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z" />
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                    </svg>
                    Account Settings
                  </button>
                  <button
                    onClick={handleLogout}
                    className="w-full text-left px-4 py-2 text-sm text-red-400 hover:bg-slate-700 transition flex items-center gap-2"
                  >
                    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 16l4-4m0 0l-4-4m4 4H7m6 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h4a3 3 0 013 3v1" />
                    </svg>
                    Sign Out
                  </button>
                </div>
              )}
            </div>
          ) : (
            <button
              onClick={handleLoginClick}
              className="px-4 py-2 bg-emerald-600 hover:bg-emerald-500 rounded-lg font-medium transition"
            >
              Sign In
            </button>
          )}
        </div>
      </nav>

      {/* Hero Section */}
      <section className="py-20 px-4">
        <div className="max-w-4xl mx-auto text-center">
          <h2 className="text-5xl md:text-6xl font-bold mb-6 leading-tight">
            Your Personal
            <span className="text-emerald-400"> Streaming</span> Paradise
          </h2>
          <p className="text-xl text-slate-400 mb-8 max-w-2xl mx-auto">
            Access thousands of movies and TV shows in stunning quality.
            No ads, no interruptions, just pure entertainment.
          </p>
          <button
            onClick={() => document.getElementById('pricing')?.scrollIntoView({ behavior: 'smooth' })}
            className="inline-block px-8 py-4 bg-emerald-600 hover:bg-emerald-500 rounded-lg font-semibold text-lg transition"
          >
            Start Watching Today
          </button>
        </div>
      </section>

      {/* Stats Section */}
      <section className="py-16 px-4 border-y border-slate-800/50 bg-slate-900/30">
        <div className="max-w-4xl mx-auto">
          <div className="grid grid-cols-2 gap-8 text-center max-w-xl mx-auto">
            <div>
              <div className="text-4xl md:text-5xl font-bold text-emerald-400 mb-2">
                {stats.movies > 0 ? stats.movies.toLocaleString() : '—'}
              </div>
              <div className="text-slate-400">Movies</div>
            </div>
            <div>
              <div className="text-4xl md:text-5xl font-bold text-emerald-400 mb-2">
                {stats.tvShows > 0 ? stats.tvShows.toLocaleString() : '—'}
              </div>
              <div className="text-slate-400">TV Shows</div>
            </div>
          </div>
        </div>
      </section>

      {/* Features Section */}
      <section className="py-20 px-4">
        <div className="max-w-5xl mx-auto">
          <h3 className="text-3xl font-bold text-center mb-12">Why Choose PandaTV?</h3>
          <div className="grid md:grid-cols-2 lg:grid-cols-4 gap-6">
            <div className="bg-slate-800/30 border border-slate-700/50 rounded-xl p-6">
              <div className="w-12 h-12 bg-emerald-500/20 rounded-lg flex items-center justify-center mb-4 text-emerald-400">
                <NoAdsIcon />
              </div>
              <h4 className="text-lg font-semibold mb-2">Zero Ads</h4>
              <p className="text-slate-400 text-sm">
                Absolutely no advertisements. Ever. Just press play and enjoy.
              </p>
            </div>
            <div className="bg-slate-800/30 border border-slate-700/50 rounded-xl p-6">
              <div className="w-12 h-12 bg-emerald-500/20 rounded-lg flex items-center justify-center mb-4 text-emerald-400">
                <SparklesIcon />
              </div>
              <h4 className="text-lg font-semibold mb-2">4K Quality</h4>
              <p className="text-slate-400 text-sm">
                Crystal clear 4K HDR content for the ultimate viewing experience.
              </p>
            </div>
            <div className="bg-slate-800/30 border border-slate-700/50 rounded-xl p-6">
              <div className="w-12 h-12 bg-emerald-500/20 rounded-lg flex items-center justify-center mb-4 text-emerald-400">
                <FilmIcon />
              </div>
              <h4 className="text-lg font-semibold mb-2">Huge Library</h4>
              <p className="text-slate-400 text-sm">
                Thousands of movies and shows, with new content added daily.
              </p>
            </div>
            <div className="bg-slate-800/30 border border-slate-700/50 rounded-xl p-6">
              <div className="w-12 h-12 bg-emerald-500/20 rounded-lg flex items-center justify-center mb-4 text-emerald-400">
                <TvIcon />
              </div>
              <h4 className="text-lg font-semibold mb-2">Any Device</h4>
              <p className="text-slate-400 text-sm">
                Stream on your TV, phone, tablet, or computer. Plex works everywhere.
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* How It Works Section */}
      <section className="py-20 px-4 bg-slate-900/30">
        <div className="max-w-5xl mx-auto">
          <h3 className="text-3xl font-bold text-center mb-4">How It Works</h3>
          <p className="text-slate-400 text-center mb-12 max-w-2xl mx-auto">
            Get started in minutes. No complicated setup, no technical knowledge required.
          </p>
          <div className="grid md:grid-cols-3 gap-8">
            {/* Step 1 */}
            <div className="text-center">
              <div className="w-16 h-16 bg-emerald-500/20 rounded-full flex items-center justify-center mx-auto mb-4 relative">
                <span className="text-2xl font-bold text-emerald-400">1</span>
              </div>
              <h4 className="text-lg font-semibold mb-2">Choose Your Plan</h4>
              <p className="text-slate-400 text-sm">
                Pick the plan that fits your needs. HD for everyday watching, or 4K for the ultimate experience.
              </p>
            </div>
            {/* Step 2 */}
            <div className="text-center">
              <div className="w-16 h-16 bg-emerald-500/20 rounded-full flex items-center justify-center mx-auto mb-4">
                <span className="text-2xl font-bold text-emerald-400">2</span>
              </div>
              <h4 className="text-lg font-semibold mb-2">Connect with Plex</h4>
              <p className="text-slate-400 text-sm">
                Sign in with your free Plex account. Don't have one? Create it in seconds during checkout.
              </p>
            </div>
            {/* Step 3 */}
            <div className="text-center">
              <div className="w-16 h-16 bg-emerald-500/20 rounded-full flex items-center justify-center mx-auto mb-4">
                <span className="text-2xl font-bold text-emerald-400">3</span>
              </div>
              <h4 className="text-lg font-semibold mb-2">Start Streaming</h4>
              <p className="text-slate-400 text-sm">
                You'll receive an instant invite. Open Plex on any device and our library appears automatically.
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* Pricing Section */}
      <section id="pricing" className="py-20 px-4">
        <div className="max-w-5xl mx-auto">
          <div className="text-center mb-12">
            <h3 className="text-3xl font-bold mb-4">Simple, Transparent Pricing</h3>
            <p className="text-slate-400">Choose the plan that's right for you. Cancel anytime.</p>
          </div>

          {/* Individual Plans */}
          <div className="grid md:grid-cols-2 gap-6 max-w-3xl mx-auto mb-12">
            {individualPlans.map((plan) => (
              <div
                key={plan.id}
                className={`relative bg-slate-800/50 border rounded-2xl p-6 ${
                  plan.popular
                    ? 'border-emerald-500 ring-2 ring-emerald-500/20'
                    : 'border-slate-700'
                }`}
              >
                {plan.popular && (
                  <div className="absolute -top-3 left-1/2 -translate-x-1/2">
                    <span className="bg-emerald-500 text-black text-xs font-bold px-3 py-1 rounded-full">
                      MOST POPULAR
                    </span>
                  </div>
                )}
                <div className="mb-6">
                  <h4 className="text-xl font-bold mb-2">{plan.name}</h4>
                  <div className="flex items-baseline gap-1">
                    <span className="text-4xl font-bold">${plan.price}</span>
                    <span className="text-slate-400">/month</span>
                  </div>
                </div>
                <ul className="space-y-3 mb-6">
                  <li className="flex items-center gap-3">
                    <CheckIcon />
                    <span>{plan.quality} streaming quality</span>
                  </li>
                  <li className="flex items-center gap-3">
                    <CheckIcon />
                    <span>{plan.streams} simultaneous stream{plan.streams > 1 ? 's' : ''}</span>
                  </li>
                  <li className="flex items-center gap-3">
                    <CheckIcon />
                    <span>Full library access</span>
                  </li>
                  <li className="flex items-center gap-3">
                    <CheckIcon />
                    <span>No ads, ever</span>
                  </li>
                </ul>
                <button
                  onClick={() => handleSelectPlan(plan)}
                  className={`w-full py-3 rounded-lg font-semibold transition ${
                    plan.popular
                      ? 'bg-emerald-600 hover:bg-emerald-500'
                      : 'bg-slate-700 hover:bg-slate-600'
                  }`}
                >
                  Get Started
                </button>
              </div>
            ))}
          </div>

          {/* Family Plans Waitlist */}
          <div className="max-w-2xl mx-auto">
            <div className="bg-gradient-to-br from-amber-500/10 to-emerald-500/10 border border-amber-500/30 rounded-2xl p-8 text-center">
              <div className="w-14 h-14 bg-amber-500/20 rounded-full flex items-center justify-center mx-auto mb-4 text-amber-400">
                <UsersIcon />
              </div>
              <h4 className="text-2xl font-bold mb-2">Family Plans Coming Soon</h4>
              <p className="text-slate-400 mb-6">
                Share PandaTV with your household. Get 2 simultaneous streams and save.
                Join the waitlist to be notified when family plans launch.
              </p>

              {waitlistSubmitted ? (
                <div className="flex items-center justify-center gap-2 text-emerald-400">
                  <CheckIcon />
                  <span className="font-medium">You're on the list! We'll notify you soon.</span>
                </div>
              ) : (
                <div className="flex gap-3 max-w-md mx-auto">
                  <input
                    type="email"
                    placeholder="Enter your email"
                    value={waitlistEmail}
                    onChange={(e) => setWaitlistEmail(e.target.value)}
                    className="flex-1 px-4 py-3 bg-slate-800/80 border border-slate-600 rounded-lg focus:outline-none focus:border-amber-500 transition"
                  />
                  <button
                    onClick={() => {
                      if (waitlistEmail) setWaitlistSubmitted(true);
                    }}
                    className="px-6 py-3 bg-amber-500 hover:bg-amber-400 text-black font-semibold rounded-lg transition flex items-center gap-2"
                  >
                    <BellIcon />
                    Notify Me
                  </button>
                </div>
              )}
            </div>
          </div>
        </div>
      </section>

      {/* Search Preview Section */}
      <section className="py-20 px-4 bg-slate-900/30">
        <div className="max-w-4xl mx-auto">
          <h3 className="text-3xl font-bold text-center mb-4">Find Anything Instantly</h3>
          <p className="text-slate-400 text-center mb-8 max-w-2xl mx-auto">
            Search our massive library for your favorite movies and shows. New content added daily.
          </p>
          <div className="relative max-w-2xl mx-auto">
            <div className="flex items-center gap-3 px-5 py-4 bg-slate-800/80 border border-slate-700 rounded-xl">
              <SearchIcon />
              <input
                type="text"
                placeholder="Try searching: Dune, Breaking Bad, The Office..."
                className="flex-1 bg-transparent outline-none text-white placeholder-slate-500"
                disabled
              />
            </div>
            {/* Fake search results preview */}
            <div className="mt-4 bg-slate-800/60 border border-slate-700/50 rounded-xl p-4">
              <div className="text-xs text-slate-500 uppercase tracking-wider mb-3">Popular Searches</div>
              <div className="flex flex-wrap gap-2">
                {['Dune', 'Breaking Bad', 'The Office', 'Interstellar', 'Stranger Things', 'The Mandalorian'].map((title) => (
                  <span
                    key={title}
                    className="px-3 py-1.5 bg-slate-700/50 hover:bg-slate-700 rounded-lg text-sm cursor-pointer transition"
                  >
                    {title}
                  </span>
                ))}
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* FAQ Section */}
      <section className="py-20 px-4">
        <div className="max-w-3xl mx-auto">
          <h3 className="text-3xl font-bold text-center mb-4">Frequently Asked Questions</h3>
          <p className="text-slate-400 text-center mb-10">
            Got questions? We've got answers.
          </p>
          <div className="bg-slate-800/30 border border-slate-700/50 rounded-xl">
            {faqItems.map((item, index) => (
              <FAQItem
                key={index}
                question={item.question}
                answer={item.answer}
                isOpen={openFaqIndex === index}
                onClick={() => setOpenFaqIndex(openFaqIndex === index ? null : index)}
              />
            ))}
          </div>
        </div>
      </section>

      {/* Footer */}
      <footer className="py-10 px-4 border-t border-slate-800/50 bg-slate-900/50">
        <div className="max-w-5xl mx-auto">
          <div className="flex flex-col md:flex-row items-center justify-between gap-4">
            <div className="text-2xl font-bold">
              <span className="text-emerald-400">Panda</span>TV
            </div>
            <div className="text-slate-500 text-sm">
              &copy; {new Date().getFullYear()} PandaTV. All rights reserved.
            </div>
          </div>
        </div>
      </footer>

      {/* Auth Modal */}
      {showAuthModal && (
        <div className="fixed inset-0 bg-black/70 flex items-center justify-center z-50 p-4">
          <div className="bg-slate-800 rounded-2xl border border-slate-700 w-full max-w-md p-6 relative">
            <button
              onClick={closeModal}
              className="absolute top-4 right-4 text-slate-400 hover:text-white"
            >
              <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>

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
                    {authMode === 'subscribe' && selectedPlan
                      ? <>Connect your Plex account to subscribe to <strong>{selectedPlan.name}</strong></>
                      : 'Connect your Plex account to sign in'
                    }
                  </p>
                </div>

                <button
                  onClick={doPlexAuth}
                  className="w-full px-4 py-3 bg-amber-500 hover:bg-amber-400 text-black font-semibold rounded-lg transition"
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
                    Complete the sign-in in the Plex popup window.
                  </p>
                </div>
              </div>
            )}

            {/* Step 3: Confirm */}
            {step === 'confirm' && plexUser && (
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
                      <span className="text-emerald-400 font-semibold text-lg">
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

                <div className="mb-6 p-4 bg-slate-900 rounded-lg border border-slate-700">
                  <div className="flex justify-between items-center mb-2">
                    <span className="font-semibold">{selectedPlan?.name}</span>
                    <span className="text-xl font-bold">${selectedPlan?.price}/mo</span>
                  </div>
                  <div className="text-sm text-slate-400">
                    {selectedPlan?.quality} • {selectedPlan?.streams} stream{selectedPlan?.streams > 1 ? 's' : ''}
                  </div>
                </div>

                <button
                  onClick={proceedToCheckout}
                  className="w-full px-4 py-3 bg-emerald-600 hover:bg-emerald-500 font-semibold rounded-lg transition"
                >
                  Continue to Checkout
                </button>

                <button
                  onClick={() => { setStep('start'); setPlexUser(null); }}
                  className="w-full mt-3 px-4 py-2 text-slate-400 hover:text-white transition text-sm"
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
                <p className="text-slate-400 text-sm">Redirecting to checkout...</p>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
