import { useState, useEffect, useRef } from 'react';
import { useAuth } from '../lib/auth';

const API_BASE = import.meta.env.VITE_API_URL || 'http://localhost:8787';

// Icons
const TvIcon = () => (
  <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9.75 17L9 20l-1 1h8l-1-1-.75-3M3 13h18M5 17h14a2 2 0 002-2V5a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" />
  </svg>
);

const PhoneIcon = () => (
  <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 18h.01M8 21h8a2 2 0 002-2V5a2 2 0 00-2-2H8a2 2 0 00-2 2v14a2 2 0 002 2z" />
  </svg>
);

const GlobeIcon = () => (
  <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 12a9 9 0 01-9 9m9-9a9 9 0 00-9-9m9 9H3m9 9a9 9 0 01-9-9m9 9c1.657 0 3-4.03 3-9s-1.343-9-3-9m0 18c-1.657 0-3-4.03-3-9s1.343-9 3-9m-9 9a9 9 0 019-9" />
  </svg>
);

const PlayIcon = () => (
  <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M14.752 11.168l-3.197-2.132A1 1 0 0010 9.87v4.263a1 1 0 001.555.832l3.197-2.132a1 1 0 000-1.664z" />
    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
  </svg>
);

const CheckIcon = () => (
  <svg className="w-5 h-5 text-violet-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
  </svg>
);

const ChevronDownIcon = () => (
  <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
  </svg>
);

const LinkIcon = () => (
  <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13.828 10.172a4 4 0 00-5.656 0l-4 4a4 4 0 105.656 5.656l1.102-1.101m-.758-4.899a4 4 0 005.656 0l4-4a4 4 0 00-5.656-5.656l-1.1 1.1" />
  </svg>
);

const ZapIcon = () => (
  <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 10V3L4 14h7v7l9-11h-7z" />
  </svg>
);

// FAQ Data
const faqItems = [
  {
    question: "What is NovixTV?",
    answer: "NovixTV is a premium streaming app that unifies your Plex libraries and IPTV providers into one beautiful interface. Access all your content from a single app on any device."
  },
  {
    question: "What devices are supported?",
    answer: "NovixTV works on Smart TVs (Samsung, LG, Sony, etc.), iOS (iPhone & iPad), Android phones and tablets, Apple TV, Fire TV, Roku, and web browsers. Watch anywhere, anytime."
  },
  {
    question: "How do I connect my Plex library?",
    answer: "After subscribing, go to Account Settings and link your Plex account with one click. Your entire library will appear instantly in the NovixTV app."
  },
  {
    question: "Can I use my own IPTV provider?",
    answer: "Yes! NovixTV supports M3U playlists and Xtream Codes. Simply add your IPTV credentials in the app settings and your live TV channels will be integrated seamlessly."
  },
  {
    question: "Can I cancel anytime?",
    answer: "Absolutely! There are no contracts or commitments. Cancel your subscription at any time from your account settings, and you won't be charged again."
  },
  {
    question: "Is there a free trial?",
    answer: "We offer a 7-day free trial for new subscribers. Experience all NovixTV features before committing. Cancel anytime during the trial and you won't be charged."
  }
];

