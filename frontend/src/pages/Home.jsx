import { useState, useEffect, useRef } from 'react';
import { useAuth } from '../lib/auth';
import { FaGear, FaLink } from 'react-icons/fa6';
import { IoMdHelpCircleOutline } from 'react-icons/io';
import { IoTvOutline, IoPhonePortraitOutline } from 'react-icons/io5';
import { BsGlobe } from 'react-icons/bs';
import { FaApple, FaGoogle } from 'react-icons/fa';
import { SiRoku, SiAmazonfiretv } from 'react-icons/si';
import { MdDevices } from 'react-icons/md';
import { LuLibraryBig } from 'react-icons/lu';

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
    answer: "NovixTV is a premium streaming app that unifies your Plex, Jellyfin, Emby, and IPTV providers into one beautiful interface. Access all your content from a single app on any device."
  },
  {
    question: "What devices are supported?",
    answer: "NovixTV works on Smart TVs (Samsung, LG, Sony, etc.), iOS (iPhone & iPad), Android phones and tablets, Apple TV, Roku, and web browsers. Watch anywhere, anytime."
  },
  {
    question: "How do I connect my media libraries?",
    answer: "After subscribing, go to Account Settings and link your Plex, Jellyfin, or Emby account with one click. Your entire library will appear instantly in the NovixTV app."
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
    answer: "We offer a 14-day free trial for new subscribers. Experience all NovixTV features before committing. Cancel anytime during the trial and you won't be charged."
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

  const goToLink = () => {
    setShowProfileMenu(false);
    window.history.pushState({}, '', '/link');
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
          <img src="/logo2.svg" alt="NovixTV" className="h-8" />
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
                    <FaGear className="w-4 h-4 text-slate-400" />
                    Account Settings
                  </button>
                  <button
                    onClick={goToLink}
                    className="w-full text-left px-4 py-2 text-sm hover:bg-slate-700 transition flex items-center gap-2"
                  >
                    <FaLink className="w-4 h-4 text-slate-400" />
                    Link Device
                  </button>
                  <button
                    onClick={() => {}}
                    className="w-full text-left px-4 py-2 text-sm hover:bg-slate-700 transition flex items-center gap-2 text-slate-400"
                  >
                    <IoMdHelpCircleOutline className="w-4 h-4" />
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
                Log In
              </button>
              <button
                onClick={handleSignupClick}
                className="px-4 py-2 bg-violet-600 hover:bg-violet-500 rounded-lg font-medium transition"
              >
                Sign Up
              </button>
            </div>
          )}
        </div>
      </nav>

      {/* Hero Section */}
      <section className="py-20 px-4">
        <div className="max-w-4xl mx-auto text-center">
          <h2 className="text-5xl md:text-6xl font-bold mb-6 leading-tight">
            All Your Streaming,
            <span className="text-violet-400"> One App</span>
          </h2>
          <p className="text-xl text-slate-400 mb-8 max-w-2xl mx-auto">
            Connect your Plex, Jellyfin, Emby, and IPTV providers.
            Watch everything in one beautiful, unified experience on any device.
          </p>
          <div className="flex flex-col sm:flex-row items-center justify-center gap-4">
            <button
              onClick={() => document.getElementById('pricing')?.scrollIntoView({ behavior: 'smooth' })}
              className="px-8 py-4 bg-violet-600 hover:bg-violet-500 rounded-lg font-semibold text-lg transition"
            >
              Get Started
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
              <IoTvOutline className="w-6 h-6" />
              <span className="text-sm">Smart TV</span>
            </div>
            <div className="flex items-center gap-2">
              <IoPhonePortraitOutline className="w-6 h-6" />
              <span className="text-sm">iOS & Android</span>
            </div>
            <div className="flex items-center gap-2">
              <BsGlobe className="w-6 h-6" />
              <span className="text-sm">Web Browser</span>
            </div>
            <div className="flex items-center gap-2">
              <FaApple className="w-6 h-6" />
              <span className="text-sm">Apple TV</span>
            </div>
            <div className="flex items-center gap-2">
              <FaGoogle className="w-6 h-6" />
              <span className="text-sm">Google TV</span>
            </div>
            <div className="flex items-center gap-2">
              <SiRoku className="w-6 h-6" />
              <span className="text-sm">Roku</span>
            </div>
            <div className="flex items-center gap-2">
              <SiAmazonfiretv className="w-6 h-6" />
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
                <LuLibraryBig className="w-6 h-6" />
              </div>
              <h4 className="text-lg font-semibold mb-2">Connect Libraries</h4>
              <p className="text-slate-400 text-sm">
                Link your Plex, Jellyfin, or Emby libraries and access all your media in one place.
              </p>
            </div>
            <div className="bg-slate-800/30 border border-slate-700/50 rounded-xl p-6">
              <div className="w-12 h-12 bg-violet-500/20 rounded-lg flex items-center justify-center mb-4 text-violet-400">
                <IoTvOutline className="w-6 h-6" />
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
                <MdDevices className="w-6 h-6" />
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
                Sign up with email or your favorite social account. Start your 14-day free trial instantly.
              </p>
            </div>
            <div className="text-center">
              <div className="w-16 h-16 bg-violet-500/20 rounded-full flex items-center justify-center mx-auto mb-4">
                <span className="text-2xl font-bold text-violet-400">2</span>
              </div>
              <h4 className="text-lg font-semibold mb-2">Connect Services</h4>
              <p className="text-slate-400 text-sm">
                Link your Plex, Jellyfin, Emby, or IPTV provider credentials.
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
            <p className="text-slate-400">Start with a 14-day free trial. Cancel anytime.</p>
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
                    <span>Plex, Jellyfin & Emby support</span>
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
                    <span>14-day free trial</span>
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
            <img src="/logo2.svg" alt="NovixTV" className="h-8" />
            <div className="text-slate-500 text-sm">
              &copy; {new Date().getFullYear()} NovixTV. All rights reserved.
            </div>
          </div>
        </div>
      </footer>
    </div>
  );
}
