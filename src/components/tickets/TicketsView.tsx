import React, { useState, useEffect } from 'react';
import { 
  Wrench, 
  Plus, 
  Search, 
  Filter, 
  CheckCircle2, 
  UserCheck, 
  Clock, 
  AlertCircle, 
  ExternalLink,
  ChevronRight,
  User
} from 'lucide-react';
import { RepairTicket, TicketStatus, Device } from '../../types/index';
import { StatusBadge, SeverityBadge } from '../common/Badge';
import { useMonitoring } from '../../context/MonitoringContext';
import { useAuth } from '../../context/AuthContext';
import { RepairTicketModal } from './RepairTicketModal';
import { ResolveTicketModal } from './ResolveTicketModal';

interface TicketsViewProps {
  onSelectDevice?: (deviceId: string) => void;
}

export const TicketsView: React.FC<TicketsViewProps> = ({ onSelectDevice }) => {
  const { devices, refreshData } = useMonitoring();
  const { user } = useAuth();

  const [tickets, setTickets] = useState<RepairTicket[]>([]);
  const [loading, setLoading] = useState<boolean>(true);
  const [statusFilter, setStatusFilter] = useState<string>('ALL_ACTIVE');
  const [searchQuery, setSearchQuery] = useState<string>('');

  const [isCreateModalOpen, setIsCreateModalOpen] = useState<boolean>(false);
  const [selectedTicketToResolve, setSelectedTicketToResolve] = useState<RepairTicket | null>(null);

  useEffect(() => {
    fetchTickets();
  }, []);

  const fetchTickets = async () => {
    try {
      const res = await fetch('/api/tickets');
      if (res.ok) setTickets(await res.json());
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  const handleUpdateStatus = async (ticketId: string, status: TicketStatus) => {
    try {
      const res = await fetch(`/api/tickets/${ticketId}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ status })
      });
      if (res.ok) {
        await fetchTickets();
        await refreshData();
      }
    } catch (err) {
      console.error(err);
    }
  };

  const handleAssignToMe = async (ticketId: string) => {
    try {
      const res = await fetch(`/api/tickets/${ticketId}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ 
          assignedTechnicianName: user?.fullName || 'Alex Rivera (Technician)',
          status: 'Assigned' 
        })
      });
      if (res.ok) {
        await fetchTickets();
        await refreshData();
      }
    } catch (err) {
      console.error(err);
    }
  };

  const filteredTickets = tickets.filter(ticket => {
    if (statusFilter === 'ALL_ACTIVE') {
      if (ticket.status === 'Resolved' || ticket.status === 'Closed') return false;
    } else if (statusFilter !== 'ALL' && ticket.status !== statusFilter) {
      return false;
    }

    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase();
      const matchDevice = ticket.deviceName.toLowerCase().includes(q);
      const matchAsset = ticket.assetId.toLowerCase().includes(q);
      const matchNum = ticket.ticketNumber.toLowerCase().includes(q);
      const matchProb = ticket.problem.toLowerCase().includes(q);
      const matchTech = (ticket.assignedTechnicianName || '').toLowerCase().includes(q);
      if (!matchDevice && !matchAsset && !matchNum && !matchProb && !matchTech) return false;
    }
    return true;
  });

  const statuses: TicketStatus[] = ['Open', 'Assigned', 'Diagnosing', 'In Repair', 'Waiting for Parts', 'Resolved', 'Closed'];

  return (
    <div className="space-y-4">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 bg-white p-4 rounded-xl border border-slate-200 shadow-xs">
        <div>
          <div className="flex items-center gap-2">
            <h2 className="text-lg font-bold text-slate-900">IT Repair & Incident Tickets</h2>
            <span className="px-2 py-0.5 rounded text-[11px] font-bold bg-indigo-100 text-indigo-800">
              {tickets.filter(t => t.status !== 'Resolved' && t.status !== 'Closed').length} In Progress
            </span>
          </div>
          <p className="text-xs text-slate-500">
            Dispatch technicians, log diagnostics, track part replacements, and record maintenance history.
          </p>
        </div>

        {user?.role !== 'viewer' && (
          <button
            id="btn-create-new-ticket"
            onClick={() => setIsCreateModalOpen(true)}
            className="flex items-center gap-1.5 px-3.5 py-2 rounded-lg text-xs font-bold bg-indigo-600 text-white hover:bg-indigo-700 transition-all shadow-xs"
          >
            <Plus className="w-4 h-4" />
            <span>+ Create Repair Ticket</span>
          </button>
        )}
      </div>

      {/* Filter and Search Bar */}
      <div className="bg-white p-3 rounded-xl border border-slate-200 shadow-xs flex flex-col md:flex-row items-center justify-between gap-2.5">
        {/* Status Filters */}
        <div className="flex items-center gap-1 overflow-x-auto pb-1 md:pb-0 w-full md:w-auto">
          {[
            { id: 'ALL_ACTIVE', label: 'All Active' },
            { id: 'ALL', label: 'All Tickets' },
            { id: 'Open', label: 'Open' },
            { id: 'Assigned', label: 'Assigned' },
            { id: 'Diagnosing', label: 'Diagnosing' },
            { id: 'In Repair', label: 'In Repair' },
            { id: 'Resolved', label: 'Resolved' }
          ].map(tab => (
            <button
              key={tab.id}
              onClick={() => setStatusFilter(tab.id)}
              className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all whitespace-nowrap ${
                statusFilter === tab.id
                  ? 'bg-slate-900 text-white shadow-xs'
                  : 'text-slate-600 hover:bg-slate-100'
              }`}
            >
              {tab.label}
            </button>
          ))}
        </div>

        {/* Search */}
        <div className="relative w-full md:w-64">
          <Search className="w-3.5 h-3.5 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
          <input
            type="text"
            value={searchQuery}
            onChange={e => setSearchQuery(e.target.value)}
            placeholder="Search ticket #, device, issue..."
            className="w-full pl-8 pr-3 py-1.5 bg-slate-50 border border-slate-200 rounded-lg text-xs text-slate-800 placeholder-slate-400 focus:outline-none focus:ring-1 focus:ring-indigo-500 focus:bg-white"
          />
        </div>
      </div>

      {/* Tickets List */}
      {filteredTickets.length === 0 ? (
        <div className="bg-white rounded-xl border border-slate-200 p-12 text-center shadow-xs">
          <CheckCircle2 className="w-10 h-10 text-emerald-500 mx-auto mb-2" />
          <h3 className="text-base font-bold text-slate-800 mb-1">
            {tickets.length === 0 ? 'No Repair Tickets' : 'No tickets matching current filters'}
          </h3>
          <p className="text-xs text-slate-500 max-w-md mx-auto mb-4">
            Create tickets manually or configure the Diagnostic Engine to automatically dispatch tickets on critical telemetry warnings.
          </p>
        </div>
      ) : (
        <div className="space-y-3">
          {filteredTickets.map(ticket => (
            <div
              key={ticket.id}
              className={`bg-white rounded-xl border p-4 shadow-xs space-y-3 ${
                ticket.status === 'Resolved' || ticket.status === 'Closed' ? 'border-slate-200 bg-slate-50/40' :
                ticket.severity === 'Critical' ? 'border-rose-300 ring-1 ring-rose-200' :
                'border-slate-200'
              }`}
            >
              {/* Header */}
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 border-b border-slate-100 pb-2.5">
                <div className="flex flex-wrap items-center gap-2">
                  <span className="font-mono font-bold text-xs px-2 py-0.5 rounded bg-slate-100 text-slate-800">
                    {ticket.ticketNumber}
                  </span>
                  <SeverityBadge severity={ticket.severity} size="sm" />
                  <span className="text-[10px] font-bold uppercase tracking-wider text-slate-500 bg-slate-100 px-1.5 py-0.5 rounded">
                    Priority: {ticket.priority}
                  </span>
                  <StatusBadge status={ticket.status} size="sm" />
                </div>

                <div className="flex items-center gap-3 text-xs text-slate-500">
                  <span>Detected: <strong className="font-mono text-slate-700">{new Date(ticket.detectedDate).toLocaleDateString()}</strong></span>
                </div>
              </div>

              {/* Body */}
              <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
                <div className="md:col-span-2 space-y-1.5">
                  <div className="flex items-center gap-2">
                    <button
                      onClick={() => onSelectDevice && onSelectDevice(ticket.deviceId)}
                      className="text-xs font-bold text-indigo-600 hover:text-indigo-800 hover:underline flex items-center gap-1"
                    >
                      {ticket.deviceName} ({ticket.assetId})
                      <ExternalLink className="w-3 h-3" />
                    </button>
                  </div>
                  <h4 className="text-sm font-bold text-slate-900">{ticket.problem}</h4>
                  <p className="text-xs text-slate-600 font-mono bg-slate-50 p-2.5 rounded-lg border border-slate-100 leading-relaxed">
                    {ticket.diagnosis}
                  </p>
                  {ticket.resolution && (
                    <div className="p-2.5 rounded-lg bg-emerald-50 border border-emerald-200 text-emerald-900 text-xs">
                      <strong>Resolution:</strong> {ticket.resolution}
                    </div>
                  )}
                </div>

                {/* Technician assignment & status workflow */}
                <div className="p-3 bg-slate-50 rounded-xl border border-slate-200 space-y-2.5 text-xs">
                  <div>
                    <span className="text-[10px] font-bold text-slate-400 uppercase block mb-0.5">Assigned Technician</span>
                    <div className="flex items-center justify-between">
                      <p className="font-bold text-slate-800 flex items-center gap-1.5">
                        <User className="w-3.5 h-3.5 text-slate-500" />
                        {ticket.assignedTechnicianName || 'Unassigned'}
                      </p>
                      {!ticket.assignedTechnicianName && user?.role !== 'viewer' && (
                        <button
                          onClick={() => handleAssignToMe(ticket.id)}
                          className="text-[11px] font-bold text-indigo-600 hover:underline"
                        >
                          Claim Ticket
                        </button>
                      )}
                    </div>
                  </div>

                  {user?.role !== 'viewer' && ticket.status !== 'Resolved' && ticket.status !== 'Closed' && (
                    <div className="pt-2 border-t border-slate-200 space-y-1.5">
                      <span className="text-[10px] font-bold text-slate-400 uppercase block">Update Lifecycle Status:</span>
                      <div className="grid grid-cols-2 gap-1">
                        {['Diagnosing', 'In Repair', 'Waiting for Parts'].map((st) => (
                          <button
                            key={st}
                            onClick={() => handleUpdateStatus(ticket.id, st as TicketStatus)}
                            className={`p-1 text-[11px] font-semibold rounded text-center transition-colors ${
                              ticket.status === st ? 'bg-indigo-600 text-white font-bold' : 'bg-white border border-slate-200 text-slate-700 hover:bg-slate-100'
                            }`}
                          >
                            {st}
                          </button>
                        ))}
                        <button
                          onClick={() => setSelectedTicketToResolve(ticket)}
                          className="p-1 text-[11px] font-bold rounded text-center bg-emerald-600 text-white hover:bg-emerald-700 transition-colors col-span-2 flex items-center justify-center gap-1 mt-1"
                        >
                          <CheckCircle2 className="w-3.5 h-3.5" />
                          Resolve & Log
                        </button>
                      </div>
                    </div>
                  )}
                </div>
              </div>

            </div>
          ))}
        </div>
      )}

      {/* Modals */}
      <RepairTicketModal
        isOpen={isCreateModalOpen}
        onClose={() => {
          setIsCreateModalOpen(false);
          fetchTickets();
        }}
      />

      <ResolveTicketModal
        isOpen={!!selectedTicketToResolve}
        onClose={() => {
          setSelectedTicketToResolve(null);
          fetchTickets();
        }}
        ticket={selectedTicketToResolve}
      />
    </div>
  );
};
