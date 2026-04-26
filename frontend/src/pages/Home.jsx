import { useState, useEffect, useRef } from 'react';
import { useAuth } from '../lib/auth';
import { FaGear, FaLink } from 'react-icons/fa6';
import { IoMdHelpCircleOutline } from 'react-icons/io';
import { IoTvOutline, IoPhonePortraitOutline } from 'react-icons/io5';
import { BsGlobe } from 'react-icons/bs';
import { FaApple, FaGoogle, FaAmazon } from 'react-icons/fa';
import { SiRoku } from 'react-icons/si';
import { MdDevices } from 'react-icons/md';
import { LuLibraryBig } from 'react-icons/lu';

const Wordmark = ({ className = '' }) => (
  <span className={`wordmark ${className}`}>
    novix<span className="wordmark-dot">.</span>tv
  </span>
);

const ChevronDownIcon = ({ className = '' }) => (
  <svg className={`w-4 h-4 ${className}`} fill="none" stroke="currentColor" strokeWidth={2} viewBox="0 0 24 24">
    <path strokeLinecap="round" strokeLinejoin="round" d="M19 9l-7 7-7-7" />
  </svg>
);

const CheckIcon = () => (
  <svg className="w-4 h-4" fill="none" stroke="currentColor" strokeWidth={2.5} viewBox="0 0 24 24">
    <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
  </svg>
);

const ArrowRight = () => (
  <svg className="w-4 h-4" fill="none" stroke="currentColor" strokeWidth={2} viewBox="0 0 24 24">
    <path strokeLinecap="round" strokeLinejoin="round" d="M14 5l7 7m0 0l-7 7m7-7H3" />
  </svg>
);

const ZapIcon = ({ className = '' }) => (
  <svg className={`w-5 h-5 ${className}`} fill="none" stroke="currentColor" strokeWidth={1.75} viewBox="0 0 24 24">
    <path strokeLinecap="round" strokeLinejoin="round" d="M13 10V3L4 14h7v7l9-11h-7z" />
  </svg>
);

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
    answer: "Yes. NovixTV supports M3U playlists and Xtream Codes. Add your IPTV credentials in the app settings and your live TV channels will be integrated seamlessly."
  },
  {
    question: "Can I cancel anytime?",
    answer: "Yes. There are no contracts or commitments. Cancel your subscription at any time from your account settings, and you won't be charged again."
  },
  {
    question: "Is there a free trial?",
    answer: "We offer a 14-day free trial for new subscribers. Experience all NovixTV features before committing. Cancel anytime during the trial and you won't be charged."
  }
];

const platforms = [
  { icon: IoTvOutline, label: 'Smart TV' },
  { icon: IoPhonePortraitOutline, label: 'iOS & Android' },
  { icon: BsGlobe, label: 'Web Browser' },
  { icon: FaApple, label: 'Apple TV' },
  { icon: FaGoogle, label: 'Google TV' },
  { icon: SiRoku, label: 'Roku' },
  { icon: FaAmazon, label: 'Fire TV' },
];

const features = [
  {
    icon: LuLibraryBig,
    title: 'Connect Libraries',
    body: 'Link your Plex, Jellyfin, or Emby libraries and access all your media in one place.',
  },
  {
    icon: IoTvOutline,
    title: 'Live TV',
    body: 'Add your IPTV provider and watch live channels seamlessly.',
  },
  {
    icon: ZapIcon,
    title: 'Fast & Smooth',
    body: 'Optimized for performance with instant playback and smooth navigation.',
  },
  {
    icon: MdDevices,
    title: 'Any Device',
    body: 'Watch on TV, phone, tablet, or browser. Your content follows you.',
  },
];

const plans = [
  { id: 'monthly', name: 'Monthly', price: 9.99, period: 'month', popular: false },
  { id: 'yearly',  name: 'Yearly',  price: 79.99, period: 'year',  popular: true, savings: 'Save 33%' },
];

function FAQItem({ question, answer, isOpen, onClick }) {
  return (
    <div className="border-b hairline last:border-0">
      <button
        onClick={onClick}
        className="w-full py-5 flex items-center justify-between text-left group"
      >
        <span className="font-medium text-base group-hover:text-violet-300 transition-colors">{question}</span>
        <ChevronDownIcon className={`chev text-dim ${isOpen ? 'open' : ''}`} />
      </button>
      <div className={`overflow-hidden transition-all duration-300 ease-out ${isOpen ? 'max-h-48 pb-5' : 'max-h-0'}`}>
        <p className="text-muted text-sm leading-relaxed max-w-2xl">{answer}</p>
      </div>
    </div>
  );
}

