import { useState, useEffect } from 'react';

const TEST_STEPS = [
  { id: 'server', label: 'Checking server status', endpoint: '' },
  { id: 'live_categories', label: 'Fetching live stream categories', endpoint: 'get_live_categories' },
  { id: 'live_streams', label: 'Fetching live stream channels', endpoint: 'get_live_streams' },
  { id: 'vod_categories', label: 'Fetching movie categories', endpoint: 'get_vod_categories' },
  { id: 'vod_streams', label: 'Fetching films', endpoint: 'get_vod_streams' },
  { id: 'series_categories', label: 'Fetching series categories', endpoint: 'get_series_categories' },
  { id: 'series', label: 'Fetching series', endpoint: 'get_series' },
  { id: 'save', label: 'Saving information', endpoint: null },
];

// Status icons
const StatusIcon = ({ status }) => {
  if (status === 'pending') {
    return (
      <div className="w-5 h-5 rounded-full border-2 border-slate-600" />
    );
  }
  if (status === 'running') {
    return (
      <div className="w-5 h-5 border-2 border-slate-600 border-t-blue-400 rounded-full animate-spin" />
    );
  }
  if (status === 'success') {
    return (
      <div className="w-5 h-5 bg-green-500 rounded-full flex items-center justify-center">
        <svg className="w-3 h-3 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M5 13l4 4L19 7" />
        </svg>
      </div>
    );
  }
  if (status === 'error') {
    return (
      <div className="w-5 h-5 bg-red-500 rounded-full flex items-center justify-center">
        <svg className="w-3 h-3 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M6 18L18 6M6 6l12 12" />
        </svg>
      </div>
    );
  }
  return null;
};

