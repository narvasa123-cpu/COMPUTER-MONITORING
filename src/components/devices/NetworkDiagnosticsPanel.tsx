import React, { useCallback, useEffect, useRef, useState } from 'react';
import { Activity, AlertTriangle, CheckCircle2, Clock, Globe2, LoaderCircle, RefreshCw, Router, ShieldAlert, Signal, Wifi, WifiOff } from 'lucide-react';
import { Device, NetworkDiagnosticResult, NetworkDiagnosticsResponse } from '../../types/index';

type TestScope = 'gateway' | 'dns' | 'internet' | 'full';

interface NetworkDiagnosticsPanelProps {
  device: Device;
  canRunDiagnostics: boolean;
  /** Present only for roles allowed to generate/request an agent update. */
  canUpdateAgent?: boolean;
  onUpdateAgent?: () => void;
}

const statusStyle: Record<string, string> = {
  ONLINE: 'bg-emerald-100 text-emerald-800 border-emerald-200',
  LIMITED: 'bg-amber-100 text-amber-800 border-amber-200',
  'NO INTERNET': 'bg-rose-100 text-rose-800 border-rose-200',
  'LOCAL NETWORK ERROR': 'bg-rose-100 text-rose-800 border-rose-200',
  'DNS ERROR': 'bg-rose-100 text-rose-800 border-rose-200',
  DISCONNECTED: 'bg-slate-200 text-slate-700 border-slate-300',
  CRITICAL: 'bg-rose-100 text-rose-800 border-rose-200',
  UNAVAILABLE: 'bg-slate-100 text-slate-600 border-slate-200'
};

const testLabels: Array<[string, string]> = [
  ['adapter', 'Wi-Fi Adapter'],
  ['connection', 'Wi-Fi Connection'],
  ['ipAddress', 'IP Address'],
  ['gateway', 'Default Gateway'],
  ['gatewayReachability', 'Gateway Reachability'],
  ['dnsResolution', 'DNS Resolution'],
  ['internetConnectivity', 'Internet Connectivity'],
  ['internetQuality', 'Packet Loss & Latency'],
  ['signalQuality', 'Signal Quality']
];

const displayValue = (value: unknown, suffix = '') => {
  if (value === undefined || value === null || value === '') return 'Unavailable';
  return `${value}${suffix}`;
};

const formatDuration = (seconds?: number | null) => {
  if (seconds === undefined || seconds === null || !Number.isFinite(seconds)) return 'Unavailable';
  const hours = Math.floor(seconds / 3600);
  const minutes = Math.floor((seconds % 3600) / 60);
  const remaining = Math.floor(seconds % 60);
  return hours ? `${hours}h ${minutes}m` : minutes ? `${minutes}m ${remaining}s` : `${remaining}s`;
};

const resultStyle = (result?: string) => result === 'PASS'
  ? 'bg-emerald-100 text-emerald-800'
  : result === 'FAIL'
    ? 'bg-rose-100 text-rose-800'
    : 'bg-slate-100 text-slate-600';

