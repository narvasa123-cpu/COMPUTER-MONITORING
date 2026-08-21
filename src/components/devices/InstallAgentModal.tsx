import React, { useState } from 'react';
import { Modal } from '../common/Modal';
import { useMonitoring } from '../../context/MonitoringContext';
import { Device } from '../../types/index';
import { 
  Download, 
  Terminal, 
  Copy, 
  Check, 
  Monitor, 
  CheckCircle2, 
  Radio, 
  Laptop, 
  Code2, 
  ExternalLink 
} from 'lucide-react';
import { StatusBadge } from '../common/Badge';

export const InstallAgentModal: React.FC = () => {
  const { 
    isInstallModalOpen, 
    setIsInstallModalOpen, 
    installTargetDevice, 
    devices,
    setInstallTargetDevice 
  } = useMonitoring();

  const [selectedTab, setSelectedTab] = useState<'powershell' | 'python' | 'node'>('powershell');
  const [copiedCode, setCopiedCode] = useState(false);
  const [copiedCommand, setCopiedCommand] = useState(false);

  const [copiedScript, setCopiedScript] = useState(false);

  const selectedDevice = installTargetDevice || devices[0] || null;
  const registrationCode = selectedDevice?.registrationCode || 'REG-XXXX-XXXX';
  const serverUrl = window.location.origin;

  const powershellRunCommand = `powershell -ExecutionPolicy Bypass -File .\\pc-monitoring-agent.ps1`;
  const pythonRunCommand = `python agent.py`;
  const nodeRunCommand = `node agent.mjs`;

  const getRunCommand = () => {
    switch (selectedTab) {
      case 'powershell': return powershellRunCommand;
      case 'python': return pythonRunCommand;
      case 'node': return nodeRunCommand;
    }
  };

  const copyToClipboard = (text: string, setCopied: (v: boolean) => void) => {
    navigator.clipboard.writeText(text);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const handleDownload = (type: 'powershell' | 'python' | 'node') => {
    window.open(`/api/agent/download/${type}?code=${registrationCode}`, '_blank');
  };

  const handleCopyFullScript = async (type: 'powershell' | 'python' | 'node') => {
    try {
      const res = await fetch(`/api/agent/download/${type}?code=${registrationCode}`);
      const text = await res.text();
      await navigator.clipboard.writeText(text);
      setCopiedScript(true);
      setTimeout(() => setCopiedScript(false), 2000);
    } catch (e) {
      console.error('Failed to copy script content', e);
    }
  };

  const isConnected = selectedDevice && selectedDevice.status !== 'Waiting for Agent Connection';

  return (
    <Modal
      isOpen={isInstallModalOpen}
      onClose={() => setIsInstallModalOpen(false)}
      title="PC & Laptop Monitoring Agent Installation"
      subtitle="Deploy the lightweight hardware monitoring agent on physical computers."
      maxWidth="4xl"
    >
      <div className="space-y-5">
        
        {/* Device Selector & Live Status */}
        <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 p-4 bg-slate-50 border border-slate-200 rounded-xl">
          <div className="flex items-center gap-3">
            <div className="p-2.5 rounded-lg bg-indigo-50 border border-indigo-100 text-indigo-700">
              <Monitor className="w-5 h-5" />
            </div>
            <div>
              <p className="text-[11px] font-bold text-slate-400 uppercase tracking-wider">Target Computer</p>
              <div className="flex items-center gap-2">
                <select
                  value={selectedDevice?.id || ''}
                  onChange={e => {
                    const dev = devices.find(d => d.id === e.target.value);
                    setInstallTargetDevice(dev || null);
                  }}
                  className="text-sm font-bold text-slate-900 bg-transparent border-b border-slate-300 focus:outline-none focus:border-indigo-600 pb-0.5 cursor-pointer"
                >
                  {devices.map(d => (
                    <option key={d.id} value={d.id}>
                      {d.deviceName} ({d.assetId}) - {d.status}
                    </option>
                  ))}
                </select>
                {selectedDevice && <StatusBadge status={selectedDevice.status} size="sm" />}
              </div>
            </div>
          </div>

          {/* Registration Code Display */}
          <div className="flex items-center gap-2 bg-white px-3 py-1.5 rounded-lg border border-slate-200 shadow-xs">
            <div>
              <p className="text-[10px] text-slate-400 font-semibold uppercase">Registration Code</p>
              <p className="font-mono text-sm font-bold text-indigo-600">{registrationCode}</p>
            </div>
            <button
              onClick={() => copyToClipboard(registrationCode, setCopiedCode)}
              className="p-1 text-slate-400 hover:text-slate-700 hover:bg-slate-100 rounded transition-colors"
              title="Copy code"
            >
              {copiedCode ? <Check className="w-4 h-4 text-emerald-600" /> : <Copy className="w-4 h-4" />}
            </button>
          </div>
        </div>

        {/* Live Connection Watcher Status */}
        <div className={`p-3.5 rounded-xl border flex items-center justify-between gap-3 ${
          isConnected ? 'bg-emerald-50 border-emerald-200 text-emerald-900' : 'bg-sky-50 border-sky-200 text-sky-900'
        }`}>
          <div className="flex items-center gap-2.5">
            <Radio className={`w-4 h-4 ${isConnected ? 'text-emerald-600 animate-pulse' : 'text-sky-600 animate-spin'}`} />
            <div>
              <p className="text-xs font-bold">
                {isConnected 
                  ? `Agent Connected & Telemetry Active (${selectedDevice.status})` 
                  : 'Listening for incoming Agent telemetry...'
                }
              </p>
              <p className="text-[11px] opacity-80">
                {isConnected
                  ? `Last heartbeat: ${selectedDevice.lastHeartbeatAt ? new Date(selectedDevice.lastHeartbeatAt).toLocaleTimeString() : 'Active'}. Hardware telemetry streaming.`
                  : 'Run the command below on the target physical computer. The dashboard will automatically update in real time.'
                }
              </p>
            </div>
          </div>
          {isConnected && (
            <span className="px-2.5 py-1 rounded bg-emerald-100 text-emerald-800 font-bold text-xs flex items-center gap-1">
              <CheckCircle2 className="w-3.5 h-3.5" />
              ONLINE
            </span>
          )}
        </div>

        {/* Agent Script Tabs */}
        <div>
          <div className="flex items-center gap-2 border-b border-slate-200">
            <button
              onClick={() => setSelectedTab('powershell')}
              className={`flex items-center gap-2 px-4 py-2.5 text-xs font-bold border-b-2 transition-all ${
                selectedTab === 'powershell' 
                  ? 'border-indigo-600 text-indigo-600 bg-indigo-50/50' 
                  : 'border-transparent text-slate-500 hover:text-slate-800'
              }`}
            >
              <Terminal className="w-4 h-4" />
              <span>Windows PowerShell (Recommended)</span>
            </button>

            <button
              onClick={() => setSelectedTab('python')}
              className={`flex items-center gap-2 px-4 py-2.5 text-xs font-bold border-b-2 transition-all ${
                selectedTab === 'python' 
                  ? 'border-indigo-600 text-indigo-600 bg-indigo-50/50' 
                  : 'border-transparent text-slate-500 hover:text-slate-800'
              }`}
            >
              <Code2 className="w-4 h-4" />
              <span>Python 3 (Cross-Platform)</span>
            </button>

            <button
              onClick={() => setSelectedTab('node')}
              className={`flex items-center gap-2 px-4 py-2.5 text-xs font-bold border-b-2 transition-all ${
                selectedTab === 'node' 
                  ? 'border-indigo-600 text-indigo-600 bg-indigo-50/50' 
                  : 'border-transparent text-slate-500 hover:text-slate-800'
              }`}
            >
              <Laptop className="w-4 h-4" />
              <span>Node.js</span>
            </button>
          </div>

          <div className="p-4 bg-slate-900 rounded-b-xl text-slate-200 space-y-4 font-mono text-xs">
            {/* Direct Download & Copy Script File */}
            <div>
              <div className="flex items-center justify-between text-slate-400 text-[11px] mb-2 font-sans">
                <span className="font-semibold text-slate-300">Step 1: Download or Copy Agent Script</span>
                <span className="text-emerald-400">Pre-configured with Server & Code</span>
              </div>
              <div className="flex flex-wrap items-center gap-2">
                {selectedTab === 'powershell' && (
                  <button
                    id="download-ps-agent-btn"
                    onClick={() => handleDownload('powershell')}
                    className="flex items-center gap-1.5 px-3.5 py-2 rounded-lg bg-indigo-600 hover:bg-indigo-500 text-white font-sans text-xs font-bold transition-colors shadow-xs"
                  >
                    <Download className="w-3.5 h-3.5" />
                    Download pc-monitoring-agent.ps1
                  </button>
                )}

                {selectedTab === 'python' && (
                  <button
                    onClick={() => handleDownload('python')}
                    className="flex items-center gap-1.5 px-3.5 py-2 rounded-lg bg-indigo-600 hover:bg-indigo-500 text-white font-sans text-xs font-bold transition-colors"
                  >
                    <Download className="w-3.5 h-3.5" />
                    Download pc-monitoring-agent.py
                  </button>
                )}

                {selectedTab === 'node' && (
                  <button
                    onClick={() => handleDownload('node')}
                    className="flex items-center gap-1.5 px-3.5 py-2 rounded-lg bg-indigo-600 hover:bg-indigo-500 text-white font-sans text-xs font-bold transition-colors"
                  >
                    <Download className="w-3.5 h-3.5" />
                    Download pc-monitoring-agent.mjs
                  </button>
                )}

                <button
                  onClick={() => handleCopyFullScript(selectedTab)}
                  className="flex items-center gap-1.5 px-3 py-2 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-200 font-sans text-xs font-semibold transition-colors border border-slate-700"
                  title="Copy the full script code to clipboard"
                >
                  {copiedScript ? <Check className="w-3.5 h-3.5 text-emerald-400" /> : <Copy className="w-3.5 h-3.5" />}
                  {copiedScript ? 'Copied Full Script!' : 'Copy Script Code'}
                </button>
              </div>
            </div>

            {/* Step 2: Run Command in PowerShell/Terminal */}
            <div>
              <div className="flex items-center justify-between text-slate-400 text-[11px] mb-1 font-sans">
                <span className="font-semibold text-slate-300">Step 2: Run in {selectedTab === 'powershell' ? 'PowerShell (Run as Administrator)' : 'Terminal'}</span>
                <span>In the folder where the script is saved</span>
              </div>
              <div className="bg-slate-950 p-3 rounded-lg border border-slate-800 flex items-center justify-between gap-3">
                <code className="text-emerald-400 break-all select-all font-mono">
                  {getRunCommand()}
                </code>
                <button
                  id="copy-agent-cmd-btn"
                  onClick={() => copyToClipboard(getRunCommand(), setCopiedCommand)}
                  className="p-1.5 rounded bg-slate-800 hover:bg-slate-700 text-slate-300 hover:text-white shrink-0 transition-colors"
                  title="Copy command"
                >
                  {copiedCommand ? <Check className="w-4 h-4 text-emerald-400" /> : <Copy className="w-4 h-4" />}
                </button>
              </div>
            </div>

            {/* Feature checklist */}
            <div className="pt-3 border-t border-slate-800/80 font-sans text-[11px] text-slate-400 grid grid-cols-1 sm:grid-cols-2 gap-2">
              <div className="flex items-center gap-1.5">
                <Check className="w-3.5 h-3.5 text-emerald-400" />
                <span>Captures CPU % and multi-core specs</span>
              </div>
              <div className="flex items-center gap-1.5">
                <Check className="w-3.5 h-3.5 text-emerald-400" />
                <span>Physical RAM used & available</span>
              </div>
              <div className="flex items-center gap-1.5">
                <Check className="w-3.5 h-3.5 text-emerald-400" />
                <span>Logical disk partitions & SMART health</span>
              </div>
              <div className="flex items-center gap-1.5">
                <Check className="w-3.5 h-3.5 text-emerald-400" />
                <span>Top resource-consuming processes</span>
              </div>
            </div>
          </div>
        </div>

        {/* Modal Close Button */}
        <div className="flex items-center justify-end pt-2 border-t border-slate-100">
          <button
            onClick={() => setIsInstallModalOpen(false)}
            className="px-4 py-2 rounded-lg text-xs font-bold bg-slate-900 text-white hover:bg-slate-800 transition-colors"
          >
            Close Guide
          </button>
        </div>

      </div>
    </Modal>
  );
};
