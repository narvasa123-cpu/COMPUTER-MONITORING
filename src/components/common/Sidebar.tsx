import React, { useEffect, useState } from 'react';
import {
  Activity,
  Building2,
  FileText,
  History,
  LayoutDashboard,
  MapPin,
  Monitor,
  ShieldCheck,
  SlidersHorizontal,
  Stethoscope,
  Users,
  Wrench,
  X,
} from 'lucide-react';
import { useMonitoring } from '../../context/MonitoringContext';
import { useAuth } from '../../context/AuthContext';

type NavigationItem = {
  id: string;
  label: string;
  icon: React.ElementType;
  badge?: number | null;
  badgeTone?: 'critical' | 'warning' | 'indigo' | 'neutral';
};

const badgeToneClasses: Record<NonNullable<NavigationItem['badgeTone']>, string> = {
  critical: 'bg-rose-500 text-white',
  warning: 'bg-amber-400 text-amber-950',
  indigo: 'bg-indigo-100 text-indigo-700',
  neutral: 'bg-white/10 text-slate-200',
};

export const Sidebar: React.FC = () => {
  const {
    activeTab,
    setActiveTab,
    setSelectedDeviceId,
    summary,
  } = useMonitoring();
  const { user } = useAuth();
  const [isMobileOpen, setIsMobileOpen] = useState(false);
  const isViewer = user?.role === 'viewer';

  useEffect(() => {
    const toggleSidebar = () => setIsMobileOpen((open) => !open);
    const closeOnEscape = (event: KeyboardEvent) => {
      if (event.key === 'Escape') setIsMobileOpen(false);
    };

    window.addEventListener('monitoring:toggle-sidebar', toggleSidebar);
    window.addEventListener('keydown', closeOnEscape);
    return () => {
      window.removeEventListener('monitoring:toggle-sidebar', toggleSidebar);
      window.removeEventListener('keydown', closeOnEscape);
    };
  }, []);

  useEffect(() => {
    const originalOverflow = document.body.style.overflow;
    if (isMobileOpen) document.body.style.overflow = 'hidden';
    return () => {
      document.body.style.overflow = originalOverflow;
    };
  }, [isMobileOpen]);

  const groups: Array<{ label: string; items: NavigationItem[] }> = [
    {
      label: 'Operations',
      items: [
        { id: 'dashboard', label: 'Command center', icon: LayoutDashboard },
        { id: 'devices', label: 'Computers', icon: Monitor, badge: summary?.totalDevices ?? 0, badgeTone: 'neutral' },
        {
          id: 'diagnostics',
          label: 'Diagnostics & findings',
          icon: Stethoscope,
          badge: summary?.activeIssues ?? 0,
          badgeTone: (summary?.criticalIssues ?? 0) > 0 ? 'critical' : 'warning',
        },
        { id: 'tickets', label: 'Repair tickets', icon: Wrench, badge: summary?.openTickets ?? 0, badgeTone: 'indigo' },
        { id: 'maintenance', label: 'Maintenance history', icon: History },
      ],
    },
    {
      label: 'Organization',
      items: [
        { id: 'locations', label: 'Laboratories & rooms', icon: MapPin },
        { id: 'departments', label: 'Departments', icon: Building2 },
        { id: 'users', label: 'User accounts', icon: Users },
      ],
    },
    {
      label: 'Control & reporting',
      items: [
        { id: 'reports', label: 'Reports & export', icon: FileText },
        { id: 'audit', label: 'Audit trail', icon: ShieldCheck },
        { id: 'settings', label: 'Rules & settings', icon: SlidersHorizontal },
      ],
    },
  ];

  const navigate = (tab: string) => {
    setActiveTab(tab);
    if (tab !== 'devices') setSelectedDeviceId(null);
    setIsMobileOpen(false);
  };

  return (
    <aside className={`app-sidebar ${isMobileOpen ? 'app-sidebar--open' : ''}`} aria-label="Application navigation">
      <button
        type="button"
        className="app-sidebar-scrim"
        onClick={() => setIsMobileOpen(false)}
        aria-label="Close navigation"
        tabIndex={isMobileOpen ? 0 : -1}
      />
      <div className="app-sidebar-panel flex min-h-0 w-full flex-col overflow-hidden bg-slate-950 text-slate-200">
        <div className="app-sidebar-mobile-title flex items-center justify-between border-b border-white/10 px-4 py-3 lg:hidden">
          <div>
            <p className="text-[10px] font-bold uppercase tracking-[0.14em] text-indigo-300">Operations console</p>
            <p className="mt-0.5 text-sm font-bold text-white">Navigation</p>
          </div>
          <button
            type="button"
            onClick={() => setIsMobileOpen(false)}
            className="inline-flex h-9 w-9 items-center justify-center rounded-lg text-slate-300 transition hover:bg-white/10 hover:text-white focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-indigo-400"
            aria-label="Close navigation"
          >
            <X className="h-4 w-4" aria-hidden="true" />
          </button>
        </div>

        <nav className="app-sidebar-nav min-h-0 flex-1 overflow-y-auto overscroll-contain px-3 py-4" aria-label="Primary navigation">
          {groups.map((group, groupIndex) => {
            const visibleItems = group.items.filter((item) => !(isViewer && (item.id === 'users' || item.id === 'audit')));
            if (visibleItems.length === 0) return null;
            return (
            <section key={group.label} className={groupIndex === 0 ? '' : 'mt-6'} aria-label={group.label}>
              <p className="px-3 pb-2 text-[10px] font-bold uppercase tracking-[0.13em] text-slate-500">{group.label}</p>
              <div className="space-y-1">
                {visibleItems.map((item) => {
                  const Icon = item.icon;
                  const isActive = activeTab === item.id;
                  const hasBadge = (item.badge ?? 0) > 0;

                  return (
                    <button
                      key={item.id}
                      id={`nav-${item.id}-btn`}
                      type="button"
                      onClick={() => navigate(item.id)}
                      className={`app-sidebar-link group relative flex w-full items-center justify-between rounded-xl px-3 py-2.5 text-left text-xs font-semibold transition focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-indigo-300 ${
                        isActive
                          ? 'bg-indigo-600 text-white shadow-[0_8px_18px_rgba(79,70,229,0.28)]'
                          : 'text-slate-300 hover:bg-white/[0.07] hover:text-white'
                      }`}
                      aria-current={isActive ? 'page' : undefined}
                    >
                      <span className="flex min-w-0 items-center gap-3">
                        <span className={`flex h-7 w-7 shrink-0 items-center justify-center rounded-lg transition ${
                          isActive ? 'bg-white/15 text-white' : 'bg-white/[0.04] text-slate-400 group-hover:bg-white/[0.09] group-hover:text-slate-200'
                        }`}>
                          <Icon className="h-4 w-4" aria-hidden="true" />
                        </span>
                        <span className="truncate">{item.label}</span>
                      </span>
                      {hasBadge && (
                        <span className={`ml-2 inline-flex min-w-5 items-center justify-center rounded-md px-1.5 py-0.5 text-[10px] font-extrabold ${
                          isActive ? 'bg-white/15 text-white' : badgeToneClasses[item.badgeTone ?? 'neutral']
                        }`}>
                          {item.badge}
                        </span>
                      )}
                    </button>
                  );
                })}
              </div>
            </section>
            );
          })}
        </nav>

        <div className="app-sidebar-footer shrink-0 border-t border-white/10 bg-slate-950/80 p-3">
          {summary && (
            <div className="grid grid-cols-2 gap-2 rounded-xl border border-white/[0.08] bg-white/[0.035] p-2.5">
              <div>
                <div className="flex items-center gap-1.5 text-[10px] font-semibold text-slate-400">
                  <Activity className="h-3.5 w-3.5 text-emerald-400" aria-hidden="true" />
                  Environment health
                </div>
                <p className="mt-1 text-base font-extrabold text-white">
                  {summary.overallHealthScore ?? '—'}
                  {summary.overallHealthScore !== null && summary.overallHealthScore !== undefined && <span className="ml-0.5 text-[10px] font-bold text-slate-400">/100</span>}
                </p>
              </div>
              <div className="border-l border-white/[0.08] pl-2.5">
                <p className="text-[10px] font-semibold text-slate-400">Live agents</p>
                <p className="mt-1 text-base font-extrabold text-white">{summary.onlineDevices}</p>
              </div>
            </div>
          )}
        </div>
      </div>
    </aside>
  );
};
