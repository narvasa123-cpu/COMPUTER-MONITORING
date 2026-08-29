import React, { useEffect, useMemo, useState } from 'react';
import { AlertTriangle, Check, CheckCircle2, Clock, Copy, Download, Monitor, RefreshCw, ShieldAlert } from 'lucide-react';
import { Modal } from '../common/Modal';
import { StatusBadge } from '../common/Badge';
import { useAuth } from '../../context/AuthContext';
import { useMonitoring } from '../../context/MonitoringContext';

type UpdateResult = {
  message?: string;
  error?: string;
  manualUpdateRequired?: boolean;
};

const formatDateTime = (value?: string) => value ? new Date(value).toLocaleString() : 'Not reported';

const updateState = (status?: string) => {
  switch (status) {
    case 'verified':
      return { label: 'Verified by fresh telemetry', classes: 'border-emerald-200 bg-emerald-50 text-emerald-900' };
    case 'queued':
      return { label: 'Update queued', classes: 'border-indigo-200 bg-indigo-50 text-indigo-900' };
    case 'dispatched':
      return { label: 'Delivered to agent', classes: 'border-indigo-200 bg-indigo-50 text-indigo-900' };
    case 'package_delivered':
      return { label: 'Package received by agent - not verified', classes: 'border-indigo-200 bg-indigo-50 text-indigo-900' };
    case 'bootstrap_downloaded':
    case 'manual_package_downloaded':
      return { label: 'Package downloaded - not installed', classes: 'border-sky-200 bg-sky-50 text-sky-900' };
    case 'awaiting_verification':
      return { label: 'Awaiting verification heartbeat', classes: 'border-indigo-200 bg-indigo-50 text-indigo-900' };
    case 'failed':
      return { label: 'Update needs attention', classes: 'border-rose-200 bg-rose-50 text-rose-900' };
    default:
      return { label: 'No update requested', classes: 'border-slate-200 bg-slate-50 text-slate-700' };
  }
};

/**
 * A deliberately separate flow from installation. The package contains no
 * registration code: it can run only on a previously paired computer whose
 * local agent credential belongs to this asset.
 */
