import React, { useEffect, useMemo, useState } from 'react';
import {
  AlertTriangle,
  CalendarDays,
  CheckCircle2,
  ClipboardList,
  Download,
  ExternalLink,
  FileText,
  History,
  PackageCheck,
  Plus,
  RefreshCw,
  Search,
  UserRound,
  Wrench
} from 'lucide-react';
import { MaintenanceRecord } from '../../types/index';
import { useAuth } from '../../context/AuthContext';
import { AddMaintenanceModal } from './AddMaintenanceModal';

interface MaintenanceViewProps {
  onSelectDevice?: (deviceId: string) => void;
}

type OperationalMaintenanceRecord = MaintenanceRecord & { cost?: number };

const formatDate = (value?: string) => {
  if (!value) return 'No date recorded';
  const date = new Date(value);
  return Number.isNaN(date.getTime()) ? 'No date recorded' : date.toLocaleString([], { dateStyle: 'medium', timeStyle: 'short' });
};

export const MaintenanceView: React.FC<MaintenanceViewProps> = ({ onSelectDevice }) => {
  const { user } = useAuth();
  const [records, setRecords] = useState<OperationalMaintenanceRecord[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [exporting, setExporting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [isAddModalOpen, setIsAddModalOpen] = useState(false);

  const fetchRecords = async (isManualRefresh = false) => {
    if (isManualRefresh) setRefreshing(true);
    else setLoading(true);
    setError(null);
    try {
      const res = await fetch('/api/maintenance');
      if (!res.ok) throw new Error('The maintenance history could not be loaded.');
      const data = await res.json();
      setRecords(Array.isArray(data) ? data as OperationalMaintenanceRecord[] : []);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'The maintenance history could not be loaded.');
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  useEffect(() => {
    void fetchRecords();
  }, []);

  const handleExport = async () => {
    setExporting(true);
    setError(null);
    try {
      const response = await fetch('/api/reports/export/maintenance');
      if (!response.ok) throw new Error('Unable to export maintenance history.');
      const url = URL.createObjectURL(await response.blob());
      const link = document.createElement('a');
      link.href = url;
      link.download = 'maintenance-history.csv';
      document.body.appendChild(link);
      link.click();
      link.remove();
      URL.revokeObjectURL(url);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Unable to export maintenance history.');
    } finally {
      setExporting(false);
    }
  };

  const filteredRecords = useMemo(() => records.filter(record => {
    if (!searchQuery.trim()) return true;
    const query = searchQuery.toLowerCase();
    return [record.recordNumber, record.deviceName, record.assetId, record.technicianName, record.problem, record.diagnosis, record.actionPerformed, record.partsReplaced, record.ticketNumber]
      .some(value => String(value || '').toLowerCase().includes(query));
  }), [records, searchQuery]);

  const partsCount = records.filter(record => Boolean(record.partsReplaced?.trim())).length;
  const ticketLinkedCount = records.filter(record => Boolean(record.ticketNumber || record.ticketId)).length;
  const canLogMaintenance = user?.role !== 'viewer';

  return (
    <div className="mx-auto max-w-7xl space-y-5">
      <section className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm">
        <div className="flex flex-col gap-5 p-5 lg:flex-row lg:items-center lg:justify-between">
          <div className="flex min-w-0 items-start gap-3">
            <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-indigo-950 text-white shadow-sm"><History className="h-5 w-5" /></div>
            <div className="min-w-0">
              <p className="text-[11px] font-extrabold uppercase tracking-[0.14em] text-indigo-700">Operations / Asset care</p>
              <h2 className="mt-1 text-xl font-black tracking-tight text-slate-950">Maintenance history</h2>
              <p className="mt-1 max-w-2xl text-sm leading-6 text-slate-500">A permanent service record for preventive work, repairs, parts replacement, and verified asset care.</p>
            </div>
          </div>
          <div className="flex flex-wrap items-center gap-2">
            <button type="button" onClick={() => void fetchRecords(true)} disabled={loading || refreshing} className="inline-flex items-center gap-2 rounded-lg border border-slate-200 bg-white px-3 py-2 text-xs font-bold text-slate-700 transition hover:border-slate-300 hover:bg-slate-50 disabled:cursor-not-allowed disabled:opacity-60"><RefreshCw className={`h-3.5 w-3.5 ${refreshing ? 'animate-spin' : ''}`} />{refreshing ? 'Refreshing' : 'Refresh'}</button>
            <button type="button" onClick={() => void handleExport()} disabled={exporting} className="inline-flex items-center gap-2 rounded-lg border border-slate-200 bg-white px-3 py-2 text-xs font-bold text-slate-700 transition hover:border-slate-300 hover:bg-slate-50 disabled:cursor-not-allowed disabled:opacity-60"><Download className="h-3.5 w-3.5" />{exporting ? 'Preparing export' : 'Export CSV'}</button>
            {canLogMaintenance && <button id="btn-log-maintenance" type="button" onClick={() => setIsAddModalOpen(true)} className="inline-flex items-center gap-2 rounded-lg bg-indigo-700 px-3.5 py-2 text-xs font-bold text-white shadow-sm transition hover:bg-indigo-800 focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:ring-offset-2"><Plus className="h-4 w-4" /> Log maintenance</button>}
          </div>
        </div>
        <div className="grid border-t border-slate-100 sm:grid-cols-3">
          <div className="flex items-center gap-3 border-b border-slate-100 px-5 py-3 sm:border-b-0 sm:border-r"><span className="flex h-8 w-8 items-center justify-center rounded-lg bg-indigo-50 text-indigo-700"><ClipboardList className="h-4 w-4" /></span><div><p className="text-[10px] font-bold uppercase tracking-wider text-slate-400">Service records</p><p className="mt-0.5 text-sm font-black text-slate-900">{records.length} documented</p></div></div>
          <div className="flex items-center gap-3 border-b border-slate-100 px-5 py-3 sm:border-b-0 sm:border-r"><span className="flex h-8 w-8 items-center justify-center rounded-lg bg-violet-50 text-violet-700"><PackageCheck className="h-4 w-4" /></span><div><p className="text-[10px] font-bold uppercase tracking-wider text-slate-400">Parts recorded</p><p className="mt-0.5 text-sm font-black text-slate-900">{partsCount} replacements</p></div></div>
          <div className="flex items-center gap-3 px-5 py-3"><span className="flex h-8 w-8 items-center justify-center rounded-lg bg-emerald-50 text-emerald-700"><FileText className="h-4 w-4" /></span><div><p className="text-[10px] font-bold uppercase tracking-wider text-slate-400">Incident-linked</p><p className="mt-0.5 text-sm font-black text-slate-900">{ticketLinkedCount} traceable records</p></div></div>
        </div>
      </section>

      <section className="rounded-2xl border border-slate-200 bg-white p-3 shadow-sm">
        <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between"><div className="relative w-full sm:max-w-sm"><Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" /><input type="search" value={searchQuery} onChange={event => setSearchQuery(event.target.value)} placeholder="Search device, technician, work order" className="w-full rounded-lg border border-slate-200 bg-slate-50 py-2 pl-9 pr-3 text-xs text-slate-800 outline-none transition placeholder:text-slate-400 focus:border-indigo-400 focus:bg-white focus:ring-2 focus:ring-indigo-100" /></div><p className="text-[11px] text-slate-500">Showing <strong className="font-bold text-slate-700">{filteredRecords.length}</strong> of {records.length} records</p></div>
      </section>

      {error && <section role="alert" className="flex flex-col gap-3 rounded-2xl border border-rose-200 bg-rose-50 p-4 text-sm text-rose-900 sm:flex-row sm:items-center sm:justify-between"><div className="flex items-start gap-2"><AlertTriangle className="mt-0.5 h-4 w-4 shrink-0" /><span>{error}</span></div><button type="button" onClick={() => void fetchRecords(true)} className="self-start text-xs font-extrabold underline underline-offset-2 sm:self-auto">Try again</button></section>}

      {loading ? <section className="rounded-2xl border border-slate-200 bg-white p-10 text-center shadow-sm"><RefreshCw className="mx-auto h-6 w-6 animate-spin text-indigo-600" /><p className="mt-3 text-sm font-bold text-slate-700">Loading maintenance history…</p></section> : filteredRecords.length === 0 ? (
        <section className="rounded-2xl border border-slate-200 bg-white px-6 py-14 text-center shadow-sm">
          {records.length === 0 ? <History className="mx-auto h-11 w-11 text-slate-300" /> : <Search className="mx-auto h-11 w-11 text-slate-300" />}
          <h3 className="mt-4 text-base font-black text-slate-900">{records.length === 0 ? 'No maintenance records recorded' : 'No maintenance records match this search'}</h3>
          <p className="mx-auto mt-2 max-w-lg text-sm leading-6 text-slate-500">{records.length === 0 ? 'Log preventive work here or resolve a repair ticket with a maintenance entry to establish the asset’s service history.' : 'Try a device name, asset ID, technician, work order, or part name.'}</p>
        </section>
      ) : <section className="space-y-3">
        {filteredRecords.map(record => <article key={record.id} className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm transition hover:shadow-md">
          <div className="h-1 bg-indigo-500" />
          <div className="p-4 sm:p-5">
            <div className="flex flex-col gap-4 border-b border-slate-100 pb-4 lg:flex-row lg:items-start lg:justify-between">
              <div className="min-w-0"><div className="flex flex-wrap items-center gap-2"><span className="rounded-md border border-indigo-100 bg-indigo-50 px-2 py-1 font-mono text-[10px] font-extrabold text-indigo-700">{record.recordNumber}</span>{record.ticketNumber && <span className="rounded-full border border-slate-200 bg-slate-50 px-2 py-0.5 text-[10px] font-extrabold uppercase tracking-wide text-slate-600">From {record.ticketNumber}</span>}<span className="rounded-full border border-emerald-100 bg-emerald-50 px-2 py-0.5 text-[10px] font-extrabold uppercase tracking-wide text-emerald-700">{record.result}</span></div><button type="button" onClick={() => onSelectDevice?.(record.deviceId)} className="mt-3 inline-flex items-center gap-1 text-sm font-black text-indigo-700 transition hover:text-indigo-900 hover:underline">{record.deviceName} <span className="text-slate-400">/ {record.assetId}</span><ExternalLink className="h-3.5 w-3.5" /></button></div>
              <div className="flex flex-wrap items-center gap-3 text-xs text-slate-600 lg:justify-end"><span className="inline-flex items-center gap-1.5"><CalendarDays className="h-3.5 w-3.5 text-slate-400" />{formatDate(record.date)}</span><span className="inline-flex items-center gap-1.5"><UserRound className="h-3.5 w-3.5 text-slate-400" />{record.technicianName || 'No technician recorded'}</span></div>
            </div>
            <div className="grid gap-3 pt-4 md:grid-cols-2">
              <div className="rounded-xl border border-slate-200 bg-slate-50 p-3.5"><p className="text-[10px] font-bold uppercase tracking-wider text-slate-400">Reported issue & diagnosis</p><p className="mt-1.5 text-sm font-extrabold text-slate-900">{record.problem || 'No problem summary recorded'}</p><p className="mt-1 text-xs leading-5 text-slate-600">{record.diagnosis || 'No diagnosis recorded'}</p></div>
              <div className="rounded-xl border border-slate-200 bg-slate-50 p-3.5"><p className="text-[10px] font-bold uppercase tracking-wider text-slate-400">Work completed</p><p className="mt-1.5 text-sm leading-6 text-slate-800">{record.actionPerformed || 'No action recorded'}</p>{record.partsReplaced?.trim() && <p className="mt-2 rounded-lg border border-violet-100 bg-violet-50 px-2.5 py-2 text-xs text-violet-950"><strong className="font-extrabold">Parts replaced:</strong> {record.partsReplaced}</p>}</div>
            </div>
            {(record.notes || (record.cost !== undefined && record.cost > 0)) && <div className="mt-3 flex flex-col gap-3 border-t border-slate-100 pt-3 text-xs sm:flex-row sm:items-start sm:justify-between"><p className="max-w-3xl leading-5 text-slate-600">{record.notes && <><strong className="font-extrabold text-slate-800">Technician notes:</strong> {record.notes}</>}</p>{record.cost !== undefined && record.cost > 0 && <span className="shrink-0 rounded-lg border border-slate-200 bg-white px-2.5 py-1.5 font-mono font-bold text-slate-700">Cost ${record.cost.toFixed(2)}</span>}</div>}
          </div>
        </article>)}
      </section>}

      <AddMaintenanceModal isOpen={isAddModalOpen} onClose={() => { setIsAddModalOpen(false); void fetchRecords(true); }} />
    </div>
  );
};
