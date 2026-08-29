import React, { useMemo, useState } from 'react';
import {
  Activity,
  AlertTriangle,
  ArrowUpRight,
  CheckCircle2,
  ChevronRight,
  Clock,
  Cpu,
  Download,
  Gauge,
  HardDrive,
  Monitor,
  Plus,
  RefreshCw,
  ShieldAlert,
  Thermometer,
  Wifi,
  WifiOff,
  Wrench
} from 'lucide-react';
import { useMonitoring } from '../../context/MonitoringContext';
import { useAuth } from '../../context/AuthContext';
import { Device, SystemNotification } from '../../types/index';
import { SeverityBadge, StatusBadge } from '../common/Badge';

interface DashboardViewProps {
  onSelectDevice: (deviceId: string) => void;
}

type AttentionTone = 'critical' | 'warning' | 'info';

interface AttentionItem {
  id: string;
  tone: AttentionTone;
  title: string;
  detail: string;
  actionLabel: string;
  onAction: () => void;
}

const formatRefreshTime = (date: Date) =>
  new Intl.DateTimeFormat(undefined, {
    hour: 'numeric',
    minute: '2-digit',
    second: '2-digit'
  }).format(date);

const formatTelemetry = (value: number | undefined, suffix: string) =>
  typeof value === 'number' && Number.isFinite(value) ? `${Math.round(value)}${suffix}` : 'Unavailable';

const healthPresentation = (score: number | null) => {
  if (score === null) {
    return {
      label: 'Awaiting telemetry',
      detail: 'A score is calculated only after the agent reports usable device data.',
      color: 'text-slate-300',
      ring: '#94a3b8'
    };
  }

  if (score >= 90) return { label: 'Excellent', detail: 'Environment is operating within normal thresholds.', color: 'text-emerald-300', ring: '#34d399' };
  if (score >= 75) return { label: 'Good', detail: 'A small number of items should be monitored.', color: 'text-emerald-300', ring: '#34d399' };
  if (score >= 60) return { label: 'Attention required', detail: 'Some reported conditions need review.', color: 'text-amber-300', ring: '#fbbf24' };
  if (score >= 40) return { label: 'Warning', detail: 'Multiple health signals need action.', color: 'text-amber-300', ring: '#fbbf24' };
  return { label: 'Critical', detail: 'Immediate IT intervention is recommended.', color: 'text-rose-300', ring: '#fb7185' };
};

const toneClasses: Record<AttentionTone, { icon: string; button: string }> = {
  critical: {
    icon: 'bg-rose-100 text-rose-700',
    button: 'text-rose-700 hover:bg-rose-100'
  },
  warning: {
    icon: 'bg-amber-100 text-amber-700',
    button: 'text-amber-800 hover:bg-amber-100'
  },
  info: {
    icon: 'bg-sky-100 text-sky-700',
    button: 'text-sky-800 hover:bg-sky-100'
  }
};

const attentionIcon = (tone: AttentionTone) => {
  if (tone === 'critical') return <ShieldAlert className="h-4 w-4" />;
  if (tone === 'warning') return <AlertTriangle className="h-4 w-4" />;
  return <Clock className="h-4 w-4" />;
};

