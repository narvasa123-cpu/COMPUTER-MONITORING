import React, { useState, useEffect } from 'react';
import { 
  Stethoscope, 
  Sliders, 
  Search, 
  Filter, 
  AlertTriangle, 
  CheckCircle2, 
  Wrench, 
  ShieldAlert, 
  Activity,
  ArrowUpRight,
  ExternalLink
} from 'lucide-react';
import { DiagnosticIssue, Severity, Device } from '../../types/index';
import { StatusBadge, SeverityBadge } from '../common/Badge';
import { useMonitoring } from '../../context/MonitoringContext';
import { useAuth } from '../../context/AuthContext';

interface DiagnosticsViewProps {
  onCreateTicketForDevice?: (device: Device, issue?: DiagnosticIssue) => void;
  onSelectDevice?: (deviceId: string) => void;
}

export const DiagnosticsView: React.FC<DiagnosticsViewProps> = ({
  onCreateTicketForDevice,
  onSelectDevice
}) => {
  const { devices, setIsRulesModalOpen, refreshData } = useMonitoring();
  const { user } = useAuth();

  const [issues, setIssues] = useState<DiagnosticIssue[]>([]);
  const [loading, setLoading] = useState<boolean>(true);
  const [statusFilter, setStatusFilter] = useState<string>('Active');
  const [severityFilter, setSeverityFilter] = useState<string>('ALL');
  const [searchQuery, setSearchQuery] = useState<string>('');

  useEffect(() => {
    fetchIssues();
  }, []);

  const fetchIssues = async () => {
    try {
      const res = await fetch('/api/diagnostics/issues');
      if (res.ok) {
        setIssues(await res.json());
      }
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  const handleUpdateStatus = async (issueId: string, status: string) => {
    try {
      const res = await fetch(`/api/diagnostics/issues/${issueId}/status`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ status })
      });
      if (res.ok) {
        await fetchIssues();
        await refreshData();
      }
    } catch (err) {
      console.error(err);
    }
  };

  const filteredIssues = issues.filter(issue => {
    if (statusFilter !== 'ALL' && issue.status !== statusFilter) return false;
    if (severityFilter !== 'ALL' && issue.severity !== severityFilter) return false;
    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase();
      const matchDevice = issue.deviceName.toLowerCase().includes(q);
      const matchAsset = issue.assetId.toLowerCase().includes(q);
      const matchTitle = issue.title.toLowerCase().includes(q);
      const matchDesc = issue.description.toLowerCase().includes(q);
      if (!matchDevice && !matchAsset && !matchTitle && !matchDesc) return false;
    }
    return true;
  });

  return (
    <div className="space-y-4">
      {/* Header with Title and Rules Config Action */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 bg-white p-4 rounded-xl border border-slate-200 shadow-xs">
        <div>
          <div className="flex items-center gap-2">
            <h2 className="text-lg font-bold text-slate-900">Diagnostic Findings & Problem Detection</h2>
            <span className="px-2 py-0.5 rounded text-[11px] font-bold bg-rose-100 text-rose-800">
              {issues.filter(i => i.status === 'Active').length} Active
            </span>
          </div>
          <p className="text-xs text-slate-500">
            Real-time anomaly detection engine comparing incoming telemetry against hardware safety rules.
          </p>
        </div>

        <div className="flex items-center gap-2">
          <button
            id="btn-open-rules-settings"
            onClick={() => setIsRulesModalOpen(true)}
            className="flex items-center gap-1.5 px-3 py-2 rounded-lg text-xs font-bold bg-slate-100 text-slate-700 hover:bg-slate-200 transition-colors"
          >
            <Sliders className="w-3.5 h-3.5 text-slate-500" />
            <span>Configure Threshold Rules</span>
          </button>
        </div>
      </div>

      {/* Filters Bar */}
      <div className="bg-white p-3 rounded-xl border border-slate-200 shadow-xs flex flex-col md:flex-row items-center justify-between gap-2.5">
        <div className="flex flex-wrap items-center gap-2 w-full md:w-auto">
          {/* Status Tabs */}
          <div className="flex items-center gap-1 bg-slate-100 p-1 rounded-lg text-xs">
            {['Active', 'ALL', 'Resolved', 'Investigating'].map(st => (
              <button
                key={st}
                onClick={() => setStatusFilter(st)}
                className={`px-2.5 py-1 rounded font-bold transition-all ${
                  statusFilter === st ? 'bg-white text-slate-900 shadow-xs' : 'text-slate-600 hover:text-slate-900'
                }`}
              >
                {st === 'ALL' ? 'All Findings' : st}
              </button>
            ))}
          </div>

          {/* Severity Dropdown */}
          <select
            value={severityFilter}
            onChange={e => setSeverityFilter(e.target.value)}
            className="px-2.5 py-1.5 bg-slate-50 border border-slate-200 rounded-lg text-xs font-bold text-slate-700 focus:outline-none cursor-pointer"
          >
            <option value="ALL">All Severities</option>
            <option value="Critical">Critical</option>
            <option value="High">High</option>
            <option value="Medium">Medium</option>
            <option value="Low">Low</option>
          </select>
        </div>

        {/* Search Bar */}
        <div className="relative w-full md:w-64">
          <Search className="w-3.5 h-3.5 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
          <input
            type="text"
            value={searchQuery}
            onChange={e => setSearchQuery(e.target.value)}
            placeholder="Search problems, devices, rules..."
            className="w-full pl-8 pr-3 py-1.5 bg-slate-50 border border-slate-200 rounded-lg text-xs text-slate-800 placeholder-slate-400 focus:outline-none focus:ring-1 focus:ring-indigo-500 focus:bg-white"
          />
        </div>
      </div>

      {/* Issues List */}
      {filteredIssues.length === 0 ? (
        <div className="bg-white rounded-xl border border-slate-200 p-12 text-center shadow-xs">
          <CheckCircle2 className="w-10 h-10 text-emerald-500 mx-auto mb-2" />
          <h3 className="text-base font-bold text-slate-800 mb-1">
            {issues.length === 0 ? 'All Systems Healthy' : 'No findings matching current filters'}
          </h3>
          <p className="text-xs text-slate-500 max-w-md mx-auto">
            The automated diagnostic engine will list high CPU usage, memory leaks, low disk space, thermal throttling, and offline timeouts here.
          </p>
        </div>
      ) : (
        <div className="space-y-3">
          {filteredIssues.map(issue => {
            const targetDev = devices.find(d => d.id === issue.deviceId);

            return (
              <div
                key={issue.id}
                className={`bg-white rounded-xl border p-4 shadow-xs space-y-3 ${
                  issue.status === 'Active' && issue.severity === 'Critical' ? 'border-rose-300 ring-1 ring-rose-200' :
                  issue.status === 'Active' && issue.severity === 'High' ? 'border-amber-300 ring-1 ring-amber-200' :
                  'border-slate-200'
                }`}
              >
                {/* Header info */}
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                  <div className="flex flex-wrap items-center gap-2">
                    <SeverityBadge severity={issue.severity} />
                    <button
                      onClick={() => onSelectDevice && onSelectDevice(issue.deviceId)}
                      className="font-bold text-xs text-indigo-600 hover:text-indigo-800 hover:underline flex items-center gap-1"
                    >
                      {issue.deviceName} ({issue.assetId})
                      <ExternalLink className="w-3 h-3" />
                    </button>
                    <span className="text-slate-300">|</span>
                    <h4 className="text-xs font-bold text-slate-900">{issue.title}</h4>
                    <StatusBadge status={issue.status} size="sm" />
                  </div>

                  <span className="text-[11px] text-slate-400 font-mono">
                    Detected: {new Date(issue.detectedAt).toLocaleString()}
                  </span>
                </div>

                <p className="text-xs text-slate-700 leading-relaxed">{issue.description}</p>

                {/* Evidence Metrics Box */}
                <div className="p-3 bg-slate-50 border border-slate-200 rounded-lg text-xs grid grid-cols-1 sm:grid-cols-3 gap-2 font-mono">
                  <div>
                    <span className="text-slate-400 text-[10px] block uppercase font-sans">Monitored Metric</span>
                    <strong className="text-slate-800">{issue.evidence.metricName}</strong>
                  </div>
                  <div>
                    <span className="text-slate-400 text-[10px] block uppercase font-sans">Triggered Real Value</span>
                    <strong className="text-rose-600 font-bold">{issue.evidence.currentValue}</strong>
                  </div>
                  <div>
                    <span className="text-slate-400 text-[10px] block uppercase font-sans">Configured Threshold</span>
                    <strong className="text-slate-700">{issue.evidence.thresholdValue}</strong>
                  </div>
                </div>

                {/* Footer Recommendations & Actions */}
                <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-2 pt-2 border-t border-slate-100">
                  <p className="text-[11px] text-slate-600">
                    💡 <strong className="text-slate-800">Recommendation:</strong> {issue.recommendedAction}
                  </p>

                  <div className="flex items-center gap-2 self-end sm:self-auto">
                    {/* Status Toggles */}
                    {issue.status === 'Active' && (
                      <button
                        onClick={() => handleUpdateStatus(issue.id, 'Investigating')}
                        className="px-2.5 py-1 text-xs font-semibold text-slate-600 hover:bg-slate-100 rounded border border-slate-200 transition-colors"
                      >
                        Investigate
                      </button>
                    )}

                    {issue.status !== 'Resolved' && (
                      <button
                        onClick={() => handleUpdateStatus(issue.id, 'Resolved')}
                        className="px-2.5 py-1 text-xs font-semibold text-emerald-700 bg-emerald-50 hover:bg-emerald-100 rounded border border-emerald-200 transition-colors"
                      >
                        Mark Resolved
                      </button>
                    )}

                    {/* Create Ticket */}
                    {user?.role !== 'viewer' && targetDev && (
                      <button
                        onClick={() => onCreateTicketForDevice && onCreateTicketForDevice(targetDev, issue)}
                        className="flex items-center gap-1 px-3 py-1 bg-indigo-600 hover:bg-indigo-700 text-white rounded text-xs font-bold transition-all shadow-xs"
                      >
                        <Wrench className="w-3.5 h-3.5" />
                        Create Ticket
                      </button>
                    )}
                  </div>
                </div>

              </div>
            );
          })}
        </div>
      )}
    </div>
  );
};
