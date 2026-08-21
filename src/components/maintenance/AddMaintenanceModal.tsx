import React, { useState } from 'react';
import { Modal } from '../common/Modal';
import { useMonitoring } from '../../context/MonitoringContext';
import { useAuth } from '../../context/AuthContext';
import { Device } from '../../types/index';
import { CheckCircle2, ArrowRight } from 'lucide-react';

interface AddMaintenanceModalProps {
  isOpen: boolean;
  onClose: () => void;
  targetDevice?: Device | null;
}

export const AddMaintenanceModal: React.FC<AddMaintenanceModalProps> = ({
  isOpen,
  onClose,
  targetDevice
}) => {
  const { devices, refreshData } = useMonitoring();
  const { user } = useAuth();

  const [selectedDeviceId, setSelectedDeviceId] = useState<string>(targetDevice?.id || devices[0]?.id || '');
  const [technicianName, setTechnicianName] = useState<string>(user?.fullName || 'Alex Rivera (Technician)');
  const [problem, setProblem] = useState<string>('Routine preventative cleaning and hardware health audit.');
  const [diagnosis, setDiagnosis] = useState<string>('Fans dusty, high background temperatures.');
  const [actionPerformed, setActionPerformed] = useState<string>('Cleared fan dust, reapplied thermal paste, cleaned keyboard and ports.');
  const [partsReplaced, setPartsReplaced] = useState<string>('');
  const [result, setResult] = useState<string>('Fully operational, temperatures lowered by 15°C.');
  const [cost, setCost] = useState<string>('0');
  const [submitting, setSubmitting] = useState<boolean>(false);
  const [error, setError] = useState<string | null>(null);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedDeviceId || !actionPerformed.trim()) {
      setError('Please select a device and enter action performed.');
      return;
    }

    setSubmitting(true);
    setError(null);

    try {
      const res = await fetch('/api/maintenance', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          deviceId: selectedDeviceId,
          technicianName,
          problem,
          diagnosis,
          actionPerformed,
          partsReplaced: partsReplaced.trim() || undefined,
          result,
          cost: Number(cost) || 0
        })
      });

      if (!res.ok) {
        const data = await res.json();
        throw new Error(data.error || 'Failed to log maintenance record.');
      }

      await refreshData();
      onClose();
    } catch (err: any) {
      setError(err.message || 'Error creating maintenance record.');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title="Log Historical Maintenance & Service Action"
      subtitle="Record preventative maintenance, hardware repairs, part upgrades, and testing results."
      maxWidth="2xl"
    >
      <form onSubmit={handleSubmit} className="space-y-4">
        {error && (
          <div className="p-3 bg-rose-50 border border-rose-200 text-rose-700 text-xs font-semibold rounded-lg">
            {error}
          </div>
        )}

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
                {d.deviceName} ({d.assetId}) • {d.assignedUser}
              </option>
            ))}
          </select>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          <div>
            <label className="block text-xs font-bold text-slate-700 mb-1">Technician Name *</label>
            <input
              type="text"
              required
              value={technicianName}
              onChange={e => setTechnicianName(e.target.value)}
              className="w-full px-3 py-1.5 bg-slate-50 border border-slate-200 rounded-lg text-xs text-slate-800 focus:ring-1 focus:ring-indigo-500 focus:bg-white"
            />
          </div>

          <div>
            <label className="block text-xs font-bold text-slate-700 mb-1">Repair Cost ($)</label>
            <input
              type="number"
              value={cost}
              onChange={e => setCost(e.target.value)}
              className="w-full px-3 py-1.5 bg-slate-50 border border-slate-200 rounded-lg text-xs text-slate-800 focus:ring-1 focus:ring-indigo-500 focus:bg-white"
            />
          </div>
        </div>

        <div>
          <label className="block text-xs font-bold text-slate-700 mb-1">Initial Problem / Reason</label>
          <input
            type="text"
            value={problem}
            onChange={e => setProblem(e.target.value)}
            className="w-full px-3 py-1.5 bg-slate-50 border border-slate-200 rounded-lg text-xs text-slate-800 focus:ring-1 focus:ring-indigo-500 focus:bg-white"
          />
        </div>

        <div>
          <label className="block text-xs font-bold text-slate-700 mb-1">Diagnosis Findings</label>
          <input
            type="text"
            value={diagnosis}
            onChange={e => setDiagnosis(e.target.value)}
            className="w-full px-3 py-1.5 bg-slate-50 border border-slate-200 rounded-lg text-xs text-slate-800 focus:ring-1 focus:ring-indigo-500 focus:bg-white"
          />
        </div>

        <div>
          <label className="block text-xs font-bold text-slate-700 mb-1">Action Performed *</label>
          <textarea
            rows={2}
            required
            value={actionPerformed}
            onChange={e => setActionPerformed(e.target.value)}
            className="w-full px-3 py-1.5 bg-slate-50 border border-slate-200 rounded-lg text-xs text-slate-800 focus:ring-1 focus:ring-indigo-500 focus:bg-white"
          />
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          <div>
            <label className="block text-xs font-bold text-slate-700 mb-1">Parts Replaced / Upgraded</label>
            <input
              type="text"
              value={partsReplaced}
              onChange={e => setPartsReplaced(e.target.value)}
              placeholder="e.g. DDR4 16GB RAM, Kingston SSD"
              className="w-full px-3 py-1.5 bg-slate-50 border border-slate-200 rounded-lg text-xs text-slate-800 focus:ring-1 focus:ring-indigo-500 focus:bg-white"
            />
          </div>

          <div>
            <label className="block text-xs font-bold text-slate-700 mb-1">Result & Verification</label>
            <input
              type="text"
              value={result}
              onChange={e => setResult(e.target.value)}
              placeholder="e.g. PASSED, Tested 100% Operational"
              className="w-full px-3 py-1.5 bg-slate-50 border border-slate-200 rounded-lg text-xs text-slate-800 focus:ring-1 focus:ring-indigo-500 focus:bg-white"
            />
          </div>
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
            className="flex items-center gap-1.5 px-4 py-2 rounded-lg text-xs font-bold bg-purple-600 text-white hover:bg-purple-700 transition-all shadow-xs disabled:opacity-50"
          >
            {submitting ? 'Saving...' : 'Save Maintenance Log'}
            <ArrowRight className="w-4 h-4" />
          </button>
        </div>
      </form>
    </Modal>
  );
};
