import React, { useEffect, useMemo, useState } from 'react';
import {
  Building2,
  Download,
  LayoutGrid,
  List as ListIcon,
  MapPin,
  Monitor,
  Plus,
  RefreshCw,
  Search,
  ServerCog,
  SlidersHorizontal,
  X
} from 'lucide-react';
import { DeviceCard } from './DeviceCard';
import { useMonitoring } from '../../context/MonitoringContext';
import { Department, Device, Location } from '../../types/index';
import { StatusBadge } from '../common/Badge';

interface DeviceListProps {
  onSelectDevice: (deviceId: string) => void;
}

const relativeTime = (value?: string) => {
  if (!value) return 'No heartbeat received';
  const timestamp = new Date(value).getTime();
  if (Number.isNaN(timestamp)) return 'Time unavailable';
  const seconds = Math.max(0, Math.round((Date.now() - timestamp) / 1000));
  if (seconds < 15) return 'Just now';
  if (seconds < 60) return `${seconds}s ago`;
  const minutes = Math.floor(seconds / 60);
  if (minutes < 60) return `${minutes}m ago`;
  const hours = Math.floor(minutes / 60);
  if (hours < 24) return `${hours}h ago`;
  return `${Math.floor(hours / 24)}d ago`;
};

const metric = (value: number | undefined) => value === undefined ? '--' : `${Math.round(value)}%`;

