import React, { useState } from 'react';
import { Modal } from '../common/Modal';
import { useMonitoring } from '../../context/MonitoringContext';
import { RepairTicket } from '../../types/index';
import { CheckCircle2, Wrench, ArrowRight } from 'lucide-react';

interface ResolveTicketModalProps {
  isOpen: boolean;
  onClose: () => void;
  ticket: RepairTicket | null;
}

export const ResolveTicketModal: React.FC<ResolveTicketModalProps> = ({
  isOpen,
  onClose,
  ticket
}) => {
  const { refreshData } = useMonitoring();

  const [resolution, setResolution] = useState<string>('Performed physical inspection, resolved underlying issue, verified normal hardware telemetry.');
  const [createMaintenanceRecord, setCreateMaintenanceRecord] = useState<boolean>(true);
  const [actionPerformed, setActionPerformed] = useState<string>('Cleaned dust filters, replaced thermal compound, uninstalled high-load background task.');
  const [partsReplaced, setPartsReplaced] = useState<string>('');
  const [cost, setCost] = useState<string>('0');
  const [submitting, setSubmitting] = useState<boolean>(false);
  const [error, setError] = useState<string | null>(null);

  if (!ticket) return null;

  const handleResolve = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!resolution.trim()) {
      setError('Resolution notes are required.');
      return;
    }

    setSubmitting(true);
    setError(null);

    try {
      const res = await fetch(`/api/tickets/${ticket.id}/resolve`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          resolution,
          createMaintenanceRecord,
          actionPerformed,
          partsReplaced: partsReplaced.trim() || undefined,
          cost: Number(cost) || 0
        })
      });

      if (!res.ok) {
        const data = await res.json();
        throw new Error(data.error || 'Failed to resolve ticket.');
      }

      await refreshData();
      onClose();
    } catch (err: any) {
      setError(err.message || 'Error resolving ticket.');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title={`Resolve Ticket ${ticket.ticketNumber}`}
      subtitle={`Complete maintenance workflow for ${ticket.deviceName} (${ticket.assetId}).`}
      maxWidth="2xl"
    >
      <form onSubmit={handleResolve} className="space-y-4">
        {error && (
          <div className="p-3 bg-rose-50 border border-rose-200 text-rose-700 text-xs font-semibold rounded-lg">
            {error}
          </div>
        )}

        <div className="p-3 bg-slate-50 border border-slate-200 rounded-lg text-xs space-y-1">
          <p className="font-bold text-slate-800">Reported Problem: {ticket.problem}</p>
          <p className="text-slate-500 font-mono text-[11px]">{ticket.diagnosis}</p>
        </div>

        {/* Resolution Notes */}
        <div>
          <label className="block text-xs font-bold text-slate-700 mb-1">
            Resolution Summary & Findings <span className="text-rose-500">*</span>
          </label>
          <textarea
            rows={3}
            required
            value={resolution}
            onChange={e => setResolution(e.target.value)}
            placeholder="Describe the exact actions taken to resolve the issue..."
            className="w-full px-3 py-1.5 bg-slate-50 border border-slate-200 rounded-lg text-xs text-slate-800 focus:ring-1 focus:ring-indigo-500 focus:bg-white"
          />
        </div>

        {/* Create Maintenance Record Checkbox */}
        <div className="p-3.5 bg-indigo-50/60 border border-indigo-100 rounded-xl space-y-3">
          <label className="flex items-center gap-2 text-xs font-bold text-indigo-900 cursor-pointer">
            <input
              type="checkbox"
              checked={createMaintenanceRecord}
              onChange={e => setCreateMaintenanceRecord(e.target.checked)}
              className="w-4 h-4 text-indigo-600 rounded cursor-pointer"
            />
            <span>Automatically generate official Maintenance & Service History Record</span>
          </label>

          {createMaintenanceRecord && (
            <div className="space-y-2.5 pt-2 border-t border-indigo-100 text-xs">
              <div>
                <label className="block text-slate-700 font-bold mb-1 text-[11px]">Action Performed</label>
                <input
                  type="text"
                  value={actionPerformed}
                  onChange={e => setActionPerformed(e.target.value)}
                  placeholder="e.g. Cleared 60GB temp files, re-applied thermal paste"
                  className="w-full px-2.5 py-1.5 bg-white border border-slate-200 rounded-lg text-xs text-slate-800 focus:ring-1 focus:ring-indigo-500"
                />
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                <div>
                  <label className="block text-slate-700 font-bold mb-1 text-[11px]">Parts Replaced (if any)</label>
                  <input
                    type="text"
                    value={partsReplaced}
                    onChange={e => setPartsReplaced(e.target.value)}
                    placeholder="e.g. Crucial 1TB NVMe SSD / Fan"
                    className="w-full px-2.5 py-1.5 bg-white border border-slate-200 rounded-lg text-xs text-slate-800 focus:ring-1 focus:ring-indigo-500"
                  />
                </div>

                <div>
                  <label className="block text-slate-700 font-bold mb-1 text-[11px]">Parts Cost ($)</label>
                  <input
                    type="number"
                    value={cost}
                    onChange={e => setCost(e.target.value)}
                    className="w-full px-2.5 py-1.5 bg-white border border-slate-200 rounded-lg text-xs text-slate-800 focus:ring-1 focus:ring-indigo-500"
                  />
                </div>
              </div>
            </div>
          )}
        </div>

        <div className="flex items-center justify-end gap-2 pt-3 border-t border-slate-100">
          <button
            type="button"
            onClick={onClose}
            className="px-4 py-2 rounded-lg text-xs font-semibold text-slate-600 hover:bg-slate-100 transition-colors"
          >
            Cancel
          </button>
          <button
            type="submit"
            disabled={submitting}
            className="flex items-center gap-1.5 px-4 py-2 rounded-lg text-xs font-bold bg-emerald-600 text-white hover:bg-emerald-700 transition-all shadow-xs disabled:opacity-50"
          >
            <CheckCircle2 className="w-4 h-4" />
            {submitting ? 'Resolving...' : 'Confirm Resolution & Close'}
          </button>
        </div>
      </form>
    </Modal>
  );
};
