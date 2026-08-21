import React, { useState } from 'react';
import { 
  Monitor, 
  Bell, 
  RefreshCw, 
  Plus, 
  FlaskConical, 
  Check, 
  ShieldCheck, 
  UserCheck, 
  AlertTriangle,
  ChevronDown
} from 'lucide-react';
import { useMonitoring } from '../../context/MonitoringContext';
import { useAuth } from '../../context/AuthContext';
import { UserRole } from '../../types/index';

export const Header: React.FC = () => {
  const { 
    notifications, 
    unreadNotificationCount, 
    isPolling, 
    setIsPolling, 
    lastRefreshed, 
    refreshData, 
    markAllNotificationsRead,
    markNotificationRead,
    setIsAddModalOpen,
    setIsDevTestingModalOpen,
    setActiveTab,
    setSelectedDeviceId
  } = useMonitoring();

  const { user, switchDemoRole } = useAuth();
  const [showNotifications, setShowNotifications] = useState(false);
  const [showRoleMenu, setShowRoleMenu] = useState(false);
  const [refreshing, setRefreshing] = useState(false);

  const handleManualRefresh = async () => {
    setRefreshing(true);
    await refreshData();
    setTimeout(() => setRefreshing(false), 400);
  };

  const roles: { role: UserRole; label: string; desc: string }[] = [
    { role: 'super_admin', label: 'Super Admin', desc: 'Full administrative access' },
    { role: 'it_admin', label: 'IT Administrator', desc: 'Manage devices, rules, tickets' },
    { role: 'technician', label: 'Technician', desc: 'Diagnostics, repairs, logs' },
    { role: 'department_head', label: 'Department Head', desc: 'Department asset overview' },
    { role: 'viewer', label: 'Viewer', desc: 'Read-only inspection' }
  ];

  return (
    <header className="bg-white border-b border-slate-200 sticky top-0 z-40 shadow-xs">
      <div className="px-4 sm:px-6 lg:px-8 py-3 flex items-center justify-between">
        
        {/* Left: Branding & Status */}
        <div className="flex items-center gap-3">
          <div className="flex items-center justify-center w-10 h-10 rounded-xl bg-slate-900 text-white shadow-sm">
            <Monitor className="w-5 h-5 text-indigo-400" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h1 className="text-base font-bold text-slate-900 leading-tight">
                PC & Laptop Monitoring & Diagnostics
              </h1>
              <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded text-[11px] font-semibold bg-emerald-100 text-emerald-800">
                <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse" />
                Live Telemetry
              </span>
            </div>
            <p className="text-xs text-slate-500 hidden sm:block">
              Hardware Telemetry • Automated Diagnostics • Incident Tickets • Maintenance
            </p>
          </div>
        </div>

        {/* Right: Actions, Notifications, Role Switcher */}
        <div className="flex items-center gap-2.5">
          
          {/* Real-time Polling & Refresh */}
          <div className="hidden md:flex items-center gap-1.5 bg-slate-50 border border-slate-200 rounded-lg px-2.5 py-1 text-xs text-slate-600">
            <button
              onClick={() => setIsPolling(!isPolling)}
              title={isPolling ? 'Live auto-sync active (every 3.5s)' : 'Live sync paused'}
              className={`w-2 h-2 rounded-full ${isPolling ? 'bg-emerald-500 animate-pulse' : 'bg-slate-400'}`}
            />
            <span className="text-[11px] font-medium">
              {isPolling ? 'Auto-Sync ON' : 'Paused'}
            </span>
            <span className="text-slate-300">|</span>
            <button
              onClick={handleManualRefresh}
              className="hover:text-slate-900 transition-colors p-0.5"
              title="Refresh now"
            >
              <RefreshCw className={`w-3.5 h-3.5 ${refreshing ? 'animate-spin text-indigo-600' : ''}`} />
            </button>
          </div>

          {/* Test Agent Emulator Button */}
          <button
            id="open-emulator-btn"
            onClick={() => setIsDevTestingModalOpen(true)}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold bg-amber-50 text-amber-900 border border-amber-300 hover:bg-amber-100 transition-colors shadow-xs"
            title="Open isolated Development/Testing Agent Telemetry Generator"
          >
            <FlaskConical className="w-3.5 h-3.5 text-amber-600" />
            <span className="hidden sm:inline">Test Emulator</span>
          </button>

          {/* Register New PC */}
          <button
            id="header-add-device-btn"
            onClick={() => setIsAddModalOpen(true)}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-bold bg-indigo-600 text-white hover:bg-indigo-700 transition-all shadow-xs"
          >
            <Plus className="w-4 h-4" />
            <span>Add Computer</span>
          </button>

          {/* Notification Center */}
          <div className="relative">
            <button
              id="notifications-toggle-btn"
              onClick={() => setShowNotifications(!showNotifications)}
              className="relative p-2 text-slate-500 hover:text-slate-800 hover:bg-slate-100 rounded-lg transition-colors"
            >
              <Bell className="w-4 h-4" />
              {unreadNotificationCount > 0 && (
                <span className="absolute top-1 right-1 w-4 h-4 rounded-full bg-rose-500 text-[10px] font-bold text-white flex items-center justify-center animate-pulse">
                  {unreadNotificationCount > 9 ? '9+' : unreadNotificationCount}
                </span>
              )}
            </button>

            {/* Notification Dropdown */}
            {showNotifications && (
              <div className="absolute right-0 mt-2 w-80 sm:w-96 bg-white rounded-xl shadow-xl border border-slate-200 py-2 z-50 animate-in fade-in zoom-in-95 duration-150">
                <div className="flex items-center justify-between px-4 py-2 border-b border-slate-100">
                  <div className="flex items-center gap-1.5">
                    <span className="text-xs font-bold text-slate-900">Notifications & Alerts</span>
                    {unreadNotificationCount > 0 && (
                      <span className="px-1.5 py-0.5 rounded text-[10px] font-bold bg-rose-100 text-rose-700">
                        {unreadNotificationCount} unread
                      </span>
                    )}
                  </div>
                  {unreadNotificationCount > 0 && (
                    <button
                      onClick={markAllNotificationsRead}
                      className="text-[11px] text-indigo-600 hover:text-indigo-800 font-medium"
                    >
                      Mark all as read
                    </button>
                  )}
                </div>

                <div className="max-h-80 overflow-y-auto divide-y divide-slate-100">
                  {notifications.length === 0 ? (
                    <div className="p-6 text-center text-xs text-slate-400">
                      No notifications or active alerts.
                    </div>
                  ) : (
                    notifications.map(notif => (
                      <div
                        key={notif.id}
                        onClick={() => {
                          markNotificationRead(notif.id);
                          if (notif.deviceId) {
                            setSelectedDeviceId(notif.deviceId);
                            setActiveTab('devices');
                          }
                          setShowNotifications(false);
                        }}
                        className={`p-3 hover:bg-slate-50 cursor-pointer transition-colors ${!notif.isRead ? 'bg-indigo-50/40' : ''}`}
                      >
                        <div className="flex items-start gap-2">
                          <div className="mt-0.5">
                            {notif.type === 'critical' && <span className="w-2 h-2 rounded-full bg-rose-500 block" />}
                            {notif.type === 'warning' && <span className="w-2 h-2 rounded-full bg-amber-500 block" />}
                            {notif.type === 'ticket' && <span className="w-2 h-2 rounded-full bg-purple-500 block" />}
                            {notif.type === 'offline' && <span className="w-2 h-2 rounded-full bg-slate-500 block" />}
                            {notif.type === 'info' && <span className="w-2 h-2 rounded-full bg-blue-500 block" />}
                          </div>
                          <div className="flex-1">
                            <p className="text-xs font-semibold text-slate-900">{notif.title}</p>
                            <p className="text-[11px] text-slate-600 mt-0.5 line-clamp-2">{notif.message}</p>
                            <span className="text-[10px] text-slate-400 mt-1 block">
                              {new Date(notif.createdAt).toLocaleTimeString()}
                            </span>
                          </div>
                        </div>
                      </div>
                    ))
                  )}
                </div>
              </div>
            )}
          </div>

          {/* User Role Switcher Dropdown */}
          <div className="relative">
            <button
              id="user-role-menu-btn"
              onClick={() => setShowRoleMenu(!showRoleMenu)}
              className="flex items-center gap-2 p-1.5 sm:px-3 sm:py-1.5 rounded-lg border border-slate-200 hover:bg-slate-50 transition-colors"
            >
              <div className="w-6 h-6 rounded-full bg-indigo-100 text-indigo-700 flex items-center justify-center text-xs font-bold">
                {user?.fullName?.charAt(0) || 'A'}
              </div>
              <div className="text-left hidden sm:block">
                <p className="text-xs font-bold text-slate-900 leading-none">{user?.fullName}</p>
                <p className="text-[10px] text-slate-500 capitalize">{user?.role?.replace('_', ' ')}</p>
              </div>
              <ChevronDown className="w-3.5 h-3.5 text-slate-400" />
            </button>

            {showRoleMenu && (
              <div className="absolute right-0 mt-2 w-64 bg-white rounded-xl shadow-xl border border-slate-200 py-2 z-50 animate-in fade-in zoom-in-95 duration-150">
                <div className="px-3 py-2 border-b border-slate-100">
                  <p className="text-[11px] font-bold text-slate-400 uppercase tracking-wider">Role Simulation</p>
                  <p className="text-xs text-slate-600">Switch current operator profile:</p>
                </div>
                <div className="py-1">
                  {roles.map(r => (
                    <button
                      key={r.role}
                      onClick={() => {
                        switchDemoRole(r.role);
                        setShowRoleMenu(false);
                      }}
                      className={`w-full text-left px-3 py-2 text-xs flex items-center justify-between hover:bg-slate-50 transition-colors ${user?.role === r.role ? 'bg-indigo-50 font-bold text-indigo-700' : 'text-slate-700'}`}
                    >
                      <div>
                        <p>{r.label}</p>
                        <p className="text-[10px] text-slate-400 font-normal">{r.desc}</p>
                      </div>
                      {user?.role === r.role && <Check className="w-3.5 h-3.5 text-indigo-600" />}
                    </button>
                  ))}
                </div>
              </div>
            )}
          </div>

        </div>
      </div>
    </header>
  );
};
