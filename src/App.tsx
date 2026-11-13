import { useCallback, useEffect, useState } from 'react';
import { Database, Server } from 'lucide-react';
import { AnalyticsView } from './components/AnalyticsView';
import { CustomerDetailsView } from './components/CustomerDetailsView';
import { DashboardView } from './components/DashboardView';
import { ModelPerformanceView } from './components/ModelPerformanceView';
import { ReportsView } from './components/ReportsView';
import { SegmentsView } from './components/SegmentsView';
import { SettingsView } from './components/SettingsView';
import { Sidebar } from './components/Sidebar';
import { ToastContainer } from './components/ToastContainer';
import { TopBar } from './components/TopBar';
import { UploadDatasetView } from './components/UploadDatasetView';
import { VisualizationView } from './components/VisualizationView';
import { buildDemoDashboardPayload } from './data/demoDataset';
import type { DashboardPayload, NavSection, ToastMessage } from './types/segmentation';
import { exportCustomersToCsv } from './utils/csvExport';

const STORAGE_KEY_FLASK_URL = 'spark_segment_flask_url';

export default function App() {
  const [activeSection, setActiveSection] = useState<NavSection>('dashboard');
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [flaskUrl, setFlaskUrl] = useState<string>(() => {
    try {
      return localStorage.getItem(STORAGE_KEY_FLASK_URL) || 'http://127.0.0.1:5000';
    } catch {
      return 'http://127.0.0.1:5000';
    }
  });
  const [dashboardData, setDashboardData] = useState<DashboardPayload>(() =>
    buildDemoDashboardPayload(flaskUrl)
  );
  const [isLoading, setIsLoading] = useState(true);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [customerSegmentFilter, setCustomerSegmentFilter] = useState('ALL');
  const [toasts, setToasts] = useState<ToastMessage[]>([]);

  const addToast = useCallback(
    (type: ToastMessage['type'], title: string, description?: string) => {
      const id = `${Date.now()}-${Math.random().toString(36).slice(2, 7)}`;
      setToasts((prev) => [...prev, { id, type, title, description }]);
      setTimeout(() => {
        setToasts((prev) => prev.filter((t) => t.id !== id));
      }, 4500);
    },
    []
  );

  const dismissToast = useCallback((id: string) => {
    setToasts((prev) => prev.filter((t) => t.id !== id));
  }, []);

  const fetchDashboard = useCallback(
    async (targetFlaskUrl: string, showToastOnResult = false) => {
      setIsRefreshing(true);
      try {
        const res = await fetch('/api/dashboard', {
          headers: { 'x-flask-url': targetFlaskUrl },
        });
        if (!res.ok) throw new Error('Dashboard API unavailable');
        const payload = (await res.json()) as DashboardPayload;
        setDashboardData(payload);

        if (showToastOnResult) {
          if (payload.backendAvailable) {
            addToast(
              'success',
              'Connected to Flask + PySpark',
              `Loaded ${payload.kpis.totalCustomers} clustered records from ${targetFlaskUrl}.`
            );
          } else {
            addToast(
              'info',
              'Flask Backend Offline — Demo Mode Active',
              'Displaying clearly labeled 200-customer benchmark dataset.'
            );
          }
        }
      } catch {
        setDashboardData(buildDemoDashboardPayload(targetFlaskUrl));
        if (showToastOnResult) {
          addToast(
            'error',
            'Unable to reach API server',
            'Showing local benchmark demo dataset.'
          );
        }
      } finally {
        setIsLoading(false);
        setIsRefreshing(false);
      }
    },
    [addToast]
  );

  useEffect(() => {
    fetchDashboard(flaskUrl, false);
  }, [fetchDashboard, flaskUrl]);

  const handleSaveFlaskUrl = (newUrl: string) => {
    setFlaskUrl(newUrl);
    try {
      localStorage.setItem(STORAGE_KEY_FLASK_URL, newUrl);
    } catch {
      // Ignore storage write restriction
    }
  };

  const handleInspectSegment = (segmentName: string) => {
    setCustomerSegmentFilter(segmentName);
    setActiveSection('customers');
  };

  const handleUploadSubmit = async (
    datasetName: string,
    rows: Array<{
      CustomerID: number;
      Gender: string;
      Age: number;
      'Annual Income (k$)': number;
      'Spending Score (1-100)': number;
    }>,
    k: number
  ): Promise<boolean> => {
    try {
      const response = await fetch('/api/upload', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'x-flask-url': flaskUrl,
        },
        body: JSON.stringify({ datasetName, rows, k }),
      });

      const payload = await response.json();
      if (!response.ok) {
        addToast(
          'error',
          'Spark Clustering Failed',
          payload.error || 'Could not process dataset with Python Flask backend.'
        );
        return false;
      }

      setDashboardData(payload as DashboardPayload);
      addToast(
        'success',
        'Apache Spark K-Means Complete',
        `Clustered ${payload.kpis.totalCustomers} customers into ${payload.kpis.totalSegments} segments (Silhouette: ${payload.kpis.silhouetteScore}).`
      );
      setActiveSection('dashboard');
      return true;
    } catch {
      addToast(
        'error',
        'Network Error',
        'Failed to contact the API gateway for Spark processing.'
      );
      return false;
    }
  };

  const handleResetToBenchmark = async () => {
    try {
      const response = await fetch('/api/reset', {
        method: 'POST',
        headers: { 'x-flask-url': flaskUrl },
      });
      const payload = (await response.json()) as DashboardPayload;
      setDashboardData(payload);
      addToast(
        'success',
        'Benchmark Dataset Restored',
        'Loaded the 200-customer Mall Customers dataset.'
      );
    } catch {
      setDashboardData(buildDemoDashboardPayload(flaskUrl));
      addToast('info', 'Reset to Demo Dataset', 'Loaded 200 benchmark records.');
    }
  };

  const handleTopBarExport = () => {
    exportCustomersToCsv(dashboardData.customers, 'spark_customer_segments.csv');
    addToast(
      'success',
      'CSV Export Complete',
      `Exported ${dashboardData.customers.length} customer records.`
    );
  };

  return (
    <div className="min-h-screen bg-slate-50 text-slate-900 flex">
      <Sidebar
        activeSection={activeSection}
        onSelect={setActiveSection}
        mobileOpen={mobileMenuOpen}
        onCloseMobile={() => setMobileMenuOpen(false)}
        mode={dashboardData.mode}
        totalCustomers={dashboardData.kpis.totalCustomers}
      />

      <div className="flex-1 lg:pl-64 flex flex-col min-w-0">
        <TopBar
          activeSection={activeSection}
          onOpenMobile={() => setMobileMenuOpen(true)}
          mode={dashboardData.mode}
          datasetName={dashboardData.dataset.name}
          isRefreshing={isRefreshing}
          onRefresh={() => fetchDashboard(flaskUrl, true)}
          onExportCsv={handleTopBarExport}
        />

        <main className="flex-1 px-4 sm:px-6 lg:px-8 py-6 max-w-[1440px] w-full mx-auto">
          {/* Transparent Mode Banner */}
          {!isLoading && (
            <div
              className={`mb-6 rounded-xl border px-4 py-3 flex flex-col sm:flex-row sm:items-center justify-between gap-2 text-xs ${
                dashboardData.mode === 'spark'
                  ? 'border-emerald-200 bg-emerald-50/70 text-emerald-900'
                  : 'border-indigo-200/80 bg-indigo-50/60 text-slate-700'
              }`}
            >
              <div className="flex items-center gap-2.5">
                {dashboardData.mode === 'spark' ? (
                  <Server className="w-4 h-4 text-emerald-600 shrink-0" />
                ) : (
                  <Database className="w-4 h-4 text-indigo-600 shrink-0" />
                )}
                <span>
                  {dashboardData.mode === 'spark' ? (
                    <>
                      <strong className="font-semibold">Live Apache Spark Mode:</strong> Connected to
                      Python Flask + PySpark MLlib at{' '}
                      <code className="font-mono">{flaskUrl}</code>.
                    </>
                  ) : (
                    <>
                      <strong className="font-semibold text-slate-900">
                        Demo Dataset Mode:
                      </strong>{' '}
                      Python Flask / Apache Spark backend is not running at{' '}
                      <code className="font-mono text-slate-800">{flaskUrl}</code>. Displaying
                      benchmark demo data (200 customers · Silhouette 0.8117).
                    </>
                  )}
                </span>
              </div>

              {dashboardData.mode === 'demo' && (
                <button
                  type="button"
                  onClick={() => setActiveSection('settings')}
                  className="font-semibold text-indigo-700 hover:text-indigo-800 whitespace-nowrap self-start sm:self-auto"
                >
                  Connect Flask Backend →
                </button>
              )}
            </div>
          )}

          {isLoading ? (
            <div className="space-y-6 animate-pulse">
              <div className="h-9 w-72 bg-slate-200 rounded-lg" />
              <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-5 gap-4">
                {[1, 2, 3, 4, 5].map((i) => (
                  <div key={i} className="h-32 bg-white rounded-2xl border border-slate-200" />
                ))}
              </div>
              <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
                <div className="lg:col-span-7 h-96 bg-white rounded-2xl border border-slate-200" />
                <div className="lg:col-span-5 h-96 bg-white rounded-2xl border border-slate-200" />
              </div>
            </div>
          ) : (
            <>
              {activeSection === 'dashboard' && (
                <DashboardView
                  data={dashboardData}
                  onNavigate={setActiveSection}
                  onInspectSegment={handleInspectSegment}
                />
              )}
              {activeSection === 'segments' && (
                <SegmentsView
                  segments={dashboardData.segments}
                  totalCustomers={dashboardData.kpis.totalCustomers}
                  onInspectSegment={handleInspectSegment}
                />
              )}
              {activeSection === 'analytics' && (
                <AnalyticsView
                  customers={dashboardData.customers}
                  segments={dashboardData.segments}
                  onInspectSegment={handleInspectSegment}
                />
              )}
              {activeSection === 'visualization' && (
                <VisualizationView
                  customers={dashboardData.customers}
                  segments={dashboardData.segments}
                  centroids={dashboardData.model.centroids}
                />
              )}
              {activeSection === 'customers' && (
                <CustomerDetailsView
                  customers={dashboardData.customers}
                  segments={dashboardData.segments}
                  initialSegmentFilter={customerSegmentFilter}
                  onClearInitialFilter={() => setCustomerSegmentFilter('ALL')}
                  onNotifyExport={(count) =>
                    addToast(
                      'success',
                      'Filtered CSV Exported',
                      `Downloaded ${count} customer records.`
                    )
                  }
                />
              )}
              {activeSection === 'upload' && (
                <UploadDatasetView
                  backendAvailable={dashboardData.backendAvailable}
                  flaskUrl={flaskUrl}
                  onSubmitToBackend={handleUploadSubmit}
                  onOpenSettings={() => setActiveSection('settings')}
                />
              )}
              {activeSection === 'performance' && (
                <ModelPerformanceView
                  model={dashboardData.model}
                  totalCustomers={dashboardData.kpis.totalCustomers}
                />
              )}
              {activeSection === 'reports' && (
                <ReportsView data={dashboardData} onNotify={addToast} />
              )}
              {activeSection === 'settings' && (
                <SettingsView
                  flaskUrl={flaskUrl}
                  backendAvailable={dashboardData.backendAvailable}
                  onSaveFlaskUrl={handleSaveFlaskUrl}
                  onTestConnection={(url) => fetchDashboard(url, true)}
                  onResetToBenchmark={handleResetToBenchmark}
                />
              )}
            </>
          )}
        </main>
      </div>

      <ToastContainer toasts={toasts} onDismiss={dismissToast} />
    </div>
  );
}