export const DashboardView: React.FC<DashboardViewProps> = ({ onSelectDevice }) => {
  const {
    summary,
    devices,
    loading,
    lastRefreshed,
    refreshData,
    setIsAddModalOpen,
    setIsInstallModalOpen,
    setInstallTargetDevice,
    setActiveTab
  } = useMonitoring();
  const { user } = useAuth();
  const isViewer = user?.role === 'viewer';
  const [isRefreshing, setIsRefreshing] = useState(false);

  const totalDevices = summary?.totalDevices ?? 0;
  const onlineDevices = summary?.onlineDevices ?? 0;
  const offlineDevices = summary?.offlineDevices ?? 0;
  const warningDevices = summary?.warningDevices ?? 0;
  const criticalDevices = summary?.criticalDevices ?? 0;
  const waitingDevices = summary?.waitingDevices ?? 0;
  const healthScore = summary?.overallHealthScore ?? null;
  const health = healthPresentation(healthScore);
  const healthRingLength = 264;
  const healthRingProgress = healthScore === null ? 0 : Math.max(0, Math.min(100, healthScore)) / 100 * healthRingLength;
  const activeAttentionCount = criticalDevices + warningDevices;
  const agentReportingRate = totalDevices > 0 ? Math.round((onlineDevices / totalDevices) * 100) : null;

  const problematicDevices = useMemo(() => (
    devices
      .filter(device => device.status === 'Critical' || device.status === 'Warning')
      .sort((left, right) => {
        const statusWeight = (status: Device['status']) => status === 'Critical' ? 0 : 1;
        const statusDifference = statusWeight(left.status) - statusWeight(right.status);
        if (statusDifference !== 0) return statusDifference;
        return (left.health?.score ?? 101) - (right.health?.score ?? 101);
      })
  ), [devices]);

  const attentionItems = useMemo(() => {
    const items: AttentionItem[] = [];

    if (criticalDevices > 0) {
      items.push({
        id: 'critical-devices',
        tone: 'critical',
        title: `${criticalDevices} ${criticalDevices === 1 ? 'computer is' : 'computers are'} in a critical state`,
        detail: 'Review evidence and diagnostics before the condition escalates.',
        actionLabel: 'Review diagnostics',
        onAction: () => setActiveTab('diagnostics')
      });
    }

    if ((summary?.criticalIssues ?? 0) > 0) {
      items.push({
        id: 'critical-issues',
        tone: 'critical',
        title: `${summary?.criticalIssues} active critical ${summary?.criticalIssues === 1 ? 'finding' : 'findings'}`,
        detail: 'These rules were triggered by received telemetry or device state.',
        actionLabel: 'Open findings',
        onAction: () => setActiveTab('diagnostics')
      });
    }

    if ((summary?.openTickets ?? 0) > 0) {
      items.push({
        id: 'open-tickets',
        tone: 'warning',
        title: `${summary?.openTickets} ${summary?.openTickets === 1 ? 'repair ticket needs' : 'repair tickets need'} follow-through`,
        detail: 'Assignment, repair notes, and verification remain visible until closure.',
        actionLabel: 'Open work queue',
        onAction: () => setActiveTab('tickets')
      });
    }

    if (offlineDevices > 0) {
      items.push({
        id: 'offline-devices',
        tone: 'warning',
        title: `${offlineDevices} ${offlineDevices === 1 ? 'device has' : 'devices have'} missed the heartbeat threshold`,
        detail: 'Confirm power, network connectivity, and agent service status.',
        actionLabel: 'Check devices',
        onAction: () => setActiveTab('devices')
      });
    }

    if ((summary?.maintenanceDevices ?? 0) > 0) {
      items.push({
        id: 'maintenance-devices',
        tone: 'warning',
        title: `${summary?.maintenanceDevices} ${summary?.maintenanceDevices === 1 ? 'asset is' : 'assets are'} under maintenance`,
        detail: 'Keep repair and verification records current before returning devices to service.',
        actionLabel: 'View maintenance',
        onAction: () => setActiveTab('maintenance')
      });
    }

    if (waitingDevices > 0) {
      items.push({
        id: 'waiting-devices',
        tone: 'info',
        title: `${waitingDevices} ${waitingDevices === 1 ? 'asset is' : 'assets are'} waiting for an agent`,
        detail: 'Inventory exists, but no authenticated telemetry has been received yet.',
        actionLabel: 'Set up agent',
        onAction: () => {
          setInstallTargetDevice(null);
          setIsInstallModalOpen(true);
        }
      });
    }

    return items.slice(0, 4);
  }, [criticalDevices, offlineDevices, setActiveTab, setInstallTargetDevice, setIsInstallModalOpen, summary?.criticalIssues, summary?.maintenanceDevices, summary?.openTickets, waitingDevices]);

  const handleRefresh = async () => {
    setIsRefreshing(true);
    await refreshData();
    setIsRefreshing(false);
  };

  const goToDevice = (deviceId?: string) => {
    if (deviceId) {
      onSelectDevice(deviceId);
      return;
    }
    setActiveTab('diagnostics');
  };

  return (
    <div className="space-y-5 pb-4">
      <section className="relative overflow-hidden rounded-2xl border border-slate-800 bg-gradient-to-br from-slate-950 via-slate-900 to-indigo-950 px-5 py-5 text-white shadow-xl shadow-slate-900/10 sm:px-6 sm:py-6">
        <div className="pointer-events-none absolute -right-24 -top-28 h-72 w-72 rounded-full bg-indigo-500/20 blur-3xl" />
        <div className="pointer-events-none absolute bottom-0 left-1/3 h-40 w-2/3 bg-emerald-400/10 blur-3xl" />

        <div className="relative grid gap-6 xl:grid-cols-[minmax(0,1fr)_auto] xl:items-center">
          <div>
            <div className="flex flex-wrap items-center gap-2">
              <span className="inline-flex items-center gap-1.5 rounded-full border border-emerald-300/20 bg-emerald-400/10 px-2.5 py-1 text-[10px] font-bold uppercase tracking-[0.16em] text-emerald-200">
                <span className="h-1.5 w-1.5 rounded-full bg-emerald-300 animate-pulse" />
                Operations command center
              </span>
              <span className="text-[11px] text-slate-300">{loading && !summary ? 'Loading current monitoring data' : 'Live management data, not simulated readings'}</span>
            </div>
            <h2 className="mt-4 text-2xl font-black tracking-tight text-white sm:text-3xl">IT environment health</h2>
            <p className="mt-2 max-w-2xl text-sm leading-6 text-slate-300">
              Monitor live device condition, investigate evidence, and move work from detection through repair verification.
            </p>

            <div className="mt-5 flex flex-wrap gap-2">
              <span className="rounded-lg border border-white/10 bg-white/[0.06] px-3 py-2 text-xs text-slate-200">
                <strong className="mr-1 text-white">{totalDevices}</strong> managed {totalDevices === 1 ? 'asset' : 'assets'}
              </span>
              <span className="rounded-lg border border-white/10 bg-white/[0.06] px-3 py-2 text-xs text-slate-200">
                <strong className="mr-1 text-emerald-300">{onlineDevices}</strong> sending fresh heartbeats
              </span>
              <span className="rounded-lg border border-white/10 bg-white/[0.06] px-3 py-2 text-xs text-slate-200">
                Data refreshed <strong className="ml-1 text-white">{formatRefreshTime(lastRefreshed)}</strong>
              </span>
            </div>

            <div className="mt-5 flex flex-wrap gap-2">
              {!isViewer && <button
                id="dash-add-device-btn"
                onClick={() => setIsAddModalOpen(true)}
                className="inline-flex items-center gap-2 rounded-lg bg-white px-3.5 py-2.5 text-xs font-bold text-slate-950 shadow-sm transition hover:bg-slate-100 focus:outline-none focus:ring-2 focus:ring-white/60"
              >
                <Plus className="h-4 w-4" />
                Register computer
              </button>}
              {!isViewer && <button
                onClick={() => {
                  setInstallTargetDevice(null);
                  setIsInstallModalOpen(true);
                }}
                className="inline-flex items-center gap-2 rounded-lg border border-white/15 bg-white/[0.07] px-3.5 py-2.5 text-xs font-bold text-white transition hover:bg-white/[0.13] focus:outline-none focus:ring-2 focus:ring-white/50"
              >
                <Download className="h-4 w-4" />
                Agent deployment
              </button>}
              <button
                onClick={handleRefresh}
                disabled={isRefreshing || loading}
                className="inline-flex items-center gap-2 rounded-lg border border-white/15 bg-white/[0.07] px-3.5 py-2.5 text-xs font-bold text-white transition hover:bg-white/[0.13] disabled:cursor-not-allowed disabled:opacity-60 focus:outline-none focus:ring-2 focus:ring-white/50"
              >
                <RefreshCw className={`h-4 w-4 ${isRefreshing ? 'animate-spin' : ''}`} />
                {isRefreshing ? 'Refreshing' : 'Refresh data'}
              </button>
            </div>
          </div>

          <div className="flex items-center gap-5 rounded-2xl border border-white/10 bg-slate-950/30 px-5 py-4 backdrop-blur-sm xl:min-w-[355px]">
            <div className="relative grid h-28 w-28 shrink-0 place-items-center">
              <svg className="absolute inset-0 h-full w-full -rotate-90" viewBox="0 0 100 100" aria-hidden="true">
                <circle cx="50" cy="50" r="42" fill="none" stroke="rgba(255,255,255,.10)" strokeWidth="8" />
                <circle
                  cx="50"
                  cy="50"
                  r="42"
                  fill="none"
                  stroke={health.ring}
                  strokeLinecap="round"
                  strokeWidth="8"
                  strokeDasharray={`${healthRingProgress} ${healthRingLength}`}
                  className="transition-all duration-700"
                />
              </svg>
              <div className="relative text-center">
                <p className="text-3xl font-black tracking-tight">{healthScore ?? '—'}</p>
                <p className="text-[10px] font-bold uppercase tracking-wider text-slate-400">Health score</p>
              </div>
            </div>
            <div className="min-w-0">
              <p className={`text-sm font-bold ${health.color}`}>{health.label}</p>
              <p className="mt-1 text-xs leading-5 text-slate-300">{health.detail}</p>
              <button
                onClick={() => setActiveTab('diagnostics')}
                className="mt-3 inline-flex items-center gap-1 text-xs font-bold text-white hover:text-indigo-200"
              >
                Investigate health signals <ChevronRight className="h-3.5 w-3.5" />
              </button>
            </div>
          </div>
        </div>
      </section>

      <section className="rounded-2xl border border-slate-200 bg-white shadow-sm">
        <div className="flex flex-col gap-3 border-b border-slate-100 px-5 py-4 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <div className="flex items-center gap-2">
              <span className={`grid h-8 w-8 place-items-center rounded-lg ${activeAttentionCount > 0 || (summary?.openTickets ?? 0) > 0 ? 'bg-amber-100 text-amber-700' : 'bg-emerald-100 text-emerald-700'}`}>
                {activeAttentionCount > 0 || (summary?.openTickets ?? 0) > 0 ? <AlertTriangle className="h-4 w-4" /> : <CheckCircle2 className="h-4 w-4" />}
              </span>
              <div>
                <h3 className="text-sm font-black text-slate-900">Attention required</h3>
                <p className="text-xs text-slate-500">Ranked by device condition, active findings, and outstanding work.</p>
              </div>
            </div>
          </div>
          <button onClick={() => setActiveTab('diagnostics')} className="inline-flex items-center gap-1 self-start text-xs font-bold text-indigo-700 hover:text-indigo-900 sm:self-auto">
            Open diagnostic center <ArrowUpRight className="h-3.5 w-3.5" />
          </button>
        </div>

        {loading && !summary ? (
          <div className="flex items-center gap-3 px-5 py-5">
            <RefreshCw className="h-4 w-4 animate-spin text-indigo-600" />
            <p className="text-sm font-semibold text-slate-600">Loading the current device, incident, and telemetry state…</p>
          </div>
        ) : attentionItems.length === 0 ? (
          <div className="flex items-start gap-3 px-5 py-5">
            <span className="grid h-9 w-9 shrink-0 place-items-center rounded-lg bg-emerald-50 text-emerald-600"><CheckCircle2 className="h-4 w-4" /></span>
            <div>
              <p className="text-sm font-bold text-slate-800">No urgent work is currently derived from received telemetry.</p>
              <p className="mt-1 text-xs leading-5 text-slate-500">This does not infer a healthy state for devices that have not yet sent an agent heartbeat.</p>
            </div>
          </div>
        ) : (
          <div className="grid divide-y divide-slate-100 md:grid-cols-2 md:divide-x md:divide-y-0">
            {attentionItems.map(item => {
              const tone = toneClasses[item.tone];
              return (
                <div key={item.id} className="flex items-start gap-3 px-5 py-4">
                  <span className={`grid h-9 w-9 shrink-0 place-items-center rounded-lg ${tone.icon}`}>{attentionIcon(item.tone)}</span>
                  <div className="min-w-0 flex-1">
                    <p className="text-xs font-bold text-slate-900">{item.title}</p>
                    <p className="mt-1 text-[11px] leading-5 text-slate-500">{item.detail}</p>
                    <button onClick={item.onAction} className={`mt-2 inline-flex items-center gap-1 rounded-md px-1.5 py-1 text-[11px] font-bold transition ${tone.button}`}>
                      {item.actionLabel} <ChevronRight className="h-3.5 w-3.5" />
                    </button>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </section>

      <section className="grid grid-cols-2 gap-3 lg:grid-cols-4">
        <button onClick={() => setActiveTab('devices')} className="group rounded-2xl border border-slate-200 bg-white p-4 text-left shadow-sm transition hover:-translate-y-0.5 hover:border-indigo-200 hover:shadow-md focus:outline-none focus:ring-2 focus:ring-indigo-500">
          <div className="flex items-start justify-between gap-2">
            <span className="grid h-9 w-9 place-items-center rounded-xl bg-indigo-50 text-indigo-700"><Monitor className="h-4 w-4" /></span>
            <ArrowUpRight className="h-4 w-4 text-slate-300 transition group-hover:text-indigo-600" />
          </div>
          <p className="mt-5 text-2xl font-black tracking-tight text-slate-950">{totalDevices}</p>
          <p className="mt-1 text-[11px] font-bold uppercase tracking-wide text-slate-500">Managed assets</p>
          <p className="mt-2 text-[11px] text-slate-400">Open inventory</p>
        </button>

        <button onClick={() => setActiveTab('devices')} className="group rounded-2xl border border-emerald-100 bg-white p-4 text-left shadow-sm transition hover:-translate-y-0.5 hover:border-emerald-300 hover:shadow-md focus:outline-none focus:ring-2 focus:ring-emerald-500">
          <div className="flex items-start justify-between gap-2">
            <span className="grid h-9 w-9 place-items-center rounded-xl bg-emerald-50 text-emerald-700"><Wifi className="h-4 w-4" /></span>
            <ArrowUpRight className="h-4 w-4 text-slate-300 transition group-hover:text-emerald-600" />
          </div>
          <p className="mt-5 text-2xl font-black tracking-tight text-emerald-700">{onlineDevices}</p>
          <p className="mt-1 text-[11px] font-bold uppercase tracking-wide text-slate-500">Live agents</p>
          <p className="mt-2 text-[11px] text-slate-400">{agentReportingRate === null ? 'No assets registered' : `${agentReportingRate}% of inventory reporting`}</p>
        </button>

        <button onClick={() => setActiveTab('diagnostics')} className="group rounded-2xl border border-amber-100 bg-white p-4 text-left shadow-sm transition hover:-translate-y-0.5 hover:border-amber-300 hover:shadow-md focus:outline-none focus:ring-2 focus:ring-amber-500">
          <div className="flex items-start justify-between gap-2">
            <span className="grid h-9 w-9 place-items-center rounded-xl bg-amber-50 text-amber-700"><Gauge className="h-4 w-4" /></span>
            <ArrowUpRight className="h-4 w-4 text-slate-300 transition group-hover:text-amber-600" />
          </div>
          <p className="mt-5 text-2xl font-black tracking-tight text-amber-700">{activeAttentionCount}</p>
          <p className="mt-1 text-[11px] font-bold uppercase tracking-wide text-slate-500">Attention devices</p>
          <p className="mt-2 text-[11px] text-slate-400">{criticalDevices} critical · {warningDevices} warning</p>
        </button>

        <button onClick={() => setActiveTab('tickets')} className="group rounded-2xl border border-rose-100 bg-white p-4 text-left shadow-sm transition hover:-translate-y-0.5 hover:border-rose-300 hover:shadow-md focus:outline-none focus:ring-2 focus:ring-rose-500">
          <div className="flex items-start justify-between gap-2">
            <span className="grid h-9 w-9 place-items-center rounded-xl bg-rose-50 text-rose-700"><Wrench className="h-4 w-4" /></span>
            <ArrowUpRight className="h-4 w-4 text-slate-300 transition group-hover:text-rose-600" />
          </div>
          <p className="mt-5 text-2xl font-black tracking-tight text-rose-700">{summary?.openTickets ?? 0}</p>
          <p className="mt-1 text-[11px] font-bold uppercase tracking-wide text-slate-500">Open repair work</p>
          <p className="mt-2 text-[11px] text-slate-400">{summary?.activeIssues ?? 0} active diagnostic findings</p>
        </button>
      </section>

      <section className="grid gap-5 xl:grid-cols-[minmax(0,1.35fr)_minmax(320px,0.65fr)]">
        <div className="rounded-2xl border border-slate-200 bg-white shadow-sm">
          <div className="flex flex-col gap-3 border-b border-slate-100 px-5 py-4 sm:flex-row sm:items-center sm:justify-between">
            <div>
              <div className="flex items-center gap-2">
                <span className="grid h-8 w-8 place-items-center rounded-lg bg-rose-50 text-rose-700"><ShieldAlert className="h-4 w-4" /></span>
                <div>
                  <h3 className="text-sm font-black text-slate-900">Device watchlist</h3>
                  <p className="text-xs text-slate-500">Critical and warning assets ordered by state and available health score.</p>
                </div>
              </div>
            </div>
            <button onClick={() => setActiveTab('devices')} className="inline-flex items-center gap-1 self-start text-xs font-bold text-indigo-700 hover:text-indigo-900 sm:self-auto">
              View all devices <ChevronRight className="h-3.5 w-3.5" />
            </button>
          </div>

          {problematicDevices.length === 0 ? (
            <div className="flex min-h-56 flex-col items-center justify-center px-5 text-center">
              <span className="grid h-11 w-11 place-items-center rounded-xl bg-emerald-50 text-emerald-600"><CheckCircle2 className="h-5 w-5" /></span>
              <p className="mt-3 text-sm font-bold text-slate-800">No devices are currently classified as warning or critical.</p>
              <p className="mt-1 max-w-md text-xs leading-5 text-slate-500">The watchlist updates from device state and agent telemetry; devices without telemetry remain visibly unclassified elsewhere in inventory.</p>
            </div>
          ) : (
            <div className="divide-y divide-slate-100">
              {problematicDevices.slice(0, 5).map(device => (
                <button
                  key={device.id}
                  onClick={() => onSelectDevice(device.id)}
                  className="group grid w-full grid-cols-[minmax(0,1fr)_auto] gap-3 px-5 py-4 text-left transition hover:bg-slate-50 focus:outline-none focus:ring-2 focus:ring-inset focus:ring-indigo-500"
                >
                  <div className="min-w-0">
                    <div className="flex flex-wrap items-center gap-2">
                      <span className="truncate text-sm font-bold text-slate-900">{device.deviceName}</span>
                      <StatusBadge status={device.status} size="sm" />
                    </div>
                    <p className="mt-1 truncate font-mono text-[11px] text-slate-500">{device.assetId} · {device.assignedUser || 'Unassigned user'}</p>
                    <div className="mt-3 flex flex-wrap gap-1.5">
                      <TelemetryChip label="CPU" value={formatTelemetry(device.latestTelemetry?.cpuUsagePercent, '%')} critical={typeof device.latestTelemetry?.cpuUsagePercent === 'number' && device.latestTelemetry.cpuUsagePercent > 80} />
                      <TelemetryChip label="RAM" value={formatTelemetry(device.latestTelemetry?.ramUsagePercent, '%')} critical={typeof device.latestTelemetry?.ramUsagePercent === 'number' && device.latestTelemetry.ramUsagePercent > 85} />
                      <TelemetryChip label="TEMP" value={formatTelemetry(device.latestTelemetry?.cpuTempC, '°C')} critical={typeof device.latestTelemetry?.cpuTempC === 'number' && device.latestTelemetry.cpuTempC > 80} />
                    </div>
                  </div>
                  <div className="flex flex-col items-end justify-between">
                    <div className="text-right">
                      <p className="text-lg font-black text-slate-900">{device.health?.score ?? '—'}</p>
                      <p className="text-[10px] font-bold uppercase tracking-wide text-slate-400">Health</p>
                    </div>
                    <span className="inline-flex items-center gap-1 text-[11px] font-bold text-indigo-700 group-hover:text-indigo-900">Inspect <ChevronRight className="h-3.5 w-3.5" /></span>
                  </div>
                </button>
              ))}
            </div>
          )}
        </div>

        <div className="space-y-5">
          <section className="rounded-2xl border border-slate-200 bg-white shadow-sm">
            <div className="flex items-center justify-between border-b border-slate-100 px-5 py-4">
              <div className="flex items-center gap-2">
                <span className="grid h-8 w-8 place-items-center rounded-lg bg-indigo-50 text-indigo-700"><Activity className="h-4 w-4" /></span>
                <div>
                  <h3 className="text-sm font-black text-slate-900">Operational signals</h3>
                  <p className="text-xs text-slate-500">High-risk conditions from latest reports.</p>
                </div>
              </div>
              <button onClick={() => setActiveTab('diagnostics')} className="text-xs font-bold text-indigo-700 hover:text-indigo-900">Analyze</button>
            </div>
            <div className="grid grid-cols-2 divide-x divide-y divide-slate-100">
              <SignalStat icon={<Cpu className="h-4 w-4" />} label="CPU stress" value={summary?.devicesWithHighCpu ?? 0} detail="Above 80%" tone="indigo" />
              <SignalStat icon={<Activity className="h-4 w-4" />} label="Memory pressure" value={summary?.devicesWithHighMemory ?? 0} detail="Above 85%" tone="indigo" />
              <SignalStat icon={<HardDrive className="h-4 w-4" />} label="Storage pressure" value={summary?.devicesWithLowStorage ?? 0} detail="Less than 15% free" tone="rose" />
              <SignalStat icon={<Thermometer className="h-4 w-4" />} label="Thermal events" value={summary?.devicesWithHighTemp ?? 0} detail="Above 80°C" tone="rose" />
            </div>
          </section>

          <section className="rounded-2xl border border-slate-200 bg-white shadow-sm">
            <div className="flex items-center justify-between border-b border-slate-100 px-5 py-4">
              <div className="flex items-center gap-2">
                <span className="grid h-8 w-8 place-items-center rounded-lg bg-sky-50 text-sky-700"><Wifi className="h-4 w-4" /></span>
                <div>
                  <h3 className="text-sm font-black text-slate-900">Network posture</h3>
                  <p className="text-xs text-slate-500">From agent Wi-Fi and network diagnostic reports.</p>
                </div>
              </div>
              <button onClick={() => setActiveTab('diagnostics')} className="text-xs font-bold text-indigo-700 hover:text-indigo-900">Network findings</button>
            </div>
            <NetworkPosture summary={summary} />
          </section>
        </div>
      </section>

      <section className="grid gap-5 lg:grid-cols-2">
        <section className="rounded-2xl border border-slate-200 bg-white shadow-sm">
          <div className="flex items-center justify-between border-b border-slate-100 px-5 py-4">
            <div className="flex items-center gap-2">
              <span className="grid h-8 w-8 place-items-center rounded-lg bg-violet-50 text-violet-700"><Wrench className="h-4 w-4" /></span>
              <div>
                <h3 className="text-sm font-black text-slate-900">Recent repair tickets</h3>
                <p className="text-xs text-slate-500">Open the work queue for assignment, repair, and verification status.</p>
              </div>
            </div>
            <button onClick={() => setActiveTab('tickets')} className="inline-flex items-center gap-1 text-xs font-bold text-indigo-700 hover:text-indigo-900">Manage queue <ChevronRight className="h-3.5 w-3.5" /></button>
          </div>
          <TicketQueue tickets={summary?.recentTickets ?? []} onOpen={() => setActiveTab('tickets')} />
        </section>

        <section className="rounded-2xl border border-slate-200 bg-white shadow-sm">
          <div className="flex items-center justify-between border-b border-slate-100 px-5 py-4">
            <div className="flex items-center gap-2">
              <span className="grid h-8 w-8 place-items-center rounded-lg bg-amber-50 text-amber-700"><AlertTriangle className="h-4 w-4" /></span>
              <div>
                <h3 className="text-sm font-black text-slate-900">Recent event stream</h3>
                <p className="text-xs text-slate-500">Latest operational notifications received by the platform.</p>
              </div>
            </div>
            <span className="rounded-md bg-slate-100 px-2 py-1 font-mono text-[10px] font-bold text-slate-500">LIVE DATA</span>
          </div>
          <AlertStream alerts={summary?.recentAlerts ?? []} onOpen={goToDevice} />
        </section>
      </section>
    </div>
  );
};

const TelemetryChip: React.FC<{ label: string; value: string; critical: boolean }> = ({ label, value, critical }) => (
  <span className={`inline-flex items-center gap-1 rounded-md border px-2 py-1 font-mono text-[10px] font-bold ${critical ? 'border-rose-200 bg-rose-50 text-rose-700' : 'border-slate-200 bg-slate-50 text-slate-600'}`}>
    <span className="text-slate-400">{label}</span>
    {value}
  </span>
);

const SignalStat: React.FC<{ icon: React.ReactNode; label: string; value: number; detail: string; tone: 'indigo' | 'rose' }> = ({ icon, label, value, detail, tone }) => (
  <div className="p-4">
    <div className={`grid h-8 w-8 place-items-center rounded-lg ${tone === 'rose' ? 'bg-rose-50 text-rose-700' : 'bg-indigo-50 text-indigo-700'}`}>{icon}</div>
    <p className={`mt-3 text-xl font-black ${value > 0 ? tone === 'rose' ? 'text-rose-700' : 'text-indigo-700' : 'text-slate-900'}`}>{value}</p>
    <p className="mt-0.5 text-[11px] font-bold text-slate-700">{label}</p>
    <p className="mt-0.5 text-[10px] text-slate-400">{detail}</p>
  </div>
);

const NetworkPosture: React.FC<{ summary: ReturnType<typeof useMonitoring>['summary'] }> = ({ summary }) => {
  const network = summary?.networkHealth;
  const hasReports = (network?.monitoredDevices ?? 0) > 0;
  const incidents = network?.activeIncidents ?? 0;
  const faultCount = (network?.limited ?? 0) + (network?.noInternet ?? 0) + (network?.localNetworkError ?? 0) + (network?.dnsError ?? 0) + (network?.critical ?? 0);

  if (!hasReports) {
    return (
      <div className="px-5 py-5">
        <div className="flex items-start gap-3">
          <span className="grid h-9 w-9 shrink-0 place-items-center rounded-lg bg-slate-100 text-slate-500"><WifiOff className="h-4 w-4" /></span>
          <div>
            <p className="text-xs font-bold text-slate-800">No fresh network diagnostics are available.</p>
            <p className="mt-1 text-[11px] leading-5 text-slate-500">
              {(network?.stale ?? 0) > 0 ? 'Only stale reports exist. Run a fresh device diagnostic before using them for operational decisions.' : 'Devices remain unclassified until a compatible agent uploads a real network test.'}
            </p>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="px-5 py-4">
      <div className="grid grid-cols-3 gap-2">
        <NetworkMetric label="Fresh reports" value={network?.monitoredDevices ?? 0} tone="slate" />
        <NetworkMetric label="Online" value={network?.online ?? 0} tone="emerald" />
        <NetworkMetric label="Fault signals" value={faultCount} tone={faultCount > 0 ? 'rose' : 'slate'} />
      </div>
      <div className="mt-3 flex flex-wrap gap-2 text-[10px] font-bold">
        {(network?.activeIncidents ?? 0) > 0 && <span className="rounded-md bg-rose-50 px-2 py-1 text-rose-700">{incidents} network incident{incidents === 1 ? '' : 's'}</span>}
        {(network?.stale ?? 0) > 0 && <span className="rounded-md bg-slate-100 px-2 py-1 text-slate-600">{network?.stale} stale report{network?.stale === 1 ? '' : 's'}</span>}
        {(network?.clusters?.length ?? 0) > 0 && <span className="rounded-md bg-amber-50 px-2 py-1 text-amber-800">{network?.clusters.length} shared-environment signal{network?.clusters.length === 1 ? '' : 's'}</span>}
      </div>
      {(network?.clusters?.length ?? 0) > 0 && (
        <div className="mt-3 space-y-2">
          {network?.clusters.slice(0, 2).map(cluster => (
            <div key={cluster.locationId} className="rounded-lg border border-amber-200 bg-amber-50 px-3 py-2">
              <p className="text-[11px] font-bold text-amber-900">Potential shared issue · {cluster.locationName}</p>
              <p className="mt-0.5 text-[10px] leading-4 text-amber-800">{cluster.affectedDevices} devices reported faults within {cluster.detectedWithinMinutes} minutes. Check {cluster.possibleSharedCause || 'the shared network environment'}.</p>
            </div>
          ))}
        </div>
      )}
    </div>
  );
};

const NetworkMetric: React.FC<{ label: string; value: number; tone: 'slate' | 'emerald' | 'rose' }> = ({ label, value, tone }) => {
  const classes = tone === 'emerald'
    ? 'border-emerald-100 bg-emerald-50 text-emerald-700'
    : tone === 'rose'
      ? 'border-rose-100 bg-rose-50 text-rose-700'
      : 'border-slate-200 bg-slate-50 text-slate-700';
  return (
    <div className={`rounded-lg border px-2.5 py-2 ${classes}`}>
      <p className="text-[9px] font-bold uppercase tracking-wide opacity-70">{label}</p>
      <p className="mt-0.5 text-lg font-black">{value}</p>
    </div>
  );
};

const TicketQueue: React.FC<{ tickets: NonNullable<ReturnType<typeof useMonitoring>['summary']>['recentTickets']; onOpen: () => void }> = ({ tickets, onOpen }) => {
  if (tickets.length === 0) {
    return (
      <div className="flex min-h-48 flex-col items-center justify-center px-5 text-center">
        <span className="grid h-10 w-10 place-items-center rounded-xl bg-emerald-50 text-emerald-600"><CheckCircle2 className="h-5 w-5" /></span>
        <p className="mt-3 text-sm font-bold text-slate-800">No open repair tickets.</p>
        <p className="mt-1 text-xs text-slate-500">New incidents and assignments will appear here when they are created.</p>
      </div>
    );
  }

  return (
    <div className="divide-y divide-slate-100">
      {tickets.slice(0, 5).map(ticket => (
        <button key={ticket.id} onClick={onOpen} className="group flex w-full items-center justify-between gap-3 px-5 py-3.5 text-left transition hover:bg-slate-50 focus:outline-none focus:ring-2 focus:ring-inset focus:ring-indigo-500">
          <div className="min-w-0">
            <div className="flex flex-wrap items-center gap-2">
              <span className="font-mono text-[11px] font-bold text-slate-700">{ticket.ticketNumber}</span>
              <SeverityBadge severity={ticket.severity} size="sm" />
              <span className="truncate text-xs font-bold text-slate-900">{ticket.deviceName}</span>
            </div>
            <p className="mt-1 truncate text-[11px] text-slate-500">{ticket.description}</p>
          </div>
          <div className="shrink-0 text-right">
            <StatusBadge status={ticket.status} size="sm" />
            <ChevronRight className="ml-auto mt-1 h-3.5 w-3.5 text-slate-300 group-hover:text-indigo-600" />
          </div>
        </button>
      ))}
    </div>
  );
};

const AlertStream: React.FC<{ alerts: SystemNotification[]; onOpen: (deviceId?: string) => void }> = ({ alerts, onOpen }) => {
  if (alerts.length === 0) {
    return (
      <div className="flex min-h-48 flex-col items-center justify-center px-5 text-center">
        <span className="grid h-10 w-10 place-items-center rounded-xl bg-slate-100 text-slate-500"><Clock className="h-5 w-5" /></span>
        <p className="mt-3 text-sm font-bold text-slate-800">No recent operational events.</p>
        <p className="mt-1 text-xs text-slate-500">New alerts will appear when the service receives a relevant device or workflow event.</p>
      </div>
    );
  }

  const dotClass: Record<SystemNotification['type'], string> = {
    critical: 'bg-rose-500',
    warning: 'bg-amber-500',
    ticket: 'bg-violet-500',
    offline: 'bg-slate-500',
    info: 'bg-sky-500'
  };

  return (
    <div className="max-h-[360px] divide-y divide-slate-100 overflow-y-auto">
      {alerts.slice(0, 8).map(alert => (
        <button key={alert.id} onClick={() => onOpen(alert.deviceId)} className="group flex w-full gap-3 px-5 py-3.5 text-left transition hover:bg-slate-50 focus:outline-none focus:ring-2 focus:ring-inset focus:ring-indigo-500">
          <span className={`mt-1.5 h-2 w-2 shrink-0 rounded-full ${dotClass[alert.type]}`} />
          <span className="min-w-0 flex-1">
            <span className="flex flex-wrap items-center justify-between gap-x-3 gap-y-1">
              <span className="text-xs font-bold text-slate-900">{alert.title}</span>
              <span className="shrink-0 font-mono text-[10px] text-slate-400">{new Date(alert.createdAt).toLocaleTimeString()}</span>
            </span>
            <span className="mt-1 block text-[11px] leading-5 text-slate-500">{alert.message}</span>
          </span>
          <ChevronRight className="mt-1 h-3.5 w-3.5 shrink-0 text-slate-300 group-hover:text-indigo-600" />
        </button>
      ))}
    </div>
  );
};