export const DeviceList: React.FC<DeviceListProps> = ({ onSelectDevice }) => {
  const {
    devices,
    setIsAddModalOpen,
    setIsInstallModalOpen,
    setInstallTargetDevice,
    refreshData
  } = useMonitoring();

  const [statusFilter, setStatusFilter] = useState<string>('ALL');
  const [departmentFilter, setDepartmentFilter] = useState<string>('ALL');
  const [locationFilter, setLocationFilter] = useState<string>('ALL');
  const [searchQuery, setSearchQuery] = useState<string>('');
  const [viewMode, setViewMode] = useState<'grid' | 'table'>('grid');
  const [departments, setDepartments] = useState<Department[]>([]);
  const [locations, setLocations] = useState<Location[]>([]);
  const [isRefreshing, setIsRefreshing] = useState(false);

  useEffect(() => {
    fetch('/api/org/departments')
      .then((response) => response.ok ? response.json() : [])
      .then(setDepartments)
      .catch(() => setDepartments([]));
    fetch('/api/org/locations')
      .then((response) => response.ok ? response.json() : [])
      .then(setLocations)
      .catch(() => setLocations([]));
  }, []);

  const filteredDevices = useMemo(() => devices.filter((device) => {
    if (statusFilter !== 'ALL' && device.status !== statusFilter) return false;
    if (departmentFilter !== 'ALL' && device.departmentId !== departmentFilter) return false;
    if (locationFilter !== 'ALL' && device.locationId !== locationFilter) return false;

    if (!searchQuery.trim()) return true;
    const query = searchQuery.trim().toLowerCase();
    return [
      device.deviceName,
      device.assetId,
      device.assignedUser,
      device.serialNumber,
      device.ipAddress,
      device.operatingSystem
    ].some((value) => (value || '').toLowerCase().includes(query));
  }), [departmentFilter, devices, locationFilter, searchQuery, statusFilter]);

  const statusTabs = useMemo(() => [
    { id: 'ALL', label: 'All devices', count: devices.length },
    { id: 'Online', label: 'Online', count: devices.filter((device) => device.status === 'Online').length },
    { id: 'Warning', label: 'Warning', count: devices.filter((device) => device.status === 'Warning').length },
    { id: 'Critical', label: 'Critical', count: devices.filter((device) => device.status === 'Critical').length },
    { id: 'Offline', label: 'Offline', count: devices.filter((device) => device.status === 'Offline').length },
    { id: 'Waiting for Agent Connection', label: 'Waiting for agent', count: devices.filter((device) => device.status === 'Waiting for Agent Connection').length },
    { id: 'Maintenance', label: 'Maintenance', count: devices.filter((device) => device.status === 'Maintenance').length }
  ], [devices]);

  const liveAgentCount = devices.filter((device) => device.connectionState === 'connected').length;
  const attentionCount = devices.filter((device) => device.status === 'Warning' || device.status === 'Critical' || Number(device.activeIssueCount || 0) > 0).length;
  const waitingCount = devices.filter((device) => device.connectionState === 'never_connected' || device.status === 'Waiting for Agent Connection').length;
  const maintenanceCount = devices.filter((device) => device.status === 'Maintenance').length;
  const hasActiveFilters = statusFilter !== 'ALL' || departmentFilter !== 'ALL' || locationFilter !== 'ALL' || Boolean(searchQuery.trim());

  const clearFilters = () => {
    setStatusFilter('ALL');
    setDepartmentFilter('ALL');
    setLocationFilter('ALL');
    setSearchQuery('');
  };

  const refreshInventory = async () => {
    setIsRefreshing(true);
    await refreshData();
    setIsRefreshing(false);
  };

  return (
    <div className="space-y-5">
      <section className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-[0_1px_2px_rgba(15,23,42,0.04)]">
        <div className="flex flex-col gap-5 p-5 lg:flex-row lg:items-center lg:justify-between">
          <div className="flex min-w-0 items-start gap-3.5">
            <div className="grid h-11 w-11 shrink-0 place-items-center rounded-xl bg-gradient-to-br from-indigo-700 to-violet-600 text-white shadow-lg shadow-indigo-200">
              <ServerCog className="h-5 w-5" />
            </div>
            <div className="min-w-0">
              <div className="flex flex-wrap items-center gap-2">
                <p className="text-[10px] font-bold uppercase tracking-[0.16em] text-indigo-600">Asset intelligence</p>
                <span className="rounded-full border border-slate-200 bg-slate-50 px-2 py-0.5 text-[10px] font-semibold text-slate-600">{devices.length} registered</span>
              </div>
              <h2 className="mt-1 text-xl font-extrabold tracking-tight text-slate-950">Device inventory</h2>
              <p className="mt-1 max-w-2xl text-sm text-slate-500">Manage registered workstations, verify agent connectivity, and open a device record for its evidence and maintenance history.</p>
            </div>
          </div>
          <div className="flex flex-wrap items-center gap-2">
            <button
              type="button"
              onClick={() => {
                setInstallTargetDevice(null);
                setIsInstallModalOpen(true);
              }}
              className="inline-flex items-center gap-2 rounded-xl border border-slate-200 bg-white px-3.5 py-2.5 text-xs font-bold text-slate-700 transition hover:border-indigo-200 hover:bg-indigo-50 hover:text-indigo-700 focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:ring-offset-2"
            >
              <Download className="h-4 w-4" />
              Agent setup
            </button>
            <button
              id="btn-register-device-top"
              type="button"
              onClick={() => setIsAddModalOpen(true)}
              className="inline-flex items-center gap-2 rounded-xl bg-indigo-600 px-4 py-2.5 text-xs font-bold text-white shadow-sm shadow-indigo-200 transition hover:bg-indigo-700 focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:ring-offset-2"
            >
              <Plus className="h-4 w-4" />
              Register computer
            </button>
          </div>
        </div>

        <div className="app-device-summary-grid grid border-t border-slate-100 sm:grid-cols-2 xl:grid-cols-4">
          {[
            { label: 'Agent connected', value: liveAgentCount, detail: 'Authenticated recent heartbeats', tone: 'text-emerald-700', dot: 'bg-emerald-500' },
            { label: 'Needs attention', value: attentionCount, detail: 'Warning, critical, or active findings', tone: attentionCount ? 'text-amber-700' : 'text-slate-700', dot: attentionCount ? 'bg-amber-500' : 'bg-slate-300' },
            { label: 'Setup pending', value: waitingCount, detail: 'Registered but not paired yet', tone: waitingCount ? 'text-sky-700' : 'text-slate-700', dot: waitingCount ? 'bg-sky-500' : 'bg-slate-300' },
            { label: 'In maintenance', value: maintenanceCount, detail: 'Lifecycle state reported by IT', tone: maintenanceCount ? 'text-violet-700' : 'text-slate-700', dot: maintenanceCount ? 'bg-violet-500' : 'bg-slate-300' }
          ].map((summary) => (
            <div key={summary.label} className="border-b border-slate-100 px-5 py-4 last:border-b-0 xl:border-b-0 xl:border-l xl:first:border-l-0">
              <div className="flex items-center gap-2 text-[10px] font-bold uppercase tracking-[0.12em] text-slate-400"><span className={`h-1.5 w-1.5 rounded-full ${summary.dot}`} />{summary.label}</div>
              <p className={`mt-1 text-2xl font-black tabular-nums ${summary.tone}`}>{summary.value}</p>
              <p className="mt-0.5 text-[11px] text-slate-500">{summary.detail}</p>
            </div>
          ))}
        </div>
      </section>

      <section className="rounded-2xl border border-slate-200 bg-white p-4 shadow-[0_1px_2px_rgba(15,23,42,0.04)]">
        <div className="flex flex-col gap-3 border-b border-slate-100 pb-3 lg:flex-row lg:items-center lg:justify-between">
          <div className="flex min-w-0 items-center gap-2.5">
            <div className="grid h-8 w-8 shrink-0 place-items-center rounded-lg bg-slate-100 text-slate-600"><SlidersHorizontal className="h-4 w-4" /></div>
            <div className="min-w-0">
              <h3 className="text-sm font-bold text-slate-900">Find devices</h3>
              <p className="truncate text-[11px] text-slate-500">Showing {filteredDevices.length} of {devices.length} registered assets</p>
            </div>
          </div>
          <div className="flex items-center gap-2 self-end lg:self-auto">
            <button
              type="button"
              onClick={refreshInventory}
              disabled={isRefreshing}
              className="inline-flex items-center gap-1.5 rounded-lg px-2.5 py-2 text-[11px] font-bold text-slate-600 transition hover:bg-slate-100 hover:text-slate-950 disabled:cursor-wait disabled:opacity-60"
              title="Refresh inventory data"
            >
              <RefreshCw className={`h-3.5 w-3.5 ${isRefreshing ? 'animate-spin' : ''}`} />
              Refresh
            </button>
            {hasActiveFilters && (
              <button type="button" onClick={clearFilters} className="inline-flex items-center gap-1.5 rounded-lg px-2.5 py-2 text-[11px] font-bold text-indigo-700 transition hover:bg-indigo-50">
                <X className="h-3.5 w-3.5" />
                Clear filters
              </button>
            )}
            <div className="flex items-center rounded-lg border border-slate-200 bg-slate-50 p-0.5" aria-label="Device view">
              <button type="button" onClick={() => setViewMode('grid')} className={`grid h-7 w-7 place-items-center rounded-md transition ${viewMode === 'grid' ? 'bg-white text-indigo-700 shadow-sm' : 'text-slate-400 hover:text-slate-700'}`} aria-label="Card view" title="Card view"><LayoutGrid className="h-3.5 w-3.5" /></button>
              <button type="button" onClick={() => setViewMode('table')} className={`grid h-7 w-7 place-items-center rounded-md transition ${viewMode === 'table' ? 'bg-white text-indigo-700 shadow-sm' : 'text-slate-400 hover:text-slate-700'}`} aria-label="Table view" title="Table view"><ListIcon className="h-3.5 w-3.5" /></button>
            </div>
          </div>
        </div>

        <div className="mt-3 flex gap-1.5 overflow-x-auto pb-1">
          {statusTabs.map((tab) => (
            <button
              key={tab.id}
              type="button"
              onClick={() => setStatusFilter(tab.id)}
              className={`inline-flex shrink-0 items-center gap-1.5 rounded-lg px-2.5 py-1.5 text-[11px] font-bold transition ${
                statusFilter === tab.id
                  ? 'bg-slate-950 text-white shadow-sm'
                  : 'text-slate-600 hover:bg-slate-100 hover:text-slate-950'
              }`}
            >
              {tab.label}
              <span className={`rounded-md px-1.5 py-0.5 text-[10px] tabular-nums ${statusFilter === tab.id ? 'bg-white/15 text-white' : 'bg-slate-100 text-slate-500'}`}>{tab.count}</span>
            </button>
          ))}
        </div>

        <div className="mt-3 grid gap-2 md:grid-cols-[minmax(0,1fr)_auto_auto]">
          <label className="relative block min-w-0">
            <span className="sr-only">Search devices</span>
            <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
            <input
              id="search-device-input"
              type="search"
              value={searchQuery}
              onChange={(event) => setSearchQuery(event.target.value)}
              placeholder="Search asset ID, computer name, user, serial, IP, or operating system"
              className="w-full rounded-xl border border-slate-200 bg-slate-50 py-2.5 pl-9 pr-3 text-xs text-slate-900 outline-none transition placeholder:text-slate-400 focus:border-indigo-400 focus:bg-white focus:ring-4 focus:ring-indigo-50"
            />
          </label>

          <label className="flex min-w-0 items-center gap-2 rounded-xl border border-slate-200 bg-slate-50 px-3 py-2 text-slate-500 focus-within:border-indigo-400 focus-within:bg-white focus-within:ring-4 focus-within:ring-indigo-50">
            <Building2 className="h-3.5 w-3.5 shrink-0" />
            <span className="sr-only">Department</span>
            <select value={departmentFilter} onChange={(event) => setDepartmentFilter(event.target.value)} className="min-w-0 bg-transparent text-xs font-medium text-slate-700 outline-none">
              <option value="ALL">All departments</option>
              {departments.map((department) => <option key={department.id} value={department.id}>{department.name}</option>)}
            </select>
          </label>

          <label className="flex min-w-0 items-center gap-2 rounded-xl border border-slate-200 bg-slate-50 px-3 py-2 text-slate-500 focus-within:border-indigo-400 focus-within:bg-white focus-within:ring-4 focus-within:ring-indigo-50">
            <MapPin className="h-3.5 w-3.5 shrink-0" />
            <span className="sr-only">Location</span>
            <select value={locationFilter} onChange={(event) => setLocationFilter(event.target.value)} className="min-w-0 bg-transparent text-xs font-medium text-slate-700 outline-none">
              <option value="ALL">All locations / labs</option>
              {locations.map((location) => <option key={location.id} value={location.id}>{location.name}</option>)}
            </select>
          </label>
        </div>
      </section>

      {filteredDevices.length === 0 ? (
        <section className="rounded-2xl border border-dashed border-slate-300 bg-white px-6 py-16 text-center">
          <div className="mx-auto grid h-12 w-12 place-items-center rounded-2xl bg-slate-100 text-slate-400"><Monitor className="h-6 w-6" /></div>
          <h3 className="mt-4 text-base font-bold text-slate-900">{devices.length === 0 ? 'No registered computers yet' : 'No devices match these filters'}</h3>
          <p className="mx-auto mt-1.5 max-w-lg text-sm leading-6 text-slate-500">
            {devices.length === 0
              ? 'Register a real PC or laptop to generate a pairing code. It will remain waiting for an agent until an authenticated heartbeat arrives.'
              : 'Adjust or clear the current filters to return to the full monitored inventory.'}
          </p>
          <div className="mt-5 flex flex-wrap justify-center gap-2">
            {devices.length === 0 ? (
              <button id="empty-state-add-btn" type="button" onClick={() => setIsAddModalOpen(true)} className="inline-flex items-center gap-2 rounded-xl bg-indigo-600 px-4 py-2.5 text-xs font-bold text-white shadow-sm transition hover:bg-indigo-700"><Plus className="h-4 w-4" />Register first computer</button>
            ) : (
              <button type="button" onClick={clearFilters} className="inline-flex items-center gap-2 rounded-xl border border-slate-200 px-4 py-2.5 text-xs font-bold text-slate-700 transition hover:bg-slate-50"><X className="h-4 w-4" />Clear all filters</button>
            )}
          </div>
        </section>
      ) : viewMode === 'grid' ? (
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-3">
          {filteredDevices.map((device) => (
            <DeviceCard
              key={device.id}
              device={device}
              onClick={() => onSelectDevice(device.id)}
              onInstallClick={() => {
                setInstallTargetDevice(device);
                setIsInstallModalOpen(true);
              }}
            />
          ))}
        </div>
      ) : (
        <section className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-[0_1px_2px_rgba(15,23,42,0.04)]">
          <div className="overflow-x-auto">
            <table className="min-w-[960px] w-full text-left text-xs">
              <thead className="border-b border-slate-200 bg-slate-50/80 text-[10px] font-bold uppercase tracking-[0.1em] text-slate-500">
                <tr>
                  <th className="px-5 py-3.5">Device</th>
                  <th className="px-4 py-3.5">Connection</th>
                  <th className="px-4 py-3.5">Health</th>
                  <th className="px-4 py-3.5">Owner / location</th>
                  <th className="px-4 py-3.5">Reported telemetry</th>
                  <th className="px-5 py-3.5">Last signal</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {filteredDevices.map((device: Device) => {
                  const telemetry = device.latestTelemetry;
                  const diskUsage = telemetry?.storage?.[0]?.usagePercent;
                  const locationName = locations.find((location) => location.id === device.locationId)?.name || 'Location not assigned';
                  const healthScore = device.health?.score;
                  const connected = device.connectionState === 'connected';
                  return (
                    <tr key={device.id} onClick={() => onSelectDevice(device.id)} className="cursor-pointer transition hover:bg-indigo-50/50 focus-within:bg-indigo-50/50">
                      <td className="px-5 py-3.5">
                        <div className="flex items-center gap-2.5">
                          <div className="grid h-8 w-8 place-items-center rounded-lg bg-slate-100 text-slate-600"><Monitor className="h-4 w-4" /></div>
                          <div>
                            <button type="button" onClick={(event) => { event.stopPropagation(); onSelectDevice(device.id); }} className="font-bold text-slate-900 hover:text-indigo-700 focus:outline-none focus:underline">{device.deviceName}</button>
                            <p className="mt-0.5 font-mono text-[10px] font-semibold uppercase tracking-wide text-slate-400">{device.assetId} / {device.deviceType}</p>
                          </div>
                        </div>
                      </td>
                      <td className="px-4 py-3.5"><StatusBadge status={device.status} size="sm" /></td>
                      <td className="px-4 py-3.5">
                        {healthScore === null || healthScore === undefined ? <span className="text-slate-400">Unavailable</span> : <span className={`font-black tabular-nums ${healthScore >= 75 ? 'text-emerald-700' : healthScore >= 60 ? 'text-amber-700' : 'text-rose-700'}`}>{healthScore}/100</span>}
                      </td>
                      <td className="px-4 py-3.5">
                        <p className="font-medium text-slate-700">{device.assignedUser || 'Unassigned user'}</p>
                        <p className="mt-0.5 text-[10px] text-slate-500">{locationName}</p>
                      </td>
                      <td className="px-4 py-3.5">
                        {telemetry ? <div className="flex items-center gap-3 font-bold tabular-nums text-slate-700"><span>CPU {metric(telemetry.cpuUsagePercent)}</span><span>RAM {metric(telemetry.ramUsagePercent)}</span><span>Disk {metric(diskUsage)}</span></div> : <span className="text-slate-400">No telemetry received</span>}
                      </td>
                      <td className="px-5 py-3.5">
                        <p className={`font-semibold ${connected ? 'text-emerald-700' : 'text-slate-600'}`}>{relativeTime(device.lastHeartbeatAt)}</p>
                        <p className="mt-0.5 text-[10px] text-slate-400">{connected ? 'Agent connected' : device.connectionState === 'never_connected' ? 'Agent not paired' : 'Last known state'}</p>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </section>
      )}
    </div>
  );
};