export default function IptvTestModal({ isOpen, onClose, iptvType, iptvForm, onSave }) {
  const [testResults, setTestResults] = useState({});
  const [currentStep, setCurrentStep] = useState(null);
  const [isComplete, setIsComplete] = useState(false);
  const [serverInfo, setServerInfo] = useState(null);
  const [contentCounts, setContentCounts] = useState({});
  const [overallSuccess, setOverallSuccess] = useState(false);

  // Reset and start tests when modal opens
  useEffect(() => {
    if (isOpen) {
      setTestResults({});
      setCurrentStep(null);
      setIsComplete(false);
      setServerInfo(null);
      setContentCounts({});
      setOverallSuccess(false);

      // Start testing after a brief delay
      setTimeout(() => {
        runTests();
      }, 300);
    }
  }, [isOpen]);

  const runTests = async () => {
    const results = {};
    const counts = {};
    let allSuccess = true;

    if (iptvType === 'm3u') {
      // For M3U, we have fewer steps
      const m3uSteps = [
        { id: 'server', label: 'Checking server status' },
        { id: 'parse', label: 'Parsing M3U playlist' },
        { id: 'save', label: 'Saving information' },
      ];

      for (const step of m3uSteps) {
        setCurrentStep(step.id);
        setTestResults(prev => ({ ...prev, [step.id]: 'running' }));

        try {
          if (step.id === 'server') {
            // Test M3U URL accessibility
            const response = await fetch(iptvForm.m3u_url.trim(), {
              method: 'GET',
              mode: 'cors',
            });

            if (!response.ok) {
              throw new Error(`HTTP ${response.status}`);
            }

            const text = await response.text();
            if (!text.trim().startsWith('#EXTM3U')) {
              throw new Error('Invalid M3U format');
            }

            // Store for parsing step
            results.m3uContent = text;
            results[step.id] = 'success';
            setTestResults(prev => ({ ...prev, [step.id]: 'success' }));
          } else if (step.id === 'parse') {
            // Parse M3U content
            const text = results.m3uContent;
            const channelCount = (text.match(/#EXTINF/g) || []).length;
            counts.channels = channelCount;
            setContentCounts({ channels: channelCount });
            results[step.id] = 'success';
            setTestResults(prev => ({ ...prev, [step.id]: 'success' }));
          } else if (step.id === 'save') {
            // Save step - will be handled by parent
            results[step.id] = 'success';
            setTestResults(prev => ({ ...prev, [step.id]: 'success' }));
          }
        } catch (err) {
          console.error(`M3U test error (${step.id}):`, err);
          results[step.id] = 'error';
          setTestResults(prev => ({ ...prev, [step.id]: 'error' }));
          allSuccess = false;
          // Continue with other tests
        }

        // Small delay between steps for visual feedback
        await new Promise(resolve => setTimeout(resolve, 300));
      }
    } else {
      // Xtream Codes testing
      let host = iptvForm.xtream_host.trim();
      if (!host.startsWith('http://') && !host.startsWith('https://')) {
        host = 'http://' + host;
      }
      host = host.replace(/\/$/, '');

      const username = encodeURIComponent(iptvForm.xtream_username.trim());
      const password = encodeURIComponent(iptvForm.xtream_password.trim());
      const baseUrl = `${host}/player_api.php?username=${username}&password=${password}`;

      for (const step of TEST_STEPS) {
        setCurrentStep(step.id);
        setTestResults(prev => ({ ...prev, [step.id]: 'running' }));

        try {
          if (step.id === 'server') {
            // Check server status / authenticate
            const response = await fetch(baseUrl, { mode: 'cors' });
            if (!response.ok) throw new Error(`HTTP ${response.status}`);

            const data = await response.json();
            if (!data.user_info || data.user_info.auth !== 1) {
              throw new Error('Authentication failed');
            }

            // Store server info
            setServerInfo({
              username: data.user_info.username,
              status: data.user_info.status,
              expDate: data.user_info.exp_date ? new Date(parseInt(data.user_info.exp_date) * 1000) : null,
              maxConnections: data.user_info.max_connections,
              activeConnections: data.user_info.active_cons,
              serverUrl: data.server_info?.url,
              serverPort: data.server_info?.port,
            });

            results[step.id] = 'success';
            setTestResults(prev => ({ ...prev, [step.id]: 'success' }));
          } else if (step.id === 'save') {
            // Save step - mark as success (actual save handled by parent)
            results[step.id] = 'success';
            setTestResults(prev => ({ ...prev, [step.id]: 'success' }));
          } else {
            // API endpoint tests
            const url = `${baseUrl}&action=${step.endpoint}`;
            const response = await fetch(url, { mode: 'cors' });

            if (!response.ok) throw new Error(`HTTP ${response.status}`);

            const data = await response.json();

            // Count items
            const count = Array.isArray(data) ? data.length : 0;
            counts[step.id] = count;
            setContentCounts(prev => ({ ...prev, [step.id]: count }));

            results[step.id] = 'success';
            setTestResults(prev => ({ ...prev, [step.id]: 'success' }));
          }
        } catch (err) {
          console.error(`Xtream test error (${step.id}):`, err);
          results[step.id] = 'error';
          setTestResults(prev => ({ ...prev, [step.id]: 'error' }));
          allSuccess = false;

          // If server check fails, skip other tests
          if (step.id === 'server') {
            // Mark remaining as error
            for (const remaining of TEST_STEPS.slice(1)) {
              results[remaining.id] = 'error';
              setTestResults(prev => ({ ...prev, [remaining.id]: 'error' }));
            }
            break;
          }
        }

        // Small delay between steps for visual feedback
        await new Promise(resolve => setTimeout(resolve, 300));
      }
    }

    setCurrentStep(null);
    setIsComplete(true);
    setOverallSuccess(allSuccess);
  };

  const handleSaveAndClose = () => {
    if (overallSuccess) {
      onSave();
    }
    onClose();
  };

  if (!isOpen) return null;

  const steps = iptvType === 'm3u'
    ? [
        { id: 'server', label: 'Checking server status' },
        { id: 'parse', label: 'Parsing M3U playlist' },
        { id: 'save', label: 'Saving information' },
      ]
    : TEST_STEPS;

  return (
    <div className="fixed inset-0 bg-black/70 flex items-center justify-center z-50 p-4">
      <div className="bg-slate-800 border border-slate-700 rounded-xl max-w-md w-full shadow-2xl">
        {/* Header */}
        <div className="px-6 py-4 border-b border-slate-700">
          <h2 className="text-lg font-semibold text-white">
            Testing IPTV Connection
          </h2>
          <p className="text-sm text-slate-400 mt-1">
            {iptvType === 'm3u' ? 'Validating M3U playlist...' : 'Connecting to Xtream Codes API...'}
          </p>
        </div>

        {/* Test Steps */}
        <div className="px-6 py-4 space-y-3">
          {steps.map((step) => {
            const status = testResults[step.id] || 'pending';
            const count = contentCounts[step.id];

            return (
              <div
                key={step.id}
                className={`flex items-center gap-3 p-3 rounded-lg transition ${
                  status === 'running' ? 'bg-slate-700/50' : 'bg-transparent'
                }`}
              >
                <StatusIcon status={status} />
                <div className="flex-1">
                  <span className={`text-sm ${
                    status === 'success' ? 'text-green-400' :
                    status === 'error' ? 'text-red-400' :
                    status === 'running' ? 'text-white' :
                    'text-slate-400'
                  }`}>
                    {step.label}
                  </span>
                  {status === 'success' && count !== undefined && (
                    <span className="text-xs text-slate-500 ml-2">
                      ({count} found)
                    </span>
                  )}
                </div>
              </div>
            );
          })}
        </div>

        {/* Server Info (for Xtream) */}
        {serverInfo && isComplete && (
          <div className="px-6 pb-4">
            <div className="bg-slate-900 rounded-lg p-3 text-xs space-y-1">
              <div className="flex justify-between">
                <span className="text-slate-500">Username:</span>
                <span className="text-slate-300">{serverInfo.username}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-slate-500">Status:</span>
                <span className={serverInfo.status === 'Active' ? 'text-green-400' : 'text-yellow-400'}>
                  {serverInfo.status}
                </span>
              </div>
              {serverInfo.expDate && (
                <div className="flex justify-between">
                  <span className="text-slate-500">Expires:</span>
                  <span className="text-slate-300">{serverInfo.expDate.toLocaleDateString()}</span>
                </div>
              )}
              {serverInfo.maxConnections && (
                <div className="flex justify-between">
                  <span className="text-slate-500">Connections:</span>
                  <span className="text-slate-300">{serverInfo.activeConnections || 0} / {serverInfo.maxConnections}</span>
                </div>
              )}
            </div>
          </div>
        )}

        {/* M3U Channel Count */}
        {iptvType === 'm3u' && contentCounts.channels !== undefined && isComplete && (
          <div className="px-6 pb-4">
            <div className="bg-slate-900 rounded-lg p-3 text-xs">
              <div className="flex justify-between">
                <span className="text-slate-500">Channels found:</span>
                <span className="text-slate-300">{contentCounts.channels}</span>
              </div>
            </div>
          </div>
        )}

        {/* Result Summary */}
        {isComplete && (
          <div className="px-6 pb-4">
            <div className={`p-3 rounded-lg text-sm ${
              overallSuccess
                ? 'bg-green-500/10 border border-green-500/30 text-green-400'
                : 'bg-red-500/10 border border-red-500/30 text-red-400'
            }`}>
              {overallSuccess
                ? 'All tests passed! Your IPTV connection is working correctly.'
                : 'Some tests failed. The connection may still work with limited features.'}
            </div>
          </div>
        )}

        {/* Actions */}
        <div className="px-6 py-4 border-t border-slate-700 flex gap-3">
          <button
            onClick={onClose}
            className="flex-1 py-2 bg-slate-700 hover:bg-slate-600 text-white font-medium rounded-lg transition"
          >
            Cancel
          </button>
          <button
            onClick={handleSaveAndClose}
            disabled={!isComplete}
            className={`flex-1 py-2 font-medium rounded-lg transition ${
              isComplete && overallSuccess
                ? 'bg-blue-500 hover:bg-blue-400 text-white'
                : isComplete
                ? 'bg-yellow-500 hover:bg-yellow-400 text-black'
                : 'bg-slate-600 text-slate-400 cursor-not-allowed'
            }`}
          >
            {!isComplete ? 'Testing...' : overallSuccess ? 'Save & Close' : 'Save Anyway'}
          </button>
        </div>
      </div>
    </div>
  );
}
