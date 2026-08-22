import React, { useState, useEffect } from 'react';
import { 
  ArrowLeft, 
  Cpu, 
  Activity, 
  HardDrive, 
  Thermometer, 
  BatteryCharging, 
  Wifi, 
  Clock, 
  Server, 
  User, 
  MapPin, 
  Wrench, 
  AlertTriangle, 
  Download, 
  Trash2, 
  CheckCircle2, 
  Sparkles, 
  ShieldAlert, 
  Info,
  Layers,
  Terminal,
  RefreshCw,
  Plus,
  ScreenShare
} from 'lucide-react';
import { Device, DiagnosticIssue, RepairTicket, MaintenanceRecord } from '../../types/index';
import { StatusBadge, SeverityBadge } from '../common/Badge';
import { useMonitoring } from '../../context/MonitoringContext';
import { useAuth } from '../../context/AuthContext';
import { NetworkDiagnosticsPanel } from './NetworkDiagnosticsPanel';

interface DeviceDetailsViewProps {
  deviceId: string;
  onBack: () => void;
  onCreateTicketForDevice?: (device: Device, issue?: DiagnosticIssue) => void;
  onLogMaintenanceForDevice?: (device: Device) => void;
}

export const DeviceDetailsView: React.FC<DeviceDetailsViewProps> = ({
  deviceId,
  onBack,
  onCreateTicketForDevice,
  onLogMaintenanceForDevice
}) => {
  const { 
    devices, 
    refreshData, 
    setIsInstallModalOpen, 
    setInstallTargetDevice
  } = useMonitoring();
  const { user } = useAuth();

  const [device, setDevice] = useState<Device | null>(null);
  const [deviceIssues, setDeviceIssues] = useState<DiagnosticIssue[]>([]);
  const [deviceTickets, setDeviceTickets] = useState<RepairTicket[]>([]);
  const [deviceMaintenance, setDeviceMaintenance] = useState<MaintenanceRecord[]>([]);
  const [activeTab, setActiveTab] = useState<'telemetry' | 'network' | 'hardware' | 'processes' | 'issues' | 'tickets' | 'maintenance'>('telemetry');
  const [loading, setLoading] = useState<boolean>(true);
  const [deleting, setDeleting] = useState<boolean>(false);

  useEffect(() => {
    fetchDeviceData();
  }, [deviceId, devices]);

  const fetchDeviceData = async () => {
    try {
      const [devRes, issRes, ticRes, maiRes] = await Promise.all([
        fetch(`/api/devices/${deviceId}`),
        fetch(`/api/diagnostics/issues?deviceId=${deviceId}`),
        fetch(`/api/tickets?deviceId=${deviceId}`),
        fetch(`/api/maintenance?deviceId=${deviceId}`)
      ]);

      if (devRes.ok) setDevice(await devRes.json());
      if (issRes.ok) setDeviceIssues(await issRes.json());
      if (ticRes.ok) setDeviceTickets(await ticRes.json());
      if (maiRes.ok) setDeviceMaintenance(await maiRes.json());
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  const handleDeleteDevice = async () => {
    if (!device) return;
    if (!confirm(`Are you sure you want to delete ${device.deviceName} (${device.assetId})? This will permanently remove its telemetry history.`)) {
      return;
    }

    setDeleting(true);
    try {
      const res = await fetch(`/api/devices/${device.id}`, { method: 'DELETE' });
      if (res.ok) {
        await refreshData();
        onBack();
      }
    } catch (err) {
      console.error(err);
    } finally {
      setDeleting(false);
    }
  };

  const formatBytes = (bytes?: number) => {
    if (!bytes) return '0 GB';
    return `${(bytes / (1024 ** 3)).toFixed(1)} GB`;
  };

  const handleRemoteSupport = async () => {
    if (!device) return;
    const reason = prompt(`Remote support for ${device.deviceName}: enter the support reason for the audit log.`);
    if (!reason?.trim()) return;
    if (!confirm('Confirm that you are authorized to access this computer and that the user or organization has approved remote support.')) return;
    try {
      const response = await fetch(`/api/devices/${device.id}/remote-session`, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ reason, authorized: true }) });
      const result = await response.json();
      if (!response.ok) throw new Error(result.error || 'Remote session could not be started.');
      window.location.href = result.rdpUri;
      setTimeout(() => alert(`If Remote Desktop did not open, run: ${result.manualCommand}\n\n${result.note}`), 700);
    } catch (error) {
      alert(error instanceof Error ? error.message : 'Remote session could not be started.');
    }
  };

  /* const handleSafeShutdown = async () => {
    if (!device || !confirm(`Request a safety shutdown for ${device.deviceName}? The computer will show a 60-second warning and its local user can cancel with shutdown /a.`)) return;
    setShutdownPending(true);
    try {
      const res = await fetch(`/api/devices/${device.id}/shutdown`, {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ reason: 'Building safety shutdown requested by IT.' })
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Unable to request shutdown.');
      alert('Safety shutdown queued. The connected agent will show a 60-second warning before powering off.');
    } catch (err) {
      alert(err instanceof Error ? err.message : 'Unable to request shutdown.');
    } finally {
      setShutdownPending(false);
    }
  };

  const handlePowerProfile = async (profile: 'balanced' | 'high_performance') => {
    if (!device) return;
    const label = profile === 'high_performance' ? 'High Performance' : 'Balanced';
    if (!confirm(`Apply the ${label} power profile to ${device.deviceName}? High Performance can increase heat and battery use.`)) return;
    try {
      const res = await fetch(`/api/devices/${device.id}/power-profile`, {
        method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ profile })
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Unable to update the power profile.');
      alert(`${label} profile queued. The connected agent will apply it within about 10 seconds.`);
    } catch (err) {
      alert(err instanceof Error ? err.message : 'Unable to update the power profile.');
    }
  }; */

  // Remote power commands are intentionally not exposed until the agent has a
  // signed command channel and acknowledgement protocol. The associated UI is
  // disabled below rather than pretending a browser action reaches a device.
  const shutdownPending = false;
  const handleSafeShutdown = () => undefined;
  const handlePowerProfile = (_profile: 'balanced' | 'high_performance') => undefined;

  const formatNetworkRate = (bytesPerSecond?: number | null) =>
    bytesPerSecond === undefined || bytesPerSecond === null ? 'Unavailable' : `${((bytesPerSecond * 8) / 1_000_000).toFixed(2)} Mbps`;

  const formatLastHeartbeat = (iso?: string) => {
    if (!iso) return 'Never connected';
    const seconds = Math.round((Date.now() - new Date(iso).getTime()) / 1000);
    if (seconds < 15) return 'Just now (Live Signal)';
    if (seconds < 60) return `${seconds}s ago`;
    const mins = Math.floor(seconds / 60);
    if (mins < 60) return `${mins}m ago`;
    return `${Math.floor(mins / 60)}h ago`;
  };

  if (loading || !device) {
    return (
      <div className="p-12 text-center text-slate-400">
        <RefreshCw className="w-8 h-8 animate-spin mx-auto mb-2 text-indigo-600" />
        <p className="text-xs">Loading hardware telemetry and diagnostic profile...</p>
      </div>
    );
  }

  const tel = device.latestTelemetry;
  const specs = device.specs;
  const canViewNetworkDiagnostics = user?.role === 'super_admin' || user?.role === 'it_admin' || user?.role === 'technician';

  return (
    <div className="space-y-4">
      
      {/* Top Navigation Bar */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 bg-white p-4 rounded-xl border border-slate-200 shadow-xs">
        <div className="flex items-center gap-3">
          <button
            onClick={onBack}
            className="p-2 rounded-lg bg-slate-100 hover:bg-slate-200 text-slate-700 transition-colors"
            title="Back to inventory"
          >
            <ArrowLeft className="w-4 h-4" />
          </button>
          <div>
            <div className="flex items-center gap-2.5">
              <h2 className="text-lg font-black text-slate-900">{device.deviceName}</h2>
              <StatusBadge status={device.status} size="md" />
            </div>
            <p className="text-xs text-slate-500 font-mono">
              Asset ID: <span className="font-bold text-slate-700">{device.assetId}</span> • Form Factor: <span className="font-semibold">{device.deviceType}</span>
            </p>
          </div>
        </div>

        {/* Action Buttons */}
        <div className="flex flex-wrap items-center gap-2">
          {/* Connect / Agent Guide */}
          <button
            onClick={() => {
              setInstallTargetDevice(device);
              setIsInstallModalOpen(true);
            }}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold bg-slate-100 text-slate-700 hover:bg-slate-200 transition-colors"
          >
            <Download className="w-3.5 h-3.5" />
            <span>Agent Setup ({device.registrationCode})</span>
          </button>

          {(user?.role === 'super_admin' || user?.role === 'it_admin' || user?.role === 'technician') && (
            <button
              onClick={handleRemoteSupport}
              disabled={device.connectionState !== 'connected'}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-bold bg-emerald-600 text-white hover:bg-emerald-700 disabled:bg-slate-200 disabled:text-slate-500 transition-colors"
              title="Launch Microsoft Remote Desktop after an authorized, audited request"
            >
              <ScreenShare className="w-3.5 h-3.5" />
              <span>Remote Support</span>
            </button>
          )}

          {/* Log Maintenance */}
          {user?.role !== 'viewer' && (
            <button
              onClick={() => onLogMaintenanceForDevice && onLogMaintenanceForDevice(device)}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold bg-purple-50 text-purple-700 border border-purple-200 hover:bg-purple-100 transition-colors"
            >
              <Wrench className="w-3.5 h-3.5 text-purple-600" />
              <span>Log Maintenance</span>
            </button>
          )}

          {false && (
            <button
              onClick={handleSafeShutdown}
              disabled={shutdownPending || device.status !== 'Online'}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-bold bg-amber-50 text-amber-800 border border-amber-300 hover:bg-amber-100 disabled:opacity-50 transition-colors"
              title="Shows a 60-second local warning before shutdown"
            >
              <AlertTriangle className="w-3.5 h-3.5" />
              <span>{shutdownPending ? 'Queuing…' : 'Safety Shutdown'}</span>
            </button>
          )}

          {false && (
            <div className="flex items-center rounded-lg border border-slate-200 overflow-hidden text-xs font-semibold">
              <button onClick={() => handlePowerProfile('balanced')} disabled={device.status !== 'Online'} className="px-2.5 py-1.5 text-slate-700 hover:bg-slate-100 disabled:opacity-50">Balanced</button>
              <button onClick={() => handlePowerProfile('high_performance')} disabled={device.status !== 'Online'} className="px-2.5 py-1.5 bg-indigo-600 text-white hover:bg-indigo-700 disabled:opacity-50">High Performance</button>
            </div>
          )}

          {/* Create Repair Ticket */}
          {user?.role !== 'viewer' && (
            <button
              onClick={() => onCreateTicketForDevice && onCreateTicketForDevice(device)}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-bold bg-indigo-600 text-white hover:bg-indigo-700 transition-all shadow-xs"
            >
              <Plus className="w-3.5 h-3.5" />
              <span>New Ticket</span>
            </button>
          )}

          {/* Delete Device (Admin only) */}
          {(user?.role === 'super_admin' || user?.role === 'it_admin') && (
            <button
              onClick={handleDeleteDevice}
              disabled={deleting}
              className="p-2 text-rose-500 hover:bg-rose-50 rounded-lg transition-colors"
              title="Delete device"
            >
              <Trash2 className="w-4 h-4" />
            </button>
          )}
        </div>
      </div>

      {/* Overview Quick Stats Ribbon */}
      <div className="grid grid-cols-2 sm:grid-cols-4 lg:grid-cols-6 gap-2.5">
        <div className="bg-white p-3 rounded-xl border border-indigo-200 shadow-xs">
          <p className="text-[10px] text-slate-400 font-bold uppercase">Health Score</p>
          <p className="text-xs font-bold text-indigo-700 truncate mt-0.5">{device.health?.score ?? 'Unavailable'}{device.health?.score !== null && device.health?.score !== undefined ? '/100' : ''}</p>
          <p className="text-[10px] text-slate-500 truncate">{device.health?.level || 'Awaiting telemetry'}</p>
        </div>
        <div className="bg-white p-3 rounded-xl border border-slate-200 shadow-xs">
          <p className="text-[10px] text-slate-400 font-bold uppercase">Assigned User</p>
          <p className="text-xs font-bold text-slate-800 truncate mt-0.5">{device.assignedUser || 'Unassigned'}</p>
        </div>

        <div className="bg-white p-3 rounded-xl border border-slate-200 shadow-xs">
          <p className="text-[10px] text-slate-400 font-bold uppercase">Operating System</p>
          <p className="text-xs font-bold text-slate-800 truncate mt-0.5">{device.operatingSystem}</p>
        </div>

        <div className="bg-white p-3 rounded-xl border border-slate-200 shadow-xs">
          <p className="text-[10px] text-slate-400 font-bold uppercase">IP Address</p>
          <p className="text-xs font-bold font-mono text-slate-800 truncate mt-0.5">{device.ipAddress || 'Waiting...'}</p>
        </div>

        <div className="bg-white p-3 rounded-xl border border-slate-200 shadow-xs">
          <p className="text-[10px] text-slate-400 font-bold uppercase">MAC Address</p>
          <p className="text-xs font-bold font-mono text-slate-800 truncate mt-0.5">{device.macAddress || 'Waiting...'}</p>
        </div>

        <div className="bg-white p-3 rounded-xl border border-slate-200 shadow-xs">
          <p className="text-[10px] text-slate-400 font-bold uppercase">Last Heartbeat</p>
          <p className="text-xs font-bold text-slate-800 truncate mt-0.5">{formatLastHeartbeat(device.lastHeartbeatAt)}</p>
        </div>

        <div className="bg-white p-3 rounded-xl border border-slate-200 shadow-xs">
          <p className="text-[10px] text-slate-400 font-bold uppercase">Uptime</p>
          <p className="text-xs font-bold text-slate-800 truncate mt-0.5">
            {tel?.uptimeSeconds ? `${(tel.uptimeSeconds / 3600).toFixed(1)} hrs` : 'N/A'}
          </p>
        </div>
      </div>

      {/* Waiting for Agent Banner if not connected */}
      {device.status === 'Waiting for Agent Connection' && (
        <div className="bg-sky-50 border border-sky-200 rounded-xl p-4 text-sky-900 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3">
          <div>
            <h4 className="text-sm font-bold flex items-center gap-2">
              <Clock className="w-4 h-4 text-sky-600" />
              Waiting for Agent Installation on Physical Computer
            </h4>
            <p className="text-xs text-sky-700 mt-1">
              Use registration code <strong className="font-mono bg-white px-2 py-0.5 rounded border border-sky-200">{device.registrationCode}</strong> on the physical machine to transmit live telemetry.
            </p>
          </div>
          <button
            onClick={() => {
              setInstallTargetDevice(device);
              setIsInstallModalOpen(true);
            }}
            className="px-3.5 py-1.5 rounded-lg bg-sky-600 text-white text-xs font-bold hover:bg-sky-700 transition-colors shrink-0"
          >
            Open Setup Commands
          </button>
        </div>
      )}

      {/* Tabs Navigation */}
      <div className="flex items-center gap-1.5 overflow-x-auto border-b border-slate-200 bg-white px-3 pt-2 rounded-t-xl [&>button]:shrink-0">
        <button
          onClick={() => setActiveTab('telemetry')}
          className={`flex items-center gap-2 px-3.5 py-2 text-xs font-bold border-b-2 transition-all ${
            activeTab === 'telemetry' ? 'border-indigo-600 text-indigo-600' : 'border-transparent text-slate-500 hover:text-slate-900'
          }`}
        >
          <Activity className="w-4 h-4" />
          <span>Live Telemetry & Sensors</span>
        </button>

        {canViewNetworkDiagnostics && (
          <button
            onClick={() => setActiveTab('network')}
            className={`flex items-center gap-2 px-3.5 py-2 text-xs font-bold border-b-2 transition-all ${
              activeTab === 'network' ? 'border-indigo-600 text-indigo-600' : 'border-transparent text-slate-500 hover:text-slate-900'
            }`}
          >
            <Wifi className="w-4 h-4" />
            <span>Wi-Fi Diagnostics</span>
          </button>
        )}

        <button
          onClick={() => setActiveTab('hardware')}
          className={`flex items-center gap-2 px-3.5 py-2 text-xs font-bold border-b-2 transition-all ${
            activeTab === 'hardware' ? 'border-indigo-600 text-indigo-600' : 'border-transparent text-slate-500 hover:text-slate-900'
          }`}
        >
          <Server className="w-4 h-4" />
          <span>Hardware Specifications</span>
        </button>

        <button
          onClick={() => setActiveTab('processes')}
          className={`flex items-center gap-2 px-3.5 py-2 text-xs font-bold border-b-2 transition-all ${
            activeTab === 'processes' ? 'border-indigo-600 text-indigo-600' : 'border-transparent text-slate-500 hover:text-slate-900'
          }`}
        >
          <Terminal className="w-4 h-4" />
          <span>Active Processes ({tel?.topProcesses?.length || 0})</span>
        </button>

        <button
          onClick={() => setActiveTab('issues')}
          className={`flex items-center gap-2 px-3.5 py-2 text-xs font-bold border-b-2 transition-all ${
            activeTab === 'issues' ? 'border-indigo-600 text-indigo-600' : 'border-transparent text-slate-500 hover:text-slate-900'
          }`}
        >
          <AlertTriangle className="w-4 h-4" />
          <span>Detected Findings</span>
          {deviceIssues.filter(i => i.status === 'Active').length > 0 && (
            <span className="px-1.5 py-0.2 rounded text-[10px] font-bold bg-rose-500 text-white">
              {deviceIssues.filter(i => i.status === 'Active').length}
            </span>
          )}
        </button>

        <button
          onClick={() => setActiveTab('tickets')}
          className={`flex items-center gap-2 px-3.5 py-2 text-xs font-bold border-b-2 transition-all ${
            activeTab === 'tickets' ? 'border-indigo-600 text-indigo-600' : 'border-transparent text-slate-500 hover:text-slate-900'
          }`}
        >
          <Wrench className="w-4 h-4" />
          <span>Repair Tickets ({deviceTickets.length})</span>
        </button>

        <button
          onClick={() => setActiveTab('maintenance')}
          className={`flex items-center gap-2 px-3.5 py-2 text-xs font-bold border-b-2 transition-all ${
            activeTab === 'maintenance' ? 'border-indigo-600 text-indigo-600' : 'border-transparent text-slate-500 hover:text-slate-900'
          }`}
        >
          <CheckCircle2 className="w-4 h-4" />
          <span>Maintenance Log ({deviceMaintenance.length})</span>
        </button>
      </div>

      {/* Tab 1: Live Telemetry & Sensors */}
      {activeTab === 'telemetry' && (
        <div className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-3.5">
            
            {/* CPU Gauge Card */}
            <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-xs space-y-3">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <Cpu className="w-4 h-4 text-indigo-600" />
                  <h4 className="text-xs font-bold text-slate-900">CPU Utilization</h4>
                </div>
                <span className={`text-xs font-extrabold ${
                  (tel?.cpuUsagePercent || 0) > 85 ? 'text-rose-600' : 
                  (tel?.cpuUsagePercent || 0) > 70 ? 'text-amber-600' : 'text-slate-800'
                }`}>
                  {tel ? `${tel.cpuUsagePercent}%` : 'No signal'}
                </span>
              </div>

              {/* Progress bar */}
              <div className="w-full h-2.5 bg-slate-100 rounded-full overflow-hidden">
                <div 
                  className={`h-full transition-all duration-500 rounded-full ${
                    (tel?.cpuUsagePercent || 0) > 85 ? 'bg-rose-500' : 
                    (tel?.cpuUsagePercent || 0) > 70 ? 'bg-amber-500' : 'bg-indigo-600'
                  }`}
                  style={{ width: `${tel?.cpuUsagePercent || 0}%` }}
                />
              </div>

              <div className="text-[11px] text-slate-500 space-y-1 pt-1 border-t border-slate-100">
                <div className="flex justify-between">
                  <span>Processor Model:</span>
                  <span className="font-semibold text-slate-700 truncate max-w-[140px]">{specs?.cpuModel || 'Intel / AMD'}</span>
                </div>
                <div className="flex justify-between">
                  <span>Cores / Threads:</span>
                  <span className="font-semibold text-slate-700">{specs?.cpuCores || '--'} Cores / {specs?.cpuThreads || '--'} Threads</span>
                </div>
                {tel?.cpuTempC && (
                  <div className="flex justify-between">
                    <span>Package Temp:</span>
                    <span className={`font-bold ${tel.cpuTempC > 80 ? 'text-rose-600' : 'text-slate-700'}`}>{tel.cpuTempC}°C</span>
                  </div>
                )}
              </div>
            </div>

            {/* RAM Gauge Card */}
            <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-xs space-y-3">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <Activity className="w-4 h-4 text-indigo-600" />
                  <h4 className="text-xs font-bold text-slate-900">RAM Memory</h4>
                </div>
                <span className={`text-xs font-extrabold ${
                  (tel?.ramUsagePercent || 0) > 90 ? 'text-rose-600' : 
                  (tel?.ramUsagePercent || 0) > 75 ? 'text-amber-600' : 'text-slate-800'
                }`}>
                  {tel ? `${tel.ramUsagePercent}%` : 'No signal'}
                </span>
              </div>

              {/* Progress bar */}
              <div className="w-full h-2.5 bg-slate-100 rounded-full overflow-hidden">
                <div 
                  className={`h-full transition-all duration-500 rounded-full ${
                    (tel?.ramUsagePercent || 0) > 90 ? 'bg-rose-500' : 
                    (tel?.ramUsagePercent || 0) > 75 ? 'bg-amber-500' : 'bg-indigo-600'
                  }`}
                  style={{ width: `${tel?.ramUsagePercent || 0}%` }}
                />
              </div>

              <div className="text-[11px] text-slate-500 space-y-1 pt-1 border-t border-slate-100">
                <div className="flex justify-between">
                  <span>Used Memory:</span>
                  <span className="font-semibold text-slate-700">{formatBytes(tel?.ramUsedBytes)}</span>
                </div>
                <div className="flex justify-between">
                  <span>Available Free:</span>
                  <span className="font-semibold text-slate-700">{formatBytes(tel?.ramFreeBytes)}</span>
                </div>
                <div className="flex justify-between">
                  <span>Total Capacity:</span>
                  <span className="font-semibold text-slate-700">{formatBytes(tel?.ramTotalBytes || specs?.totalRamBytes)} ({specs?.ramType || 'DDR4'})</span>
                </div>
              </div>
            </div>

            {/* Live Wi-Fi / network throughput */}
            <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-xs space-y-3">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <Wifi className="w-4 h-4 text-indigo-600" />
                  <h4 className="text-xs font-bold text-slate-900">Network Speed</h4>
                </div>
                <span className="text-xs font-extrabold text-emerald-600">Live</span>
              </div>
              <div className="text-[11px] text-slate-500 space-y-2 pt-1 border-t border-slate-100">
                <div className="flex justify-between gap-2">
                  <span>Download:</span>
                  <span className="font-bold text-slate-800">{formatNetworkRate(tel?.network?.bytesInPerSec)}</span>
                </div>
                <div className="flex justify-between gap-2">
                  <span>Upload:</span>
                  <span className="font-bold text-slate-800">{formatNetworkRate(tel?.network?.bytesOutPerSec)}</span>
                </div>
                <div className="pt-1 text-[10px] truncate" title={tel?.network?.adapterName || undefined}>
                  {tel?.network?.adapterName || 'Waiting for agent data'}
                </div>
              </div>
            </div>

            {/* Thermal & Temperature */}
            <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-xs space-y-3">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <Thermometer className="w-4 h-4 text-indigo-600" />
                  <h4 className="text-xs font-bold text-slate-900">Thermal Sensors</h4>
                </div>
                <span className={`text-xs font-extrabold ${
                  (tel?.cpuTempC || 0) > 82 ? 'text-rose-600' : 'text-slate-800'
                }`}>
                  {tel?.cpuTempC ? `${tel.cpuTempC}°C` : 'Nominal'}
                </span>
              </div>

              <div className="w-full h-2.5 bg-slate-100 rounded-full overflow-hidden">
                <div 
                  className={`h-full transition-all duration-500 rounded-full ${
                    (tel?.cpuTempC || 0) > 82 ? 'bg-rose-500' : 
                    (tel?.cpuTempC || 0) > 70 ? 'bg-amber-500' : 'bg-emerald-500'
                  }`}
                  style={{ width: `${Math.min(100, ((tel?.cpuTempC || 40) / 100) * 100)}%` }}
                />
              </div>

              <div className="text-[11px] text-slate-500 space-y-1 pt-1 border-t border-slate-100">
                <div className="flex justify-between">
                  <span>CPU Thermal State:</span>
                  <span className={`font-bold ${(tel?.cpuTempC || 0) > 80 ? 'text-rose-600' : 'text-emerald-600'}`}>
                    {(tel?.cpuTempC || 0) > 80 ? 'Thermal Warning' : 'Healthy Range'}
                  </span>
                </div>
                <div className="flex justify-between">
                  <span>Fan Status:</span>
                  <span className="font-semibold text-slate-700">Active (Auto PWM)</span>
                </div>
                {tel?.gpuTempC && (
                  <div className="flex justify-between">
                    <span>GPU Temp:</span>
                    <span className="font-semibold text-slate-700">{tel.gpuTempC}°C</span>
                  </div>
                )}
              </div>
            </div>

            {/* Battery / Power State */}
            <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-xs space-y-3">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <BatteryCharging className="w-4 h-4 text-indigo-600" />
                  <h4 className="text-xs font-bold text-slate-900">Power & Battery</h4>
                </div>
                <span className="text-xs font-extrabold text-slate-800">
                  {tel?.battery ? `${tel.battery.percent}%` : 'AC Powered'}
                </span>
              </div>

              <div className="w-full h-2.5 bg-slate-100 rounded-full overflow-hidden">
                <div 
                  className={`h-full transition-all duration-500 rounded-full ${
                    (tel?.battery?.percent || 100) < 15 ? 'bg-rose-500' : 'bg-emerald-500'
                  }`}
                  style={{ width: `${tel?.battery?.percent || 100}%` }}
                />
              </div>

              <div className="text-[11px] text-slate-500 space-y-1 pt-1 border-t border-slate-100">
                <div className="flex justify-between">
                  <span>Power Source:</span>
                  <span className="font-semibold text-slate-700">
                    {tel?.battery?.isCharging ? 'AC Adapter (Charging)' : tel?.battery ? 'Battery (Discharging)' : 'Direct AC Wall Outlet'}
                  </span>
                </div>
                <div className="flex justify-between">
                  <span>Battery Health:</span>
                  <span className="font-semibold text-emerald-700">{tel?.battery?.healthPercent ? `${tel.battery.healthPercent}% Capacity` : 'N/A (Desktop)'}</span>
                </div>
                <div className="flex justify-between">
                  <span>Power Plan:</span>
                  <span className="font-semibold text-slate-700">High Performance</span>
                </div>
              </div>
            </div>

          </div>

          {/* Storage Partitions Breakdown */}
          <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-xs space-y-3">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <HardDrive className="w-4 h-4 text-indigo-600" />
                <h4 className="text-xs font-bold text-slate-900">Logical Storage Volumes & Free Space</h4>
              </div>
              <span className="text-xs text-slate-500 font-mono">
                {tel?.storage?.length || specs?.storageDevices?.length || 0} Partition(s) Detected
              </span>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-3.5">
              {(tel?.storage || specs?.storageDevices || []).map((disk, idx) => {
                const freeGB = disk.freeBytes ? (disk.freeBytes / (1024 ** 3)).toFixed(1) : '0';
                const totalGB = disk.capacityBytes ? (disk.capacityBytes / (1024 ** 3)).toFixed(1) : '0';
                const usage = disk.usagePercent || 0;
                const isCriticalDisk = usage > 90;

                return (
                  <div key={idx} className="p-3.5 bg-slate-50 rounded-xl border border-slate-200 space-y-2.5">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        <div className="p-1.5 rounded-lg bg-white border border-slate-200 text-slate-700 font-mono text-xs font-bold">
                          {disk.driveLetter || disk.mountPoint || `Drive ${idx + 1}`}
                        </div>
                        <div>
                          <p className="text-xs font-bold text-slate-800">{disk.model || disk.fileSystem || 'Primary Partition'}</p>
                          <p className="text-[10px] text-slate-400 font-mono">{disk.busType || 'NVMe SSD'} • {disk.fileSystem || 'NTFS'}</p>
                        </div>
                      </div>
                      <div className="text-right">
                        <p className={`text-xs font-bold ${isCriticalDisk ? 'text-rose-600 font-black' : 'text-slate-800'}`}>
                          {usage}% Used
                        </p>
                        <p className="text-[10px] text-slate-500 font-mono">{freeGB} GB Free / {totalGB} GB</p>
                      </div>
                    </div>

                    {/* Usage bar */}
                    <div className="w-full h-2 bg-slate-200 rounded-full overflow-hidden">
                      <div 
                        className={`h-full transition-all duration-500 rounded-full ${
                          usage > 90 ? 'bg-rose-500' : usage > 80 ? 'bg-amber-500' : 'bg-indigo-600'
                        }`}
                        style={{ width: `${usage}%` }}
                      />
                    </div>

                    <div className="flex items-center justify-between text-[10px] text-slate-500 pt-1 border-t border-slate-200/60">
                      <span>S.M.A.R.T. Health Status:</span>
                      <span className="font-bold text-emerald-600 flex items-center gap-1">
                        <CheckCircle2 className="w-3 h-3" />
                        {disk.smartStatus || 'Healthy (PASSED)'}
                      </span>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        </div>
      )}

      {activeTab === 'network' && canViewNetworkDiagnostics && (
        <NetworkDiagnosticsPanel
          device={device}
          canRunDiagnostics={user?.role === 'super_admin' || user?.role === 'it_admin' || user?.role === 'technician'}
        />
      )}

      {/* Tab 2: Hardware Specifications */}
      {activeTab === 'hardware' && (
        <div className="bg-white p-5 rounded-xl border border-slate-200 shadow-xs space-y-4">
          <div className="flex items-center justify-between border-b border-slate-100 pb-3">
            <div>
              <h3 className="text-sm font-bold text-slate-900">Hardware & Firmware Configuration</h3>
              <p className="text-xs text-slate-500">Collected automatically via WMI / sysfs agent inspection.</p>
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 text-xs">
            {/* Processor */}
            <div className="p-3.5 bg-slate-50 rounded-xl border border-slate-200 space-y-1">
              <p className="text-[10px] font-bold text-slate-400 uppercase">Processor (CPU)</p>
              <p className="text-xs font-bold text-slate-900">{specs?.cpuModel || 'Generic x86_64'}</p>
              <p className="text-[11px] text-slate-500">
                {specs?.cpuCores || '--'} Physical Cores • {specs?.cpuThreads || '--'} Logical Threads @ {specs?.cpuMaxClockMhz ? `${(specs.cpuMaxClockMhz / 1000).toFixed(2)} GHz` : '3.6 GHz'}
              </p>
            </div>

            {/* Motherboard & BIOS */}
            <div className="p-3.5 bg-slate-50 rounded-xl border border-slate-200 space-y-1">
              <p className="text-[10px] font-bold text-slate-400 uppercase">Motherboard & BIOS</p>
              <p className="text-xs font-bold text-slate-900">{specs?.motherboardModel || 'OEM System Board'}</p>
              <p className="text-[11px] text-slate-500">
                Manufacturer: {specs?.motherboardManufacturer || 'System Vendor'} • BIOS: {specs?.biosVersion || '1.14.0'}
              </p>
            </div>

            {/* Memory Architecture */}
            <div className="p-3.5 bg-slate-50 rounded-xl border border-slate-200 space-y-1">
              <p className="text-[10px] font-bold text-slate-400 uppercase">Installed Memory (RAM)</p>
              <p className="text-xs font-bold text-slate-900">{formatBytes(specs?.totalRamBytes || tel?.ramTotalBytes)}</p>
              <p className="text-[11px] text-slate-500">
                Type: {specs?.ramType || 'DDR4'} • Slots Used: {specs?.ramSlotsUsed || 2} / {specs?.ramSlotsTotal || 4}
              </p>
            </div>

            {/* Graphics Card */}
            <div className="p-3.5 bg-slate-50 rounded-xl border border-slate-200 space-y-1">
              <p className="text-[10px] font-bold text-slate-400 uppercase">Graphics Processing (GPU)</p>
              <p className="text-xs font-bold text-slate-900">{specs?.gpuModel || 'Integrated Intel UHD / AMD Radeon'}</p>
              <p className="text-[11px] text-slate-500">
                VRAM: {specs?.gpuMemoryBytes ? formatBytes(specs.gpuMemoryBytes) : 'Shared System RAM'}
              </p>
            </div>

            {/* Network Interfaces */}
            <div className="p-3.5 bg-slate-50 rounded-xl border border-slate-200 space-y-1">
              <p className="text-[10px] font-bold text-slate-400 uppercase">Network Controller</p>
              <p className="text-xs font-bold text-slate-900">{device.ipAddress || '192.168.1.XX'}</p>
              <p className="text-[11px] font-mono text-slate-500">
                MAC: {device.macAddress || 'XX:XX:XX:XX:XX:XX'} (Gigabit Ethernet)
              </p>
            </div>

            {/* Serial & Chassis */}
            <div className="p-3.5 bg-slate-50 rounded-xl border border-slate-200 space-y-1">
              <p className="text-[10px] font-bold text-slate-400 uppercase">Chassis & Serial Tag</p>
              <p className="text-xs font-bold font-mono text-slate-900">{device.serialNumber || 'SN-UNKNOWN'}</p>
              <p className="text-[11px] text-slate-500">
                Manufacturer: {device.manufacturer || 'Dell Inc.'} • Model: {device.model || 'Workstation'}
              </p>
            </div>
          </div>
        </div>
      )}

      {/* Tab 3: Active Processes */}
      {activeTab === 'processes' && (
        <div className="bg-white rounded-xl border border-slate-200 shadow-xs overflow-hidden">
          <div className="p-4 border-b border-slate-200 bg-slate-50 flex items-center justify-between">
            <div>
              <h3 className="text-xs font-bold text-slate-900">Top Resource-Consuming Processes</h3>
              <p className="text-[11px] text-slate-500">Active tasks reported in real time by the agent.</p>
            </div>
            <span className="text-xs font-mono text-slate-500">{tel?.topProcesses?.length || 0} active processes</span>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead className="bg-slate-100/70 border-b border-slate-200 text-slate-600 font-bold uppercase text-[10px]">
                <tr>
                  <th className="py-2.5 px-4">PID</th>
                  <th className="py-2.5 px-4">Process Name</th>
                  <th className="py-2.5 px-4">CPU Usage</th>
                  <th className="py-2.5 px-4">Memory RSS</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {!tel?.topProcesses || tel.topProcesses.length === 0 ? (
                  <tr>
                    <td colSpan={4} className="py-8 text-center text-slate-400 text-xs">
                      No process telemetry received yet. Install or start the agent.
                    </td>
                  </tr>
                ) : (
                  tel.topProcesses.map((proc, i) => (
                    <tr key={i} className="hover:bg-slate-50">
                      <td className="py-2.5 px-4 font-mono text-slate-500">{proc.pid}</td>
                      <td className="py-2.5 px-4 font-bold text-slate-800">{proc.name}</td>
                      <td className="py-2.5 px-4">
                        <span className={`font-bold ${proc.cpuPercent > 30 ? 'text-rose-600' : 'text-slate-700'}`}>
                          {proc.cpuPercent.toFixed(1)}%
                        </span>
                      </td>
                      <td className="py-2.5 px-4 text-slate-600">
                        {proc.memoryMb ? `${proc.memoryMb.toFixed(1)} MB` : '--'}
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Tab 4: Detected Findings / Diagnostic Issues */}
      {activeTab === 'issues' && (
        <div className="space-y-3">
          <div className="flex items-center justify-between">
            <h3 className="text-xs font-bold text-slate-900">Automated Diagnostic Findings</h3>
            <span className="text-xs text-slate-500 font-medium">
              Evaluated against configurable system thresholds.
            </span>
          </div>

          {deviceIssues.length === 0 ? (
            <div className="bg-white p-8 rounded-xl border border-slate-200 text-center shadow-xs">
              <CheckCircle2 className="w-8 h-8 text-emerald-500 mx-auto mb-2" />
              <p className="text-sm font-bold text-slate-800">No active hardware or software issues detected</p>
              <p className="text-xs text-slate-500 mt-0.5">Telemetry metrics are within healthy nominal limits.</p>
            </div>
          ) : (
            <div className="space-y-3">
              {deviceIssues.map(issue => (
                <div 
                  key={issue.id} 
                  className={`p-4 rounded-xl border bg-white shadow-xs space-y-3 ${
                    issue.status === 'Active' && issue.severity === 'Critical' ? 'border-rose-300 ring-1 ring-rose-200' :
                    issue.status === 'Active' && issue.severity === 'High' ? 'border-amber-300 ring-1 ring-amber-200' :
                    'border-slate-200'
                  }`}
                >
                  <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                    <div className="flex items-center gap-2.5">
                      <SeverityBadge severity={issue.severity} />
                      <h4 className="text-xs font-bold text-slate-900">{issue.title}</h4>
                      <StatusBadge status={issue.status} size="sm" />
                    </div>
                    <span className="text-[11px] text-slate-400 font-mono">
                      Detected: {new Date(issue.detectedAt).toLocaleString()}
                    </span>
                  </div>

                  <p className="text-xs text-slate-700">{issue.description}</p>

                  {/* Evidence Box */}
                  <div className="bg-slate-50 p-3 rounded-lg border border-slate-200 text-xs space-y-1">
                    <p className="font-bold text-slate-800 text-[11px] uppercase tracking-wider">Telemetry Evidence:</p>
                    <div className="grid grid-cols-1 sm:grid-cols-3 gap-2 font-mono text-[11px]">
                      <div>Metric: <strong className="text-slate-800">{issue.evidence.metricName}</strong></div>
                      <div>Triggered Value: <strong className="text-rose-600">{issue.evidence.currentValue}</strong></div>
                      <div>Threshold: <strong className="text-slate-700">{issue.evidence.thresholdValue}</strong></div>
                    </div>
                  </div>

                  {/* Recommended Action & Create Ticket */}
                  <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-2 pt-2 border-t border-slate-100">
                    <p className="text-[11px] text-indigo-700">
                      💡 <strong>Recommended Action:</strong> {issue.recommendedAction || 'Inspect running services and check cooling/storage.'}
                    </p>
                    
                    {issue.status === 'Active' && (
                      <button
                        onClick={() => onCreateTicketForDevice && onCreateTicketForDevice(device, issue)}
                        className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-bold transition-colors shadow-xs"
                      >
                        <Wrench className="w-3.5 h-3.5" />
                        Create Repair Ticket
                      </button>
                    )}
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {/* Tab 5: Repair Tickets for this Device */}
      {activeTab === 'tickets' && (
        <div className="space-y-3">
          <div className="flex items-center justify-between">
            <h3 className="text-xs font-bold text-slate-900">Incident & Repair Tickets</h3>
            <button
              onClick={() => onCreateTicketForDevice && onCreateTicketForDevice(device)}
              className="flex items-center gap-1 px-3 py-1.5 rounded-lg bg-indigo-600 text-white text-xs font-bold hover:bg-indigo-700 transition-colors shadow-xs"
            >
              <Plus className="w-3.5 h-3.5" />
              <span>Create Ticket</span>
            </button>
          </div>

          {deviceTickets.length === 0 ? (
            <div className="bg-white p-8 rounded-xl border border-slate-200 text-center shadow-xs">
              <Wrench className="w-8 h-8 text-slate-300 mx-auto mb-2" />
              <p className="text-sm font-bold text-slate-800">No repair tickets for this device</p>
              <p className="text-xs text-slate-500 mt-0.5">Create a ticket to assign a technician for hardware/software resolution.</p>
            </div>
          ) : (
            <div className="bg-white rounded-xl border border-slate-200 shadow-xs overflow-hidden">
              <table className="w-full text-left text-xs">
                <thead className="bg-slate-50 border-b border-slate-200 text-slate-600 font-bold uppercase text-[10px]">
                  <tr>
                    <th className="py-3 px-4">Ticket #</th>
                    <th className="py-3 px-4">Severity / Priority</th>
                    <th className="py-3 px-4">Problem Summary</th>
                    <th className="py-3 px-4">Assigned Tech</th>
                    <th className="py-3 px-4">Status</th>
                    <th className="py-3 px-4">Detected Date</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {deviceTickets.map(t => (
                    <tr key={t.id} className="hover:bg-slate-50">
                      <td className="py-3 px-4 font-mono font-bold text-indigo-600">{t.ticketNumber}</td>
                      <td className="py-3 px-4">
                        <div className="flex items-center gap-1.5">
                          <SeverityBadge severity={t.severity} size="sm" />
                          <span className="text-[10px] text-slate-500 font-semibold uppercase">[{t.priority}]</span>
                        </div>
                      </td>
                      <td className="py-3 px-4">
                        <p className="font-bold text-slate-900">{t.problem}</p>
                        <p className="text-[11px] text-slate-500 line-clamp-1">{t.diagnosis}</p>
                      </td>
                      <td className="py-3 px-4 text-slate-700">{t.assignedTechnicianName || 'Unassigned'}</td>
                      <td className="py-3 px-4">
                        <StatusBadge status={t.status} size="sm" />
                      </td>
                      <td className="py-3 px-4 text-slate-500">{new Date(t.detectedDate).toLocaleDateString()}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      )}

      {/* Tab 6: Maintenance History */}
      {activeTab === 'maintenance' && (
        <div className="space-y-3">
          <div className="flex items-center justify-between">
            <h3 className="text-xs font-bold text-slate-900">Historical Maintenance & Repair Log</h3>
            <button
              onClick={() => onLogMaintenanceForDevice && onLogMaintenanceForDevice(device)}
              className="flex items-center gap-1 px-3 py-1.5 rounded-lg bg-purple-600 text-white text-xs font-bold hover:bg-purple-700 transition-colors shadow-xs"
            >
              <Plus className="w-3.5 h-3.5" />
              <span>Log Maintenance Action</span>
            </button>
          </div>

          {deviceMaintenance.length === 0 ? (
            <div className="bg-white p-8 rounded-xl border border-slate-200 text-center shadow-xs">
              <CheckCircle2 className="w-8 h-8 text-slate-300 mx-auto mb-2" />
              <p className="text-sm font-bold text-slate-800">No historical maintenance records yet</p>
              <p className="text-xs text-slate-500 mt-0.5">When repairs are resolved, maintenance records are automatically created for compliance audits.</p>
            </div>
          ) : (
            <div className="space-y-3">
              {deviceMaintenance.map(record => (
                <div key={record.id} className="p-4 bg-white rounded-xl border border-slate-200 shadow-xs space-y-2 text-xs">
                  <div className="flex items-center justify-between border-b border-slate-100 pb-2">
                    <span className="font-mono font-bold text-indigo-600">{record.recordNumber}</span>
                    <span className="text-slate-400 font-mono">{record.date}</span>
                  </div>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-2">
                    <div>
                      <p className="text-[10px] font-bold text-slate-400 uppercase">Problem Reported:</p>
                      <p className="text-slate-800 font-semibold">{record.problem}</p>
                    </div>
                    <div>
                      <p className="text-[10px] font-bold text-slate-400 uppercase">Action Performed by {record.technicianName}:</p>
                      <p className="text-slate-800">{record.actionPerformed}</p>
                    </div>
                  </div>
                  {record.partsReplaced && (
                    <p className="text-[11px] text-slate-600">
                      <strong>Parts Replaced:</strong> {record.partsReplaced}
                    </p>
                  )}
                  <div className="pt-1 flex items-center justify-between text-[11px]">
                    <span className="text-slate-500">Result: <strong className="text-emerald-700">{record.result}</strong></span>
                    {record.cost && <span className="font-mono font-bold text-slate-700">Cost: ${record.cost.toFixed(2)}</span>}
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

    </div>
  );
};