export const NetworkDiagnosticsPanel: React.FC<NetworkDiagnosticsPanelProps> = ({ device, canRunDiagnostics, canUpdateAgent = false, onUpdateAgent }) => {
  const [data, setData] = useState<NetworkDiagnosticsResponse | null>(null);
  const [loading, setLoading] = useState(true);
  const [running, setRunning] = useState<TestScope | null>(null);
  const [message, setMessage] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const activeDeviceId = useRef(device.id);

  const load = useCallback(async () => {
    const requestedDeviceId = device.id;
    try {
      const response = await fetch(`/api/devices/${device.id}/network-diagnostics`);
      const result = await response.json().catch(() => ({}));
      if (!response.ok) throw new Error(result.error || 'Network diagnostics could not be loaded.');
      if (activeDeviceId.current !== requestedDeviceId) return;
      setData(result as NetworkDiagnosticsResponse);
      setError(null);
    } catch (loadError) {
      if (activeDeviceId.current !== requestedDeviceId) return;
      setError(loadError instanceof Error ? loadError.message : 'Network diagnostics could not be loaded.');
    } finally {
      if (activeDeviceId.current === requestedDeviceId) setLoading(false);
    }
  }, [device.id]);

  useEffect(() => {
    activeDeviceId.current = device.id;
    setData(null);
    setError(null);
    setMessage(null);
    setLoading(true);
    void load();
    const refreshTimer = window.setInterval(() => void load(), 15000);
    return () => window.clearInterval(refreshTimer);
  }, [load]);

  useEffect(() => {
    if (!data?.pendingCommand) setMessage(null);
  }, [data?.pendingCommand]);

  const runDiagnostic = async (scope: TestScope) => {
    setRunning(scope);
    setMessage(null);
    setError(null);
    try {
      const response = await fetch(`/api/devices/${device.id}/network-diagnostics/run`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ scope })
      });
      const result = await response.json().catch(() => ({}));
      if (!response.ok) throw new Error(result.error || 'The live network diagnostic could not be queued.');
      setMessage(result.message || 'The agent has been asked to run a live network diagnostic. Results will appear after its next telemetry upload.');
      await load();
    } catch (runError) {
      setError(runError instanceof Error ? runError.message : 'The live network diagnostic could not be queued.');
    } finally {
      setRunning(null);
    }
  };

  const current: NetworkDiagnosticResult | null = data?.current || null;
  const wifi = current?.wifi;
  const stale = data?.telemetryStale || false;
  const agentOffline = data?.agentStatus === 'OFFLINE' || device.connectionState !== 'connected';
  const commandCapable = data?.supportsOnDemandNetworkDiagnostics === true;
  const canTriggerDiagnostic = canRunDiagnostics && !agentOffline && commandCapable;

  if (loading) {
    return <div className="rounded-xl border border-slate-200 bg-white p-10 text-center text-xs text-slate-500"><LoaderCircle className="mx-auto mb-2 h-5 w-5 animate-spin text-indigo-600" />Loading real network diagnostics…</div>;
  }

  return (
    <div className="space-y-4">
      <div className="flex flex-col gap-3 rounded-xl border border-slate-200 bg-white p-4 shadow-xs sm:flex-row sm:items-start sm:justify-between">
        <div className="flex gap-3">
          <div className="rounded-lg bg-indigo-50 p-2 text-indigo-600"><Wifi className="h-5 w-5" /></div>
          <div>
            <div className="flex flex-wrap items-center gap-2">
              <h3 className="text-sm font-bold text-slate-900">Wi-Fi Connectivity Diagnostics</h3>
              <span className={`rounded-full border px-2 py-0.5 text-[10px] font-black ${statusStyle[current?.status || 'UNAVAILABLE']}`}>{current?.status || 'UNAVAILABLE'}</span>
              {stale && <span className="rounded-full border border-amber-200 bg-amber-50 px-2 py-0.5 text-[10px] font-bold text-amber-800">TELEMETRY STALE</span>}
            </div>
            <p className="mt-1 text-xs text-slate-500">Collected by the Windows agent. Wi-Fi association, local network, DNS, and external internet are tested as separate layers.</p>
            <p className="mt-1 text-[11px] text-slate-400">Last network test: {data?.lastNetworkTestAt ? new Date(data.lastNetworkTestAt).toLocaleString() : 'Not received'} · Last heartbeat: {data?.lastHeartbeatAt ? new Date(data.lastHeartbeatAt).toLocaleString() : 'Not received'}</p>
          </div>
        </div>
        <div className="flex flex-wrap gap-2">
          <button type="button" onClick={() => void load()} className="inline-flex items-center gap-1.5 rounded-lg border border-slate-200 bg-white px-3 py-1.5 text-xs font-bold text-slate-700 hover:bg-slate-50"><RefreshCw className="h-3.5 w-3.5" />Refresh results</button>
          <button type="button" disabled={!canTriggerDiagnostic || running !== null} onClick={() => void runDiagnostic('full')} className="inline-flex items-center gap-1.5 rounded-lg bg-indigo-600 px-3 py-1.5 text-xs font-bold text-white hover:bg-indigo-700 disabled:cursor-not-allowed disabled:bg-slate-200 disabled:text-slate-500" title={!commandCapable ? 'Install the current Windows PowerShell agent to enable on-demand diagnostics.' : undefined}><Activity className="h-3.5 w-3.5" />{running === 'full' ? 'Queuing…' : 'Run full network diagnostic'}</button>
        </div>
      </div>

      {agentOffline && <div className="flex gap-2 rounded-xl border border-amber-200 bg-amber-50 p-3 text-xs text-amber-900"><WifiOff className="mt-0.5 h-4 w-4 shrink-0" /><div><strong>Monitoring Agent Offline.</strong> A live test cannot run until the agent reconnects. Last known network data is marked stale and is not presented as live.</div></div>}
      {!commandCapable && <div className="flex flex-col gap-2 rounded-xl border border-sky-200 bg-sky-50 p-3 text-xs text-sky-900 sm:flex-row sm:items-center sm:justify-between"><div className="flex gap-2"><ShieldAlert className="mt-0.5 h-4 w-4 shrink-0" /><div><strong>On-demand diagnostics unavailable.</strong> This agent has not reported the Wi-Fi diagnostic command capability. No diagnostic command has been sent. Update the Windows agent on this physical computer, then wait for its next telemetry upload.</div></div>{canUpdateAgent && onUpdateAgent && <button type="button" onClick={onUpdateAgent} className="shrink-0 rounded-lg border border-sky-300 bg-white px-3 py-1.5 text-xs font-bold text-sky-800 hover:bg-sky-100">Update Windows agent</button>}</div>}
      {data?.pendingCommand && <div className="flex gap-2 rounded-xl border border-indigo-200 bg-indigo-50 p-3 text-xs text-indigo-900"><Clock className="mt-0.5 h-4 w-4 shrink-0" /><div><strong>Network diagnostic {data.pendingCommand.status}.</strong> The agent checks for commands on its next telemetry cycle, then uploads a fresh full diagnostic. The dashboard refreshes this command state automatically.</div></div>}
      {!data?.pendingCommand && data?.lastCommand?.status === 'completed' && <div className="flex gap-2 rounded-xl border border-emerald-200 bg-emerald-50 p-3 text-xs text-emerald-900"><CheckCircle2 className="mt-0.5 h-4 w-4 shrink-0" /><div><strong>Latest requested diagnostic completed.</strong> Review the agent-measured result and timestamp below; a completed command is not treated as a successful network connection by itself.</div></div>}
      {!data?.pendingCommand && data?.lastCommand?.status === 'expired' && <div role="alert" className="flex gap-2 rounded-xl border border-rose-200 bg-rose-50 p-3 text-xs text-rose-900"><AlertTriangle className="mt-0.5 h-4 w-4 shrink-0" /><div><strong>Latest diagnostic request expired.</strong> The agent did not collect it before the command expired. Confirm the agent is online, then run it again.</div></div>}
      {message && <div className="rounded-xl border border-sky-200 bg-sky-50 px-3 py-2 text-xs text-sky-900">{message}</div>}
      {error && <div role="alert" className="rounded-xl border border-rose-200 bg-rose-50 px-3 py-2 text-xs text-rose-800">{error}</div>}

      {!current ? (
        <div className="rounded-xl border border-dashed border-slate-300 bg-white p-10 text-center">
          <WifiOff className="mx-auto mb-2 h-7 w-7 text-slate-400" />
          <p className="text-sm font-bold text-slate-800">No Wi-Fi diagnostic has been received</p>
          <p className="mt-1 text-xs text-slate-500">Download and run the current Windows agent on this computer. The platform will show unavailable data until that agent performs a real test.</p>
        </div>
      ) : (
        <>
          <div className="grid grid-cols-1 gap-4 lg:grid-cols-3">
            <div className="rounded-xl border border-slate-200 bg-white p-4 shadow-xs lg:col-span-2">
              <div className="flex flex-wrap items-start justify-between gap-2 border-b border-slate-100 pb-3">
                <div>
                  <p className="text-[10px] font-bold uppercase tracking-wide text-slate-400">Likely root cause</p>
                  <h4 className="mt-0.5 text-sm font-black text-slate-900">{current.diagnosis}</h4>
                </div>
                <span className="rounded-md bg-slate-100 px-2 py-1 text-[10px] font-bold text-slate-700">{current.confidence} confidence</span>
              </div>
              <p className="mt-3 text-xs leading-5 text-slate-700">{current.analysis}</p>
              <div className="mt-3 rounded-lg border border-slate-200 bg-slate-50 p-3">
                <p className="text-[10px] font-bold uppercase tracking-wide text-slate-500">Evidence</p>
                <ul className="mt-1.5 space-y-1 text-xs text-slate-700">
                  {current.evidence.map((item, index) => <li key={`${item}-${index}`} className="flex gap-1.5"><span className="text-indigo-500">•</span><span>{item}</span></li>)}
                </ul>
              </div>
              {current.recommendedActions.length > 0 && <div className="mt-3"><p className="text-[10px] font-bold uppercase tracking-wide text-slate-500">Recommended actions</p><ol className="mt-1.5 list-decimal space-y-1 pl-4 text-xs text-slate-700">{current.recommendedActions.map((item, index) => <li key={`${item}-${index}`}>{item}</li>)}</ol></div>}
            </div>

            <div className="rounded-xl border border-slate-200 bg-white p-4 shadow-xs">
              <p className="text-[10px] font-bold uppercase tracking-wide text-slate-400">Latest agent-measured network status</p>
              <dl className="mt-3 space-y-2 text-xs">
                <div className="flex justify-between gap-3"><dt className="text-slate-500">Wi-Fi</dt><dd className="font-bold text-slate-800">{displayValue(wifi?.connectionState)}</dd></div>
                <div className="flex justify-between gap-3"><dt className="text-slate-500">SSID</dt><dd className="max-w-[12rem] truncate font-bold text-slate-800" title={wifi?.ssid || undefined}>{displayValue(wifi?.ssid)}</dd></div>
                <div className="flex justify-between gap-3"><dt className="text-slate-500">Signal</dt><dd className="font-bold text-slate-800">{displayValue(wifi?.signalQuality, wifi?.signalQuality === undefined || wifi?.signalQuality === null ? '' : '%')}</dd></div>
                <div className="flex justify-between gap-3"><dt className="text-slate-500">IPv4</dt><dd className="font-mono font-bold text-slate-800">{displayValue(wifi?.ipv4)}</dd></div>
                <div className="flex justify-between gap-3"><dt className="text-slate-500">Gateway</dt><dd className="font-mono font-bold text-slate-800">{displayValue(wifi?.defaultGateway)}</dd></div>
                <div className="flex justify-between gap-3"><dt className="text-slate-500">Internet</dt><dd className="font-bold text-slate-800">{wifi?.internetReachable === true ? 'Reachable' : wifi?.internetReachable === false ? 'Unreachable' : 'Unavailable'}</dd></div>
                <div className="flex justify-between gap-3"><dt className="text-slate-500">Latency</dt><dd className="font-bold text-slate-800">{displayValue(wifi?.avgLatencyMs, wifi?.avgLatencyMs === undefined || wifi?.avgLatencyMs === null ? '' : ' ms')}</dd></div>
                <div className="flex justify-between gap-3"><dt className="text-slate-500">Packet loss</dt><dd className="font-bold text-slate-800">{displayValue(wifi?.packetLossPercent, wifi?.packetLossPercent === undefined || wifi?.packetLossPercent === null ? '' : '%')}</dd></div>
              </dl>
            </div>
          </div>

          <div className="rounded-xl border border-slate-200 bg-white p-4 shadow-xs">
            <div className="flex flex-col gap-2 border-b border-slate-100 pb-3 sm:flex-row sm:items-center sm:justify-between">
              <div><h4 className="text-xs font-bold text-slate-900">Connectivity test layers</h4><p className="mt-0.5 text-[11px] text-slate-500">A PASS at one layer does not imply a PASS at the next layer.</p></div>
              <div className="flex flex-wrap gap-1.5">
                {(['gateway', 'dns', 'internet'] as TestScope[]).map(scope => <button key={scope} type="button" disabled={!canTriggerDiagnostic || running !== null} onClick={() => void runDiagnostic(scope)} title="The agent runs a full correlated diagnostic and prioritizes this requested layer; it does not fabricate an isolated test result." className="rounded-md border border-slate-200 px-2.5 py-1 text-[10px] font-bold text-slate-700 hover:bg-slate-50 disabled:cursor-not-allowed disabled:text-slate-400">{running === scope ? 'Queuing…' : `Test ${scope}`}</button>)}
              </div>
            </div>
            <p className="mt-2 text-[11px] text-slate-500">Gateway, DNS, and Internet actions each request the same complete agent diagnostic so that the result is correlated rather than an isolated or simulated check.</p>
            <div className="mt-3 overflow-x-auto">
              <table className="w-full min-w-[560px] text-left text-xs"><thead className="text-[10px] uppercase tracking-wide text-slate-400"><tr><th className="pb-2 font-bold">Test</th><th className="pb-2 font-bold">Result</th><th className="pb-2 font-bold">Evidence</th></tr></thead><tbody className="divide-y divide-slate-100">{testLabels.map(([key, label]) => { const test = current.tests[key]; return <tr key={key}><td className="py-2.5 font-semibold text-slate-800">{label}</td><td className="py-2.5"><span className={`rounded-full px-2 py-0.5 text-[10px] font-black ${resultStyle(test?.result)}`}>{test?.result || 'UNAVAILABLE'}</span></td><td className="py-2.5 text-slate-600">{test?.detail || 'No test evidence was reported.'}</td></tr>; })}</tbody></table>
            </div>
          </div>

          <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
            <div className="rounded-xl border border-slate-200 bg-white p-4 shadow-xs"><div className="flex items-center gap-2"><Router className="h-4 w-4 text-indigo-600" /><h4 className="text-xs font-bold text-slate-900">Wireless interface details</h4></div><dl className="mt-3 grid grid-cols-1 gap-x-5 gap-y-2 text-xs sm:grid-cols-2"><div><dt className="text-slate-400">Adapter</dt><dd className="mt-0.5 font-semibold text-slate-800">{displayValue(wifi?.adapterName)}</dd></div><div><dt className="text-slate-400">Adapter status</dt><dd className="mt-0.5 font-semibold text-slate-800">{displayValue(wifi?.adapterStatus)}</dd></div><div><dt className="text-slate-400">BSSID</dt><dd className="mt-0.5 font-mono font-semibold text-slate-800">{displayValue(wifi?.bssid)}</dd></div><div><dt className="text-slate-400">Band / radio</dt><dd className="mt-0.5 font-semibold text-slate-800">{wifi?.band || wifi?.radioType || 'Unavailable'}</dd></div><div><dt className="text-slate-400">Link speed</dt><dd className="mt-0.5 font-semibold text-slate-800">{displayValue(wifi?.linkSpeedMbps, wifi?.linkSpeedMbps === undefined || wifi?.linkSpeedMbps === null ? '' : ' Mbps')}</dd></div><div><dt className="text-slate-400">Observed connection</dt><dd className="mt-0.5 font-semibold text-slate-800">{formatDuration(wifi?.connectionDurationSeconds)}</dd></div><div><dt className="text-slate-400">Profile / category</dt><dd className="mt-0.5 font-semibold text-slate-800">{wifi?.networkProfile || wifi?.networkCategory || 'Unavailable'}</dd></div><div><dt className="text-slate-400">MAC address</dt><dd className="mt-0.5 font-mono font-semibold text-slate-800">{displayValue(wifi?.mac)}</dd></div></dl></div>
            <div className="rounded-xl border border-slate-200 bg-white p-4 shadow-xs"><div className="flex items-center gap-2"><Globe2 className="h-4 w-4 text-indigo-600" /><h4 className="text-xs font-bold text-slate-900">IP and resolver configuration</h4></div><dl className="mt-3 grid grid-cols-1 gap-x-5 gap-y-2 text-xs sm:grid-cols-2"><div><dt className="text-slate-400">IPv6</dt><dd className="mt-0.5 font-mono font-semibold text-slate-800">{displayValue(wifi?.ipv6)}</dd></div><div><dt className="text-slate-400">Subnet mask</dt><dd className="mt-0.5 font-mono font-semibold text-slate-800">{displayValue(wifi?.subnetMask)}</dd></div><div><dt className="text-slate-400">DHCP</dt><dd className="mt-0.5 font-semibold text-slate-800">{wifi?.dhcpEnabled === true ? 'Enabled' : wifi?.dhcpEnabled === false ? 'Disabled' : 'Unavailable'}</dd></div><div><dt className="text-slate-400">DHCP server</dt><dd className="mt-0.5 font-mono font-semibold text-slate-800">{displayValue(wifi?.dhcpServer)}</dd></div><div className="sm:col-span-2"><dt className="text-slate-400">DNS servers</dt><dd className="mt-0.5 font-mono font-semibold text-slate-800">{wifi?.dnsServers?.length ? wifi.dnsServers.join(', ') : 'Unavailable'}</dd></div><div><dt className="text-slate-400">HTTP response</dt><dd className="mt-0.5 font-semibold text-slate-800">{displayValue(wifi?.responseTimeMs, wifi?.responseTimeMs === undefined || wifi?.responseTimeMs === null ? '' : ' ms')}</dd></div><div><dt className="text-slate-400">Last successful test</dt><dd className="mt-0.5 font-semibold text-slate-800">{data?.lastSuccessfulNetworkTestAt ? new Date(data.lastSuccessfulNetworkTestAt).toLocaleString() : 'Unavailable'}</dd></div></dl></div>
          </div>

          <div className="rounded-xl border border-slate-200 bg-white p-4 shadow-xs"><div className="flex items-center gap-2"><Clock className="h-4 w-4 text-indigo-600" /><h4 className="text-xs font-bold text-slate-900">Network diagnostics history</h4></div>{data?.history?.length ? <div className="mt-3 overflow-x-auto"><table className="w-full min-w-[600px] text-left text-xs"><thead className="text-[10px] uppercase tracking-wide text-slate-400"><tr><th className="pb-2">Tested</th><th className="pb-2">Status</th><th className="pb-2">Diagnosis</th><th className="pb-2">Signal</th><th className="pb-2">Latency / loss</th></tr></thead><tbody className="divide-y divide-slate-100">{data.history.slice(0, 30).map(record => <tr key={record.id || `${record.sourceTimestamp}-${record.code}`}><td className="py-2 font-mono text-slate-600">{record.sourceTimestamp ? new Date(record.sourceTimestamp).toLocaleString() : 'Unavailable'}</td><td className="py-2"><span className={`rounded-full border px-2 py-0.5 text-[10px] font-black ${statusStyle[record.status] || statusStyle.UNAVAILABLE}`}>{record.status}</span></td><td className="py-2 font-semibold text-slate-800">{record.diagnosis}</td><td className="py-2 text-slate-600">{displayValue(record.wifi?.signalQuality, record.wifi?.signalQuality === undefined || record.wifi?.signalQuality === null ? '' : '%')}</td><td className="py-2 text-slate-600">{displayValue(record.wifi?.avgLatencyMs, record.wifi?.avgLatencyMs === undefined || record.wifi?.avgLatencyMs === null ? '' : ' ms')} / {displayValue(record.wifi?.packetLossPercent, record.wifi?.packetLossPercent === undefined || record.wifi?.packetLossPercent === null ? '' : '%')}</td></tr>)}</tbody></table></div> : <div className="py-7 text-center text-xs text-slate-500"><Signal className="mx-auto mb-1 h-4 w-4 text-slate-400" />No completed network diagnostic history yet.</div>}</div>
        </>
      )}
    </div>
  );
};
