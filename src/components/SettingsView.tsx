import { useState } from 'react';
import { Check, Copy, Database, RefreshCw, RotateCcw, Server, Terminal } from 'lucide-react';

interface SettingsViewProps {
  flaskUrl: string;
  backendAvailable: boolean;
  onSaveFlaskUrl: (url: string) => void;
  onTestConnection: (url: string) => Promise<void>;
  onResetToBenchmark: () => Promise<void>;
}

export function SettingsView({
  flaskUrl,
  backendAvailable,
  onSaveFlaskUrl,
  onTestConnection,
  onResetToBenchmark,
}: SettingsViewProps) {
  const [draftUrl, setDraftUrl] = useState(flaskUrl);
  const [testing, setTesting] = useState(false);
  const [resetting, setResetting] = useState(false);
  const [copiedCmd, setCopiedCmd] = useState(false);

  const setupCommands = `cd backend
python -m venv .venv
source .venv/bin/activate   # Windows: .\\.venv\\Scripts\\Activate.ps1
pip install -r requirements.txt
python app.py`;

  const handleSaveAndTest = async (e: React.FormEvent) => {
    e.preventDefault();
    const cleaned = draftUrl.trim().replace(/\/+$/, '');
    if (!cleaned) return;
    onSaveFlaskUrl(cleaned);
    setTesting(true);
    try {
      await onTestConnection(cleaned);
    } finally {
      setTesting(false);
    }
  };

  const handleReset = async () => {
    setResetting(true);
    try {
      await onResetToBenchmark();
    } finally {
      setResetting(false);
    }
  };

  const handleCopyCommands = async () => {
    try {
      await navigator.clipboard.writeText(setupCommands);
      setCopiedCmd(true);
      setTimeout(() => setCopiedCmd(false), 2000);
    } catch {
      // Clipboard API unavailable in restricted frames
    }
  };

  return (
    <div className="space-y-6">
      <div>
        <h1 className="font-display text-2xl sm:text-3xl font-bold tracking-tight text-slate-900">
          Settings & Backend Integration
        </h1>
        <p className="text-sm text-slate-600 mt-1">
          Configure the Python Flask + Apache Spark backend URL, manage dataset state, and view VS Code setup steps.
        </p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        {/* Connection Form */}
        <div className="lg:col-span-6 bg-white rounded-2xl border border-slate-200/90 p-6 shadow-xs space-y-5">
          <div className="flex items-start justify-between gap-3">
            <div>
              <h2 className="font-display text-base font-semibold text-slate-900">
                Python Flask + PySpark Endpoint
              </h2>
              <p className="text-xs text-slate-500 mt-0.5">
                All CSV uploads and K-Means model training proxy through this endpoint
              </p>
            </div>
            <div className="flex items-center gap-1.5 text-xs font-medium whitespace-nowrap">
              {backendAvailable ? (
                <>
                  <Server className="w-4 h-4 text-emerald-600" />
                  <span className="text-emerald-700">Connected</span>
                </>
              ) : (
                <>
                  <Database className="w-4 h-4 text-amber-600" />
                  <span className="text-amber-700">Demo Mode</span>
                </>
              )}
            </div>
          </div>

          <form onSubmit={handleSaveAndTest} className="space-y-4">
            <div>
              <label
                htmlFor="flask-url-input"
                className="block text-xs font-semibold text-slate-700 mb-1.5"
              >
                Flask API Base URL
              </label>
              <input
                id="flask-url-input"
                type="url"
                required
                value={draftUrl}
                onChange={(e) => setDraftUrl(e.target.value)}
                placeholder="http://127.0.0.1:5000"
                className="w-full rounded-lg border border-slate-200 px-3.5 py-2.5 text-sm font-mono text-slate-800 focus:outline-none focus:ring-2 focus:ring-indigo-500"
              />
            </div>

            <div className="flex flex-wrap items-center gap-3">
              <button
                type="submit"
                disabled={testing}
                className="inline-flex items-center gap-2 px-4 py-2 rounded-lg text-xs font-semibold text-white bg-gradient-to-r from-blue-600 to-purple-600 hover:from-blue-700 hover:to-purple-700 disabled:opacity-60 transition-all"
              >
                <RefreshCw className={`w-3.5 h-3.5 ${testing ? 'animate-spin' : ''}`} />
                <span>{testing ? 'Checking...' : 'Save & Test Connection'}</span>
              </button>

              <button
                type="button"
                onClick={handleReset}
                disabled={resetting}
                className="inline-flex items-center gap-2 px-4 py-2 rounded-lg border border-slate-200 bg-white text-xs font-semibold text-slate-700 hover:bg-slate-50 transition-colors"
              >
                <RotateCcw className="w-3.5 h-3.5" />
                <span>{resetting ? 'Resetting...' : 'Reset to 200-Customer Sample'}</span>
              </button>
            </div>
          </form>
        </div>

        {/* VS Code Run Guide */}
        <div className="lg:col-span-6 bg-white rounded-2xl border border-slate-200/90 p-6 shadow-xs space-y-4">
          <div className="flex items-center justify-between gap-2">
            <div className="flex items-center gap-2">
              <Terminal className="w-4 h-4 text-indigo-600" />
              <h2 className="font-display text-base font-semibold text-slate-900">
                Run Flask + Apache Spark in VS Code
              </h2>
            </div>
            <button
              type="button"
              onClick={handleCopyCommands}
              className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg border border-slate-200 text-xs font-medium text-slate-700 hover:bg-slate-50 transition-colors"
            >
              {copiedCmd ? (
                <>
                  <Check className="w-3.5 h-3.5 text-emerald-600" />
                  <span>Copied</span>
                </>
              ) : (
                <>
                  <Copy className="w-3.5 h-3.5" />
                  <span>Copy</span>
                </>
              )}
            </button>
          </div>

          <p className="text-xs text-slate-600 leading-relaxed">
            Ensure <span className="font-semibold text-slate-800">Python 3.10+</span> and{' '}
            <span className="font-semibold text-slate-800">Java JDK 11 or 17</span> are installed, then run:
          </p>

          <pre className="rounded-xl bg-[#0B1221] text-slate-100 p-4 text-xs font-mono overflow-x-auto leading-relaxed">
            {setupCommands}
          </pre>

          <p className="text-xs text-slate-500 leading-relaxed">
            Flask initializes <code className="font-mono text-slate-700">customer_segmentation.db</code>{' '}
            (SQLite), fits PySpark K-Means on <code className="font-mono text-slate-700">Mall_Customers.csv</code>,
            and exposes REST endpoints on port 5000.
          </p>
        </div>
      </div>
    </div>
  );
}
