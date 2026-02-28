import { TbError404 } from 'react-icons/tb';

export default function NotFound() {
  const goHome = () => {
    window.history.pushState({}, '', '/');
    window.dispatchEvent(new PopStateEvent('popstate'));
  };

  return (
    <div className="min-h-screen bg-slate-950 text-white flex items-center justify-center p-4">
      <div className="w-full max-w-md text-center">
        {/* Header */}
        <div className="mb-8">
          <button onClick={goHome} className="inline-block">
            <img src="/logo2.svg" alt="NovixTV" className="h-10 mx-auto" />
          </button>
        </div>

        {/* Card */}
        <div className="bg-slate-800/50 rounded-lg border border-slate-700 p-8">
          <div className="w-20 h-20 bg-violet-500/20 rounded-full flex items-center justify-center mx-auto mb-4">
            <TbError404 className="w-12 h-12 text-violet-400" />
          </div>
          <h1 className="text-4xl font-bold mb-2">Page Not Found</h1>
          <p className="text-slate-400 mb-8">
            The page you're looking for doesn't exist or has been moved.
          </p>
          <button
            onClick={goHome}
            className="px-8 py-3 bg-violet-600 hover:bg-violet-500 rounded-lg font-semibold transition"
          >
            Back to Home
          </button>
        </div>
      </div>
    </div>
  );
}
