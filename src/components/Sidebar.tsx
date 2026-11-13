import {
  Activity,
  BarChart3,
  Cpu,
  FileSpreadsheet,
  FileText,
  Layers,
  LayoutDashboard,
  Settings,
  UploadCloud,
  Users,
  X,
} from 'lucide-react';
import type { NavSection } from '../types/segmentation';

interface SidebarProps {
  activeSection: NavSection;
  onSelect: (section: NavSection) => void;
  mobileOpen: boolean;
  onCloseMobile: () => void;
  mode: 'spark' | 'demo';
  totalCustomers: number;
}

export interface NavItemConfig {
  id: NavSection;
  label: string;
  icon: typeof LayoutDashboard;
}

export const NAV_ITEMS: NavItemConfig[] = [
  { id: 'dashboard', label: 'Dashboard', icon: LayoutDashboard },
  { id: 'segments', label: 'Customer Segments', icon: Layers },
  { id: 'analytics', label: 'Customer Analytics', icon: Activity },
  { id: 'visualization', label: 'Data Visualization', icon: BarChart3 },
  { id: 'customers', label: 'Customer Details', icon: Users },
  { id: 'upload', label: 'Upload Dataset', icon: UploadCloud },
  { id: 'performance', label: 'Model Performance', icon: Cpu },
  { id: 'reports', label: 'Reports', icon: FileText },
  { id: 'settings', label: 'Settings', icon: Settings },
];

export function Sidebar({
  activeSection,
  onSelect,
  mobileOpen,
  onCloseMobile,
  mode,
  totalCustomers,
}: SidebarProps) {
  const handleNavClick = (section: NavSection) => {
    onSelect(section);
    onCloseMobile();
  };

  return (
    <>
      {mobileOpen && (
        <div
          className="fixed inset-0 z-40 bg-slate-950/60 backdrop-blur-[2px] lg:hidden"
          onClick={onCloseMobile}
          aria-hidden="true"
        />
      )}

      <aside
        className={`fixed inset-y-0 left-0 z-50 w-64 bg-[#0B1221] text-slate-200 flex flex-col border-r border-slate-800/80 transition-transform duration-200 ease-out lg:translate-x-0 ${
          mobileOpen ? 'translate-x-0' : '-translate-x-full'
        }`}
        aria-label="Primary sidebar navigation"
      >
        <div className="h-16 px-5 flex items-center justify-between border-b border-slate-800/80 shrink-0">
          <button
            type="button"
            onClick={() => handleNavClick('dashboard')}
            className="flex items-center gap-3 text-left focus:outline-none focus-visible:ring-2 focus-visible:ring-indigo-400 rounded-lg"
          >
            <div className="w-9 h-9 rounded-xl bg-gradient-to-br from-blue-500 via-indigo-500 to-purple-600 flex items-center justify-center shadow-md shadow-indigo-950/50 shrink-0">
              <FileSpreadsheet className="w-4.5 h-4.5 text-white" />
            </div>
            <div className="min-w-0">
              <span className="block font-display text-sm font-bold text-white tracking-tight truncate">
                SparkSegment
              </span>
              <span className="block text-[11px] text-slate-400 truncate">
                Apache Spark Analytics
              </span>
            </div>
          </button>

          <button
            type="button"
            onClick={onCloseMobile}
            className="lg:hidden p-1.5 rounded-lg text-slate-400 hover:text-white hover:bg-slate-800"
            aria-label="Close navigation menu"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        <nav className="flex-1 overflow-y-auto sidebar-scroll px-3 py-4 space-y-1">
          {NAV_ITEMS.map((item) => {
            const Icon = item.icon;
            const isActive = activeSection === item.id;
            return (
              <button
                key={item.id}
                type="button"
                onClick={() => handleNavClick(item.id)}
                aria-current={isActive ? 'page' : undefined}
                className={`w-full flex items-center gap-3 px-3.5 py-2.5 rounded-xl text-sm font-medium transition-all duration-150 whitespace-nowrap focus:outline-none focus-visible:ring-2 focus-visible:ring-indigo-400 ${
                  isActive
                    ? 'bg-gradient-to-r from-blue-600 to-purple-600 text-white shadow-sm shadow-indigo-950/50'
                    : 'text-slate-300 hover:text-white hover:bg-slate-800/70'
                }`}
              >
                <Icon
                  className={`w-4.5 h-4.5 shrink-0 ${
                    isActive ? 'text-white' : 'text-slate-400'
                  }`}
                />
                <span className="truncate">{item.label}</span>
              </button>
            );
          })}
        </nav>

        <div className="p-4 border-t border-slate-800/80 shrink-0">
          <div className="rounded-xl bg-slate-900/90 border border-slate-800 p-3.5">
            <p className="text-xs font-medium text-slate-300">
              {mode === 'spark' ? 'PySpark Engine Connected' : 'Demo Benchmark Active'}
            </p>
            <p className="text-[11px] text-slate-400 mt-1 tabular-nums">
              {totalCustomers.toLocaleString()} records · K-Means (k=5)
            </p>
            <button
              type="button"
              onClick={() => handleNavClick('settings')}
              className="mt-2.5 text-xs font-medium text-indigo-300 hover:text-indigo-200 transition-colors"
            >
              Configure Flask backend →
            </button>
          </div>
        </div>
      </aside>
    </>
  );
}
