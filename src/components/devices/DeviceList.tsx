import React, { useState, useEffect } from 'react';
import { 
  Plus, 
  Search, 
  Filter, 
  LayoutGrid, 
  List as ListIcon, 
  Monitor, 
  Download, 
  RefreshCw,
  MapPin,
  Building2,
  AlertCircle
} from 'lucide-react';
import { DeviceCard } from './DeviceCard';
import { useMonitoring } from '../../context/MonitoringContext';
import { Device, Department, Location } from '../../types/index';
import { StatusBadge } from '../common/Badge';

interface DeviceListProps {
  onSelectDevice: (deviceId: string) => void;
}

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

  useEffect(() => {
    fetch('/api/org/departments').then(res => res.json()).then(setDepartments).catch(console.error);
    fetch('/api/org/locations').then(res => res.json()).then(setLocations).catch(console.error);
  }, []);

  const filteredDevices = devices.filter(device => {
    // Status filter
    if (statusFilter !== 'ALL' && device.status !== statusFilter) {
      return false;
    }
    // Department filter
    if (departmentFilter !== 'ALL' && device.departmentId !== departmentFilter) {
      return false;
    }
    // Location filter
    if (locationFilter !== 'ALL' && device.locationId !== locationFilter) {
      return false;
    }
    // Search query
    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase();
      const matchName = device.deviceName.toLowerCase().includes(q);
      const matchAsset = device.assetId.toLowerCase().includes(q);
      const matchUser = (device.assignedUser || '').toLowerCase().includes(q);
      const matchSerial = (device.serialNumber || '').toLowerCase().includes(q);
      const matchIp = (device.ipAddress || '').includes(q);
      if (!matchName && !matchAsset && !matchUser && !matchSerial && !matchIp) {
        return false;
      }
    }
    return true;
  });

  const statusTabs = [
    { id: 'ALL', label: 'All Devices', count: devices.length },
    { id: 'Online', label: 'Online', count: devices.filter(d => d.status === 'Online').length },
    { id: 'Warning', label: 'Warning', count: devices.filter(d => d.status === 'Warning').length },
    { id: 'Critical', label: 'Critical', count: devices.filter(d => d.status === 'Critical').length },
    { id: 'Offline', label: 'Offline', count: devices.filter(d => d.status === 'Offline').length },
    { id: 'Waiting for Agent Connection', label: 'Waiting Agent', count: devices.filter(d => d.status === 'Waiting for Agent Connection').length },
    { id: 'Maintenance', label: 'Maintenance', count: devices.filter(d => d.status === 'Maintenance').length }
  ];

  return (
    <div className="space-y-4">
      {/* Header with Title and Registration Action */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 bg-white p-4 rounded-xl border border-slate-200 shadow-xs">
        <div>
          <h2 className="text-lg font-bold text-slate-900">Computer & Laptop Inventory</h2>
          <p className="text-xs text-slate-500">
            Monitored workstations, laptops, and lab devices across all campus departments.
          </p>
        </div>
        <div className="flex items-center gap-2">
          <button
            onClick={() => {
              setInstallTargetDevice(null);
              setIsInstallModalOpen(true);
            }}
            className="flex items-center gap-1.5 px-3 py-2 rounded-lg text-xs font-semibold bg-slate-100 text-slate-700 hover:bg-slate-200 transition-colors"
          >
            <Download className="w-3.5 h-3.5" />
            <span>Agent Setup Guide</span>
          </button>
          <button
            id="btn-register-device-top"
            onClick={() => setIsAddModalOpen(true)}
            className="flex items-center gap-1.5 px-3.5 py-2 rounded-lg text-xs font-bold bg-indigo-600 text-white hover:bg-indigo-700 transition-all shadow-xs"
          >
            <Plus className="w-4 h-4" />
            <span>Register Computer</span>
          </button>
        </div>
      </div>

      {/* Filter and Search Bar */}
      <div className="bg-white p-3 rounded-xl border border-slate-200 shadow-xs space-y-3">
        {/* Status Tabs */}
        <div className="flex items-center gap-1.5 overflow-x-auto pb-1 border-b border-slate-100">
          {statusTabs.map(tab => (
            <button
              key={tab.id}
              onClick={() => setStatusFilter(tab.id)}
              className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition-all whitespace-nowrap flex items-center gap-1.5 ${
                statusFilter === tab.id
                  ? 'bg-slate-900 text-white shadow-xs'
                  : 'text-slate-600 hover:bg-slate-100'
              }`}
            >
              <span>{tab.label}</span>
              <span className={`px-1.5 py-0.2 rounded text-[10px] ${
                statusFilter === tab.id ? 'bg-slate-700 text-white' : 'bg-slate-200 text-slate-700'
              }`}>
                {tab.count}
              </span>
            </button>
          ))}
        </div>

        {/* Dropdowns, Search, and View Mode */}
        <div className="flex flex-col md:flex-row items-center justify-between gap-2.5">
          <div className="flex flex-wrap items-center gap-2 w-full md:w-auto">
            {/* Search */}
            <div className="relative flex-1 sm:w-64">
              <Search className="w-3.5 h-3.5 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
              <input
                id="search-device-input"
                type="text"
                value={searchQuery}
                onChange={e => setSearchQuery(e.target.value)}
                placeholder="Search name, asset ID, IP, user..."
                className="w-full pl-8 pr-3 py-1.5 bg-slate-50 border border-slate-200 rounded-lg text-xs text-slate-800 placeholder-slate-400 focus:outline-none focus:ring-1 focus:ring-indigo-500 focus:bg-white"
              />
            </div>

            {/* Department Dropdown */}
            <div className="flex items-center gap-1 bg-slate-50 border border-slate-200 rounded-lg px-2 py-1">
              <Building2 className="w-3.5 h-3.5 text-slate-400" />
              <select
                value={departmentFilter}
                onChange={e => setDepartmentFilter(e.target.value)}
                className="bg-transparent text-xs text-slate-700 focus:outline-none cursor-pointer"
              >
                <option value="ALL">All Departments</option>
                {departments.map(d => (
                  <option key={d.id} value={d.id}>{d.name}</option>
                ))}
              </select>
            </div>

            {/* Location Dropdown */}
            <div className="flex items-center gap-1 bg-slate-50 border border-slate-200 rounded-lg px-2 py-1">
              <MapPin className="w-3.5 h-3.5 text-slate-400" />
              <select
                value={locationFilter}
                onChange={e => setLocationFilter(e.target.value)}
                className="bg-transparent text-xs text-slate-700 focus:outline-none cursor-pointer"
              >
                <option value="ALL">All Locations / Labs</option>
                {locations.map(l => (
                  <option key={l.id} value={l.id}>{l.name}</option>
                ))}
              </select>
            </div>
          </div>

          {/* View Mode Toggle */}
          <div className="flex items-center gap-1 bg-slate-100 p-1 rounded-lg self-end md:self-auto">
            <button
              onClick={() => setViewMode('grid')}
              className={`p-1 rounded ${viewMode === 'grid' ? 'bg-white shadow-xs text-slate-900' : 'text-slate-500 hover:text-slate-900'}`}
              title="Grid View"
            >
              <LayoutGrid className="w-3.5 h-3.5" />
            </button>
            <button
              onClick={() => setViewMode('table')}
              className={`p-1 rounded ${viewMode === 'table' ? 'bg-white shadow-xs text-slate-900' : 'text-slate-500 hover:text-slate-900'}`}
              title="Table View"
            >
              <ListIcon className="w-3.5 h-3.5" />
            </button>
          </div>
        </div>
      </div>

      {/* Device Cards Grid / Table or Empty State */}
      {filteredDevices.length === 0 ? (
        <div className="bg-white rounded-xl border border-slate-200 p-12 text-center shadow-xs">
          <div className="w-12 h-12 rounded-full bg-slate-100 text-slate-400 flex items-center justify-center mx-auto mb-3">
            <Monitor className="w-6 h-6" />
          </div>
          <h3 className="text-base font-bold text-slate-800 mb-1">
            {devices.length === 0 ? 'No devices registered yet' : 'No computers match current filters'}
          </h3>
          <p className="text-xs text-slate-500 max-w-md mx-auto mb-4">
            {devices.length === 0
              ? 'Register a real PC or laptop to receive a unique registration code, install the monitoring agent, and start receiving live hardware telemetry.'
              : 'Try clearing your search query, department, or status filters.'}
          </p>
          {devices.length === 0 && (
            <button
              id="empty-state-add-btn"
              onClick={() => setIsAddModalOpen(true)}
              className="inline-flex items-center gap-1.5 px-4 py-2 rounded-lg text-xs font-bold bg-indigo-600 text-white hover:bg-indigo-700 transition-all shadow-xs"
            >
              <Plus className="w-4 h-4" />
              <span>+ Add First Computer</span>
            </button>
          )}
        </div>
      ) : viewMode === 'grid' ? (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-3.5">
          {filteredDevices.map(device => (
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
        /* Table View */
        <div className="bg-white rounded-xl border border-slate-200 shadow-xs overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead className="bg-slate-50 border-b border-slate-200 text-slate-600 uppercase text-[10px] font-bold tracking-wider">
                <tr>
                  <th className="py-3 px-4">Device</th>
                  <th className="py-3 px-4">Status</th>
                  <th className="py-3 px-4">Assigned User</th>
                  <th className="py-3 px-4">Location / Lab</th>
                  <th className="py-3 px-4">IP Address</th>
                  <th className="py-3 px-4">CPU %</th>
                  <th className="py-3 px-4">RAM %</th>
                  <th className="py-3 px-4">Disk %</th>
                  <th className="py-3 px-4">Last Heartbeat</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {filteredDevices.map(device => {
                  const tel = device.latestTelemetry;
                  const primaryDisk = tel?.storage?.[0];
                  return (
                    <tr
                      key={device.id}
                      onClick={() => onSelectDevice(device.id)}
                      className="hover:bg-indigo-50/40 cursor-pointer transition-colors"
                    >
                      <td className="py-3 px-4">
                        <div className="font-bold text-slate-900">{device.deviceName}</div>
                        <div className="text-[10px] font-mono text-slate-400">{device.assetId} • {device.deviceType}</div>
                      </td>
                      <td className="py-3 px-4">
                        <StatusBadge status={device.status} size="sm" />
                      </td>
                      <td className="py-3 px-4 text-slate-700 font-medium">{device.assignedUser || 'Unassigned'}</td>
                      <td className="py-3 px-4 text-slate-600">
                        {locations.find(l => l.id === device.locationId)?.name || 'N/A'}
                      </td>
                      <td className="py-3 px-4 font-mono text-slate-600">{device.ipAddress || 'Waiting...'}</td>
                      <td className="py-3 px-4 font-bold text-slate-800">
                        {tel ? `${tel.cpuUsagePercent}%` : '--'}
                      </td>
                      <td className="py-3 px-4 font-bold text-slate-800">
                        {tel ? `${tel.ramUsagePercent}%` : '--'}
                      </td>
                      <td className="py-3 px-4 font-bold text-slate-800">
                        {primaryDisk ? `${primaryDisk.usagePercent}%` : '--'}
                      </td>
                      <td className="py-3 px-4 text-slate-500">
                        {device.lastHeartbeatAt ? new Date(device.lastHeartbeatAt).toLocaleTimeString() : 'Never'}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  );
};
