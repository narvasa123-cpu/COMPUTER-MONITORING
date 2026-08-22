import React from 'react';
import { 
  Monitor, 
  Wifi, 
  WifiOff, 
  AlertTriangle, 
  ShieldAlert, 
  Wrench, 
  Cpu, 
  Activity, 
  HardDrive, 
  Thermometer, 
  Clock, 
  Plus, 
  Download, 
  ExternalLink,
  ChevronRight,
  CheckCircle2
} from 'lucide-react';
import { useMonitoring } from '../../context/MonitoringContext';
import { StatusBadge, SeverityBadge } from '../common/Badge';

interface DashboardViewProps {
  onSelectDevice: (deviceId: string) => void;
}

export const DashboardView: React.FC<DashboardViewProps> = ({ onSelectDevice }) => {
  const { 
    summary, 
    devices, 
    setIsAddModalOpen, 
    setIsInstallModalOpen, 
    setActiveTab 
  } = useMonitoring();

  const problematicDevices = devices.filter(d => d.status === 'Critical' || d.status === 'Warning');
  const waitingDevices = devices.filter(d => d.status === 'Waiting for Agent Connection');

  return (
    <div className="space-y-4">
      
      {/* Top Banner with Quick Actions */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 bg-white p-4 rounded-xl border border-slate-200 shadow-xs">
        <div>
          <div className="flex items-center gap-2">
            <h2 className="text-lg font-black text-slate-900">IT Infrastructure Health & Telemetry Dashboard</h2>
          </div>
          <p className="text-xs text-slate-500">
            Real-time monitoring, automated anomaly diagnostics, and lifecycle incident management.
          </p>
          <p className="text-[11px] font-semibold text-slate-600 mt-1">
            Environment health: <span className="text-indigo-700">{summary?.overallHealthScore ?? 'Unavailable'}{summary?.overallHealthScore !== null && summary?.overallHealthScore !== undefined ? '/100' : ''}</span>
            <span className="font-normal text-slate-400"> · calculated only from received telemetry</span>
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          {/* Agent Setup Guide */}
          <button
            onClick={() => setIsInstallModalOpen(true)}
            className="flex items-center gap-1.5 px-3 py-2 rounded-lg text-xs font-semibold bg-slate-100 text-slate-700 hover:bg-slate-200 transition-colors"
          >
            <Download className="w-3.5 h-3.5" />
            <span>Agent Setup</span>
          </button>

          {/* Add Device */}
          <button
            id="dash-add-device-btn"
            onClick={() => setIsAddModalOpen(true)}
            className="flex items-center gap-1.5 px-3.5 py-2 rounded-lg text-xs font-bold bg-indigo-600 text-white hover:bg-indigo-700 transition-all shadow-xs"
          >
            <Plus className="w-4 h-4" />
            <span>+ Add Computer</span>
          </button>
        </div>
      </div>

      {/* 1. Primary Status KPI Cards */}
      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3">
        {/* Total */}
        <div 
          onClick={() => setActiveTab('devices')}
          className="bg-white p-3.5 rounded-xl border border-slate-200 hover:border-indigo-300 transition-all cursor-pointer shadow-xs group"
        >
          <div className="flex items-center justify-between">
            <span className="text-[10px] text-slate-400 font-bold uppercase">Total Computers</span>
            <Monitor className="w-4 h-4 text-slate-400 group-hover:text-indigo-600" />
          </div>
          <p className="text-2xl font-black text-slate-900 mt-1">{summary?.totalDevices || 0}</p>
          <p className="text-[10px] text-slate-400 mt-0.5">Inventory assets</p>
        </div>

        {/* Online */}
        <div 
          onClick={() => setActiveTab('devices')}
          className="bg-white p-3.5 rounded-xl border border-emerald-200 bg-emerald-50/20 hover:border-emerald-300 transition-all cursor-pointer shadow-xs group"
        >
          <div className="flex items-center justify-between">
            <span className="text-[10px] text-emerald-700 font-bold uppercase">Online & Live</span>
            <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
          </div>
          <p className="text-2xl font-black text-emerald-700 mt-1">{summary?.onlineDevices || 0}</p>
          <p className="text-[10px] text-emerald-600 mt-0.5">Transmitting heartbeats</p>
        </div>

        {/* Warning */}
        <div 
          onClick={() => setActiveTab('diagnostics')}
          className="bg-white p-3.5 rounded-xl border border-amber-200 bg-amber-50/20 hover:border-amber-300 transition-all cursor-pointer shadow-xs group"
        >
          <div className="flex items-center justify-between">
            <span className="text-[10px] text-amber-700 font-bold uppercase">Warning State</span>
            <AlertTriangle className="w-4 h-4 text-amber-500" />
          </div>
          <p className="text-2xl font-black text-amber-700 mt-1">{summary?.warningDevices || 0}</p>
          <p className="text-[10px] text-amber-600 mt-0.5">Degraded telemetry</p>
        </div>

        {/* Critical */}
        <div 
          onClick={() => setActiveTab('diagnostics')}
          className="bg-white p-3.5 rounded-xl border border-rose-200 bg-rose-50/20 hover:border-rose-300 transition-all cursor-pointer shadow-xs group"
        >
          <div className="flex items-center justify-between">
            <span className="text-[10px] text-rose-700 font-bold uppercase">Critical Faults</span>
            <span className="w-2 h-2 rounded-full bg-rose-500 animate-ping" />
          </div>
          <p className="text-2xl font-black text-rose-700 mt-1">{summary?.criticalDevices || 0}</p>
          <p className="text-[10px] text-rose-600 mt-0.5">Thresholds violated</p>
        </div>

        {/* Offline */}
        <div 
          onClick={() => setActiveTab('devices')}
          className="bg-white p-3.5 rounded-xl border border-slate-200 hover:border-slate-300 transition-all cursor-pointer shadow-xs group"
        >
          <div className="flex items-center justify-between">
            <span className="text-[10px] text-slate-500 font-bold uppercase">Offline</span>
            <WifiOff className="w-4 h-4 text-slate-400" />
          </div>
          <p className="text-2xl font-black text-slate-700 mt-1">{summary?.offlineDevices || 0}</p>
          <p className="text-[10px] text-slate-400 mt-0.5">Heartbeat timeout</p>
        </div>

        {/* Waiting for Agent */}
        <div 
          onClick={() => setActiveTab('devices')}
          className="bg-white p-3.5 rounded-xl border border-sky-200 bg-sky-50/20 hover:border-sky-300 transition-all cursor-pointer shadow-xs group"
        >
          <div className="flex items-center justify-between">
            <span className="text-[10px] text-sky-700 font-bold uppercase">Waiting Agent</span>
            <Clock className="w-4 h-4 text-sky-500" />
          </div>
          <p className="text-2xl font-black text-sky-700 mt-1">{summary?.waitingDevices || 0}</p>
          <p className="text-[10px] text-sky-600 mt-0.5">Pending agent install</p>
        </div>
      </div>

      {/* Wi-Fi state is computed only from agent network diagnostics, never from asset records. */}
      <div className="rounded-xl border border-slate-200 bg-white p-4 shadow-xs">
        <div className="flex flex-col gap-2 border-b border-slate-100 pb-3 sm:flex-row sm:items-center sm:justify-between">
          <div className="flex items-center gap-2">
            <Wifi className="h-4 w-4 text-indigo-600" />
            <div>
              <h3 className="text-xs font-bold text-slate-900">Network Health</h3>
              <p className="text-[11px] text-slate-500">Separate Wi-Fi, local gateway, DNS, and internet results from the Windows agent.</p>
            </div>
          </div>
          <span className="text-[11px] font-mono text-slate-500">{summary?.networkHealth?.monitoredDevices ?? 0} fresh agent network reports</span>
        </div>
        {(summary?.networkHealth?.monitoredDevices ?? 0) === 0 ? (
          <div className="py-5 text-center text-xs text-slate-500">{(summary?.networkHealth?.stale ?? 0) > 0 ? 'Only stale network reports are available. Reconnect the agent or run a fresh diagnostic before treating them as current.' : 'No Wi-Fi diagnostics have been received yet. Devices remain unclassified until an updated Windows agent performs a real test.'}</div>
        ) : (
          <>
            <div className="mt-3 grid grid-cols-2 gap-2 sm:grid-cols-3 xl:grid-cols-9">
              {[
                ['Online', summary?.networkHealth?.online ?? 0, 'text-emerald-700 bg-emerald-50 border-emerald-200'],
                ['Limited', summary?.networkHealth?.limited ?? 0, 'text-amber-700 bg-amber-50 border-amber-200'],
                ['No Internet', summary?.networkHealth?.noInternet ?? 0, 'text-rose-700 bg-rose-50 border-rose-200'],
                ['Local Error', summary?.networkHealth?.localNetworkError ?? 0, 'text-rose-700 bg-rose-50 border-rose-200'],
                ['DNS Error', summary?.networkHealth?.dnsError ?? 0, 'text-rose-700 bg-rose-50 border-rose-200'],
                ['Disconnected', summary?.networkHealth?.disconnected ?? 0, 'text-slate-700 bg-slate-50 border-slate-200'],
                ['Unavailable', summary?.networkHealth?.unavailable ?? 0, 'text-slate-700 bg-slate-50 border-slate-200'],
                ['Active Incidents', summary?.networkHealth?.activeIncidents ?? 0, 'text-indigo-700 bg-indigo-50 border-indigo-200'],
                ['Stale Reports', summary?.networkHealth?.stale ?? 0, 'text-slate-600 bg-slate-50 border-slate-200']
              ].map(([label, count, classes]) => (
                <div key={String(label)} className={`rounded-lg border p-2.5 ${classes}`}>
                  <p className="text-[10px] font-bold uppercase">{label}</p>
                  <p className="mt-0.5 text-xl font-black">{count}</p>
                </div>
              ))}
            </div>
            {(summary?.networkHealth?.clusters?.length ?? 0) > 0 && (
              <div className="mt-3 rounded-lg border border-amber-200 bg-amber-50 p-3 text-xs text-amber-950">
                <p className="font-bold">Possible shared environment issue</p>
                {summary?.networkHealth?.clusters.map(cluster => <p key={cluster.locationId} className="mt-1">{cluster.affectedDevices} device(s) in {cluster.locationName} reported active network faults within {cluster.detectedWithinMinutes} minutes. Check the access point, router, switch, DNS, or upstream network service.</p>)}
              </div>
            )}
          </>
        )}
      </div>

      {/* 2. Hardware Resource Stress & Diagnostic Metrics */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
        <div className="bg-white p-3.5 rounded-xl border border-slate-200 shadow-xs flex items-center gap-3">
          <div className="p-2.5 rounded-lg bg-indigo-50 text-indigo-600">
            <Cpu className="w-5 h-5" />
          </div>
          <div>
            <p className="text-[10px] font-bold text-slate-400 uppercase">High CPU Usage (&gt;80%)</p>
            <p className="text-lg font-black text-slate-900">{summary?.devicesWithHighCpu || 0} Computer(s)</p>
          </div>
        </div>

        <div className="bg-white p-3.5 rounded-xl border border-slate-200 shadow-xs flex items-center gap-3">
          <div className="p-2.5 rounded-lg bg-indigo-50 text-indigo-600">
            <Activity className="w-5 h-5" />
          </div>
          <div>
            <p className="text-[10px] font-bold text-slate-400 uppercase">High Memory Usage (&gt;85%)</p>
            <p className="text-lg font-black text-slate-900">{summary?.devicesWithHighMemory || 0} Computer(s)</p>
          </div>
        </div>

        <div className="bg-white p-3.5 rounded-xl border border-slate-200 shadow-xs flex items-center gap-3">
          <div className="p-2.5 rounded-lg bg-rose-50 text-rose-600">
            <HardDrive className="w-5 h-5" />
          </div>
          <div>
            <p className="text-[10px] font-bold text-slate-400 uppercase">Low Storage Space (&lt;15% Free)</p>
            <p className="text-lg font-black text-rose-600">{summary?.devicesWithLowStorage || 0} Computer(s)</p>
          </div>
        </div>

        <div className="bg-white p-3.5 rounded-xl border border-slate-200 shadow-xs flex items-center gap-3">
          <div className="p-2.5 rounded-lg bg-rose-50 text-rose-600">
            <Thermometer className="w-5 h-5" />
          </div>
          <div>
            <p className="text-[10px] font-bold text-slate-400 uppercase">Thermal Overheating (&gt;80°C)</p>
            <p className="text-lg font-black text-rose-600">{summary?.devicesWithHighTemp || 0} Computer(s)</p>
          </div>
        </div>
      </div>

      {/* 3. Problem Computers Requiring Attention */}
      {problematicDevices.length > 0 && (
        <div className="bg-white rounded-xl border border-slate-200 p-4 shadow-xs space-y-3">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <AlertTriangle className="w-4 h-4 text-rose-500" />
              <h3 className="text-xs font-bold text-slate-900">
                Computers Requiring Diagnostic Attention ({problematicDevices.length})
              </h3>
            </div>
            <button
              onClick={() => setActiveTab('diagnostics')}
              className="text-xs font-bold text-indigo-600 hover:underline flex items-center gap-1"
            >
              <span>View All Diagnostics</span>
              <ChevronRight className="w-3.5 h-3.5" />
            </button>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
            {problematicDevices.map(device => {
              const tel = device.latestTelemetry;
              return (
                <div
                  key={device.id}
                  onClick={() => onSelectDevice(device.id)}
                  className={`p-3.5 rounded-xl border cursor-pointer hover:shadow-md transition-all flex flex-col justify-between ${
                    device.status === 'Critical' ? 'bg-rose-50/40 border-rose-200' : 'bg-amber-50/40 border-amber-200'
                  }`}
                >
                  <div>
                    <div className="flex items-center justify-between mb-2">
                      <span className="font-bold text-xs text-slate-900">{device.deviceName}</span>
                      <StatusBadge status={device.status} size="sm" />
                    </div>
                    <p className="text-[11px] font-mono text-slate-500">{device.assetId} • {device.assignedUser}</p>
                  </div>

                  <div className="grid grid-cols-3 gap-1 my-2 py-1.5 px-2 bg-white/80 rounded-lg text-center text-xs">
                    <div>
                      <span className="text-[9px] text-slate-400 font-bold block">CPU</span>
                      <span className={`font-bold ${(tel?.cpuUsagePercent || 0) > 80 ? 'text-rose-600' : 'text-slate-700'}`}>
                        {tel ? `${tel.cpuUsagePercent}%` : '--'}
                      </span>
                    </div>
                    <div>
                      <span className="text-[9px] text-slate-400 font-bold block">RAM</span>
                      <span className={`font-bold ${(tel?.ramUsagePercent || 0) > 85 ? 'text-rose-600' : 'text-slate-700'}`}>
                        {tel ? `${tel.ramUsagePercent}%` : '--'}
                      </span>
                    </div>
                    <div>
                      <span className="text-[9px] text-slate-400 font-bold block">TEMP</span>
                      <span className={`font-bold ${(tel?.cpuTempC || 0) > 80 ? 'text-rose-600' : 'text-slate-700'}`}>
                        {tel?.cpuTempC ? `${tel.cpuTempC}°C` : '--'}
                      </span>
                    </div>
                  </div>

                  <div className="text-right">
                    <span className="text-[11px] font-bold text-indigo-600 hover:underline flex items-center justify-end gap-1">
                      Inspect Telemetry <ChevronRight className="w-3 h-3" />
                    </span>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* 4. Active Repair Tickets & Recent Activity */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        
        {/* Open Repair Tickets */}
        <div className="bg-white rounded-xl border border-slate-200 p-4 shadow-xs space-y-3">
          <div className="flex items-center justify-between border-b border-slate-100 pb-2.5">
            <div className="flex items-center gap-2">
              <Wrench className="w-4 h-4 text-indigo-600" />
              <h3 className="text-xs font-bold text-slate-900">Recent Repair Tickets</h3>
            </div>
            <button
              onClick={() => setActiveTab('tickets')}
              className="text-xs font-bold text-indigo-600 hover:underline flex items-center gap-1"
            >
              <span>Manage All ({summary?.openTickets || 0} Open)</span>
              <ChevronRight className="w-3.5 h-3.5" />
            </button>
          </div>

          {!summary?.recentTickets || summary.recentTickets.length === 0 ? (
            <div className="py-8 text-center text-xs text-slate-400">
              No open repair tickets. Systems operational.
            </div>
          ) : (
            <div className="divide-y divide-slate-100">
              {summary.recentTickets.slice(0, 5).map(t => (
                <div 
                  key={t.id} 
                  onClick={() => setActiveTab('tickets')}
                  className="py-2.5 flex items-center justify-between cursor-pointer hover:bg-slate-50 rounded px-1.5 transition-colors"
                >
                  <div className="space-y-0.5">
                    <div className="flex items-center gap-2">
                      <span className="font-mono font-bold text-xs text-slate-800">{t.ticketNumber}</span>
                      <SeverityBadge severity={t.severity} size="sm" />
                      <span className="text-xs font-bold text-slate-900">{t.deviceName}</span>
                    </div>
                    <p className="text-[11px] text-slate-500 line-clamp-1">{t.problem}</p>
                  </div>
                  <StatusBadge status={t.status} size="sm" />
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Live Alerts Stream */}
        <div className="bg-white rounded-xl border border-slate-200 p-4 shadow-xs space-y-3">
          <div className="flex items-center justify-between border-b border-slate-100 pb-2.5">
            <div className="flex items-center gap-2">
              <ShieldAlert className="w-4 h-4 text-indigo-600" />
              <h3 className="text-xs font-bold text-slate-900">Real-Time Telemetry Alerts</h3>
            </div>
            <span className="text-[11px] text-slate-400 font-mono">Live Stream</span>
          </div>

          {!summary?.recentAlerts || summary.recentAlerts.length === 0 ? (
            <div className="py-8 text-center text-xs text-slate-400">
              No recent alert events.
            </div>
          ) : (
            <div className="divide-y divide-slate-100 max-h-64 overflow-y-auto">
              {summary.recentAlerts.slice(0, 6).map(notif => (
                <div key={notif.id} className="py-2 flex items-start gap-2.5">
                  <div className="mt-1">
                    {notif.type === 'critical' && <span className="w-2 h-2 rounded-full bg-rose-500 block" />}
                    {notif.type === 'warning' && <span className="w-2 h-2 rounded-full bg-amber-500 block" />}
                    {notif.type === 'ticket' && <span className="w-2 h-2 rounded-full bg-indigo-500 block" />}
                    {notif.type === 'offline' && <span className="w-2 h-2 rounded-full bg-slate-500 block" />}
                    {notif.type === 'info' && <span className="w-2 h-2 rounded-full bg-blue-500 block" />}
                  </div>
                  <div className="flex-1">
                    <p className="text-xs font-bold text-slate-900">{notif.title}</p>
                    <p className="text-[11px] text-slate-600">{notif.message}</p>
                    <span className="text-[10px] text-slate-400 font-mono">{new Date(notif.createdAt).toLocaleTimeString()}</span>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

      </div>

    </div>
  );
};
