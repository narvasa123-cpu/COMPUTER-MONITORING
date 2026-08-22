import React, { createContext, useContext, useState, useEffect, useCallback, useRef } from 'react';
import { Device, SystemNotification, DashboardSummary } from '../types/index';

interface MonitoringContextType {
  devices: Device[];
  summary: DashboardSummary | null;
  notifications: SystemNotification[];
  unreadNotificationCount: number;
  loading: boolean;
  error: string | null;
  isPolling: boolean;
  setIsPolling: (polling: boolean) => void;
  lastRefreshed: Date;
  refreshData: () => Promise<void>;
  markNotificationRead: (id: string) => Promise<void>;
  markAllNotificationsRead: () => Promise<void>;
  
  // Navigation & Modals
  activeTab: string;
  setActiveTab: (tab: string) => void;
  selectedDeviceId: string | null;
  setSelectedDeviceId: (id: string | null) => void;
  
  // Modals state
  isAddModalOpen: boolean;
  setIsAddModalOpen: (open: boolean) => void;
  isInstallModalOpen: boolean;
  setIsInstallModalOpen: (open: boolean) => void;
  installTargetDevice: Device | null;
  setInstallTargetDevice: (device: Device | null) => void;
  isRulesModalOpen: boolean;
  setIsRulesModalOpen: (open: boolean) => void;
}

const MonitoringContext = createContext<MonitoringContextType | undefined>(undefined);

export const MonitoringProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [devices, setDevices] = useState<Device[]>([]);
  const [summary, setSummary] = useState<DashboardSummary | null>(null);
  const [notifications, setNotifications] = useState<SystemNotification[]>([]);
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);
  const [isPolling, setIsPolling] = useState<boolean>(true);
  const [lastRefreshed, setLastRefreshed] = useState<Date>(new Date());
  const refreshInFlight = useRef(false);

  const [activeTab, setActiveTab] = useState<string>('dashboard');
  const [selectedDeviceId, setSelectedDeviceId] = useState<string | null>(null);

  const [isAddModalOpen, setIsAddModalOpen] = useState<boolean>(false);
  const [isInstallModalOpen, setIsInstallModalOpen] = useState<boolean>(false);
  const [installTargetDevice, setInstallTargetDevice] = useState<Device | null>(null);
  const [isRulesModalOpen, setIsRulesModalOpen] = useState<boolean>(false);

  const refreshData = useCallback(async () => {
    if (refreshInFlight.current) return;
    refreshInFlight.current = true;
    try {
      const [devRes, sumRes, notifRes] = await Promise.all([
        fetch('/api/devices'),
        fetch('/api/reports/summary'),
        fetch('/api/notifications')
      ]);

      if (!devRes.ok || !sumRes.ok || !notifRes.ok) {
        throw new Error('The monitoring service returned an unexpected response.');
      }

      const [devData, sumData, notifData] = await Promise.all([
        devRes.json(), sumRes.json(), notifRes.json()
      ]);
      setDevices(devData);
      setSummary(sumData);
      setNotifications(notifData);
      setError(null);

      setLastRefreshed(new Date());
    } catch (err) {
      console.warn('Background sync warning:', err);
      setError('Unable to reach the monitoring service. Data may be out of date.');
    } finally {
      setLoading(false);
      refreshInFlight.current = false;
    }
  }, []);

  useEffect(() => {
    refreshData();
  }, [refreshData]);

  // Polling loop every 3.5 seconds
  useEffect(() => {
    if (!isPolling) return;
    const interval = setInterval(() => {
      refreshData();
    }, 3500);
    return () => clearInterval(interval);
  }, [isPolling, refreshData]);

  const markNotificationRead = async (id: string) => {
    try {
      await fetch(`/api/notifications/${id}/read`, { method: 'POST' });
      setNotifications(prev => prev.map(n => n.id === id ? { ...n, isRead: true } : n));
    } catch (err) {
      console.error(err);
    }
  };

  const markAllNotificationsRead = async () => {
    try {
      await fetch('/api/notifications/read-all', { method: 'POST' });
      setNotifications(prev => prev.map(n => ({ ...n, isRead: true })));
    } catch (err) {
      console.error(err);
    }
  };

  const unreadNotificationCount = notifications.filter(n => !n.isRead).length;

  return (
    <MonitoringContext.Provider value={{
      devices,
      summary,
      notifications,
      unreadNotificationCount,
      loading,
      error,
      isPolling,
      setIsPolling,
      lastRefreshed,
      refreshData,
      markNotificationRead,
      markAllNotificationsRead,
      activeTab,
      setActiveTab,
      selectedDeviceId,
      setSelectedDeviceId,
      isAddModalOpen,
      setIsAddModalOpen,
      isInstallModalOpen,
      setIsInstallModalOpen,
      installTargetDevice,
      setInstallTargetDevice,
      isRulesModalOpen,
      setIsRulesModalOpen
    }}>
      {children}
    </MonitoringContext.Provider>
  );
};

export const useMonitoring = () => {
  const context = useContext(MonitoringContext);
  if (!context) {
    throw new Error('useMonitoring must be used within a MonitoringProvider');
  }
  return context;
};
