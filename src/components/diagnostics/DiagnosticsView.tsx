import React, { useEffect, useMemo, useState } from 'react';
import {
  Activity,
  AlertTriangle,
  CheckCircle2,
  CircleAlert,
  ClipboardList,
  ExternalLink,
  RefreshCw,
  Search,
  ShieldCheck,
  SlidersHorizontal,
  Wrench
} from 'lucide-react';
import { DiagnosticIssue, Device } from '../../types/index';
import { SeverityBadge, StatusBadge } from '../common/Badge';
import { useMonitoring } from '../../context/MonitoringContext';
import { useAuth } from '../../context/AuthContext';

interface DiagnosticsViewProps {
  onCreateTicketForDevice?: (device: Device, issue?: DiagnosticIssue) => void;
  onSelectDevice?: (deviceId: string) => void;
}

/** The deployed Worker includes these compatibility properties on diagnostic findings. */
type OperationalDiagnosticIssue = DiagnosticIssue & {
  description?: string;
  recommendedAction?: string;
  evidence: DiagnosticIssue['evidence'] & { metricName?: string };
};

const formatTimestamp = (value?: string) => {
  if (!value) return 'No timestamp available';
  const date = new Date(value);
  return Number.isNaN(date.getTime())
    ? 'No timestamp available'
    : date.toLocaleString([], { dateStyle: 'medium', timeStyle: 'short' });
};

const issueDescription = (issue: OperationalDiagnosticIssue) =>
  issue.description || issue.evidence.details || 'No additional diagnostic narrative was supplied by the monitoring service.';

const issueRecommendation = (issue: OperationalDiagnosticIssue) =>
  issue.recommendedAction || issue.recommendedActions?.[0] || 'No recommendation was supplied for this finding.';

