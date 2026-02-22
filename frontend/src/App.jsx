import { useState, useEffect } from 'react';
import { AuthProvider, useAuth } from './lib/auth';
import Dashboard from './pages/Dashboard';
import Settings from './pages/Settings';
import Home from './pages/Home';
import Login from './pages/Login';
import Signup from './pages/Signup';
import Success from './pages/Success';
import Account from './pages/Account';
import CompleteProfileModal from './components/CompleteProfileModal';

// Simple hash-based router
function useRoute() {
  const [route, setRoute] = useState(window.location.pathname);

  useEffect(() => {
    const handlePopState = () => setRoute(window.location.pathname);
    window.addEventListener('popstate', handlePopState);
    return () => window.removeEventListener('popstate', handlePopState);
  }, []);

  return route;
}

// Admin panel layout
function AdminLayout() {
  const [activeTab, setActiveTab] = useState('dashboard');

  return (
    <div className="min-h-screen bg-slate-950 text-white">
      {/* Header */}
      <header className="border-b border-slate-800">
        <div className="max-w-7xl mx-auto px-4 py-4">
          <div className="flex items-center justify-between">
            <h1 className="text-xl font-bold">
              <span className="text-violet-400">PandaTV</span> Manager
            </h1>
            <nav className="flex gap-1">
              <button
                onClick={() => setActiveTab('dashboard')}
                className={`px-4 py-2 rounded transition ${
                  activeTab === 'dashboard'
                    ? 'bg-slate-800 text-white'
                    : 'text-slate-400 hover:text-white'
                }`}
              >
                Dashboard
              </button>
              <button
                onClick={() => setActiveTab('settings')}
                className={`px-4 py-2 rounded transition ${
                  activeTab === 'settings'
                    ? 'bg-slate-800 text-white'
                    : 'text-slate-400 hover:text-white'
                }`}
              >
                Settings
              </button>
            </nav>
          </div>
        </div>
      </header>

      {/* Main content */}
      <main className="max-w-7xl mx-auto px-4 py-6">
        {activeTab === 'dashboard' && <Dashboard />}
        {activeTab === 'settings' && <Settings />}
      </main>
    </div>
  );
}

function Router() {
  const route = useRoute();
  const { user, needsProfileCompletion, profileLoading, updateUserProfile } = useAuth();

  // Handle profile completion
  const handleProfileComplete = (updates) => {
    updateUserProfile(updates);
  };

  // Route matching
  let content;
  if (route === '/') {
    content = <Home />;
  } else if (route === '/login') {
    content = <Login />;
  } else if (route === '/signup') {
    content = <Signup />;
  } else if (route === '/success') {
    content = <Success />;
  } else if (route === '/account') {
    content = <Account />;
  } else if (route === '/admin') {
    content = <AdminLayout />;
  } else {
    // 404 fallback - redirect to home
    content = <Home />;
  }

  return (
    <>
      {content}
      {/* Show profile completion modal when user is logged in but missing name */}
      {user && !profileLoading && needsProfileCompletion && (
        <CompleteProfileModal
          isOpen={true}
          user={user}
          onComplete={handleProfileComplete}
        />
      )}
    </>
  );
}

export default function App() {
  return (
    <AuthProvider>
      <Router />
    </AuthProvider>
  );
}
