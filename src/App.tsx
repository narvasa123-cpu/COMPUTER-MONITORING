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
import { AgentUpdateModal } from './components/devices/AgentUpdateModal';
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
    <div className="min-h-screen bg-transparent text-slate-800 flex flex-col font-sans antialiased">
      {/* Top Header */}
      <Header />

      {error && (
        <div className="mx-4 mt-4 flex items-center justify-between gap-3 rounded-xl border border-amber-200 bg-amber-50 px-4 py-3 text-xs text-amber-900 shadow-sm sm:mx-6 lg:mx-8">
          <span>{error}</span>
          <button type="button" onClick={refreshData} className="shrink-0 rounded-lg px-2 py-1 font-bold underline underline-offset-2 transition hover:bg-amber-100">Retry</button>
        </div>
      )}

      <div className="flex min-h-0 flex-1 overflow-hidden">
        {/* Navigation Sidebar */}
        <Sidebar />

        {/* Main Content Viewport */}
        <main className="min-w-0 flex-1 overflow-y-auto p-4 sm:p-6 lg:p-8 xl:p-9">
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
      <AgentUpdateModal />
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
    return (
      <div className="grid min-h-screen place-items-center bg-[#f6f8fc] p-6 text-center">
        <div className="rounded-2xl border border-slate-200 bg-white px-6 py-5 shadow-sm">
          <p className="text-sm font-bold text-slate-800">Loading monitoring console...</p>
          <p className="mt-1 text-xs text-slate-500">Checking your authorized session.</p>
        </div>
      </div>
    );
  }
  if (!user) return <LoginView />;

  return (
    <MonitoringProvider>
      <MainAppLayout />
    </MonitoringProvider>
  );
}