export const DiagnosticsView: React.FC<DiagnosticsViewProps> = ({
  onCreateTicketForDevice,
  onSelectDevice
}) => {
  const { devices, setIsRulesModalOpen, refreshData } = useMonitoring();
  const { user } = useAuth();

  const [issues, setIssues] = useState<OperationalDiagnosticIssue[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [statusFilter, setStatusFilter] = useState<string>('Active');
  const [severityFilter, setSeverityFilter] = useState<string>('ALL');
  const [searchQuery, setSearchQuery] = useState('');

  const fetchIssues = async (isManualRefresh = false) => {
    if (isManualRefresh) setRefreshing(true);
    else setLoading(true);
    setError(null);

    try {
      const res = await fetch('/api/diagnostics/issues');
      if (!res.ok) throw new Error('The diagnostic findings could not be loaded.');
      const data = await res.json();
      setIssues(Array.isArray(data) ? data as OperationalDiagnosticIssue[] : []);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'The diagnostic findings could not be loaded.');
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  useEffect(() => {
    void fetchIssues();
  }, []);

  const handleUpdateStatus = async (issueId: string, status: string) => {
    setError(null);
    try {
      const res = await fetch(`/api/diagnostics/issues/${issueId}/status`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ status })
      });
      if (!res.ok) throw new Error('The finding status could not be updated.');
      await Promise.all([fetchIssues(true), refreshData()]);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'The finding status could not be updated.');
    }
  };

  const filteredIssues = useMemo(() => issues.filter(issue => {
    if (statusFilter !== 'ALL' && issue.status !== statusFilter) return false;
    if (severityFilter !== 'ALL' && issue.severity !== severityFilter) return false;
    if (!searchQuery.trim()) return true;

    const query = searchQuery.toLowerCase();
    return [
      issue.deviceName,
      issue.assetId,
      issue.title,
      issueDescription(issue),
      issue.evidence.metricName,
      issue.evidence.metric
    ].some(value => String(value || '').toLowerCase().includes(query));
  }), [issues, searchQuery, severityFilter, statusFilter]);

  const activeCount = issues.filter(issue => issue.status === 'Active').length;
  const criticalCount = issues.filter(issue => issue.status !== 'Resolved' && issue.severity === 'Critical').length;
  const investigatingCount = issues.filter(issue => issue.status === 'Investigating').length;
  const canManageFindings = user?.role === 'super_admin';

  const statusTabs = [
    { value: 'Active', label: 'Active', count: activeCount },
    { value: 'Investigating', label: 'Investigating', count: investigatingCount },
    { value: 'Resolved', label: 'Resolved', count: issues.filter(issue => issue.status === 'Resolved').length },
    { value: 'ALL', label: 'All findings', count: issues.length }
  ];

  return (
    <div className="mx-auto max-w-7xl space-y-5">
      <section className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm">
        <div className="flex flex-col gap-5 p-5 lg:flex-row lg:items-center lg:justify-between">
          <div className="flex min-w-0 items-start gap-3">
            <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-indigo-950 text-white shadow-sm">
              <Activity className="h-5 w-5" />
            </div>
            <div className="min-w-0">
              <div className="flex flex-wrap items-center gap-2">
                <p className="text-[11px] font-extrabold uppercase tracking-[0.14em] text-indigo-700">Operations / Detection</p>
                {activeCount > 0 && <span className="rounded-full border border-rose-200 bg-rose-50 px-2 py-0.5 text-[10px] font-extrabold uppercase tracking-wide text-rose-700">{activeCount} active</span>}
              </div>
              <h2 className="mt-1 text-xl font-black tracking-tight text-slate-950">Diagnostic findings</h2>
              <p className="mt-1 max-w-2xl text-sm leading-6 text-slate-500">Evidence-based signals from connected monitoring agents, evaluated against your configured safety rules.</p>
            </div>
          </div>

          <div className="flex flex-wrap items-center gap-2">
            <button
              type="button"
              onClick={() => void fetchIssues(true)}
              disabled={loading || refreshing}
              className="inline-flex items-center gap-2 rounded-lg border border-slate-200 bg-white px-3 py-2 text-xs font-bold text-slate-700 transition hover:border-slate-300 hover:bg-slate-50 disabled:cursor-not-allowed disabled:opacity-60"
            >
              <RefreshCw className={`h-3.5 w-3.5 ${refreshing ? 'animate-spin' : ''}`} />
              {refreshing ? 'Refreshing' : 'Refresh'}
            </button>
            <button
              id="btn-open-rules-settings"
              type="button"
              onClick={() => setIsRulesModalOpen(true)}
              className="inline-flex items-center gap-2 rounded-lg bg-indigo-700 px-3.5 py-2 text-xs font-bold text-white shadow-sm transition hover:bg-indigo-800 focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:ring-offset-2"
            >
              <SlidersHorizontal className="h-3.5 w-3.5" />
              Configure rules
            </button>
          </div>
        </div>

        <div className="grid border-t border-slate-100 sm:grid-cols-3">
          <div className="flex items-center gap-3 border-b border-slate-100 px-5 py-3 sm:border-b-0 sm:border-r">
            <span className="flex h-8 w-8 items-center justify-center rounded-lg bg-rose-50 text-rose-600"><CircleAlert className="h-4 w-4" /></span>
            <div><p className="text-[10px] font-bold uppercase tracking-wider text-slate-400">Critical attention</p><p className="mt-0.5 text-sm font-black text-slate-900">{criticalCount} open critical</p></div>
          </div>
          <div className="flex items-center gap-3 border-b border-slate-100 px-5 py-3 sm:border-b-0 sm:border-r">
            <span className="flex h-8 w-8 items-center justify-center rounded-lg bg-amber-50 text-amber-600"><Search className="h-4 w-4" /></span>
            <div><p className="text-[10px] font-bold uppercase tracking-wider text-slate-400">Under investigation</p><p className="mt-0.5 text-sm font-black text-slate-900">{investigatingCount} assigned to review</p></div>
          </div>
          <div className="flex items-center gap-3 px-5 py-3">
            <span className="flex h-8 w-8 items-center justify-center rounded-lg bg-emerald-50 text-emerald-600"><ShieldCheck className="h-4 w-4" /></span>
            <div><p className="text-[10px] font-bold uppercase tracking-wider text-slate-400">Rules evaluated</p><p className="mt-0.5 text-sm font-black text-slate-900">{issues.length} findings on record</p></div>
          </div>
        </div>
      </section>

      <section className="rounded-2xl border border-slate-200 bg-white p-3 shadow-sm">
        <div className="flex flex-col gap-3 xl:flex-row xl:items-center xl:justify-between">
          <div className="flex min-w-0 items-center gap-2 overflow-x-auto pb-1 xl:pb-0">
            {statusTabs.map(tab => (
              <button
                key={tab.value}
                type="button"
                onClick={() => setStatusFilter(tab.value)}
                className={`inline-flex shrink-0 items-center gap-2 rounded-lg px-3 py-2 text-xs font-bold transition ${statusFilter === tab.value ? 'bg-slate-950 text-white shadow-sm' : 'text-slate-600 hover:bg-slate-100 hover:text-slate-900'}`}
              >
                {tab.label}
                <span className={`rounded-md px-1.5 py-0.5 text-[10px] ${statusFilter === tab.value ? 'bg-white/15 text-white' : 'bg-slate-100 text-slate-500'}`}>{tab.count}</span>
              </button>
            ))}
            <span className="h-6 w-px shrink-0 bg-slate-200" />
            <label className="sr-only" htmlFor="diagnostic-severity">Severity</label>
            <select
              id="diagnostic-severity"
              value={severityFilter}
              onChange={event => setSeverityFilter(event.target.value)}
              className="shrink-0 rounded-lg border border-slate-200 bg-slate-50 px-3 py-2 text-xs font-bold text-slate-700 outline-none transition focus:border-indigo-400 focus:bg-white focus:ring-2 focus:ring-indigo-100"
            >
              <option value="ALL">All severities</option>
              <option value="Critical">Critical</option>
              <option value="High">High</option>
              <option value="Medium">Medium</option>
              <option value="Low">Low</option>
            </select>
          </div>

          <div className="relative w-full xl:w-80">
            <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
            <input
              type="search"
              value={searchQuery}
              onChange={event => setSearchQuery(event.target.value)}
              placeholder="Search device, rule, or evidence"
              className="w-full rounded-lg border border-slate-200 bg-slate-50 py-2 pl-9 pr-3 text-xs text-slate-800 outline-none transition placeholder:text-slate-400 focus:border-indigo-400 focus:bg-white focus:ring-2 focus:ring-indigo-100"
            />
          </div>
        </div>
        <div className="mt-3 flex items-center justify-between border-t border-slate-100 pt-2.5 text-[11px] text-slate-500">
          <span>Showing <strong className="font-bold text-slate-700">{filteredIssues.length}</strong> of {issues.length} findings</span>
          <span className="hidden sm:inline">Statuses are updated directly in the monitoring record.</span>
        </div>
      </section>

      {error && (
        <section role="alert" className="flex flex-col gap-3 rounded-2xl border border-rose-200 bg-rose-50 p-4 text-sm text-rose-900 sm:flex-row sm:items-center sm:justify-between">
          <div className="flex items-start gap-2"><AlertTriangle className="mt-0.5 h-4 w-4 shrink-0" /><span>{error}</span></div>
          <button type="button" onClick={() => void fetchIssues(true)} className="self-start text-xs font-extrabold underline underline-offset-2 sm:self-auto">Try again</button>
        </section>
      )}

      {loading ? (
        <section className="rounded-2xl border border-slate-200 bg-white p-10 text-center shadow-sm">
          <RefreshCw className="mx-auto h-6 w-6 animate-spin text-indigo-600" />
          <p className="mt-3 text-sm font-bold text-slate-700">Loading diagnostic findings…</p>
        </section>
      ) : filteredIssues.length === 0 ? (
        <section className="rounded-2xl border border-slate-200 bg-white px-6 py-14 text-center shadow-sm">
          {issues.length === 0 ? <CheckCircle2 className="mx-auto h-11 w-11 text-emerald-500" /> : <Search className="mx-auto h-11 w-11 text-slate-300" />}
          <h3 className="mt-4 text-base font-black text-slate-900">{issues.length === 0 ? 'No diagnostic findings recorded' : 'No findings match these filters'}</h3>
          <p className="mx-auto mt-2 max-w-lg text-sm leading-6 text-slate-500">{issues.length === 0 ? 'Incoming agent telemetry will appear here only when a configured rule detects an observed condition.' : 'Change the status, severity, or search terms to review a different set of findings.'}</p>
        </section>
      ) : (
        <section className="space-y-3">
          {filteredIssues.map(issue => {
            const targetDevice = devices.find(device => device.id === issue.deviceId);
            const isCritical = issue.status !== 'Resolved' && issue.severity === 'Critical';

            return (
              <article key={issue.id} className={`overflow-hidden rounded-2xl border bg-white shadow-sm transition hover:shadow-md ${isCritical ? 'border-rose-200' : 'border-slate-200'}`}>
                <div className={`h-1 ${isCritical ? 'bg-rose-500' : issue.status === 'Resolved' ? 'bg-emerald-500' : issue.severity === 'High' ? 'bg-orange-500' : 'bg-indigo-500'}`} />
                <div className="p-4 sm:p-5">
                  <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
                    <div className="min-w-0 flex-1">
                      <div className="flex flex-wrap items-center gap-2">
                        <SeverityBadge severity={issue.severity} size="sm" />
                        <StatusBadge status={issue.status} size="sm" />
                        {issue.ticketId && <span className="rounded-full border border-indigo-100 bg-indigo-50 px-2 py-0.5 text-[10px] font-extrabold uppercase tracking-wide text-indigo-700">Ticket linked</span>}
                      </div>
                      <h3 className="mt-3 text-base font-black text-slate-950">{issue.title}</h3>
                      <button
                        type="button"
                        onClick={() => onSelectDevice?.(issue.deviceId)}
                        className="mt-1 inline-flex items-center gap-1 text-xs font-bold text-indigo-700 transition hover:text-indigo-900 hover:underline"
                      >
                        {issue.deviceName} <span className="text-slate-400">/ {issue.assetId}</span><ExternalLink className="h-3.5 w-3.5" />
                      </button>
                    </div>
                    <div className="rounded-lg border border-slate-100 bg-slate-50 px-3 py-2 text-left lg:text-right">
                      <p className="text-[10px] font-bold uppercase tracking-wider text-slate-400">Detected</p>
                      <p className="mt-0.5 text-xs font-semibold text-slate-700">{formatTimestamp(issue.detectedAt)}</p>
                    </div>
                  </div>

                  <p className="mt-4 text-sm leading-6 text-slate-600">{issueDescription(issue)}</p>

                  <div className="mt-4 grid overflow-hidden rounded-xl border border-slate-200 bg-slate-50 sm:grid-cols-3">
                    <div className="border-b border-slate-200 p-3 sm:border-b-0 sm:border-r">
                      <p className="text-[10px] font-bold uppercase tracking-wider text-slate-400">Observed metric</p>
                      <p className="mt-1 break-words text-xs font-extrabold text-slate-800">{issue.evidence.metricName || issue.evidence.metric || 'Not reported'}</p>
                    </div>
                    <div className="border-b border-slate-200 p-3 sm:border-b-0 sm:border-r">
                      <p className="text-[10px] font-bold uppercase tracking-wider text-slate-400">Observed value</p>
                      <p className="mt-1 break-words font-mono text-sm font-black text-rose-700">{String(issue.evidence.currentValue ?? 'Not reported')}</p>
                    </div>
                    <div className="p-3">
                      <p className="text-[10px] font-bold uppercase tracking-wider text-slate-400">Configured threshold</p>
                      <p className="mt-1 break-words font-mono text-sm font-black text-slate-700">{String(issue.evidence.thresholdValue ?? 'Not reported')}</p>
                    </div>
                  </div>

                  <div className="mt-4 grid gap-3 border-t border-slate-100 pt-4 xl:grid-cols-[minmax(0,1fr)_auto] xl:items-center">
                    <div className="flex items-start gap-2 rounded-lg bg-amber-50 px-3 py-2.5 text-xs leading-5 text-amber-950">
                      <ClipboardList className="mt-0.5 h-4 w-4 shrink-0 text-amber-600" />
                      <span><strong className="font-extrabold">Recommended next step:</strong> {issueRecommendation(issue)}</span>
                    </div>
                    {canManageFindings && (
                      <div className="flex flex-wrap items-center gap-2 xl:justify-end">
                        {issue.status === 'Active' && (
                          <button type="button" onClick={() => void handleUpdateStatus(issue.id, 'Investigating')} className="inline-flex items-center gap-1.5 rounded-lg border border-slate-200 bg-white px-3 py-2 text-xs font-bold text-slate-700 transition hover:bg-slate-50">
                            <Search className="h-3.5 w-3.5" /> Investigate
                          </button>
                        )}
                        {issue.status !== 'Resolved' && (
                          <button type="button" onClick={() => void handleUpdateStatus(issue.id, 'Resolved')} className="inline-flex items-center gap-1.5 rounded-lg border border-emerald-200 bg-emerald-50 px-3 py-2 text-xs font-bold text-emerald-800 transition hover:bg-emerald-100">
                            <CheckCircle2 className="h-3.5 w-3.5" /> Mark resolved
                          </button>
                        )}
                        {targetDevice && (
                          <button type="button" onClick={() => onCreateTicketForDevice?.(targetDevice, issue)} className="inline-flex items-center gap-1.5 rounded-lg bg-indigo-700 px-3 py-2 text-xs font-bold text-white shadow-sm transition hover:bg-indigo-800">
                            <Wrench className="h-3.5 w-3.5" /> Create ticket
                          </button>
                        )}
                      </div>
                    )}
                  </div>
                </div>
              </article>
            );
          })}
        </section>
      )}
    </div>
  );
};
