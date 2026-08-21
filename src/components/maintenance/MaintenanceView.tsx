import React, { useState, useEffect } from 'react';
import { 
  History, 
  Plus, 
  Search, 
  CheckCircle2, 
  Wrench, 
  ExternalLink,
  Calendar,
  DollarSign,
  FileSpreadsheet
} from 'lucide-react';
import { MaintenanceRecord } from '../../types/index';
import { useMonitoring } from '../../context/MonitoringContext';
import { useAuth } from '../../context/AuthContext';
import { AddMaintenanceModal } from './AddMaintenanceModal';

interface MaintenanceViewProps {
  onSelectDevice?: (deviceId: string) => void;
}

export const MaintenanceView: React.FC<MaintenanceViewProps> = ({ onSelectDevice }) => {
  const { user } = useAuth();
  const [records, setRecords] = useState<MaintenanceRecord[]>([]);
  const [loading, setLoading] = useState<boolean>(true);
  const [searchQuery, setSearchQuery] = useState<string>('');
  const [isAddModalOpen, setIsAddModalOpen] = useState<boolean>(false);

  useEffect(() => {
    fetchRecords();
  }, []);

  const fetchRecords = async () => {
    try {
      const res = await fetch('/api/maintenance');
      if (res.ok) setRecords(await res.json());
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  const filteredRecords = records.filter(rec => {
    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase();
      const matchDevice = rec.deviceName.toLowerCase().includes(q);
      const matchAsset = rec.assetId.toLowerCase().includes(q);
      const matchNum = rec.recordNumber.toLowerCase().includes(q);
      const matchTech = rec.technicianName.toLowerCase().includes(q);
      const matchAction = rec.actionPerformed.toLowerCase().includes(q);
      if (!matchDevice && !matchAsset && !matchNum && !matchTech && !matchAction) return false;
    }
    return true;
  });

  return (
    <div className="space-y-4">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 bg-white p-4 rounded-xl border border-slate-200 shadow-xs">
        <div>
          <div className="flex items-center gap-2">
            <h2 className="text-lg font-bold text-slate-900">Computer Maintenance & Repair History</h2>
            <span className="px-2 py-0.5 rounded text-[11px] font-bold bg-purple-100 text-purple-800">
              {records.length} Service Records
            </span>
          </div>
          <p className="text-xs text-slate-500">
            Immutable audit record of all physical hardware replacements, upgrades, and diagnostic maintenance.
          </p>
        </div>

        <div className="flex items-center gap-2">
          <a
            href="/api/reports/export/maintenance"
            className="flex items-center gap-1.5 px-3 py-2 rounded-lg text-xs font-semibold bg-slate-100 text-slate-700 hover:bg-slate-200 transition-colors"
          >
            <FileSpreadsheet className="w-3.5 h-3.5" />
            <span>Export CSV</span>
          </a>

          {user?.role !== 'viewer' && (
            <button
              id="btn-log-maintenance"
              onClick={() => setIsAddModalOpen(true)}
              className="flex items-center gap-1.5 px-3.5 py-2 rounded-lg text-xs font-bold bg-purple-600 text-white hover:bg-purple-700 transition-all shadow-xs"
            >
              <Plus className="w-4 h-4" />
              <span>+ Log Maintenance</span>
            </button>
          )}
        </div>
      </div>

      {/* Search */}
      <div className="bg-white p-3 rounded-xl border border-slate-200 shadow-xs flex items-center justify-between">
        <div className="relative w-full sm:w-80">
          <Search className="w-3.5 h-3.5 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
          <input
            type="text"
            value={searchQuery}
            onChange={e => setSearchQuery(e.target.value)}
            placeholder="Search records, technician, device..."
            className="w-full pl-8 pr-3 py-1.5 bg-slate-50 border border-slate-200 rounded-lg text-xs text-slate-800 placeholder-slate-400 focus:outline-none focus:ring-1 focus:ring-purple-500 focus:bg-white"
          />
        </div>
        <span className="text-xs text-slate-400 hidden sm:block">Showing {filteredRecords.length} records</span>
      </div>

      {/* Records List */}
      {filteredRecords.length === 0 ? (
        <div className="bg-white rounded-xl border border-slate-200 p-12 text-center shadow-xs">
          <History className="w-10 h-10 text-slate-300 mx-auto mb-2" />
          <h3 className="text-base font-bold text-slate-800 mb-1">No Maintenance Records Found</h3>
          <p className="text-xs text-slate-500 max-w-md mx-auto mb-4">
            Maintenance logs are automatically preserved whenever repair tickets are resolved or manually registered by technicians.
          </p>
        </div>
      ) : (
        <div className="space-y-3">
          {filteredRecords.map(rec => (
            <div key={rec.id} className="bg-white rounded-xl border border-slate-200 p-4 shadow-xs space-y-3">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 border-b border-slate-100 pb-2.5">
                <div className="flex flex-wrap items-center gap-2">
                  <span className="font-mono font-bold text-xs px-2 py-0.5 rounded bg-purple-50 text-purple-700 border border-purple-200">
                    {rec.recordNumber}
                  </span>
                  <button
                    onClick={() => onSelectDevice && onSelectDevice(rec.deviceId)}
                    className="font-bold text-xs text-indigo-600 hover:text-indigo-800 hover:underline flex items-center gap-1"
                  >
                    {rec.deviceName} ({rec.assetId})
                    <ExternalLink className="w-3 h-3" />
                  </button>
                  <span className="text-slate-300">|</span>
                  <span className="text-xs text-slate-600 font-semibold">Technician: <strong>{rec.technicianName}</strong></span>
                </div>

                <div className="flex items-center gap-2 text-xs text-slate-400 font-mono">
                  <Calendar className="w-3.5 h-3.5" />
                  <span>{rec.date}</span>
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-3 text-xs">
                <div className="p-3 bg-slate-50 rounded-lg border border-slate-100 space-y-1">
                  <p className="text-[10px] font-bold text-slate-400 uppercase">Reported Issue & Diagnosis</p>
                  <p className="font-semibold text-slate-800">{rec.problem}</p>
                  <p className="text-[11px] text-slate-500">{rec.diagnosis}</p>
                </div>

                <div className="p-3 bg-slate-50 rounded-lg border border-slate-100 space-y-1">
                  <p className="text-[10px] font-bold text-slate-400 uppercase">Action Performed & Solution</p>
                  <p className="text-slate-800">{rec.actionPerformed}</p>
                  {rec.partsReplaced && (
                    <p className="text-[11px] text-purple-700 font-medium">
                      <strong>Replaced / Upgraded:</strong> {rec.partsReplaced}
                    </p>
                  )}
                </div>
              </div>

              <div className="flex items-center justify-between pt-1 border-t border-slate-100 text-xs">
                <span className="text-slate-600">
                  Result: <strong className="text-emerald-700">{rec.result}</strong>
                </span>
                {rec.cost !== undefined && rec.cost > 0 && (
                  <span className="font-mono font-bold text-slate-700">Cost: ${rec.cost.toFixed(2)}</span>
                )}
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Modal */}
      <AddMaintenanceModal
        isOpen={isAddModalOpen}
        onClose={() => {
          setIsAddModalOpen(false);
          fetchRecords();
        }}
      />
    </div>
  );
};
