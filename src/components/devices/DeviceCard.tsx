import React from 'react';
import {
  Activity,
  AlertTriangle,
  Clock3,
  Cpu,
  Download,
  HardDrive,
  Laptop,
  Monitor,
  Server,
  Wrench
} from 'lucide-react';
import { Device } from '../../types/index';
import { StatusBadge } from '../common/Badge';

interface DeviceCardProps {
  device: Device;
  onClick: () => void;
  onInstallClick: () => void;
}

const formatLastHeartbeat = (iso?: string) => {
  if (!iso) return 'No heartbeat received';
  const seconds = Math.max(0, Math.round((Date.now() - new Date(iso).getTime()) / 1000));
  if (seconds < 15) return 'Updated just now';
  if (seconds < 60) return `Updated ${seconds}s ago`;
  const minutes = Math.floor(seconds / 60);
  if (minutes < 60) return `Updated ${minutes}m ago`;
  return `Updated ${Math.floor(minutes / 60)}h ago`;
};

const metricTone = (value: number | undefined, warning: number, critical: number) => {
  if (value === undefined) return 'text-slate-400';
  if (value >= critical) return 'text-rose-700';
  if (value >= warning) return 'text-amber-700';
  return 'text-slate-900';
};

export const DeviceCard: React.FC<DeviceCardProps> = ({ device, onClick, onInstallClick }) => {
  const telemetry = device.latestTelemetry;
  const isWaiting = device.connectionState === 'never_connected' || device.status === 'Waiting for Agent Connection';
  const isLive = device.connectionState === 'connected' && Boolean(telemetry);
  const primaryDisk = telemetry?.storage?.[0];
  const diskUsage = primaryDisk?.usagePercent;
  const healthScore = device.health?.score;
  const deviceIcon = device.deviceType === 'Laptop'
    ? <Laptop className="h-5 w-5" />
    : device.deviceType === 'Server'
      ? <Server className="h-5 w-5" />
      : <Monitor className="h-5 w-5" />;
  const healthTone = healthScore === null || healthScore === undefined
    ? 'border-slate-200 bg-slate-50 text-slate-500'
    : healthScore >= 75
      ? 'border-emerald-200 bg-emerald-50 text-emerald-800'
      : healthScore >= 60
        ? 'border-amber-200 bg-amber-50 text-amber-800'
        : 'border-rose-200 bg-rose-50 text-rose-800';

  return (
    <article
      id={`device-card-${device.id}`}
      role="button"
      tabIndex={0}
      onClick={onClick}
      onKeyDown={(event) => {
        if (event.key === 'Enter' || event.key === ' ') {
          event.preventDefault();
          onClick();
        }
      }}
      className={`group relative flex min-h-[292px] cursor-pointer flex-col overflow-hidden rounded-2xl border bg-white p-4 shadow-[0_1px_2px_rgba(15,23,42,0.04)] transition duration-200 hover:-translate-y-0.5 hover:border-indigo-300 hover:shadow-[0_14px_30px_rgba(15,23,42,0.09)] focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:ring-offset-2 ${
        device.status === 'Critical'
          ? 'border-rose-200'
          : device.status === 'Warning'
            ? 'border-amber-200'
            : 'border-slate-200'
      }`}
    >
      <div className={`absolute inset-x-0 top-0 h-1 ${
        device.status === 'Critical' ? 'bg-rose-500' : device.status === 'Warning' ? 'bg-amber-400' : isLive ? 'bg-emerald-500' : 'bg-slate-200'
      }`} />

      <div className="flex items-start justify-between gap-3 pt-1">
        <div className="flex min-w-0 items-center gap-3">
          <div className="grid h-10 w-10 shrink-0 place-items-center rounded-xl border border-indigo-100 bg-indigo-50 text-indigo-700">
            {deviceIcon}
          </div>
          <div className="min-w-0">
            <h3 className="truncate text-sm font-bold tracking-tight text-slate-950 group-hover:text-indigo-700">{device.deviceName}</h3>
            <p className="mt-0.5 truncate font-mono text-[10px] font-semibold uppercase tracking-wide text-slate-500">{device.assetId}</p>
          </div>
        </div>
        <StatusBadge status={device.status} size="sm" />
      </div>

      <div className="mt-4 grid grid-cols-[1fr_auto] gap-3 rounded-xl border border-slate-100 bg-slate-50/80 p-3">
        <div className="min-w-0">
          <p className="text-[10px] font-bold uppercase tracking-[0.12em] text-slate-400">Asset health</p>
          <p className="mt-1 truncate text-xs font-semibold text-slate-700">{device.assignedUser || 'Unassigned user'}</p>
          <p className="mt-0.5 truncate text-[11px] text-slate-500">{device.operatingSystem || 'Operating system unavailable'}</p>
        </div>
        <div className={`flex min-w-[60px] flex-col items-center justify-center rounded-lg border px-2 ${healthTone}`}>
          <span className="text-[9px] font-bold uppercase tracking-wide opacity-70">Health</span>
          <span className="mt-0.5 text-base font-black tabular-nums">{healthScore ?? '--'}{healthScore === null || healthScore === undefined ? '' : '/100'}</span>
        </div>
      </div>

      {isWaiting ? (
        <div className="mt-3 rounded-xl border border-sky-200 bg-sky-50 p-3">
          <p className="text-xs font-bold text-sky-950">Awaiting first agent heartbeat</p>
          <p className="mt-1 text-[11px] leading-4 text-sky-800">This asset is not presented as online until its physical computer pairs and sends authenticated telemetry.</p>
          <button
            type="button"
            onClick={(event) => {
              event.stopPropagation();
              onInstallClick();
            }}
            className="mt-2 inline-flex items-center gap-1.5 rounded-lg bg-sky-700 px-2.5 py-1.5 text-[11px] font-bold text-white transition hover:bg-sky-800"
          >
            <Download className="h-3.5 w-3.5" />
            Open agent setup
          </button>
        </div>
      ) : (
        <div className="mt-3">
          <div className="mb-2 flex items-center justify-between">
            <p className="text-[10px] font-bold uppercase tracking-[0.12em] text-slate-400">{isLive ? 'Live telemetry' : 'Last reported telemetry'}</p>
            <span className={`inline-flex h-1.5 w-1.5 rounded-full ${isLive ? 'bg-emerald-500' : 'bg-slate-300'}`} />
          </div>
          <div className="grid grid-cols-3 divide-x divide-slate-100 rounded-xl border border-slate-100 bg-white px-1.5 py-2.5 text-center">
            <div className="px-1">
              <p className="flex items-center justify-center gap-1 text-[9px] font-bold uppercase tracking-wide text-slate-400"><Cpu className="h-3 w-3" /> CPU</p>
              <p className={`mt-1 text-sm font-black tabular-nums ${metricTone(telemetry?.cpuUsagePercent, 70, 85)}`}>{telemetry ? `${Math.round(telemetry.cpuUsagePercent)}%` : '—'}</p>
            </div>
            <div className="px-1">
              <p className="flex items-center justify-center gap-1 text-[9px] font-bold uppercase tracking-wide text-slate-400"><Activity className="h-3 w-3" /> RAM</p>
              <p className={`mt-1 text-sm font-black tabular-nums ${metricTone(telemetry?.ramUsagePercent, 75, 90)}`}>{telemetry ? `${Math.round(telemetry.ramUsagePercent)}%` : '—'}</p>
            </div>
            <div className="px-1">
              <p className="flex items-center justify-center gap-1 text-[9px] font-bold uppercase tracking-wide text-slate-400"><HardDrive className="h-3 w-3" /> Disk</p>
              <p className={`mt-1 text-sm font-black tabular-nums ${metricTone(diskUsage, 80, 90)}`}>{diskUsage === undefined ? '—' : `${Math.round(diskUsage)}%`}</p>
            </div>
          </div>
        </div>
      )}

      <footer className="mt-auto flex items-center justify-between border-t border-slate-100 pt-3 text-[11px] text-slate-500">
        <span className="flex min-w-0 items-center gap-1.5 truncate"><Clock3 className="h-3.5 w-3.5 shrink-0 text-slate-400" />{formatLastHeartbeat(device.lastHeartbeatAt)}</span>
        <span className="ml-2 flex shrink-0 items-center gap-2">
          {Number(device.activeIssueCount || 0) > 0 && <span className="inline-flex items-center gap-1 font-bold text-rose-700" title="Active findings"><AlertTriangle className="h-3.5 w-3.5" />{device.activeIssueCount}</span>}
          {Number(device.openTicketCount || 0) > 0 && <span className="inline-flex items-center gap-1 font-bold text-indigo-700" title="Open repair tickets"><Wrench className="h-3.5 w-3.5" />{device.openTicketCount}</span>}
          {device.agentVersion && <span className="hidden font-mono text-[10px] text-slate-400 xl:inline">{device.agentVersion}</span>}
        </span>
      </footer>
    </article>
  );
};