export const AgentUpdateModal: React.FC = () => {
  const {
    isAgentUpdateModalOpen,
    setIsAgentUpdateModalOpen,
    agentUpdateTargetDevice,
    setAgentUpdateTargetDevice,
    devices,
    refreshData
  } = useMonitoring();
  const { user } = useAuth();
  const [downloading, setDownloading] = useState(false);
  const [queueing, setQueueing] = useState(false);
  const [copied, setCopied] = useState(false);
  const [message, setMessage] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [downloadedInThisSession, setDownloadedInThisSession] = useState(false);

  const device = useMemo(() => {
    if (!agentUpdateTargetDevice) return null;
    return devices.find(candidate => candidate.id === agentUpdateTargetDevice.id) || agentUpdateTargetDevice;
  }, [agentUpdateTargetDevice, devices]);

  const canManageUpdates = user?.role === 'super_admin' || user?.role === 'it_admin';
  const capabilities = device?.agentCapabilities || [];
  const supportsSelfUpdate = capabilities.includes('agent_self_update');
  const isConnected = device?.connectionState === 'connected';
  const isPaired = !!device && device.connectionState !== 'never_connected';
  const status = updateState(device?.agentUpdateStatus);
  const updateAwaitingVerification = device?.agentUpdateStatus === 'queued'
    || device?.agentUpdateStatus === 'dispatched'
    || device?.agentUpdateStatus === 'package_delivered'
    || device?.agentUpdateStatus === 'awaiting_verification';
  const updateCommand = 'powershell -NoProfile -ExecutionPolicy Bypass -File "$env:USERPROFILE\\Downloads\\pc-monitoring-agent-update.ps1" -InstallAsStartupTask';

  useEffect(() => {
    if (!isAgentUpdateModalOpen) return;
    setMessage(null);
    setError(null);
    setDownloadedInThisSession(false);
  }, [isAgentUpdateModalOpen, device?.id]);

  // The global console already refreshes regularly. Keep a slightly slower,
  // explicit refresh while the operator is waiting for evidence of an update.
  useEffect(() => {
    if (!isAgentUpdateModalOpen) return;
    void refreshData();
    const timer = window.setInterval(() => void refreshData(), 10000);
    return () => window.clearInterval(timer);
  }, [isAgentUpdateModalOpen, refreshData]);

  const close = () => {
    setIsAgentUpdateModalOpen(false);
    setAgentUpdateTargetDevice(null);
  };

  const copyUpdateCommand = async () => {
    try {
      await navigator.clipboard.writeText(updateCommand);
      setCopied(true);
      window.setTimeout(() => setCopied(false), 2000);
    } catch {
      setError('The update command could not be copied. Copy it manually from the command box.');
    }
  };

  const downloadBootstrapPackage = async () => {
    if (!device) return;
    setDownloading(true);
    setError(null);
    setMessage(null);
    try {
      const response = await fetch(`/api/devices/${device.id}/agent-installer/powershell`);
      if (!response.ok) {
        const result = await response.json().catch(() => ({})) as UpdateResult;
        throw new Error(result.error || 'The Windows update package could not be generated.');
      }
      const script = await response.blob();
      const objectUrl = window.URL.createObjectURL(new Blob([script], { type: 'text/plain;charset=utf-8' }));
      const link = document.createElement('a');
      link.href = objectUrl;
      link.download = 'pc-monitoring-agent-update.ps1';
      document.body.appendChild(link);
      link.click();
      link.remove();
      window.setTimeout(() => window.URL.revokeObjectURL(objectUrl), 1000);
      setDownloadedInThisSession(true);
      setMessage('Update package downloaded. It has not been installed or verified. Run it on the target computer, then wait for a new heartbeat.');
      await refreshData();
    } catch (downloadError) {
      setError(downloadError instanceof Error ? downloadError.message : 'The Windows update package could not be downloaded.');
    } finally {
      setDownloading(false);
    }
  };

  const requestAutomaticUpdate = async () => {
    if (!device) return;
    if (!window.confirm(`Request an agent update for ${device.deviceName}? The connected agent will retrieve the Worker's current Windows agent package during its next command cycle. Verification still requires a fresh telemetry heartbeat.`)) return;
    setQueueing(true);
    setError(null);
    setMessage(null);
    try {
      const response = await fetch(`/api/devices/${device.id}/agent-update`, { method: 'POST' });
      const result = await response.json().catch(() => ({})) as UpdateResult;
      if (!response.ok) {
        throw new Error(result.error || (result.manualUpdateRequired
          ? 'This agent requires the one-time Windows update package.'
          : 'The agent update request could not be queued.'));
      }
      setMessage(result.message || 'Agent update queued. The console will mark it verified only after the restarted agent reports fresh telemetry.');
      await refreshData();
    } catch (queueError) {
      setError(queueError instanceof Error ? queueError.message : 'The agent update request could not be queued.');
    } finally {
      setQueueing(false);
    }
  };

  return (
    <Modal
      isOpen={isAgentUpdateModalOpen}
      onClose={close}
      title="Update Windows Monitoring Agent"
      subtitle="Update existing paired computers without reusing or exposing a registration code."
      maxWidth="3xl"
    >
      {!device ? (
        <div className="rounded-xl border border-dashed border-slate-300 bg-slate-50 p-8 text-center text-sm text-slate-600">
          Select a paired computer before opening the agent update workflow.
        </div>
      ) : (
        <div className="space-y-5">
          <div className="flex flex-col gap-3 rounded-xl border border-slate-200 bg-slate-50 p-4 sm:flex-row sm:items-center sm:justify-between">
            <div className="flex items-center gap-3">
              <div className="rounded-lg border border-indigo-100 bg-indigo-50 p-2.5 text-indigo-700"><Monitor className="h-5 w-5" /></div>
              <div>
                <p className="text-[10px] font-bold uppercase tracking-wide text-slate-400">Target computer</p>
                <p className="text-sm font-black text-slate-900">{device.deviceName} <span className="font-mono text-slate-500">({device.assetId})</span></p>
                <p className="mt-0.5 text-[11px] text-slate-500">Last heartbeat: {formatDateTime(device.lastHeartbeatAt)}</p>
              </div>
            </div>
            <StatusBadge status={device.status} size="sm" />
          </div>

          {!isPaired ? (
            <div className="flex gap-2 rounded-xl border border-sky-200 bg-sky-50 p-3 text-xs text-sky-900">
              <ShieldAlert className="mt-0.5 h-4 w-4 shrink-0" />
              <div><strong>This computer has not paired with an agent yet.</strong> Use the installation workflow and its registration code first. An update package cannot turn an unpaired asset into a monitored computer.</div>
            </div>
          ) : (
            <>
              <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
                <div className="rounded-xl border border-slate-200 bg-white p-3"><p className="text-[10px] font-bold uppercase tracking-wide text-slate-400">Reported version</p><p className="mt-1 font-mono text-sm font-bold text-slate-900">{device.agentVersion || 'Not reported'}</p></div>
                <div className="rounded-xl border border-slate-200 bg-white p-3"><p className="text-[10px] font-bold uppercase tracking-wide text-slate-400">Connection</p><p className="mt-1 text-sm font-bold text-slate-900">{isConnected ? 'Connected' : device.connectionState.replaceAll('_', ' ')}</p></div>
                <div className={`rounded-xl border p-3 ${status.classes}`}><p className="text-[10px] font-bold uppercase tracking-wide opacity-70">Update state</p><p className="mt-1 text-sm font-bold">{status.label}</p></div>
              </div>

              <div className="rounded-xl border border-slate-200 bg-white p-4">
                <p className="text-[10px] font-bold uppercase tracking-wide text-slate-400">Agent capabilities reported by this computer</p>
                {capabilities.length ? (
                  <div className="mt-2 flex flex-wrap gap-1.5">
                    {capabilities.map(capability => <span key={capability} className="rounded-md bg-slate-100 px-2 py-1 font-mono text-[10px] font-semibold text-slate-700">{capability}</span>)}
                  </div>
                ) : <p className="mt-2 text-xs text-slate-500">No capability list has been reported. This is treated as an older agent; use the one-time Windows update package.</p>}
                {device.agentUpdateTargetVersion && <p className="mt-3 text-xs text-slate-600">Requested target version: <span className="font-mono font-bold">{device.agentUpdateTargetVersion}</span></p>}
                {device.agentUpdateRequestedAt && <p className="mt-1 text-[11px] text-slate-500">Last update request: {formatDateTime(device.agentUpdateRequestedAt)}</p>}
                {device.agentUpdatePackageDeliveredAt && <p className="mt-1 text-[11px] text-slate-500">Package received by agent: {formatDateTime(device.agentUpdatePackageDeliveredAt)}</p>}
                {device.agentUpdateVerifiedAt && <p className="mt-1 text-[11px] font-semibold text-emerald-700">Verified after telemetry: {formatDateTime(device.agentUpdateVerifiedAt)}</p>}
                {device.agentUpdateFailureReason && <p className="mt-2 text-xs font-medium text-rose-700">Update evidence: {device.agentUpdateFailureReason}</p>}
              </div>

              {device.agentUpdateStatus === 'verified' && (
                <div className="flex gap-2 rounded-xl border border-emerald-200 bg-emerald-50 p-3 text-xs text-emerald-900"><CheckCircle2 className="mt-0.5 h-4 w-4 shrink-0" /><div><strong>Agent update verified.</strong> The backend received a new heartbeat that reported the expected agent version and capabilities. This is evidence of the update, not merely a package download.</div></div>
              )}

              {updateAwaitingVerification && (
                <div className="flex gap-2 rounded-xl border border-indigo-200 bg-indigo-50 p-3 text-xs text-indigo-900"><Clock className="mt-0.5 h-4 w-4 shrink-0" /><div><strong>Waiting for agent evidence.</strong> The request is {device.agentUpdateStatus}. The dashboard refreshes automatically, but it will not claim completion until a fresh telemetry cycle reports the upgraded agent.</div></div>
              )}

              {!supportsSelfUpdate && (
                <div className="flex gap-2 rounded-xl border border-sky-200 bg-sky-50 p-3 text-xs text-sky-900"><ShieldAlert className="mt-0.5 h-4 w-4 shrink-0" /><div><strong>One-time manual bootstrap required.</strong> This agent has not reported <span className="font-mono">agent_self_update</span>, so no remote update command can be honestly queued. Download the device-bound Windows package below and run it on this physical computer. Future compatible agents can accept an update request from the console.</div></div>
              )}

              {downloadedInThisSession && (
                <div className="flex gap-2 rounded-xl border border-amber-200 bg-amber-50 p-3 text-xs text-amber-900"><AlertTriangle className="mt-0.5 h-4 w-4 shrink-0" /><div><strong>Package downloaded, not installed.</strong> Run the command below on <strong>{device.deviceName}</strong>, using the same Windows account that runs the current agent. Then wait for the next heartbeat to verify the result.</div></div>
              )}

              {message && <div className="rounded-xl border border-sky-200 bg-sky-50 px-3 py-2 text-xs text-sky-900">{message}</div>}
              {error && <div role="alert" className="rounded-xl border border-rose-200 bg-rose-50 px-3 py-2 text-xs text-rose-800">{error}</div>}

              <div className="rounded-xl border border-slate-200 bg-white p-4">
                <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
                  <div>
                    <h4 className="text-sm font-bold text-slate-900">One-time Windows update package</h4>
                    <p className="mt-1 text-xs leading-5 text-slate-600">This package is generated for this paired device and has no reusable registration code. It uses the agent credential already stored on the target PC; it cannot authenticate a different asset.</p>
                  </div>
                  {canManageUpdates && <button type="button" disabled={downloading} onClick={() => void downloadBootstrapPackage()} className="inline-flex shrink-0 items-center justify-center gap-1.5 rounded-lg bg-indigo-600 px-3 py-2 text-xs font-bold text-white hover:bg-indigo-700 disabled:cursor-not-allowed disabled:bg-slate-300"><Download className="h-3.5 w-3.5" />{downloading ? 'Preparing...' : 'Download Windows package'}</button>}
                </div>
                {!canManageUpdates && <p className="mt-3 text-xs text-amber-800">Only an IT administrator can generate or request an agent update. Your access is read-only.</p>}
                <div className="mt-3 rounded-lg border border-slate-800 bg-slate-950 p-3">
                   <p className="mb-1.5 font-sans text-[10px] font-bold uppercase tracking-wide text-slate-400">Run on the target computer after download</p>
                   <p className="mb-2 font-sans text-[11px] leading-4 text-slate-400">The package normally downloads to your Downloads folder. If it was saved elsewhere, replace the path in the command.</p>
                  <div className="flex items-center gap-2"><code className="min-w-0 flex-1 break-all text-xs text-emerald-400">{updateCommand}</code><button type="button" onClick={() => void copyUpdateCommand()} className="rounded bg-slate-800 p-1.5 text-slate-200 hover:bg-slate-700" title="Copy update command">{copied ? <Check className="h-4 w-4 text-emerald-400" /> : <Copy className="h-4 w-4" />}</button></div>
                </div>
              </div>

              <div className="rounded-xl border border-slate-200 bg-slate-50 p-4">
                <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                  <div><h4 className="text-sm font-bold text-slate-900">Future automatic update</h4><p className="mt-1 text-xs text-slate-600">Available only after this agent has reported the <span className="font-mono">agent_self_update</span> capability and is currently connected.</p></div>
                  {canManageUpdates && <button type="button" disabled={!supportsSelfUpdate || !isConnected || queueing || updateAwaitingVerification} onClick={() => void requestAutomaticUpdate()} className="inline-flex shrink-0 items-center justify-center gap-1.5 rounded-lg border border-indigo-200 bg-white px-3 py-2 text-xs font-bold text-indigo-700 hover:bg-indigo-50 disabled:cursor-not-allowed disabled:border-slate-200 disabled:bg-slate-100 disabled:text-slate-400" title={!supportsSelfUpdate ? 'This agent needs the one-time Windows update package first.' : !isConnected ? 'The agent must be connected to receive an update command.' : undefined}><RefreshCw className={`h-3.5 w-3.5 ${queueing ? 'animate-spin' : ''}`} />{queueing ? 'Queuing...' : 'Request automatic update'}</button>}
                </div>
              </div>
            </>
          )}

          <div className="flex justify-end border-t border-slate-100 pt-2"><button type="button" onClick={close} className="rounded-lg bg-slate-900 px-4 py-2 text-xs font-bold text-white hover:bg-slate-800">Close</button></div>
        </div>
      )}
    </Modal>
  );
};
