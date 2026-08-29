import React, { useMemo, useState } from 'react';
import { Check, ClipboardCopy, Code2, Download, Laptop, Monitor, Radio, Terminal } from 'lucide-react';
import { Modal } from '../common/Modal';
import { StatusBadge } from '../common/Badge';
import { useMonitoring } from '../../context/MonitoringContext';

type AgentType = 'powershell' | 'python' | 'node';

export const InstallAgentModal: React.FC = () => {
  const {
    isInstallModalOpen,
    setIsInstallModalOpen,
    installTargetDevice,
    setInstallTargetDevice,
    devices,
    setIsAgentUpdateModalOpen,
    setAgentUpdateTargetDevice
  } = useMonitoring();
  const [selectedTab, setSelectedTab] = useState<AgentType>('powershell');
  const [copiedCode, setCopiedCode] = useState(false);
  const [copiedCommand, setCopiedCommand] = useState(false);
  const [copiedScript, setCopiedScript] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Installation is only for an asset that has never paired. A connected,
  // disconnected, or offline agent must use the separate update workflow.
  const unpairedDevices = useMemo(
    () => devices.filter(device => device.connectionState === 'never_connected' && Boolean(device.registrationCode)),
    [devices]
  );
  const currentInstallTarget = installTargetDevice
    ? devices.find(device => device.id === installTargetDevice.id) || installTargetDevice
    : null;
  const selectedDevice = unpairedDevices.find(device => device.id === currentInstallTarget?.id) || unpairedDevices[0] || null;
  const pairedTarget = currentInstallTarget && currentInstallTarget.connectionState !== 'never_connected' ? currentInstallTarget : null;
  const registrationCode = selectedDevice?.registrationCode || null;

  const runCommand = selectedTab === 'powershell'
    ? 'powershell -NoProfile -ExecutionPolicy Bypass -File "$env:USERPROFILE\\Downloads\\pc-monitoring-agent.ps1" -InstallAsStartupTask'
    : selectedTab === 'python'
      ? 'python agent.py'
      : 'node agent.mjs';

  const copyToClipboard = async (value: string, setCopied: (value: boolean) => void) => {
    try {
      await navigator.clipboard.writeText(value);
      setCopied(true);
      window.setTimeout(() => setCopied(false), 2000);
    } catch {
      setError('Clipboard access was blocked. Select and copy the value manually.');
    }
  };

  const agentUrl = (type: AgentType) => registrationCode
    ? `/api/agent/download/${type}?code=${encodeURIComponent(registrationCode)}`
    : null;

  const downloadAgent = (type: AgentType) => {
    const url = agentUrl(type);
    if (!url) {
      setError('Choose an unpaired computer with an active registration code before downloading an agent.');
      return;
    }
    setError(null);
    window.open(url, '_blank', 'noopener,noreferrer');
  };

  const copyScript = async () => {
    const url = agentUrl(selectedTab);
    if (!url) {
      setError('Choose an unpaired computer with an active registration code before copying an agent script.');
      return;
    }
    setError(null);
    try {
      const response = await fetch(url);
      if (!response.ok) {
        const result = await response.json().catch(() => ({}));
        throw new Error(result.error || 'The agent script could not be generated.');
      }
      await navigator.clipboard.writeText(await response.text());
      setCopiedScript(true);
      window.setTimeout(() => setCopiedScript(false), 2000);
    } catch (copyError) {
      setError(copyError instanceof Error ? copyError.message : 'The agent script could not be copied.');
    }
  };

  const openUpdateWorkflow = () => {
    if (!pairedTarget) return;
    setAgentUpdateTargetDevice(pairedTarget);
    setIsInstallModalOpen(false);
    setIsAgentUpdateModalOpen(true);
  };

  return (
    <Modal
      isOpen={isInstallModalOpen}
      onClose={() => setIsInstallModalOpen(false)}
      title="Install Monitoring Agent"
      subtitle="Pair a newly registered physical computer. Existing agents use the separate Update Agent workflow."
      maxWidth="4xl"
    >
      {!selectedDevice ? (
        <div className="space-y-4">
          <div className="rounded-xl border border-dashed border-slate-300 bg-slate-50 p-8 text-center">
            <Monitor className="mx-auto mb-2 h-7 w-7 text-slate-400" />
            {pairedTarget ? (
              <>
                <p className="text-sm font-bold text-slate-800">{pairedTarget.deviceName} is already paired</p>
                <p className="mt-1 text-xs leading-5 text-slate-600">A registration code is not reused after pairing. Use the agent update workflow instead of downloading another install package.</p>
                <button type="button" onClick={openUpdateWorkflow} className="mt-4 rounded-lg bg-indigo-600 px-3.5 py-2 text-xs font-bold text-white hover:bg-indigo-700">Open Update Agent</button>
              </>
            ) : (
              <>
                <p className="text-sm font-bold text-slate-800">No unpaired computers are waiting for installation</p>
                <p className="mt-1 text-xs text-slate-600">Register a computer first. A device-specific pairing code will then be available here.</p>
              </>
            )}
          </div>
          <div className="flex justify-end"><button type="button" onClick={() => setIsInstallModalOpen(false)} className="rounded-lg bg-slate-900 px-4 py-2 text-xs font-bold text-white hover:bg-slate-800">Close</button></div>
        </div>
      ) : (
        <div className="space-y-5">
          <div className="flex flex-col gap-3 rounded-xl border border-slate-200 bg-slate-50 p-4 sm:flex-row sm:items-center sm:justify-between">
            <div className="flex items-center gap-3">
              <div className="rounded-lg border border-indigo-100 bg-indigo-50 p-2.5 text-indigo-700"><Monitor className="h-5 w-5" /></div>
              <div>
                <p className="text-[10px] font-bold uppercase tracking-wide text-slate-400">Computer awaiting first agent</p>
                <div className="flex flex-wrap items-center gap-2"><select value={selectedDevice.id} onChange={event => setInstallTargetDevice(unpairedDevices.find(device => device.id === event.target.value) || null)} className="border-b border-slate-300 bg-transparent pb-0.5 text-sm font-bold text-slate-900 focus:border-indigo-600 focus:outline-none">{unpairedDevices.map(device => <option key={device.id} value={device.id}>{device.deviceName} ({device.assetId})</option>)}</select><StatusBadge status={selectedDevice.status} size="sm" /></div>
                <p className="mt-1 text-[11px] text-slate-500">No heartbeat has been received. The dashboard will show a connection only after this physical computer pairs and sends telemetry.</p>
              </div>
            </div>
            <div className="flex items-center gap-2 rounded-lg border border-slate-200 bg-white px-3 py-2 shadow-xs">
              <div><p className="text-[10px] font-bold uppercase text-slate-400">Pairing code</p><p className="font-mono text-sm font-bold text-indigo-700">{registrationCode}</p></div>
              <button type="button" onClick={() => void copyToClipboard(registrationCode, setCopiedCode)} className="rounded p-1 text-slate-500 hover:bg-slate-100 hover:text-slate-800" title="Copy pairing code">{copiedCode ? <Check className="h-4 w-4 text-emerald-600" /> : <ClipboardCopy className="h-4 w-4" />}</button>
            </div>
          </div>

          <div className="rounded-xl border border-sky-200 bg-sky-50 p-3 text-xs text-sky-900"><div className="flex gap-2"><Radio className="mt-0.5 h-4 w-4 shrink-0" /><div><strong>Waiting for a real heartbeat.</strong> Download and run the selected agent on <strong>{selectedDevice.deviceName}</strong>. It remains unconnected until the backend receives an authenticated registration and telemetry.</div></div></div>

          <div>
            <div className="flex flex-wrap gap-1 border-b border-slate-200">
              <button type="button" onClick={() => setSelectedTab('powershell')} className={`flex items-center gap-2 border-b-2 px-4 py-2.5 text-xs font-bold ${selectedTab === 'powershell' ? 'border-indigo-600 bg-indigo-50/50 text-indigo-700' : 'border-transparent text-slate-500 hover:text-slate-800'}`}><Terminal className="h-4 w-4" />Windows PowerShell (recommended)</button>
              <button type="button" onClick={() => setSelectedTab('python')} className={`flex items-center gap-2 border-b-2 px-4 py-2.5 text-xs font-bold ${selectedTab === 'python' ? 'border-indigo-600 bg-indigo-50/50 text-indigo-700' : 'border-transparent text-slate-500 hover:text-slate-800'}`}><Code2 className="h-4 w-4" />Python</button>
              <button type="button" onClick={() => setSelectedTab('node')} className={`flex items-center gap-2 border-b-2 px-4 py-2.5 text-xs font-bold ${selectedTab === 'node' ? 'border-indigo-600 bg-indigo-50/50 text-indigo-700' : 'border-transparent text-slate-500 hover:text-slate-800'}`}><Laptop className="h-4 w-4" />Node.js</button>
            </div>
            <div className="space-y-4 rounded-b-xl bg-slate-900 p-4 font-mono text-xs text-slate-200">
              <div className="flex flex-wrap items-center justify-between gap-2 font-sans"><div><p className="text-[11px] font-bold text-slate-200">1. Download the device-specific agent</p><p className="mt-0.5 text-[11px] text-slate-400">The pairing code is embedded only for this unpaired asset.</p></div><div className="flex flex-wrap gap-2"><button id="download-ps-agent-btn" type="button" onClick={() => downloadAgent(selectedTab)} className="inline-flex items-center gap-1.5 rounded-lg bg-indigo-600 px-3 py-2 text-xs font-bold text-white hover:bg-indigo-500"><Download className="h-3.5 w-3.5" />Download {selectedTab === 'powershell' ? '.ps1' : selectedTab === 'python' ? '.py' : '.mjs'}</button><button type="button" onClick={() => void copyScript()} className="inline-flex items-center gap-1.5 rounded-lg border border-slate-700 bg-slate-800 px-3 py-2 text-xs font-semibold text-slate-200 hover:bg-slate-700">{copiedScript ? <Check className="h-3.5 w-3.5 text-emerald-400" /> : <ClipboardCopy className="h-3.5 w-3.5" />}{copiedScript ? 'Script copied' : 'Copy script'}</button></div></div>
              <div><div className="mb-1 flex flex-wrap justify-between gap-1 font-sans text-[11px] text-slate-400"><span className="font-semibold text-slate-300">2. Run on the target computer</span><span>Open PowerShell as Administrator</span></div><p className="mb-2 font-sans text-[11px] leading-4 text-slate-400">The downloaded file is normally saved in your Downloads folder. If you saved it elsewhere, replace the path in the command.</p><div className="flex items-center gap-2 rounded-lg border border-slate-800 bg-slate-950 p-3"><code className="min-w-0 flex-1 break-all text-emerald-400">{runCommand}</code><button id="copy-agent-cmd-btn" type="button" onClick={() => void copyToClipboard(runCommand, setCopiedCommand)} className="rounded bg-slate-800 p-1.5 text-slate-200 hover:bg-slate-700" title="Copy command">{copiedCommand ? <Check className="h-4 w-4 text-emerald-400" /> : <ClipboardCopy className="h-4 w-4" />}</button></div></div>
              {selectedTab !== 'powershell' && <p className="rounded-lg border border-amber-500/30 bg-amber-500/10 p-2.5 font-sans text-[11px] text-amber-100">Python and Node installers provide their supported telemetry only. They do not advertise the Windows Wi-Fi diagnostic command or Windows agent update capabilities.</p>}
            </div>
          </div>

          {error && <div role="alert" className="rounded-xl border border-rose-200 bg-rose-50 px-3 py-2 text-xs text-rose-800">{error}</div>}
          <div className="flex justify-end border-t border-slate-100 pt-2"><button type="button" onClick={() => setIsInstallModalOpen(false)} className="rounded-lg bg-slate-900 px-4 py-2 text-xs font-bold text-white hover:bg-slate-800">Close Guide</button></div>
        </div>
      )}
    </Modal>
  );
};
