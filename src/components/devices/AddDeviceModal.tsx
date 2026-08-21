import React, { useState, useEffect } from 'react';
import { Modal } from '../common/Modal';
import { useMonitoring } from '../../context/MonitoringContext';
import { Department, Location, DeviceType, Device } from '../../types/index';
import { CheckCircle2, Copy, Check, Download, ArrowRight, Monitor } from 'lucide-react';

export const AddDeviceModal: React.FC = () => {
  const { isAddModalOpen, setIsAddModalOpen, refreshData, setInstallTargetDevice, setIsInstallModalOpen } = useMonitoring();

  const [step, setStep] = useState<'form' | 'success'>('form');
  const [createdDevice, setCreatedDevice] = useState<Device | null>(null);
  const [copied, setCopied] = useState<boolean>(false);
  const [submitting, setSubmitting] = useState<boolean>(false);
  const [error, setError] = useState<string | null>(null);

  const [departments, setDepartments] = useState<Department[]>([]);
  const [locations, setLocations] = useState<Location[]>([]);

  // Form Fields
  const [deviceName, setDeviceName] = useState('');
  const [assetId, setAssetId] = useState('');
  const [deviceType, setDeviceType] = useState<DeviceType>('Desktop');
  const [assignedUser, setAssignedUser] = useState('');
  const [departmentId, setDepartmentId] = useState('');
  const [locationId, setLocationId] = useState('');
  const [manufacturer, setManufacturer] = useState('');
  const [model, setModel] = useState('');
  const [serialNumber, setSerialNumber] = useState('');
  const [operatingSystem, setOperatingSystem] = useState('Windows 11 Pro (64-bit)');
  const [purchaseDate, setPurchaseDate] = useState(new Date().toISOString().split('T')[0]);
  const [warrantyExpiration, setWarrantyExpiration] = useState('');
  const [notes, setNotes] = useState('');

  useEffect(() => {
    if (isAddModalOpen) {
      fetch('/api/org/departments').then(res => res.json()).then(data => {
        setDepartments(data);
        if (data.length > 0 && !departmentId) setDepartmentId(data[0].id);
      }).catch(console.error);

      fetch('/api/org/locations').then(res => res.json()).then(data => {
        setLocations(data);
        if (data.length > 0 && !locationId) setLocationId(data[0].id);
      }).catch(console.error);

      setStep('form');
      setCreatedDevice(null);
      setError(null);
      // Auto-generate suggested Asset ID
      const randomId = Math.floor(100 + Math.random() * 900);
      setAssetId(`PC-LAB-${randomId}`);
      setDeviceName(`LAB-PC-${randomId}`);
    }
  }, [isAddModalOpen]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!deviceName.trim() || !assetId.trim()) {
      setError('Device name and Asset ID are required.');
      return;
    }

    setSubmitting(true);
    setError(null);

    try {
      const res = await fetch('/api/devices', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          deviceName,
          assetId,
          deviceType,
          assignedUser,
          departmentId,
          locationId,
          manufacturer,
          model,
          serialNumber,
          operatingSystem,
          purchaseDate,
          warrantyExpiration,
          notes
        })
      });

      if (!res.ok) {
        const data = await res.json();
        throw new Error(data.error || 'Failed to register device.');
      }

      const device: Device = await res.json();
      setCreatedDevice(device);
      setStep('success');
      await refreshData();
    } catch (err: any) {
      setError(err.message || 'An error occurred during registration.');
    } finally {
      setSubmitting(false);
    }
  };

  const copyCode = () => {
    if (createdDevice) {
      navigator.clipboard.writeText(createdDevice.registrationCode);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    }
  };

  return (
    <Modal
      isOpen={isAddModalOpen}
      onClose={() => setIsAddModalOpen(false)}
      title={step === 'form' ? 'Register New Computer / Laptop' : 'Registration Code Generated!'}
      subtitle={step === 'form' ? 'Enter hardware inventory metadata to generate a secure agent registration token.' : 'Install the PC Monitoring Agent and enter this code to begin receiving real telemetry.'}
      maxWidth="3xl"
    >
      {step === 'form' ? (
        <form onSubmit={handleSubmit} className="space-y-4">
          {error && (
            <div className="p-3 rounded-lg bg-rose-50 border border-rose-200 text-xs font-semibold text-rose-700">
              {error}
            </div>
          )}

          <div className="grid grid-cols-1 md:grid-cols-2 gap-3.5">
            {/* Device Name */}
            <div>
              <label className="block text-xs font-bold text-slate-700 mb-1">
                Device Name <span className="text-rose-500">*</span>
              </label>
              <input
                id="input-device-name"
                type="text"
                required
                value={deviceName}
                onChange={e => setDeviceName(e.target.value)}
                placeholder="e.g. LAB1-WS-01"
                className="w-full px-3 py-1.5 bg-slate-50 border border-slate-200 rounded-lg text-xs text-slate-800 focus:ring-1 focus:ring-indigo-500 focus:bg-white"
              />
            </div>

            {/* Asset ID */}
            <div>
              <label className="block text-xs font-bold text-slate-700 mb-1">
                Asset ID / Tag <span className="text-rose-500">*</span>
              </label>
              <input
                id="input-asset-id"
                type="text"
                required
                value={assetId}
                onChange={e => setAssetId(e.target.value)}
                placeholder="e.g. AST-2026-0042"
                className="w-full px-3 py-1.5 bg-slate-50 border border-slate-200 rounded-lg text-xs text-slate-800 font-mono focus:ring-1 focus:ring-indigo-500 focus:bg-white"
              />
            </div>

            {/* Device Type */}
            <div>
              <label className="block text-xs font-bold text-slate-700 mb-1">Device Form Factor</label>
              <select
                value={deviceType}
                onChange={e => setDeviceType(e.target.value as DeviceType)}
                className="w-full px-3 py-1.5 bg-slate-50 border border-slate-200 rounded-lg text-xs text-slate-800 focus:ring-1 focus:ring-indigo-500 focus:bg-white"
              >
                <option value="Desktop">Desktop Tower / Workstation</option>
                <option value="Laptop">Laptop / Portable</option>
                <option value="All-in-One">All-in-One PC</option>
                <option value="Mini PC">Mini PC / NUC</option>
                <option value="Server">Lab Server Host</option>
              </select>
            </div>

            {/* Assigned Person / Lab Desk */}
            <div>
              <label className="block text-xs font-bold text-slate-700 mb-1">Assigned User / Station</label>
              <input
                type="text"
                value={assignedUser}
                onChange={e => setAssignedUser(e.target.value)}
                placeholder="e.g. Student Workstation #4 or Dr. Marcus"
                className="w-full px-3 py-1.5 bg-slate-50 border border-slate-200 rounded-lg text-xs text-slate-800 focus:ring-1 focus:ring-indigo-500 focus:bg-white"
              />
            </div>

            {/* Department */}
            <div>
              <label className="block text-xs font-bold text-slate-700 mb-1">Department</label>
              <select
                value={departmentId}
                onChange={e => setDepartmentId(e.target.value)}
                className="w-full px-3 py-1.5 bg-slate-50 border border-slate-200 rounded-lg text-xs text-slate-800 focus:ring-1 focus:ring-indigo-500 focus:bg-white"
              >
                {departments.map(d => (
                  <option key={d.id} value={d.id}>{d.name} ({d.code})</option>
                ))}
              </select>
            </div>

            {/* Location / Laboratory */}
            <div>
              <label className="block text-xs font-bold text-slate-700 mb-1">Laboratory / Location</label>
              <select
                value={locationId}
                onChange={e => setLocationId(e.target.value)}
                className="w-full px-3 py-1.5 bg-slate-50 border border-slate-200 rounded-lg text-xs text-slate-800 focus:ring-1 focus:ring-indigo-500 focus:bg-white"
              >
                {locations.map(l => (
                  <option key={l.id} value={l.id}>{l.name} - {l.roomNumber}</option>
                ))}
              </select>
            </div>

            {/* Manufacturer & Model */}
            <div>
              <label className="block text-xs font-bold text-slate-700 mb-1">Manufacturer</label>
              <input
                type="text"
                value={manufacturer}
                onChange={e => setManufacturer(e.target.value)}
                placeholder="e.g. Dell / HP / Lenovo / Custom"
                className="w-full px-3 py-1.5 bg-slate-50 border border-slate-200 rounded-lg text-xs text-slate-800 focus:ring-1 focus:ring-indigo-500 focus:bg-white"
              />
            </div>

            <div>
              <label className="block text-xs font-bold text-slate-700 mb-1">Model / Chassis</label>
              <input
                type="text"
                value={model}
                onChange={e => setModel(e.target.value)}
                placeholder="e.g. OptiPlex 7090 / ThinkPad T14"
                className="w-full px-3 py-1.5 bg-slate-50 border border-slate-200 rounded-lg text-xs text-slate-800 focus:ring-1 focus:ring-indigo-500 focus:bg-white"
              />
            </div>

            {/* Serial Number & Operating System */}
            <div>
              <label className="block text-xs font-bold text-slate-700 mb-1">Serial Number</label>
              <input
                type="text"
                value={serialNumber}
                onChange={e => setSerialNumber(e.target.value)}
                placeholder="e.g. 8G2K9L3 or SN-XXXX"
                className="w-full px-3 py-1.5 bg-slate-50 border border-slate-200 rounded-lg text-xs text-slate-800 font-mono focus:ring-1 focus:ring-indigo-500 focus:bg-white"
              />
            </div>

            <div>
              <label className="block text-xs font-bold text-slate-700 mb-1">Expected Operating System</label>
              <select
                value={operatingSystem}
                onChange={e => setOperatingSystem(e.target.value)}
                className="w-full px-3 py-1.5 bg-slate-50 border border-slate-200 rounded-lg text-xs text-slate-800 focus:ring-1 focus:ring-indigo-500 focus:bg-white"
              >
                <option value="Windows 11 Pro (64-bit)">Windows 11 Pro (64-bit)</option>
                <option value="Windows 10 Pro (64-bit)">Windows 10 Pro (64-bit)</option>
                <option value="Windows Server 2022">Windows Server 2022</option>
                <option value="Ubuntu Linux 24.04 LTS">Ubuntu Linux 24.04 LTS</option>
                <option value="macOS Sonoma / Sequoia">macOS Sonoma / Sequoia</option>
              </select>
            </div>
          </div>

          {/* Notes */}
          <div>
            <label className="block text-xs font-bold text-slate-700 mb-1">Administrative Notes</label>
            <textarea
              rows={2}
              value={notes}
              onChange={e => setNotes(e.target.value)}
              placeholder="e.g. Dedicated for Computer Graphics lab coursework, dual monitor setup."
              className="w-full px-3 py-1.5 bg-slate-50 border border-slate-200 rounded-lg text-xs text-slate-800 focus:ring-1 focus:ring-indigo-500 focus:bg-white"
            />
          </div>

          <div className="flex items-center justify-end gap-2 pt-3 border-t border-slate-100">
            <button
              type="button"
              onClick={() => setIsAddModalOpen(false)}
              className="px-4 py-2 rounded-lg text-xs font-semibold text-slate-600 hover:bg-slate-100 transition-colors"
            >
              Cancel
            </button>
            <button
              id="submit-register-device-btn"
              type="submit"
              disabled={submitting}
              className="flex items-center gap-1.5 px-4 py-2 rounded-lg text-xs font-bold bg-indigo-600 text-white hover:bg-indigo-700 transition-all shadow-xs disabled:opacity-50"
            >
              {submitting ? 'Registering...' : 'Generate Registration Code'}
              <ArrowRight className="w-4 h-4" />
            </button>
          </div>
        </form>
      ) : (
        /* Success Screen with Registration Code & Next Steps */
        <div className="space-y-5 text-center py-2">
          <div className="w-12 h-12 rounded-full bg-emerald-100 text-emerald-600 flex items-center justify-center mx-auto">
            <CheckCircle2 className="w-7 h-7" />
          </div>

          <div>
            <h4 className="text-base font-bold text-slate-900">
              {createdDevice?.deviceName} Registered!
            </h4>
            <p className="text-xs text-slate-500 mt-0.5">
              Asset ID: <span className="font-mono font-bold text-slate-700">{createdDevice?.assetId}</span> • Status: <span className="text-sky-600 font-semibold">Waiting for Agent Connection</span>
            </p>
          </div>

          {/* Registration Code Banner */}
          <div className="p-4 bg-slate-900 rounded-xl text-white max-w-md mx-auto shadow-inner">
            <p className="text-[11px] text-slate-400 font-bold uppercase tracking-wider mb-1">
              Device Registration Code
            </p>
            <div className="flex items-center justify-center gap-3">
              <span className="font-mono text-2xl font-black tracking-widest text-indigo-300">
                {createdDevice?.registrationCode}
              </span>
              <button
                id="copy-reg-code-btn"
                onClick={copyCode}
                className="p-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-300 hover:text-white transition-colors"
                title="Copy code"
              >
                {copied ? <Check className="w-4 h-4 text-emerald-400" /> : <Copy className="w-4 h-4" />}
              </button>
            </div>
          </div>

          <div className="text-left bg-slate-50 p-4 rounded-xl border border-slate-200 space-y-2 text-xs text-slate-600 max-w-lg mx-auto">
            <p className="font-bold text-slate-900 flex items-center gap-1.5">
              <Monitor className="w-4 h-4 text-indigo-600" /> Installation Steps on the Physical Computer:
            </p>
            <ol className="list-decimal list-inside space-y-1.5 pl-1">
              <li>Open PowerShell as Administrator on the physical computer.</li>
              <li>Run the Agent script or download the standalone package.</li>
              <li>When prompted, enter registration code: <strong className="font-mono text-indigo-700">{createdDevice?.registrationCode}</strong></li>
              <li>The computer will automatically switch to <strong className="text-emerald-700">ONLINE</strong> and transmit live CPU, RAM, Disk, and Hardware specs!</li>
            </ol>
          </div>

          <div className="flex items-center justify-center gap-3 pt-3 border-t border-slate-100">
            <button
              onClick={() => setIsAddModalOpen(false)}
              className="px-4 py-2 rounded-lg text-xs font-semibold text-slate-600 hover:bg-slate-100 transition-colors"
            >
              Done / Close
            </button>
            <button
              id="open-agent-modal-from-reg-btn"
              onClick={() => {
                setIsAddModalOpen(false);
                setInstallTargetDevice(createdDevice);
                setIsInstallModalOpen(true);
              }}
              className="flex items-center gap-1.5 px-4 py-2 rounded-lg text-xs font-bold bg-indigo-600 text-white hover:bg-indigo-700 transition-all shadow-xs"
            >
              <Download className="w-4 h-4" />
              Open Agent Setup & Commands
            </button>
          </div>
        </div>
      )}
    </Modal>
  );
};
