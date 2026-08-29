import React, { useEffect, useMemo, useState } from 'react';
import {
  AlertTriangle,
  CheckCircle2,
  ClipboardCheck,
  Clock3,
  ExternalLink,
  Plus,
  RefreshCw,
  Search,
  User,
  UserRoundCheck,
  Wrench
} from 'lucide-react';
import { RepairTicket, TicketStatus } from '../../types/index';
import { SeverityBadge, StatusBadge } from '../common/Badge';
import { useMonitoring } from '../../context/MonitoringContext';
import { useAuth } from '../../context/AuthContext';
import { RepairTicketModal } from './RepairTicketModal';
import { ResolveTicketModal } from './ResolveTicketModal';

interface TicketsViewProps {
  onSelectDevice?: (deviceId: string) => void;
}

/** The Worker maintains problem/diagnosis aliases for existing incident records. */
type OperationalRepairTicket = RepairTicket & {
  problem?: string;
  diagnosis?: string;
  verificationBlockedReason?: string;
};

const ticketProblem = (ticket: OperationalRepairTicket) => ticket.problem || ticket.title || 'Untitled incident';
const ticketDiagnosis = (ticket: OperationalRepairTicket) => ticket.diagnosis || ticket.description || 'No diagnostic narrative was supplied for this incident.';

const formatDate = (value?: string) => {
  if (!value) return 'No date recorded';
  const date = new Date(value);
  return Number.isNaN(date.getTime()) ? 'No date recorded' : date.toLocaleString([], { dateStyle: 'medium', timeStyle: 'short' });
};

