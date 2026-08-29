import React, { useState } from 'react';
import {
  Bell,
  ChevronDown,
  Clock3,
  LogOut,
  Menu,
  Monitor,
  Plus,
  RefreshCw,
  Radio,
} from 'lucide-react';
import { useMonitoring } from '../../context/MonitoringContext';
import { useAuth } from '../../context/AuthContext';

const formatRefreshTime = (date: Date) => new Intl.DateTimeFormat(undefined, {
  hour: 'numeric',
  minute: '2-digit',
  second: '2-digit',
}).format(date);

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
    setActiveTab,
    setSelectedDeviceId,
  } = useMonitoring();
  const { user, logout } = useAuth();
  const [showNotifications, setShowNotifications] = useState(false);
  const [showRoleMenu, setShowRoleMenu] = useState(false);
  const [refreshing, setRefreshing] = useState(false);

  const handleManualRefresh = async () => {
    setRefreshing(true);
    try {
      await refreshData();
    } finally {
      window.setTimeout(() => setRefreshing(false), 350);
    }
  };

  const toggleNavigation = () => {
    window.dispatchEvent(new CustomEvent('monitoring:toggle-sidebar'));
  };

  return (
    <header className="app-header sticky top-0 z-40 border-b border-slate-200/90 bg-white/95 shadow-[0_1px_0_rgba(15,23,42,0.03)] backdrop-blur">
      <div className="app-header-inner flex min-h-[72px] items-center justify-between gap-3 px-4 py-3 sm:px-6 lg:px-8">
        <div className="flex min-w-0 items-center gap-3">
          <button
            type="button"
            onClick={toggleNavigation}
            className="app-mobile-nav-trigger inline-flex h-10 w-10 shrink-0 items-center justify-center rounded-xl border border-slate-200 bg-white text-slate-700 shadow-sm transition hover:border-indigo-200 hover:bg-indigo-50 hover:text-indigo-700 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-indigo-500 focus-visible:ring-offset-2 lg:hidden"
            aria-label="Open navigation"
          >
            <Menu className="h-5 w-5" aria-hidden="true" />
          </button>

          <div className="app-brand-mark flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-gradient-to-br from-slate-950 to-slate-800 text-white shadow-[0_8px_18px_rgba(15,23,42,0.18)] ring-1 ring-slate-900/10">
            <Monitor className="h-5 w-5 text-indigo-200" aria-hidden="true" />
          </div>
          <div className="min-w-0">
            <div className="flex min-w-0 flex-wrap items-center gap-x-2 gap-y-1">
              <h1 className="truncate text-[15px] font-bold tracking-[-0.02em] text-slate-950 sm:text-base">
                PC &amp; Laptop Monitoring
              </h1>
              <span className={`app-sync-badge inline-flex shrink-0 items-center gap-1.5 rounded-full border px-2 py-0.5 text-[10px] font-bold uppercase tracking-[0.08em] ${
                isPolling
                  ? 'border-emerald-200 bg-emerald-50 text-emerald-800'
                  : 'border-slate-200 bg-slate-50 text-slate-600'
              }`}>
                <span className={`h-1.5 w-1.5 rounded-full ${isPolling ? 'bg-emerald-500 animate-pulse' : 'bg-slate-400'}`} />
                {isPolling ? 'Sync active' : 'Sync paused'}
              </span>
            </div>
            <p className="app-header-subtitle mt-0.5 hidden text-xs text-slate-500 sm:block">
              Health intelligence <span className="mx-1 text-slate-300">•</span> Diagnostics <span className="mx-1 text-slate-300">•</span> Incident response <span className="mx-1 text-slate-300">•</span> Maintenance
            </p>
          </div>
        </div>

        <div className="flex shrink-0 items-center gap-1.5 sm:gap-2">
          <div className="hidden items-center rounded-xl border border-slate-200 bg-slate-50/80 p-1 md:flex">
            <button
              type="button"
              onClick={() => setIsPolling(!isPolling)}
              className="inline-flex h-8 items-center gap-1.5 rounded-lg px-2 text-[11px] font-semibold text-slate-600 transition hover:bg-white hover:text-slate-900 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-indigo-500"
              title={isPolling ? 'Pause dashboard auto-sync' : 'Resume dashboard auto-sync'}
              aria-pressed={isPolling}
            >
              <Radio className={`h-3.5 w-3.5 ${isPolling ? 'text-emerald-600' : 'text-slate-400'}`} aria-hidden="true" />
              <span>{isPolling ? 'Auto-sync' : 'Paused'}</span>
            </button>
            <span className="h-4 w-px bg-slate-200" aria-hidden="true" />
            <button
              type="button"
              onClick={handleManualRefresh}
              disabled={refreshing}
              className="inline-flex h-8 items-center gap-1.5 rounded-lg px-2 text-[11px] font-semibold text-slate-600 transition hover:bg-white hover:text-slate-900 disabled:cursor-wait focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-indigo-500"
              title={`Refresh data now. Last successful refresh: ${formatRefreshTime(lastRefreshed)}`}
            >
              <RefreshCw className={`h-3.5 w-3.5 ${refreshing ? 'animate-spin text-indigo-600' : ''}`} aria-hidden="true" />
              <span className="hidden lg:inline">{formatRefreshTime(lastRefreshed)}</span>
            </button>
          </div>

          <button
            id="header-add-device-btn"
            type="button"
            onClick={() => setIsAddModalOpen(true)}
            className="inline-flex h-10 items-center gap-1.5 rounded-xl bg-indigo-600 px-3 text-xs font-bold text-white shadow-[0_6px_14px_rgba(79,70,229,0.24)] transition hover:bg-indigo-700 hover:shadow-[0_8px_18px_rgba(79,70,229,0.3)] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-indigo-500 focus-visible:ring-offset-2 sm:px-3.5"
          >
            <Plus className="h-4 w-4" aria-hidden="true" />
            <span className="hidden sm:inline">Add computer</span>
            <span className="sr-only sm:hidden">Add computer</span>
          </button>

          <div className="relative">
            <button
              id="notifications-toggle-btn"
              type="button"
              onClick={() => {
                setShowNotifications(!showNotifications);
                setShowRoleMenu(false);
              }}
              className="relative inline-flex h-10 w-10 items-center justify-center rounded-xl text-slate-500 transition hover:bg-slate-100 hover:text-slate-900 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-indigo-500 focus-visible:ring-offset-2"
              aria-label={`Notifications${unreadNotificationCount ? `, ${unreadNotificationCount} unread` : ''}`}
              aria-expanded={showNotifications}
            >
              <Bell className="h-[18px] w-[18px]" aria-hidden="true" />
              {unreadNotificationCount > 0 && (
                <span className="absolute right-1 top-1 inline-flex min-h-4 min-w-4 items-center justify-center rounded-full border-2 border-white bg-rose-600 px-0.5 text-[9px] font-extrabold leading-none text-white">
                  {unreadNotificationCount > 9 ? '9+' : unreadNotificationCount}
                </span>
              )}
            </button>

            {showNotifications && (
              <div className="app-header-popover absolute right-0 mt-2 w-[min(24rem,calc(100vw-2rem))] overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-[0_24px_56px_rgba(15,23,42,0.18)]" role="dialog" aria-label="Notifications">
                <div className="flex items-center justify-between border-b border-slate-100 px-4 py-3">
                  <div>
                    <p className="text-xs font-bold text-slate-950">Notifications</p>
                    <p className="mt-0.5 text-[11px] text-slate-500">System alerts and workflow activity</p>
                  </div>
                  {unreadNotificationCount > 0 && (
                    <button
                      type="button"
                      onClick={markAllNotificationsRead}
                      className="rounded-lg px-2 py-1 text-[11px] font-bold text-indigo-700 transition hover:bg-indigo-50 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-indigo-500"
                    >
                      Mark all read
                    </button>
                  )}
                </div>

                <div className="max-h-[min(22rem,calc(100vh-11rem))] divide-y divide-slate-100 overflow-y-auto">
                  {notifications.length === 0 ? (
                    <div className="px-5 py-10 text-center">
                      <Bell className="mx-auto h-5 w-5 text-slate-300" aria-hidden="true" />
                      <p className="mt-2 text-xs font-semibold text-slate-600">No notifications yet</p>
                      <p className="mt-1 text-[11px] leading-relaxed text-slate-400">New alert, incident, and assignment activity will appear here.</p>
                    </div>
                  ) : (
                    notifications.map((notification) => (
                      <button
                        key={notification.id}
                        type="button"
                        onClick={() => {
                          markNotificationRead(notification.id);
                          if (notification.deviceId) {
                            setSelectedDeviceId(notification.deviceId);
                            setActiveTab('devices');
                          }
                          setShowNotifications(false);
                        }}
                        className={`flex w-full items-start gap-3 px-4 py-3 text-left transition hover:bg-slate-50 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-indigo-500 ${
                          !notification.isRead ? 'bg-indigo-50/45' : ''
                        }`}
                      >
                        <span className={`mt-1.5 h-2 w-2 shrink-0 rounded-full ${
                          notification.type === 'critical' ? 'bg-rose-500' :
                          notification.type === 'warning' ? 'bg-amber-500' :
                          notification.type === 'ticket' ? 'bg-violet-500' :
                          notification.type === 'offline' ? 'bg-slate-500' : 'bg-sky-500'
                        }`} aria-hidden="true" />
                        <span className="min-w-0 flex-1">
                          <span className="block text-xs font-semibold text-slate-900">{notification.title}</span>
                          <span className="mt-0.5 block line-clamp-2 text-[11px] leading-relaxed text-slate-600">{notification.message}</span>
                          <span className="mt-1.5 flex items-center gap-1 text-[10px] text-slate-400">
                            <Clock3 className="h-3 w-3" aria-hidden="true" />
                            {new Date(notification.createdAt).toLocaleString()}
                          </span>
                        </span>
                      </button>
                    ))
                  )}
                </div>
              </div>
            )}
          </div>

          <div className="relative">
            <button
              id="user-role-menu-btn"
              type="button"
              onClick={() => {
                setShowRoleMenu(!showRoleMenu);
                setShowNotifications(false);
              }}
              className="inline-flex h-10 items-center gap-2 rounded-xl border border-slate-200 bg-white p-1.5 pr-2 shadow-sm transition hover:border-slate-300 hover:bg-slate-50 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-indigo-500 focus-visible:ring-offset-2 sm:pl-2 sm:pr-2.5"
              aria-label="Account menu"
              aria-expanded={showRoleMenu}
            >
              <span className="inline-flex h-7 w-7 items-center justify-center rounded-lg bg-indigo-100 text-xs font-extrabold text-indigo-700">
                {user?.fullName?.trim().charAt(0).toUpperCase() || 'A'}
              </span>
              <span className="hidden min-w-0 text-left sm:block">
                <span className="block max-w-36 truncate text-xs font-bold text-slate-900">{user?.fullName}</span>
                <span className="block max-w-36 truncate text-[10px] capitalize text-slate-500">{user?.role?.replace('_', ' ')}</span>
              </span>
              <ChevronDown className="hidden h-3.5 w-3.5 text-slate-400 sm:block" aria-hidden="true" />
            </button>

            {showRoleMenu && (
              <div className="app-header-popover absolute right-0 mt-2 w-64 overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-[0_24px_56px_rgba(15,23,42,0.18)]" role="dialog" aria-label="Account menu">
                <div className="border-b border-slate-100 px-4 py-3">
                  <p className="text-[10px] font-bold uppercase tracking-[0.12em] text-slate-400">Signed in as</p>
                  <p className="mt-1 truncate text-xs font-bold text-slate-900">{user?.fullName}</p>
                  <p className="mt-0.5 truncate text-[11px] text-slate-500">{user?.email}</p>
                  <p className="mt-2 inline-flex rounded-md bg-slate-100 px-1.5 py-0.5 text-[10px] font-bold capitalize text-slate-600">{user?.role?.replace('_', ' ')}</p>
                </div>
                <div className="p-1.5">
                  <button
                    type="button"
                    onClick={() => {
                      setShowRoleMenu(false);
                      logout();
                    }}
                    className="flex w-full items-center gap-2 rounded-xl px-3 py-2 text-left text-xs font-bold text-rose-700 transition hover:bg-rose-50 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-rose-500"
                  >
                    <LogOut className="h-3.5 w-3.5" aria-hidden="true" />
                    Sign out
                  </button>
                </div>
              </div>
            )}
          </div>
        </div>
      </div>
    </header>
  );
};
