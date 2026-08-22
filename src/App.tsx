import React, { useState } from 'react';
import { AuthProvider, useAuth } from './context/AuthContext';
import { MonitoringProvider, useMonitoring } from './context/MonitoringContext';
import { Header } from './components/common/Header';
import { Sidebar } from './components/common/Sidebar';
import { DashboardView } from './components/dashboard/DashboardView';
import { DeviceList } from './components/devices/DeviceList';
import { DeviceDetailsView } from './components/devices/DeviceDetailsView';
import { DiagnosticsView } from './components/diagnostics/DiagnosticsView';
import { DiagnosticRulesModal } from './components/diagnostics/DiagnosticRulesModal';
import { TicketsView } from './components/tickets/TicketsView';
import { RepairTicketModal } from './components/tickets/RepairTicketModal';
import { MaintenanceView } from './components/maintenance/MaintenanceView';
import { AddMaintenanceModal } from './components/maintenance/AddMaintenanceModal';
import { LocationsView } from './components/locations/LocationsView';
import { DepartmentsView } from './components/departments/DepartmentsView';
import { UsersView } from './components/users/UsersView';
import { ReportsView } from './components/reports/ReportsView';
import { AuditLogsView } from './components/audit/AuditLogsView';
import { SettingsView } from './components/settings/SettingsView';
import { AddDeviceModal } from './components/devices/AddDeviceModal';
import { InstallAgentModal } from './components/devices/InstallAgentModal';
import { LoginView } from './components/auth/LoginView';
import { Device, DiagnosticIssue } from './types/index';

function MainAppLayout() {
  const { activeTab, setActiveTab, selectedDeviceId, setSelectedDeviceId, error, refreshData } = useMonitoring();

  // Cross-component Ticket and Maintenance modal handlers
  const [ticketModalTarget, setTicketModalTarget] = useState<{ device: Device | null; issue: DiagnosticIssue | null } | null>(null);
  const [maintenanceModalTarget, setMaintenanceModalTarget] = useState<Device | null>(null);

  const handleOpenCreateTicket = (device: Device, issue?: DiagnosticIssue) => {
    setTicketModalTarget({ device, issue: issue || null });
  };

  const handleOpenLogMaintenance = (device: Device) => {
    setMaintenanceModalTarget(device);
  };

  return (
    <div className="min-h-screen bg-slate-100/70 text-slate-800 flex flex-col font-sans antialiased">
      {/* Top Header */}
      <Header />

      {error && (
        <div className="mx-4 mt-4 sm:mx-6 lg:mx-8 flex items-center justify-between gap-3 rounded-md border border-amber-200 bg-amber-50 px-4 py-2 text-xs text-amber-900">
          <span>{error}</span>
          <button onClick={refreshData} className="shrink-0 font-bold underline underline-offset-2">Retry</button>
        </div>
      )}

      <div className="flex-1 flex overflow-hidden">
        {/* Navigation Sidebar */}
        <Sidebar />

        {/* Main Content Viewport */}
        <main className="flex-1 overflow-y-auto p-4 sm:p-6 lg:p-8 max-w-7xl w-full">
          {activeTab === 'dashboard' && (
            <DashboardView
              onSelectDevice={(id) => {
                setSelectedDeviceId(id);
                setActiveTab('devices');
              }}
            />
          )}

          {activeTab === 'devices' && (
            selectedDeviceId ? (
              <DeviceDetailsView
                deviceId={selectedDeviceId}
                onBack={() => setSelectedDeviceId(null)}
                onCreateTicketForDevice={handleOpenCreateTicket}
                onLogMaintenanceForDevice={handleOpenLogMaintenance}
              />
            ) : (
              <DeviceList
                onSelectDevice={(id) => setSelectedDeviceId(id)}
              />
            )
          )}

          {activeTab === 'diagnostics' && (
            <DiagnosticsView
              onCreateTicketForDevice={handleOpenCreateTicket}
              onSelectDevice={(id) => {
                setSelectedDeviceId(id);
                setActiveTab('devices');
              }}
            />
          )}

          {activeTab === 'tickets' && (
            <TicketsView
              onSelectDevice={(id) => {
                setSelectedDeviceId(id);
                setActiveTab('devices');
              }}
            />
          )}

          {activeTab === 'maintenance' && (
            <MaintenanceView
              onSelectDevice={(id) => {
                setSelectedDeviceId(id);
                setActiveTab('devices');
              }}
            />
          )}

          {activeTab === 'locations' && <LocationsView />}
          {activeTab === 'departments' && <DepartmentsView />}
          {activeTab === 'users' && <UsersView />}
          {activeTab === 'reports' && <ReportsView />}
          {activeTab === 'audit' && <AuditLogsView />}
          {activeTab === 'settings' && <SettingsView />}
        </main>
      </div>

      {/* Global Modals */}
      <AddDeviceModal />
      <InstallAgentModal />
      <DiagnosticRulesModal />

      {/* Dynamic Ticket and Maintenance Modals */}
      {ticketModalTarget && (
        <RepairTicketModal
          isOpen={!!ticketModalTarget}
          onClose={() => setTicketModalTarget(null)}
          targetDevice={ticketModalTarget.device}
          targetIssue={ticketModalTarget.issue}
        />
      )}

      {maintenanceModalTarget && (
        <AddMaintenanceModal
          isOpen={!!maintenanceModalTarget}
          onClose={() => setMaintenanceModalTarget(null)}
          targetDevice={maintenanceModalTarget}
        />
      )}
    </div>
  );
}

export default function App() {
  return (
    <AuthProvider>
      <AuthenticatedApp />
    </AuthProvider>
  );
}

function AuthenticatedApp() {
  const { user, loading } = useAuth();

  if (loading) {
    return <div className="min-h-screen bg-slate-100 grid place-items-center text-sm text-slate-500">Loading monitoring console...</div>;
  }
  if (!user) return <LoginView />;

  return (
    <MonitoringProvider>
      <MainAppLayout />
    </MonitoringProvider>
  );
}
