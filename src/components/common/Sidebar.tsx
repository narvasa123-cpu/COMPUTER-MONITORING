import React from 'react';
import { 
  LayoutDashboard, 
  Monitor, 
  Stethoscope, 
  Wrench, 
  History, 
  MapPin, 
  Building2, 
  Users, 
  FileText, 
  ShieldCheck, 
  Sliders,
  Download,
  Flame
} from 'lucide-react';
import { useMonitoring } from '../../context/MonitoringContext';

export const Sidebar: React.FC = () => {
  const { 
    activeTab, 
    setActiveTab, 
    setSelectedDeviceId,
    summary,
    unreadNotificationCount,
    setIsInstallModalOpen,
    setInstallTargetDevice
  } = useMonitoring();

  const navItems = [
    { id: 'dashboard', label: 'Dashboard', icon: LayoutDashboard, badge: null },
    { 
      id: 'devices', 
      label: 'Computers', 
      icon: Monitor, 
      badge: summary?.totalDevices || 0 
    },
    { 
      id: 'diagnostics', 
      label: 'Diagnostics & Findings', 
      icon: Stethoscope, 
      badge: summary?.activeIssues || 0,
      badgeColor: (summary?.criticalIssues || 0) > 0 ? 'bg-rose-500 text-white' : 'bg-amber-100 text-amber-800'
    },
    { 
      id: 'tickets', 
      label: 'Repair Tickets', 
      icon: Wrench, 
      badge: summary?.openTickets || 0,
      badgeColor: 'bg-indigo-100 text-indigo-700'
    },
    { id: 'maintenance', label: 'Maintenance History', icon: History, badge: null },
    { id: 'locations', label: 'Laboratories & Rooms', icon: MapPin, badge: null },
    { id: 'departments', label: 'Departments', icon: Building2, badge: null },
    { id: 'users', label: 'User Accounts', icon: Users, badge: null },
    { id: 'reports', label: 'Reports & Export', icon: FileText, badge: null },
    { id: 'audit', label: 'Audit Trail', icon: ShieldCheck, badge: null },
    { id: 'settings', label: 'Rules & Settings', icon: Sliders, badge: null }
  ];

  return (
    <aside className="w-64 bg-slate-900 text-slate-300 flex flex-col shrink-0 min-h-[calc(100vh-61px)]">
      {/* Navigation Links */}
      <div className="p-3 space-y-1 flex-1 overflow-y-auto">
        <div className="px-3 py-2 text-[10px] font-bold uppercase tracking-wider text-slate-400">
          Operations & Inventory
        </div>

        {navItems.map(item => {
          const Icon = item.icon;
          const isActive = activeTab === item.id;
          return (
            <button
              key={item.id}
              id={`nav-${item.id}-btn`}
              onClick={() => {
                setActiveTab(item.id);
                if (item.id !== 'devices') {
                  setSelectedDeviceId(null);
                }
              }}
              className={`w-full flex items-center justify-between px-3 py-2.5 rounded-lg text-xs font-semibold transition-all ${
                isActive 
                  ? 'bg-indigo-600 text-white shadow-sm' 
                  : 'text-slate-300 hover:bg-slate-800 hover:text-white'
              }`}
            >
              <div className="flex items-center gap-2.5">
                <Icon className={`w-4 h-4 ${isActive ? 'text-white' : 'text-slate-400'}`} />
                <span>{item.label}</span>
              </div>
              {item.badge !== null && item.badge > 0 && (
                <span className={`px-1.5 py-0.5 rounded text-[10px] font-bold ${item.badgeColor || 'bg-slate-700 text-slate-200'}`}>
                  {item.badge}
                </span>
              )}
            </button>
          );
        })}
      </div>

      {/* Agent Download Quick Banner */}
      <div className="p-3 border-t border-slate-800 bg-slate-950/40">
        <div className="bg-slate-800/80 rounded-lg p-3 border border-slate-700/50 text-xs">
          <div className="flex items-center gap-2 text-indigo-400 font-bold mb-1">
            <Download className="w-4 h-4" />
            <span>PC Monitoring Agent</span>
          </div>
          <p className="text-[11px] text-slate-400 leading-relaxed mb-2.5">
            Install on Windows/Linux PCs to collect actual hardware telemetry & heartbeats.
          </p>
          <button
            id="sidebar-install-guide-btn"
            onClick={() => {
              setInstallTargetDevice(null);
              setIsInstallModalOpen(true);
            }}
            className="w-full py-1.5 px-2 bg-indigo-600/90 hover:bg-indigo-600 text-white rounded text-[11px] font-bold text-center transition-colors"
          >
            Get Agent Scripts
          </button>
        </div>
      </div>
    </aside>
  );
};