export default function Home() {
  const { user, signOut } = useAuth();
  const [showProfileMenu, setShowProfileMenu] = useState(false);
  const [openFaqIndex, setOpenFaqIndex] = useState(null);
  const profileMenuRef = useRef(null);

  useEffect(() => {
    const handleClickOutside = (e) => {
      if (profileMenuRef.current && !profileMenuRef.current.contains(e.target)) {
        setShowProfileMenu(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const navigate = (path) => {
    window.history.pushState({}, '', path);
    window.dispatchEvent(new PopStateEvent('popstate'));
  };

  const handleLogout = async () => {
    setShowProfileMenu(false);
    await signOut();
  };

  const handleSelectPlan = (plan) => {
    if (user) navigate(`/checkout?plan=${plan.id}`);
    else navigate(`/signup?plan=${plan.id}`);
  };

  return (
    <div className="min-h-screen text-white" style={{ background: 'var(--bg)' }}>
      {/* ─────────── Navigation ─────────── */}
      <nav className="sticky top-0 z-40 backdrop-blur-xl" style={{ background: 'rgba(7,7,13,0.7)' }}>
        <div className="max-w-6xl mx-auto px-6 py-4 flex items-center justify-between">
          <button onClick={() => navigate('/')} className="flex items-center">
            <Wordmark />
          </button>

          <div className="hidden md:flex items-center gap-8">
            <a href="#features" className="nav-link text-sm">Features</a>
            <a href="#pricing" className="nav-link text-sm">Pricing</a>
            <a href="#faq" className="nav-link text-sm">FAQ</a>
          </div>

          {user ? (
            <div className="relative" ref={profileMenuRef}>
              <button
                onClick={() => setShowProfileMenu(!showProfileMenu)}
                className="flex items-center gap-2 hover:opacity-80 transition"
              >
                {user.user_metadata?.avatar_url || user.user_metadata?.picture ? (
                  <img
                    src={user.user_metadata?.avatar_url || user.user_metadata?.picture}
                    alt=""
                    className="w-8 h-8 rounded-full"
                  />
                ) : (
                  <div className="w-8 h-8 rounded-full flex items-center justify-center text-sm font-semibold"
                    style={{ background: 'rgba(167,139,250,0.15)', color: 'var(--accent-bright)' }}>
                    {(user.user_metadata?.full_name || user.email || 'U').charAt(0).toUpperCase()}
                  </div>
                )}
                <ChevronDownIcon className="text-dim" />
              </button>

              {showProfileMenu && (
                <div className="absolute right-0 mt-3 w-56 rounded-xl shadow-2xl overflow-hidden"
                     style={{ background: 'var(--bg-elev)', border: '1px solid var(--hairline-strong)' }}>
                  <div className="px-4 py-3 border-b hairline">
                    <div className="font-medium text-sm truncate">
                      {user.user_metadata?.full_name || user.user_metadata?.name || 'User'}
                    </div>
                    <div className="text-xs text-muted truncate">{user.email}</div>
                  </div>
                  <div className="py-1">
                    <button onClick={() => { setShowProfileMenu(false); navigate('/account'); }}
                            className="w-full text-left px-4 py-2.5 text-sm hover:bg-white/5 transition flex items-center gap-3">
                      <FaGear className="w-4 h-4 text-dim" /> Account Settings
                    </button>
                    <button onClick={() => { setShowProfileMenu(false); navigate('/link'); }}
                            className="w-full text-left px-4 py-2.5 text-sm hover:bg-white/5 transition flex items-center gap-3">
                      <FaLink className="w-4 h-4 text-dim" /> Link Device
                    </button>
                    <button className="w-full text-left px-4 py-2.5 text-sm hover:bg-white/5 transition flex items-center gap-3 text-muted">
                      <IoMdHelpCircleOutline className="w-4 h-4" /> Help
                    </button>
                  </div>
                  <div className="border-t hairline py-1">
                    <button onClick={handleLogout}
                            className="w-full text-left px-4 py-2.5 text-sm text-red-400 hover:bg-white/5 transition flex items-center gap-3">
                      <svg className="w-4 h-4" fill="none" stroke="currentColor" strokeWidth={2} viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" d="M17 16l4-4m0 0l-4-4m4 4H7m6 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h4a3 3 0 013 3v1" />
                      </svg>
                      Sign Out
                    </button>
                  </div>
                </div>
              )}
            </div>
          ) : (
            <div className="flex items-center gap-2">
              <button onClick={() => navigate('/login')} className="btn-ghost">Log in</button>
              <button onClick={() => navigate('/signup')} className="btn-primary">
                Get started <ArrowRight />
              </button>
            </div>
          )}
        </div>
      </nav>

      {/* ─────────── Hero ─────────── */}
      <section className="relative pt-24 pb-32 px-6">
        <div className="ambient" />
        <div className="grain" />
        <div className="relative max-w-4xl mx-auto text-center">
          <div className="eyebrow mb-6">Now in beta</div>
          <h1 className="text-5xl md:text-7xl font-bold leading-[1.05] tracking-tight mb-7"
              style={{ letterSpacing: '-0.035em' }}>
            All your streaming.
            <br />
            <span style={{
              background: 'linear-gradient(180deg, var(--accent-bright) 0%, var(--accent) 100%)',
              WebkitBackgroundClip: 'text',
              WebkitTextFillColor: 'transparent',
              backgroundClip: 'text',
            }}>
              One quiet app.
            </span>
          </h1>
          <p className="text-lg md:text-xl text-muted max-w-2xl mx-auto mb-10 leading-relaxed">
            Connect Plex, Jellyfin, Emby, and IPTV providers. Watch everything in one
            unified interface — on any device, with no clutter.
          </p>
          <div className="flex flex-col sm:flex-row items-center justify-center gap-3">
            <button onClick={() => document.getElementById('pricing')?.scrollIntoView({ behavior: 'smooth' })}
                    className="btn-primary">
              Start free trial <ArrowRight />
            </button>
            <button className="btn-secondary">Watch demo</button>
          </div>
          <p className="mt-6 text-xs text-dim">14-day free trial · No credit card required</p>
        </div>
      </section>

      {/* ─────────── Platforms ─────────── */}
      <section className="px-6 py-16" style={{ borderTop: '1px solid var(--hairline)', borderBottom: '1px solid var(--hairline)' }}>
        <div className="max-w-5xl mx-auto">
          <p className="text-center text-xs uppercase tracking-[0.2em] text-dim mb-10">
            Available on all your favorite platforms
          </p>
          <div className="flex items-center justify-center gap-x-12 gap-y-8 flex-wrap">
            {platforms.map(({ icon: Icon, label }) => (
              <div key={label} className="flex items-center gap-2.5 text-muted hover:text-white transition-colors">
                <Icon className="w-5 h-5" />
                <span className="text-sm font-medium">{label}</span>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ─────────── Features ─────────── */}
      <section id="features" className="py-32 px-6">
        <div className="max-w-6xl mx-auto">
          <div className="max-w-2xl mb-20">
            <div className="eyebrow mb-4">Everything you need</div>
            <h2 className="text-4xl md:text-5xl font-bold tracking-tight mb-5"
                style={{ letterSpacing: '-0.03em' }}>
              All your streaming, together.
            </h2>
            <p className="text-lg text-muted leading-relaxed">
              NovixTV brings every source you already pay for into one calm, fast app.
            </p>
          </div>

          <div className="grid md:grid-cols-2 lg:grid-cols-4 gap-x-10 gap-y-14">
            {features.map(({ icon: Icon, title, body }) => (
              <div key={title}>
                <Icon className="w-6 h-6 mb-5" style={{ color: 'var(--accent-bright)' }} />
                <h3 className="text-lg font-semibold mb-2 tracking-tight">{title}</h3>
                <p className="text-sm text-muted leading-relaxed">{body}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ─────────── How It Works ─────────── */}
      <section className="py-32 px-6" style={{ borderTop: '1px solid var(--hairline)' }}>
        <div className="max-w-5xl mx-auto">
          <div className="text-center max-w-2xl mx-auto mb-20">
            <div className="eyebrow mb-4">How it works</div>
            <h2 className="text-4xl md:text-5xl font-bold tracking-tight mb-5"
                style={{ letterSpacing: '-0.03em' }}>
              Get started in minutes.
            </h2>
            <p className="text-lg text-muted">Connect your services and start streaming.</p>
          </div>
          <div className="grid md:grid-cols-3 gap-12 md:gap-16">
            {[
              { n: '01', t: 'Create account',    b: 'Sign up with email or your favorite social account. Start your 14-day free trial instantly.' },
              { n: '02', t: 'Connect services',  b: 'Link your Plex, Jellyfin, Emby, or IPTV provider credentials.' },
              { n: '03', t: 'Start watching',    b: 'Download the app on your devices and enjoy all your content in one place.' },
            ].map(({ n, t, b }) => (
              <div key={n}>
                <div className="font-mono text-sm mb-6" style={{ color: 'var(--accent)' }}>{n}</div>
                <h3 className="text-xl font-semibold mb-3 tracking-tight">{t}</h3>
                <p className="text-sm text-muted leading-relaxed">{b}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ─────────── Pricing ─────────── */}
      <section id="pricing" className="py-32 px-6" style={{ borderTop: '1px solid var(--hairline)' }}>
        <div className="max-w-5xl mx-auto">
          <div className="text-center max-w-2xl mx-auto mb-16">
            <div className="eyebrow mb-4">Pricing</div>
            <h2 className="text-4xl md:text-5xl font-bold tracking-tight mb-5"
                style={{ letterSpacing: '-0.03em' }}>
              Simple, honest pricing.
            </h2>
            <p className="text-lg text-muted">14-day free trial. Cancel anytime.</p>
          </div>

          <div className="grid md:grid-cols-2 gap-6 max-w-3xl mx-auto">
            {plans.map((plan) => (
              <div
                key={plan.id}
                className={`relative rounded-2xl p-8 ${plan.popular ? 'gradient-card' : ''}`}
                style={{
                  background: plan.popular ? undefined : 'var(--bg-elev)',
                  outline: plan.popular ? '1px solid rgba(167,139,250,0.4)' : '1px solid var(--hairline)',
                }}
              >
                {plan.popular && (
                  <div className="absolute -top-3 left-8">
                    <span className="text-[10px] uppercase tracking-[0.18em] font-semibold px-2.5 py-1 rounded-full"
                          style={{ background: 'var(--accent)', color: 'var(--bg)' }}>
                      Best value
                    </span>
                  </div>
                )}
                <div className="mb-8">
                  <h3 className="text-sm font-medium text-muted uppercase tracking-wider mb-3">{plan.name}</h3>
                  <div className="flex items-baseline gap-1.5">
                    <span className="text-5xl font-bold tracking-tight">${plan.price}</span>
                    <span className="text-muted text-sm">/ {plan.period}</span>
                  </div>
                  {plan.savings && (
                    <span className="inline-block mt-2 text-xs font-medium" style={{ color: 'var(--accent-bright)' }}>
                      {plan.savings}
                    </span>
                  )}
                </div>
                <ul className="space-y-3.5 mb-8 text-sm">
                  {[
                    'All platform access',
                    'Plex, Jellyfin & Emby support',
                    'IPTV integration',
                    '4K streaming support',
                    '14-day free trial',
                  ].map((item) => (
                    <li key={item} className="flex items-center gap-3">
                      <span style={{ color: 'var(--accent-bright)' }}><CheckIcon /></span>
                      <span>{item}</span>
                    </li>
                  ))}
                </ul>
                <button
                  onClick={() => handleSelectPlan(plan)}
                  className={plan.popular ? 'btn-primary w-full' : 'btn-secondary w-full'}
                >
                  Start free trial
                </button>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ─────────── FAQ ─────────── */}
      <section id="faq" className="py-32 px-6" style={{ borderTop: '1px solid var(--hairline)' }}>
        <div className="max-w-3xl mx-auto">
          <div className="mb-12">
            <div className="eyebrow mb-4">FAQ</div>
            <h2 className="text-4xl md:text-5xl font-bold tracking-tight"
                style={{ letterSpacing: '-0.03em' }}>
              Questions, answered.
            </h2>
          </div>
          <div>
            {faqItems.map((item, i) => (
              <FAQItem
                key={i}
                question={item.question}
                answer={item.answer}
                isOpen={openFaqIndex === i}
                onClick={() => setOpenFaqIndex(openFaqIndex === i ? null : i)}
              />
            ))}
          </div>
        </div>
      </section>

      {/* ─────────── CTA ─────────── */}
      <section className="relative py-32 px-6 overflow-hidden" style={{ borderTop: '1px solid var(--hairline)' }}>
        <div className="ambient" />
        <div className="relative max-w-3xl mx-auto text-center">
          <h2 className="text-4xl md:text-5xl font-bold tracking-tight mb-5"
              style={{ letterSpacing: '-0.03em' }}>
            Unify your streaming today.
          </h2>
          <p className="text-lg text-muted mb-10 max-w-xl mx-auto">
            Join thousands who've consolidated every service they pay for into one app.
          </p>
          <button onClick={() => navigate('/signup')} className="btn-primary">
            Start free trial <ArrowRight />
          </button>
        </div>
      </section>

      {/* ─────────── Footer ─────────── */}
      <footer className="px-6 py-12" style={{ borderTop: '1px solid var(--hairline)' }}>
        <div className="max-w-6xl mx-auto flex flex-col md:flex-row items-center justify-between gap-6">
          <Wordmark className="text-base" />
          <div className="flex items-center gap-8 text-sm text-muted">
            <a href="#features" className="hover:text-white transition">Features</a>
            <a href="#pricing" className="hover:text-white transition">Pricing</a>
            <a href="#faq" className="hover:text-white transition">FAQ</a>
          </div>
          <div className="text-xs text-dim">
            © {new Date().getFullYear()} novix.tv
          </div>
        </div>
      </footer>
    </div>
  );
}
