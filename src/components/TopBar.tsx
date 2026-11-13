import { Database, Download, Menu, RefreshCw, Server } from 'lucide-react';
import type { NavSection } from '../types/segmentation';
import { NAV_ITEMS } from './Sidebar';

interface TopBarProps {
  activeSection: NavSection;
  onOpenMobile: () => void;
  mode: 'spark' | 'demo';
  datasetName: string;
  isRefreshing: boolean;
  onRefresh: () => void;
  onExportCsv: () => void;
}

export function TopBar({
  activeSection,
  onOpenMobile,
  mode,
  datasetName,
  isRefreshing,
  onRefresh,
  onExportCsv,
}: TopBarProps) {
  const activeLabel =
    NAV_ITEMS.find((item) => item.id === activeSection)?.label || 'Dashboard';

  return (
    <header className="sticky top-0 z-30 h-16 bg-white/95 backdrop-blur-sm border-b border-slate-200 px-4 sm:px-6 lg:px-8 flex items-center justify-between gap-4">
      <div className="flex items-center gap-3 min-w-0">
        <button
          type="button"
          onClick={onOpenMobile}
          className="lg:hidden p-2 -ml-2 rounded-lg text-slate-600 hover:text-slate-900 hover:bg-slate-100 focus-visible:ring-2 focus-visible:ring-indigo-500"
          aria-label="Open navigation menu"
        >
          <Menu className="w-5 h-5" />
        </button>

        <div className="min-w-0">
          <div className="flex items-center gap-2 text-xs text-slate-500 whitespace-nowrap">
            <span>Customer Segmentation</span>
            <span aria-hidden="true">/</span>
            <span className="font-medium text-slate-800">{activeLabel}</span>
          </div>
          <p className="text-xs text-slate-500 truncate mt-0.5">{datasetName}</p>
        </div>
      </div>

      <div className="flex items-center gap-3 shrink-0">
        <div
          className="hidden md:flex items-center gap-2 text-xs text-slate-600 whitespace-nowrap"
          title={
            mode === 'spark'
              ? 'Connected to Python Flask + Apache Spark backend'
              : 'Flask backend offline — displaying clearly labeled demo benchmark data'
          }
        >
          {mode === 'spark' ? (
            <>
              <Server className="w-3.5 h-3.5 text-emerald-600" />
              <span className="font-medium text-emerald-700">Flask + PySpark Live</span>
            </>
          ) : (
            <>
              <Database className="w-3.5 h-3.5 text-amber-600" />
              <span className="font-medium text-amber-700">Demo Dataset Mode</span>
            </>
          )}
        </div>

        <button
          type="button"
          onClick={onRefresh}
          disabled={isRefreshing}
          className="p-2 rounded-lg border border-slate-200 text-slate-600 hover:text-slate-900 hover:bg-slate-50 transition-colors disabled:opacity-50"
          aria-label="Sync with Flask backend"
          title="Check Flask + Spark backend connection"
        >
          <RefreshCw className={`w-4 h-4 ${isRefreshing ? 'animate-spin' : ''}`} />
        </button>

        <button
          type="button"
          onClick={onExportCsv}
          className="inline-flex items-center gap-2 px-4 py-2 rounded-lg text-xs font-semibold text-white bg-gradient-to-r from-blue-600 to-purple-600 hover:from-blue-700 hover:to-purple-700 shadow-sm transition-all whitespace-nowrap shrink-0"
        >
          <Download className="w-3.5 h-3.5" />
          <span>Export CSV</span>
        </button>
      </div>
    </header>
  );
}
