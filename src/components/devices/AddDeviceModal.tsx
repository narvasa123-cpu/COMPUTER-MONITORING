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
        <div className="space-y-5 py-1">
          <div className="flex flex-col items-center text-center">
            <div className="grid h-14 w-14 place-items-center rounded-2xl bg-emerald-50 text-emerald-600 ring-8 ring-emerald-50/60">
              <CheckCircle2 className="h-7 w-7" />
            </div>
            <h4 className="mt-4 text-xl font-extrabold tracking-tight text-slate-950">Computer registered successfully</h4>
            <p className="mt-1 text-sm text-slate-500">Install the agent on this computer to start receiving verified telemetry.</p>
          </div>

          <div>
            <h4 className="sr-only">
              {createdDevice?.deviceName} Registered!
            </h4>
            <p className="mt-0.5 text-center text-xs text-slate-500">
              Asset ID: <span className="font-mono font-bold text-slate-700">{createdDevice?.assetId}</span> • Status: <span className="text-sky-600 font-semibold">Waiting for Agent Connection</span>
            </p>
          </div>

          {/* Registration Code Banner */}
          <div className="mx-auto w-full max-w-xl rounded-2xl border border-indigo-200 bg-gradient-to-br from-slate-950 via-slate-900 to-indigo-950 p-5 text-white shadow-lg shadow-slate-900/10">
            <p className="text-[11px] text-slate-400 font-bold uppercase tracking-wider mb-1">
              One-time registration code
            </p>
            <div className="flex items-start justify-between gap-4">
              <span className="min-w-0 break-all text-left font-mono text-lg font-extrabold leading-7 tracking-[0.12em] text-indigo-100 sm:text-xl">
                {createdDevice?.registrationCode}
              </span>
              <button
                id="copy-reg-code-btn"
                type="button"
                onClick={copyCode}
                className="inline-flex shrink-0 items-center gap-1.5 rounded-lg bg-white/10 px-3 py-2 text-xs font-bold text-white transition hover:bg-white/20 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-indigo-300"
              >
                {copied ? <Check className="w-4 h-4 text-emerald-300" /> : <Copy className="w-4 h-4" />}
                {copied ? 'Copied' : 'Copy'}
              </button>
            </div>
          </div>

          <div className="mx-auto max-w-xl rounded-2xl border border-slate-200 bg-slate-50/80 p-4 text-left text-xs text-slate-600">
            <p className="flex items-center gap-2 font-extrabold text-slate-900">
              <span className="grid h-7 w-7 place-items-center rounded-lg bg-indigo-100 text-indigo-600"><Monitor className="h-4 w-4" /></span>
              Install on the physical computer
            </p>
            <ol className="mt-3 grid gap-2 leading-5 sm:grid-cols-2">
              <li className="flex gap-2"><span className="font-bold text-indigo-600">1.</span><span>Open PowerShell as Administrator.</span></li>
              <li className="flex gap-2"><span className="font-bold text-indigo-600">2.</span><span>Run the monitoring agent installer.</span></li>
              <li className="flex gap-2"><span className="font-bold text-indigo-600">3.</span><span>Enter the one-time code when prompted.</span></li>
              <li className="flex gap-2"><span className="font-bold text-indigo-600">4.</span><span>Wait for the device to report <strong className="text-emerald-700">ONLINE</strong>.</span></li>
            </ol>
          </div>

          <div className="flex flex-col-reverse items-stretch justify-end gap-2 border-t border-slate-100 pt-4 sm:flex-row sm:items-center">
            <button
              type="button"
              onClick={() => setIsAddModalOpen(false)}
              className="rounded-lg px-4 py-2.5 text-sm font-semibold text-slate-600 transition-colors hover:bg-slate-100"
            >
              Close
            </button>
            <button
              id="open-agent-modal-from-reg-btn"
              type="button"
              onClick={() => {
                setIsAddModalOpen(false);
                setInstallTargetDevice(createdDevice);
                setIsInstallModalOpen(true);
              }}
              className="inline-flex items-center justify-center gap-2 rounded-lg bg-indigo-600 px-4 py-2.5 text-sm font-bold text-white shadow-sm transition-all hover:bg-indigo-700 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-indigo-300"
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
