import React, { useState, useEffect } from 'react';
import { Modal } from '../common/Modal';
import { useMonitoring } from '../../context/MonitoringContext';
import { useAuth } from '../../context/AuthContext';
import { Device, DiagnosticIssue, Severity, TicketPriority } from '../../types/index';
import { Wrench, ArrowRight, User } from 'lucide-react';

interface RepairTicketModalProps {
  isOpen: boolean;
  onClose: () => void;
  targetDevice?: Device | null;
  targetIssue?: DiagnosticIssue | null;
}

export const RepairTicketModal: React.FC<RepairTicketModalProps> = ({
  isOpen,
  onClose,
  targetDevice,
  targetIssue
}) => {
  const { devices, refreshData } = useMonitoring();
  const { user } = useAuth();

  const [selectedDeviceId, setSelectedDeviceId] = useState<string>('');
  const [problem, setProblem] = useState<string>('');
  const [diagnosis, setDiagnosis] = useState<string>('');
  const [severity, setSeverity] = useState<Severity>('High');
  const [priority, setPriority] = useState<TicketPriority>('High');
  const [assignedTechnicianName, setAssignedTechnicianName] = useState<string>('');
  const [notes, setNotes] = useState<string>('');
  const [submitting, setSubmitting] = useState<boolean>(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (isOpen) {
      const dev = targetDevice || devices[0];
      setSelectedDeviceId(dev ? dev.id : '');
      if (targetIssue) {
        setProblem(targetIssue.title);
        setDiagnosis(`Automated Finding: ${targetIssue.description}. Triggered evidence: ${targetIssue.evidence.metricName} = ${targetIssue.evidence.currentValue} (Threshold: ${targetIssue.evidence.thresholdValue}). Recommended: ${targetIssue.recommendedAction}`);
        setSeverity(targetIssue.severity);
        setPriority(targetIssue.severity === 'Critical' ? 'Urgent' : 'High');
      } else {
        setProblem(dev ? `Hardware diagnostic check for ${dev.deviceName}` : 'General Maintenance Check');
        setDiagnosis('Physical and software diagnostic inspection.');
        setSeverity('Medium');
        setPriority('Medium');
      }
      setAssignedTechnicianName(user?.role === 'user' ? user.fullName : 'Alex Rivera (Lead Technician)');
      setError(null);
    }
  }, [isOpen, targetDevice, targetIssue, devices, user]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedDeviceId || !problem.trim()) {
      setError('Please select a device and enter problem summary.');
      return;
    }

    setSubmitting(true);
    setError(null);

    try {
      const res = await fetch('/api/tickets', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          deviceId: selectedDeviceId,
          issueId: targetIssue?.id,
          title: problem,
          description: `${diagnosis}${notes.trim() ? `\n\nUser notes: ${notes.trim()}` : ''}`,
          severity,
          priority,
          assignedTechnicianName,
          notes
        })
      });

      if (!res.ok) {
        const data = await res.json();
        throw new Error(data.error || 'Failed to create ticket.');
      }

      await refreshData();
      onClose();
    } catch (err: any) {
      setError(err.message || 'Error submitting ticket.');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title="Create Repair & Diagnostic Service Ticket"
      subtitle="Dispatch hardware maintenance technicians and track repair lifecycle."
      maxWidth="2xl"
    >
      <form onSubmit={handleSubmit} className="space-y-4">
        {error && (
          <div className="p-3 bg-rose-50 border border-rose-200 text-rose-700 text-xs font-semibold rounded-lg">
            {error}
          </div>
        )}

        {/* Target Computer Selection */}
        <div>
          <label className="block text-xs font-bold text-slate-700 mb-1">Target Computer / Laptop *</label>
          <select
            value={selectedDeviceId}
            onChange={e => setSelectedDeviceId(e.target.value)}
            required
            className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-lg text-xs font-bold text-slate-800 focus:ring-1 focus:ring-indigo-500 focus:bg-white"
          >
            {devices.map(d => (
              <option key={d.id} value={d.id}>
                {d.deviceName} ({d.assetId}) • Status: {d.status} • {d.assignedUser}
              </option>
            ))}
          </select>
        </div>

        {/* Problem Title */}
        <div>
          <label className="block text-xs font-bold text-slate-700 mb-1">Problem Summary *</label>
          <input
            type="text"
            required
            value={problem}
            onChange={e => setProblem(e.target.value)}
            placeholder="e.g. Critical High Thermal Spike / Disk C: Almost Full"
            className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-lg text-xs text-slate-800 focus:ring-1 focus:ring-indigo-500 focus:bg-white"
          />
        </div>

        {/* Severity & Priority */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          <div>
            <label className="block text-xs font-bold text-slate-700 mb-1">Severity Level</label>
            <select
              value={severity}
              onChange={e => setSeverity(e.target.value as Severity)}
              className="w-full px-3 py-1.5 bg-slate-50 border border-slate-200 rounded-lg text-xs text-slate-800 focus:ring-1 focus:ring-indigo-500 focus:bg-white"
            >
              <option value="Critical">Critical (System Failing/Unusable)</option>
              <option value="High">High (Impacting Performance)</option>
              <option value="Medium">Medium (Attention Required)</option>
              <option value="Low">Low (Minor Warning)</option>
            </select>
          </div>

          <div>
            <label className="block text-xs font-bold text-slate-700 mb-1">Dispatch Priority</label>
            <select
              value={priority}
              onChange={e => setPriority(e.target.value as TicketPriority)}
              className="w-full px-3 py-1.5 bg-slate-50 border border-slate-200 rounded-lg text-xs text-slate-800 focus:ring-1 focus:ring-indigo-500 focus:bg-white"
            >
              <option value="Urgent">Urgent (Immediate Dispatch)</option>
              <option value="High">High (Within 4 Hours)</option>
              <option value="Medium">Medium (Next Working Shift)</option>
              <option value="Low">Low (Scheduled Routine)</option>
            </select>
          </div>
        </div>

        {/* Assigned Technician */}
        <div>
          <label className="block text-xs font-bold text-slate-700 mb-1">Assigned Support Technician</label>
          <input
            type="text"
            value={assignedTechnicianName}
            onChange={e => setAssignedTechnicianName(e.target.value)}
            placeholder="e.g. Alex Rivera (Hardware Tech)"
            className="w-full px-3 py-1.5 bg-slate-50 border border-slate-200 rounded-lg text-xs text-slate-800 focus:ring-1 focus:ring-indigo-500 focus:bg-white"
          />
        </div>

        {/* Diagnosis & Findings */}
        <div>
          <label className="block text-xs font-bold text-slate-700 mb-1">Diagnostic Findings & Context</label>
          <textarea
            rows={3}
            value={diagnosis}
            onChange={e => setDiagnosis(e.target.value)}
            placeholder="Enter diagnostic details or observed telemetry evidence..."
            className="w-full px-3 py-1.5 bg-slate-50 border border-slate-200 rounded-lg text-xs text-slate-800 focus:ring-1 focus:ring-indigo-500 focus:bg-white font-mono"
          />
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
            className="flex items-center gap-1.5 px-4 py-2 rounded-lg text-xs font-bold bg-indigo-600 text-white hover:bg-indigo-700 transition-all shadow-xs disabled:opacity-50"
          >
            {submitting ? 'Creating Ticket...' : 'Dispatch Ticket'}
            <ArrowRight className="w-4 h-4" />
          </button>
        </div>
      </form>
    </Modal>
  );
};