export const TicketsView: React.FC<TicketsViewProps> = ({ onSelectDevice }) => {
  const { refreshData } = useMonitoring();
  const { user } = useAuth();
  const [tickets, setTickets] = useState<OperationalRepairTicket[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [statusFilter, setStatusFilter] = useState<string>('ALL_ACTIVE');
  const [searchQuery, setSearchQuery] = useState('');
  const [isCreateModalOpen, setIsCreateModalOpen] = useState(false);
  const [selectedTicketToResolve, setSelectedTicketToResolve] = useState<OperationalRepairTicket | null>(null);

  const fetchTickets = async (isManualRefresh = false) => {
    if (isManualRefresh) setRefreshing(true);
    else setLoading(true);
    setError(null);
    try {
      const res = await fetch('/api/tickets');
      if (!res.ok) throw new Error('The incident queue could not be loaded.');
      const data = await res.json();
      setTickets(Array.isArray(data) ? data as OperationalRepairTicket[] : []);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'The incident queue could not be loaded.');
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  useEffect(() => {
    void fetchTickets();
  }, []);

  const updateTicket = async (ticketId: string, payload: Partial<OperationalRepairTicket>) => {
    setError(null);
    try {
      const res = await fetch(`/api/tickets/${ticketId}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload)
      });
      if (!res.ok) throw new Error('The incident could not be updated.');
      await Promise.all([fetchTickets(true), refreshData()]);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'The incident could not be updated.');
    }
  };

  const handleAssignToMe = (ticketId: string) => void updateTicket(ticketId, {
    assignedTechnicianName: user?.fullName || 'Current technician',
    status: 'Assigned'
  });

  const filteredTickets = useMemo(() => tickets.filter(ticket => {
    if (statusFilter === 'ALL_ACTIVE') {
      if (ticket.status === 'Resolved' || ticket.status === 'Closed') return false;
    } else if (statusFilter !== 'ALL' && ticket.status !== statusFilter) return false;

    if (!searchQuery.trim()) return true;
    const query = searchQuery.toLowerCase();
    return [ticket.ticketNumber, ticket.deviceName, ticket.assetId, ticketProblem(ticket), ticketDiagnosis(ticket), ticket.assignedTechnicianName]
      .some(value => String(value || '').toLowerCase().includes(query));
  }), [searchQuery, statusFilter, tickets]);

  const activeTickets = tickets.filter(ticket => ticket.status !== 'Resolved' && ticket.status !== 'Closed');
  const criticalTickets = activeTickets.filter(ticket => ticket.severity === 'Critical').length;
  const unassignedTickets = activeTickets.filter(ticket => !ticket.assignedTechnicianName).length;
  const verificationPending = tickets.filter(ticket => ticket.status === 'Resolved' && ticket.verificationStatus === 'Pending').length;
  const canManageTickets = user?.role === 'super_admin';
  const canReportProblem = user?.role === 'user' || canManageTickets;
  const statusTabs = [
    { id: 'ALL_ACTIVE', label: 'Active queue', count: activeTickets.length },
    { id: 'Open', label: 'Open', count: tickets.filter(ticket => ticket.status === 'Open').length },
    { id: 'Assigned', label: 'Assigned', count: tickets.filter(ticket => ticket.status === 'Assigned').length },
    { id: 'Diagnosing', label: 'Diagnosing', count: tickets.filter(ticket => ticket.status === 'Diagnosing').length },
    { id: 'In Repair', label: 'In repair', count: tickets.filter(ticket => ticket.status === 'In Repair').length },
    { id: 'Resolved', label: 'Resolved', count: tickets.filter(ticket => ticket.status === 'Resolved').length },
    { id: 'ALL', label: 'All', count: tickets.length }
  ];

  return (
    <div className="mx-auto max-w-7xl space-y-5">
      <section className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm">
        <div className="flex flex-col gap-5 p-5 lg:flex-row lg:items-center lg:justify-between">
          <div className="flex min-w-0 items-start gap-3">
            <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-indigo-950 text-white shadow-sm"><Wrench className="h-5 w-5" /></div>
            <div className="min-w-0">
              <p className="text-[11px] font-extrabold uppercase tracking-[0.14em] text-indigo-700">Operations / Incident response</p>
              <h2 className="mt-1 text-xl font-black tracking-tight text-slate-950">Repair ticket queue</h2>
              <p className="mt-1 max-w-2xl text-sm leading-6 text-slate-500">Assign accountable technicians, progress repair work, and keep post-repair verification visible until the lifecycle is complete.</p>
            </div>
          </div>
          <div className="flex flex-wrap items-center gap-2">
            <button type="button" onClick={() => void fetchTickets(true)} disabled={loading || refreshing} className="inline-flex items-center gap-2 rounded-lg border border-slate-200 bg-white px-3 py-2 text-xs font-bold text-slate-700 transition hover:border-slate-300 hover:bg-slate-50 disabled:cursor-not-allowed disabled:opacity-60">
              <RefreshCw className={`h-3.5 w-3.5 ${refreshing ? 'animate-spin' : ''}`} /> {refreshing ? 'Refreshing' : 'Refresh'}
            </button>
            {canReportProblem && <button id="btn-create-new-ticket" type="button" onClick={() => setIsCreateModalOpen(true)} className="inline-flex items-center gap-2 rounded-lg bg-indigo-700 px-3.5 py-2 text-xs font-bold text-white shadow-sm transition hover:bg-indigo-800 focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:ring-offset-2"><Plus className="h-4 w-4" /> {canManageTickets ? 'Create repair ticket' : 'Report a problem'}</button>}
          </div>
        </div>
        <div className="grid border-t border-slate-100 sm:grid-cols-2 xl:grid-cols-4">
          {[
            { label: 'Active work', value: activeTickets.length, detail: 'not resolved or closed', icon: Clock3, tone: 'text-indigo-700 bg-indigo-50', border: 'xl:border-r' },
            { label: 'Critical incidents', value: criticalTickets, detail: 'need immediate attention', icon: AlertTriangle, tone: 'text-rose-700 bg-rose-50', border: 'sm:border-r xl:border-r' },
            { label: 'Unassigned', value: unassignedTickets, detail: 'waiting for ownership', icon: User, tone: 'text-amber-700 bg-amber-50', border: 'xl:border-r' },
            { label: 'Verify after repair', value: verificationPending, detail: 'resolved but not verified', icon: ClipboardCheck, tone: 'text-emerald-700 bg-emerald-50', border: '' }
          ].map(item => {
            const Icon = item.icon;
            return <div key={item.label} className={`flex items-center gap-3 border-b border-slate-100 px-5 py-3 last:border-b-0 xl:border-b-0 ${item.border}`}>
              <span className={`flex h-8 w-8 items-center justify-center rounded-lg ${item.tone}`}><Icon className="h-4 w-4" /></span>
              <div><p className="text-[10px] font-bold uppercase tracking-wider text-slate-400">{item.label}</p><p className="mt-0.5 text-sm font-black text-slate-900">{item.value} <span className="font-medium text-slate-500">{item.detail}</span></p></div>
            </div>;
          })}
        </div>
      </section>

      <section className="rounded-2xl border border-slate-200 bg-white p-3 shadow-sm">
        <div className="flex flex-col gap-3 xl:flex-row xl:items-center xl:justify-between">
          <div className="flex min-w-0 items-center gap-2 overflow-x-auto pb-1 xl:pb-0">
            {statusTabs.map(tab => <button key={tab.id} type="button" onClick={() => setStatusFilter(tab.id)} className={`inline-flex shrink-0 items-center gap-2 rounded-lg px-3 py-2 text-xs font-bold transition ${statusFilter === tab.id ? 'bg-slate-950 text-white shadow-sm' : 'text-slate-600 hover:bg-slate-100 hover:text-slate-900'}`}>
              {tab.label}<span className={`rounded-md px-1.5 py-0.5 text-[10px] ${statusFilter === tab.id ? 'bg-white/15 text-white' : 'bg-slate-100 text-slate-500'}`}>{tab.count}</span>
            </button>)}
          </div>
          <div className="relative w-full xl:w-80"><Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" /><input type="search" value={searchQuery} onChange={event => setSearchQuery(event.target.value)} placeholder="Search incident, device, or technician" className="w-full rounded-lg border border-slate-200 bg-slate-50 py-2 pl-9 pr-3 text-xs text-slate-800 outline-none transition placeholder:text-slate-400 focus:border-indigo-400 focus:bg-white focus:ring-2 focus:ring-indigo-100" /></div>
        </div>
        <div className="mt-3 flex items-center justify-between border-t border-slate-100 pt-2.5 text-[11px] text-slate-500"><span>Showing <strong className="font-bold text-slate-700">{filteredTickets.length}</strong> of {tickets.length} incidents</span><span className="hidden sm:inline">Closing remains blocked until post-repair verification passes.</span></div>
      </section>

      {error && <section role="alert" className="flex flex-col gap-3 rounded-2xl border border-rose-200 bg-rose-50 p-4 text-sm text-rose-900 sm:flex-row sm:items-center sm:justify-between"><div className="flex items-start gap-2"><AlertTriangle className="mt-0.5 h-4 w-4 shrink-0" /><span>{error}</span></div><button type="button" onClick={() => void fetchTickets(true)} className="self-start text-xs font-extrabold underline underline-offset-2 sm:self-auto">Try again</button></section>}

      {loading ? <section className="rounded-2xl border border-slate-200 bg-white p-10 text-center shadow-sm"><RefreshCw className="mx-auto h-6 w-6 animate-spin text-indigo-600" /><p className="mt-3 text-sm font-bold text-slate-700">Loading repair tickets…</p></section> : filteredTickets.length === 0 ? (
        <section className="rounded-2xl border border-slate-200 bg-white px-6 py-14 text-center shadow-sm">
          {tickets.length === 0 ? <CheckCircle2 className="mx-auto h-11 w-11 text-emerald-500" /> : <Search className="mx-auto h-11 w-11 text-slate-300" />}
          <h3 className="mt-4 text-base font-black text-slate-900">{tickets.length === 0 ? 'No repair tickets recorded' : 'No incidents match these filters'}</h3>
          <p className="mx-auto mt-2 max-w-lg text-sm leading-6 text-slate-500">{tickets.length === 0 ? 'Create a ticket from a diagnostic finding or open a manual incident when work needs to be tracked.' : 'Change the queue filter or search terms to review a different set of incidents.'}</p>
        </section>
      ) : <section className="space-y-3">
        {filteredTickets.map(ticket => {
          const isComplete = ticket.status === 'Resolved' || ticket.status === 'Closed';
          const isCritical = !isComplete && ticket.severity === 'Critical';
          return <article key={ticket.id} className={`overflow-hidden rounded-2xl border bg-white shadow-sm transition hover:shadow-md ${isCritical ? 'border-rose-200' : 'border-slate-200'}`}>
            <div className={`h-1 ${isCritical ? 'bg-rose-500' : ticket.status === 'Closed' ? 'bg-emerald-500' : ticket.status === 'Resolved' ? 'bg-teal-500' : 'bg-indigo-500'}`} />
            <div className="p-4 sm:p-5">
              <div className="flex flex-col gap-4 border-b border-slate-100 pb-4 lg:flex-row lg:items-start lg:justify-between">
                <div className="min-w-0">
                  <div className="flex flex-wrap items-center gap-2"><span className="rounded-md border border-slate-200 bg-slate-50 px-2 py-1 font-mono text-[10px] font-extrabold text-slate-700">{ticket.ticketNumber}</span><SeverityBadge severity={ticket.severity} size="sm" /><StatusBadge status={ticket.status} size="sm" /><span className="rounded-full bg-slate-100 px-2 py-0.5 text-[10px] font-extrabold uppercase tracking-wide text-slate-600">Priority {ticket.priority}</span></div>
                  <h3 className="mt-3 text-base font-black text-slate-950">{ticketProblem(ticket)}</h3>
                  <button type="button" onClick={() => onSelectDevice?.(ticket.deviceId)} className="mt-1 inline-flex items-center gap-1 text-xs font-bold text-indigo-700 transition hover:text-indigo-900 hover:underline">{ticket.deviceName} <span className="text-slate-400">/ {ticket.assetId}</span><ExternalLink className="h-3.5 w-3.5" /></button>
                </div>
                <div className="rounded-lg border border-slate-100 bg-slate-50 px-3 py-2 lg:text-right"><p className="text-[10px] font-bold uppercase tracking-wider text-slate-400">Detected</p><p className="mt-0.5 text-xs font-semibold text-slate-700">{formatDate(ticket.detectedDate)}</p></div>
              </div>

              <div className="grid gap-4 pt-4 xl:grid-cols-[minmax(0,1fr)_18rem]">
                <div className="min-w-0 space-y-3">
                  <div className="rounded-xl border border-slate-200 bg-slate-50 p-3.5"><p className="text-[10px] font-bold uppercase tracking-wider text-slate-400">Diagnostic evidence</p><p className="mt-1.5 whitespace-pre-wrap text-sm leading-6 text-slate-600">{ticketDiagnosis(ticket)}</p></div>
                  {ticket.resolution && <div className="rounded-xl border border-emerald-200 bg-emerald-50 p-3.5"><p className="text-[10px] font-bold uppercase tracking-wider text-emerald-700">Recorded repair action</p><p className="mt-1.5 text-sm leading-6 text-emerald-950">{ticket.resolution}</p></div>}
                  {ticket.status === 'Resolved' && ticket.verificationStatus && <div className="flex items-start gap-2 rounded-xl border border-amber-200 bg-amber-50 p-3 text-xs leading-5 text-amber-950"><ClipboardCheck className="mt-0.5 h-4 w-4 shrink-0 text-amber-600" /><span><strong>Post-repair verification: {ticket.verificationStatus}.</strong>{ticket.verificationBlockedReason ? ` ${ticket.verificationBlockedReason}` : ' The device record retains this incident until verification is complete.'}</span></div>}
                </div>

                <aside className="rounded-xl border border-slate-200 bg-slate-50 p-3.5">
                  <p className="text-[10px] font-bold uppercase tracking-wider text-slate-400">Work ownership</p>
                  <div className="mt-2 flex items-center justify-between gap-2"><div className="flex min-w-0 items-center gap-2"><span className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-white text-slate-500 shadow-sm"><User className="h-3.5 w-3.5" /></span><p className="truncate text-xs font-extrabold text-slate-800">{ticket.assignedTechnicianName || 'Unassigned'}</p></div>{!ticket.assignedTechnicianName && canManageTickets && <button type="button" onClick={() => handleAssignToMe(ticket.id)} className="shrink-0 text-[11px] font-extrabold text-indigo-700 hover:underline">Claim</button>}</div>
                  {canManageTickets && !isComplete && <div className="mt-4 border-t border-slate-200 pt-3"><p className="text-[10px] font-bold uppercase tracking-wider text-slate-400">Lifecycle action</p><div className="mt-2 grid grid-cols-2 gap-1.5">{(['Diagnosing', 'In Repair', 'Waiting for Parts'] as TicketStatus[]).map(status => <button key={status} type="button" onClick={() => void updateTicket(ticket.id, { status })} className={`rounded-lg px-2 py-1.5 text-[10px] font-bold transition ${ticket.status === status ? 'bg-indigo-700 text-white' : 'border border-slate-200 bg-white text-slate-700 hover:bg-slate-100'}`}>{status}</button>)}<button type="button" onClick={() => setSelectedTicketToResolve(ticket)} className="col-span-2 inline-flex items-center justify-center gap-1.5 rounded-lg bg-emerald-600 px-2 py-2 text-[11px] font-extrabold text-white transition hover:bg-emerald-700"><CheckCircle2 className="h-3.5 w-3.5" /> Resolve & log work</button></div></div>}
                  {ticket.assignedTechnicianName && <div className="mt-4 flex items-center gap-1.5 border-t border-slate-200 pt-3 text-[11px] font-semibold text-slate-500"><UserRoundCheck className="h-3.5 w-3.5 text-emerald-600" />Owner recorded in incident history</div>}
                </aside>
              </div>
            </div>
          </article>;
        })}
      </section>}

      <RepairTicketModal isOpen={isCreateModalOpen} onClose={() => { setIsCreateModalOpen(false); void fetchTickets(true); }} />
      <ResolveTicketModal isOpen={!!selectedTicketToResolve} onClose={() => { setSelectedTicketToResolve(null); void fetchTickets(true); }} ticket={selectedTicketToResolve} />
    </div>
  );
};
