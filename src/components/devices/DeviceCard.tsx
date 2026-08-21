import React from 'react';
import { 
  Monitor, 
  Laptop, 
  Server, 
  HardDrive, 
  Cpu, 
  Activity, 
  Clock, 
  User, 
  MapPin, 
  Wrench, 
  AlertTriangle,
  Download,
  Wifi,
  WifiOff
} from 'lucide-react';
import { Device } from '../../types/index';
import { StatusBadge } from '../common/Badge';

interface DeviceCardProps {
  device: Device;
  onClick: () => void;
  onInstallClick: () => void;
}

export const DeviceCard: React.FC<DeviceCardProps> = ({ device, onClick, onInstallClick }) => {
  const tel = device.latestTelemetry;
  const isWaiting = device.status === 'Waiting for Agent Connection';
  const isOffline = device.status === 'Offline';

  const formatBytes = (bytes: number) => {
    if (!bytes) return '0 GB';
    return `${(bytes / (1024 ** 3)).toFixed(1)} GB`;
  };

  const primaryDisk = tel?.storage?.[0];
  const diskPct = primaryDisk ? primaryDisk.usagePercent : (device.specs?.storageDevices?.[0]?.usagePercent || 0);

  const getDeviceIcon = () => {
    switch (device.deviceType) {
      case 'Laptop': return <Laptop className="w-5 h-5 text-indigo-600" />;
      case 'Server': return <Server className="w-5 h-5 text-indigo-600" />;
      default: return <Monitor className="w-5 h-5 text-indigo-600" />;
    }
  };

  const formatLastHeartbeat = (iso?: string) => {
    if (!iso) return 'Never';
    const seconds = Math.round((Date.now() - new Date(iso).getTime()) / 1000);
    if (seconds < 15) return 'Just now (Live)';
    if (seconds < 60) return `${seconds}s ago`;
    const mins = Math.floor(seconds / 60);
    if (mins < 60) return `${mins}m ago`;
    const hours = Math.floor(mins / 60);
    return `${hours}h ago`;
  };

  return (
    <div 
      id={`device-card-${device.id}`}
      onClick={onClick}
      className={`group bg-white rounded-xl border transition-all cursor-pointer p-4 hover:shadow-md flex flex-col justify-between ${
        device.status === 'Critical' ? 'border-rose-300 ring-1 ring-rose-200' :
        device.status === 'Warning' ? 'border-amber-300 ring-1 ring-amber-200' :
        device.status === 'Online' ? 'border-slate-200 hover:border-indigo-300' :
        'border-slate-200 bg-slate-50/50'
      }`}
    >
      {/* Header info */}
      <div>
        <div className="flex items-start justify-between gap-2 mb-2.5">
          <div className="flex items-center gap-2.5">
            <div className="p-2 rounded-lg bg-indigo-50 border border-indigo-100 flex items-center justify-center">
              {getDeviceIcon()}
            </div>
            <div>
              <h4 className="text-sm font-bold text-slate-900 group-hover:text-indigo-600 transition-colors">
                {device.deviceName}
              </h4>
              <p className="text-[11px] font-mono text-slate-500">{device.assetId}</p>
            </div>
          </div>
          <StatusBadge status={device.status} size="sm" />
        </div>

        {/* User & Location */}
        <div className="space-y-1 my-3 text-xs text-slate-600">
          <div className="flex items-center gap-1.5 truncate">
            <User className="w-3.5 h-3.5 text-slate-400 shrink-0" />
            <span className="truncate">{device.assignedUser || 'Unassigned'}</span>
          </div>
          <div className="flex items-center gap-1.5 truncate">
            <MapPin className="w-3.5 h-3.5 text-slate-400 shrink-0" />
            <span className="truncate text-slate-500">
              {device.operatingSystem}
            </span>
          </div>
        </div>

        {/* Live Gauges or Waiting State */}
        {isWaiting ? (
          <div className="my-3 p-3 bg-sky-50 border border-sky-200 rounded-lg text-center">
            <p className="text-xs font-semibold text-sky-800 mb-1">Waiting for Agent Connection</p>
            <p className="text-[11px] text-sky-600 mb-2 font-mono">Code: {device.registrationCode}</p>
            <button
              onClick={(e) => {
                e.stopPropagation();
                onInstallClick();
              }}
              className="inline-flex items-center gap-1 px-2.5 py-1 rounded bg-sky-600 text-white text-xs font-bold hover:bg-sky-700 transition-colors"
            >
              <Download className="w-3.5 h-3.5" />
              Connect Agent
            </button>
          </div>
        ) : (
          <div className="grid grid-cols-3 gap-2 my-3 py-2 px-2.5 bg-slate-50 border border-slate-100 rounded-lg text-center">
            {/* CPU */}
            <div>
              <p className="text-[10px] text-slate-400 font-semibold uppercase flex items-center justify-center gap-0.5">
                <Cpu className="w-3 h-3" /> CPU
              </p>
              <p className={`text-xs font-bold mt-0.5 ${
                (tel?.cpuUsagePercent || 0) > 85 ? 'text-rose-600 font-extrabold' : 
                (tel?.cpuUsagePercent || 0) > 70 ? 'text-amber-600' : 'text-slate-800'
              }`}>
                {tel ? `${tel.cpuUsagePercent}%` : '--'}
              </p>
            </div>

            {/* RAM */}
            <div>
              <p className="text-[10px] text-slate-400 font-semibold uppercase flex items-center justify-center gap-0.5">
                <Activity className="w-3 h-3" /> RAM
              </p>
              <p className={`text-xs font-bold mt-0.5 ${
                (tel?.ramUsagePercent || 0) > 90 ? 'text-rose-600 font-extrabold' : 
                (tel?.ramUsagePercent || 0) > 75 ? 'text-amber-600' : 'text-slate-800'
              }`}>
                {tel ? `${tel.ramUsagePercent}%` : '--'}
              </p>
            </div>

            {/* Disk */}
            <div>
              <p className="text-[10px] text-slate-400 font-semibold uppercase flex items-center justify-center gap-0.5">
                <HardDrive className="w-3 h-3" /> Disk
              </p>
              <p className={`text-xs font-bold mt-0.5 ${
                diskPct > 90 ? 'text-rose-600 font-extrabold' : 
                diskPct > 80 ? 'text-amber-600' : 'text-slate-800'
              }`}>
                {diskPct ? `${Math.round(diskPct)}%` : '--'}
              </p>
            </div>
          </div>
        )}
      </div>

      {/* Footer / Telemetry metadata */}
      <div className="pt-2 border-t border-slate-100 flex items-center justify-between text-[11px] text-slate-400">
        <div className="flex items-center gap-1">
          <Clock className="w-3 h-3" />
          <span>{formatLastHeartbeat(device.lastHeartbeatAt)}</span>
        </div>

        <div className="flex items-center gap-2">
          {device.activeIssueCount !== undefined && device.activeIssueCount > 0 && (
            <span className="flex items-center gap-0.5 text-rose-600 font-semibold">
              <AlertTriangle className="w-3 h-3" />
              {device.activeIssueCount}
            </span>
          )}
          {device.openTicketCount !== undefined && device.openTicketCount > 0 && (
            <span className="flex items-center gap-0.5 text-indigo-600 font-semibold">
              <Wrench className="w-3 h-3" />
              {device.openTicketCount}
            </span>
          )}
        </div>
      </div>
    </div>
  );
};