// FAQ Item Component
function FAQItem({ question, answer, isOpen, onClick }) {
  return (
    <div className="border-b border-slate-700/50 last:border-0">
      <button
        onClick={onClick}
        className="w-full px-6 py-5 flex items-center justify-between text-left hover:text-violet-400 transition"
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

// Subscription plans
const plans = [
  {
    id: 'monthly',
    name: 'Monthly',
    price: 9.99,
    period: 'month',
    popular: false,
  },
  {
    id: 'yearly',
    name: 'Yearly',
    price: 79.99,
    period: 'year',
    popular: true,
    savings: 'Save 33%',
  },
];


export default function Home() {
  const { user, signOut, loading } = useAuth();
  const [showProfileMenu, setShowProfileMenu] = useState(false);
  const [openFaqIndex, setOpenFaqIndex] = useState(null);
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

  const handleLoginClick = () => {
    window.history.pushState({}, '', '/login');
    window.dispatchEvent(new PopStateEvent('popstate'));
  };

  const handleSignupClick = () => {
    window.history.pushState({}, '', '/signup');
    window.dispatchEvent(new PopStateEvent('popstate'));
  };

  const goToAccount = () => {
    setShowProfileMenu(false);
    window.history.pushState({}, '', '/account');
    window.dispatchEvent(new PopStateEvent('popstate'));
  };

  const handleLogout = async () => {
    setShowProfileMenu(false);
    await signOut();
  };

  const handleSelectPlan = (plan) => {
    if (user) {
      // Go to checkout/subscription page
      window.history.pushState({}, '', `/checkout?plan=${plan.id}`);
      window.dispatchEvent(new PopStateEvent('popstate'));
    } else {
      // Go to signup with plan selected
      window.history.pushState({}, '', `/signup?plan=${plan.id}`);
      window.dispatchEvent(new PopStateEvent('popstate'));
    }
  };

  return (
    <div className="min-h-screen bg-slate-950 text-white">
      {/* Navigation */}
      <nav className="border-b border-slate-800/50">
        <div className="max-w-6xl mx-auto px-4 py-4 flex items-center justify-between">
          <h1 className="text-2xl font-bold">
            <span className="text-violet-400">Novix</span>TV
          </h1>
          {user ? (
            <div className="relative" ref={profileMenuRef}>
              <button
                onClick={() => setShowProfileMenu(!showProfileMenu)}
                className="flex items-center gap-2 hover:opacity-80 transition"
              >
                {user.user_metadata?.avatar_url || user.user_metadata?.picture ? (
                  <img
                    src={user.user_metadata?.avatar_url || user.user_metadata?.picture}
                    alt={user.user_metadata?.full_name || user.user_metadata?.name || user.email}
                    className="w-9 h-9 rounded-full border-2 border-slate-700"
                  />
                ) : (
                  <div className="w-9 h-9 bg-violet-500/20 rounded-full flex items-center justify-center border-2 border-slate-700">
                    <span className="text-violet-400 font-semibold">
                      {(user.user_metadata?.full_name || user.user_metadata?.name || user.email || 'U').charAt(0).toUpperCase()}
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
                    <div className="font-medium text-sm">{user.user_metadata?.full_name || user.user_metadata?.name || 'User'}</div>
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
                    onClick={() => {}}
                    className="w-full text-left px-4 py-2 text-sm hover:bg-slate-700 transition flex items-center gap-2 text-slate-400"
                  >
                    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8.228 9c.549-1.165 2.03-2 3.772-2 2.21 0 4 1.343 4 3 0 1.4-1.278 2.575-3.006 2.907-.542.104-.994.54-.994 1.093m0 3h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                    </svg>
                    Help
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
            <div className="flex items-center gap-3">
              <button
                onClick={handleLoginClick}
                className="px-4 py-2 text-slate-300 hover:text-white transition"
              >
                Sign In
              </button>
              <button
                onClick={handleSignupClick}
                className="px-4 py-2 bg-violet-600 hover:bg-violet-500 rounded-lg font-medium transition"
              >
                Get Started
              </button>
            </div>
          )}
        </div>
      </nav>

      {/* Hero Section */}
      <section className="py-20 px-4">
        <div className="max-w-4xl mx-auto text-center">
          <div className="inline-flex items-center gap-2 px-4 py-2 bg-violet-500/10 border border-violet-500/30 rounded-full mb-6">
            <span className="text-violet-400 text-sm font-medium">Now available on all platforms</span>
          </div>
          <h2 className="text-5xl md:text-6xl font-bold mb-6 leading-tight">
            All Your Streaming,
            <span className="text-violet-400"> One App</span>
          </h2>
          <p className="text-xl text-slate-400 mb-8 max-w-2xl mx-auto">
            Connect your Plex libraries and IPTV providers.
            Watch everything in one beautiful, unified experience on any device.
          </p>
          <div className="flex flex-col sm:flex-row items-center justify-center gap-4">
            <button
              onClick={() => document.getElementById('pricing')?.scrollIntoView({ behavior: 'smooth' })}
              className="px-8 py-4 bg-violet-600 hover:bg-violet-500 rounded-lg font-semibold text-lg transition flex items-center gap-2"
            >
              <PlayIcon />
              Start Free Trial
            </button>
            <button className="px-8 py-4 bg-slate-800 hover:bg-slate-700 border border-slate-700 rounded-lg font-semibold text-lg transition">
              Watch Demo
            </button>
          </div>
        </div>
      </section>

      {/* Platform Icons */}
      <section className="py-8 px-4 border-y border-slate-800/50 bg-slate-900/30">
        <div className="max-w-4xl mx-auto">
          <p className="text-center text-slate-500 text-sm mb-6">Available on all your favorite platforms</p>
          <div className="flex items-center justify-center gap-8 flex-wrap text-slate-400">
            <div className="flex items-center gap-2">
              <TvIcon />
              <span className="text-sm">Smart TV</span>
            </div>
            <div className="flex items-center gap-2">
              <PhoneIcon />
              <span className="text-sm">iOS & Android</span>
            </div>
            <div className="flex items-center gap-2">
              <GlobeIcon />
              <span className="text-sm">Web Browser</span>
            </div>
            <div className="flex items-center gap-2">
              <svg className="w-6 h-6" fill="currentColor" viewBox="0 0 24 24">
                <path d="M18.71 19.5c-.83 1.24-1.71 2.45-3.05 2.47-1.34.03-1.77-.79-3.29-.79-1.53 0-2 .77-3.27.82-1.31.05-2.3-1.32-3.14-2.53C4.25 17 2.94 12.45 4.7 9.39c.87-1.52 2.43-2.48 4.12-2.51 1.28-.02 2.5.87 3.29.87.78 0 2.26-1.07 3.81-.91.65.03 2.47.26 3.64 1.98-.09.06-2.17 1.28-2.15 3.81.03 3.02 2.65 4.03 2.68 4.04-.03.07-.42 1.44-1.38 2.83M13 3.5c.73-.83 1.94-1.46 2.94-1.5.13 1.17-.34 2.35-1.04 3.19-.69.85-1.83 1.51-2.95 1.42-.15-1.15.41-2.35 1.05-3.11z"/>
              </svg>
              <span className="text-sm">Apple TV</span>
            </div>
            <div className="flex items-center gap-2">
              <svg className="w-6 h-6" fill="currentColor" viewBox="0 0 24 24">
                <path d="M12.04 3.5c.59 0 1.2.04 1.82.13 3.49.49 6.37 2.87 7.43 6.14.35 1.08.53 2.18.53 3.31 0 .55-.04 1.09-.11 1.62-.44 3.25-2.41 5.97-5.24 7.38-.77.38-1.58.68-2.43.88-.59.14-1.2.21-1.82.21-.62 0-1.23-.07-1.82-.21-.85-.2-1.66-.5-2.43-.88-2.83-1.41-4.8-4.13-5.24-7.38-.07-.53-.11-1.07-.11-1.62 0-1.13.18-2.23.53-3.31 1.06-3.27 3.94-5.65 7.43-6.14.62-.09 1.23-.13 1.82-.13m0-1.5c-.7 0-1.42.05-2.13.16-4.06.58-7.43 3.35-8.69 7.22-.42 1.28-.64 2.61-.64 3.95 0 .66.04 1.31.13 1.94.52 3.86 2.86 7.11 6.15 8.75.9.45 1.85.8 2.84 1.03.7.17 1.42.25 2.13.25.71 0 1.43-.08 2.13-.25.99-.23 1.94-.58 2.84-1.03 3.29-1.64 5.63-4.89 6.15-8.75.09-.63.13-1.28.13-1.94 0-1.34-.22-2.67-.64-3.95-1.26-3.87-4.63-6.64-8.69-7.22-.71-.11-1.43-.16-2.13-.16z"/>
              </svg>
              <span className="text-sm">Fire TV</span>
            </div>
          </div>
        </div>
      </section>

      {/* Features Section */}
      <section className="py-20 px-4">
        <div className="max-w-5xl mx-auto">
          <h3 className="text-3xl font-bold text-center mb-4">Everything You Need</h3>
          <p className="text-slate-400 text-center mb-12 max-w-2xl mx-auto">
            NovixTV brings all your streaming content together in one powerful app.
          </p>
          <div className="grid md:grid-cols-2 lg:grid-cols-4 gap-6">
            <div className="bg-slate-800/30 border border-slate-700/50 rounded-xl p-6">
              <div className="w-12 h-12 bg-violet-500/20 rounded-lg flex items-center justify-center mb-4 text-violet-400">
                <LinkIcon />
              </div>
              <h4 className="text-lg font-semibold mb-2">Connect Plex</h4>
              <p className="text-slate-400 text-sm">
                Link your Plex libraries and access all your media in one place.
              </p>
            </div>
            <div className="bg-slate-800/30 border border-slate-700/50 rounded-xl p-6">
              <div className="w-12 h-12 bg-violet-500/20 rounded-lg flex items-center justify-center mb-4 text-violet-400">
                <TvIcon />
              </div>
              <h4 className="text-lg font-semibold mb-2">Live TV</h4>
              <p className="text-slate-400 text-sm">
                Add your IPTV provider and watch live channels seamlessly.
              </p>
            </div>
            <div className="bg-slate-800/30 border border-slate-700/50 rounded-xl p-6">
              <div className="w-12 h-12 bg-violet-500/20 rounded-lg flex items-center justify-center mb-4 text-violet-400">
                <ZapIcon />
              </div>
              <h4 className="text-lg font-semibold mb-2">Fast & Smooth</h4>
              <p className="text-slate-400 text-sm">
                Optimized for performance with instant playback and smooth navigation.
              </p>
            </div>
            <div className="bg-slate-800/30 border border-slate-700/50 rounded-xl p-6">
              <div className="w-12 h-12 bg-violet-500/20 rounded-lg flex items-center justify-center mb-4 text-violet-400">
                <PhoneIcon />
              </div>
              <h4 className="text-lg font-semibold mb-2">Any Device</h4>
              <p className="text-slate-400 text-sm">
                Watch on TV, phone, tablet, or browser. Your content follows you.
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
            Get started in minutes. Connect your services and start streaming.
          </p>
          <div className="grid md:grid-cols-3 gap-8">
            <div className="text-center">
              <div className="w-16 h-16 bg-violet-500/20 rounded-full flex items-center justify-center mx-auto mb-4 relative">
                <span className="text-2xl font-bold text-violet-400">1</span>
              </div>
              <h4 className="text-lg font-semibold mb-2">Create Account</h4>
              <p className="text-slate-400 text-sm">
                Sign up with email or your favorite social account. Start your free trial instantly.
              </p>
            </div>
            <div className="text-center">
              <div className="w-16 h-16 bg-violet-500/20 rounded-full flex items-center justify-center mx-auto mb-4">
                <span className="text-2xl font-bold text-violet-400">2</span>
              </div>
              <h4 className="text-lg font-semibold mb-2">Connect Services</h4>
              <p className="text-slate-400 text-sm">
                Link your Plex account and add your IPTV provider credentials.
              </p>
            </div>
            <div className="text-center">
              <div className="w-16 h-16 bg-violet-500/20 rounded-full flex items-center justify-center mx-auto mb-4">
                <span className="text-2xl font-bold text-violet-400">3</span>
              </div>
              <h4 className="text-lg font-semibold mb-2">Start Watching</h4>
              <p className="text-slate-400 text-sm">
                Download the app on your devices and enjoy all your content in one place.
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* Pricing Section */}
      <section id="pricing" className="py-20 px-4">
        <div className="max-w-4xl mx-auto">
          <div className="text-center mb-12">
            <h3 className="text-3xl font-bold mb-4">Simple Pricing</h3>
            <p className="text-slate-400">Start with a 7-day free trial. Cancel anytime.</p>
          </div>

          <div className="grid md:grid-cols-2 gap-6 max-w-2xl mx-auto">
            {plans.map((plan) => (
              <div
                key={plan.id}
                className={`relative bg-slate-800/50 border rounded-2xl p-6 ${
                  plan.popular
                    ? 'border-violet-500 ring-2 ring-violet-500/20'
                    : 'border-slate-700'
                }`}
              >
                {plan.popular && (
                  <div className="absolute -top-3 left-1/2 -translate-x-1/2">
                    <span className="bg-violet-500 text-white text-xs font-bold px-3 py-1 rounded-full">
                      BEST VALUE
                    </span>
                  </div>
                )}
                <div className="mb-6">
                  <h4 className="text-xl font-bold mb-2">{plan.name}</h4>
                  <div className="flex items-baseline gap-1">
                    <span className="text-4xl font-bold">${plan.price}</span>
                    <span className="text-slate-400">/{plan.period}</span>
                  </div>
                  {plan.savings && (
                    <span className="text-violet-400 text-sm font-medium">{plan.savings}</span>
                  )}
                </div>
                <ul className="space-y-3 mb-6">
                  <li className="flex items-center gap-3">
                    <CheckIcon />
                    <span>All platform access</span>
                  </li>
                  <li className="flex items-center gap-3">
                    <CheckIcon />
                    <span>Unlimited Plex libraries</span>
                  </li>
                  <li className="flex items-center gap-3">
                    <CheckIcon />
                    <span>IPTV integration</span>
                  </li>
                  <li className="flex items-center gap-3">
                    <CheckIcon />
                    <span>4K streaming support</span>
                  </li>
                  <li className="flex items-center gap-3">
                    <CheckIcon />
                    <span>7-day free trial</span>
                  </li>
                </ul>
                <button
                  onClick={() => handleSelectPlan(plan)}
                  className={`w-full py-3 rounded-lg font-semibold transition ${
                    plan.popular
                      ? 'bg-violet-600 hover:bg-violet-500'
                      : 'bg-slate-700 hover:bg-slate-600'
                  }`}
                >
                  Start Free Trial
                </button>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* FAQ Section */}
      <section className="py-20 px-4 bg-slate-900/30">
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

      {/* CTA Section */}
      <section className="py-20 px-4">
        <div className="max-w-4xl mx-auto text-center">
          <h3 className="text-3xl font-bold mb-4">Ready to Get Started?</h3>
          <p className="text-slate-400 mb-8 max-w-xl mx-auto">
            Join thousands of users who have unified their streaming experience with NovixTV.
          </p>
          <button
            onClick={handleSignupClick}
            className="px-8 py-4 bg-violet-600 hover:bg-violet-500 rounded-lg font-semibold text-lg transition"
          >
            Start Your Free Trial
          </button>
        </div>
      </section>

      {/* Footer */}
      <footer className="py-10 px-4 border-t border-slate-800/50 bg-slate-900/50">
        <div className="max-w-5xl mx-auto">
          <div className="flex flex-col md:flex-row items-center justify-between gap-4">
            <div className="text-2xl font-bold">
              <span className="text-violet-400">Novix</span>TV
            </div>
            <div className="text-slate-500 text-sm">
              &copy; {new Date().getFullYear()} NovixTV. All rights reserved.
            </div>
          </div>
        </div>
      </footer>
    </div>
  );
}
