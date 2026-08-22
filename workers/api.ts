import { generateNodeAgent, generatePowerShellAgent, generatePythonAgent } from '../server/agent-templates';
import { permanentlyPurgeDeviceData } from '../src/lib/device-purge';

interface Env {
  SUPABASE_URL: string;
  SUPABASE_SECRET_KEY: string;
}
type Json = Record<string, unknown>;

const cors = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'Authorization, Content-Type',
  'Access-Control-Allow-Methods': 'GET, POST, PUT, DELETE, OPTIONS',
  'Content-Type': 'application/json; charset=utf-8'
};

const now = () => new Date().toISOString();
const id = (prefix: string) => `${prefix}-${crypto.randomUUID()}`;
const json = (body: unknown, status = 200) => new Response(JSON.stringify(body), { status, headers: cors });
const hash = async (value: string) => {
  const bytes = new Uint8Array(await crypto.subtle.digest('SHA-256', new TextEncoder().encode(value)));
  return Array.from(bytes, byte => byte.toString(16).padStart(2, '0')).join('');
};

const defaultSettings = () => ({
  heartbeatIntervalSec: 30,
  connectionLostThresholdSec: 60,
  offlineThresholdSec: 300,
  telemetryRetentionPoints: 1440,
  networkHistoryRetentionPoints: 720,
  networkDiagnosticIntervalSec: 60,
  networkWeakSignalThresholdPercent: 35,
  networkHighLatencyMs: 200,
  networkPacketLossThresholdPercent: 10,
  networkIncidentCooldownSec: 600,
  autoCreateTicketOnCritical: true,
  enableSoundAlerts: true,
  agentApiUrl: ''
});
const defaultRules = () => ([
  { id: 'rule-cpu-high', code: 'HIGH_CPU_USAGE', name: 'High CPU Usage', metric: 'cpu_usage', thresholdValue: 85, thresholdUnit: '%', durationSeconds: 30, severity: 'High', description: 'Sustained CPU utilization is above the configured threshold.', enabled: true, autoCreateTicket: false, possibleCauses: ['Runaway process', 'Heavy scheduled workload'], recommendedActions: ['Inspect the highest CPU-consuming processes.'] },
  { id: 'rule-ram-high', code: 'HIGH_RAM_USAGE', name: 'High Memory Usage', metric: 'ram_usage', thresholdValue: 90, thresholdUnit: '%', durationSeconds: 30, severity: 'High', description: 'Physical memory utilization is above the configured threshold.', enabled: true, autoCreateTicket: false, possibleCauses: ['Memory pressure', 'Memory leak'], recommendedActions: ['Review processes and available memory.'] },
  { id: 'rule-disk-low', code: 'LOW_DISK_SPACE', name: 'Low Disk Space', metric: 'disk_free_percent', thresholdValue: 12, thresholdUnit: '% free', durationSeconds: 0, severity: 'Critical', description: 'Primary storage free capacity is below the configured threshold.', enabled: true, autoCreateTicket: true, possibleCauses: ['Temporary files', 'Large local data'], recommendedActions: ['Free at least 15% of storage capacity.'] },
  { id: 'rule-cpu-temp', code: 'HIGH_CPU_TEMP', name: 'High CPU Temperature', metric: 'cpu_temp', thresholdValue: 82, thresholdUnit: '°C', durationSeconds: 20, severity: 'Critical', description: 'CPU temperature is above the configured threshold.', enabled: true, autoCreateTicket: true, possibleCauses: ['Dust', 'Cooling failure'], recommendedActions: ['Inspect cooling and airflow.'] }
]);

function initializeState(state: Json) {
  state.users ||= []; state.devices ||= []; state.notifications ||= []; state.telemetry ||= {}; state.sessions ||= {};
  state.departments ||= []; state.locations ||= []; state.tickets ||= []; state.issues ||= []; state.maintenance ||= []; state.telemetryHistory ||= {};
  state.networkDiagnostics ||= {}; state.auditLogs ||= []; state.diagnosticRules ||= defaultRules();
  state.settings = { ...defaultSettings(), ...(state.settings as Json || {}) };
  return state;
}

const stringValue = (value: unknown) => typeof value === 'string' ? value.trim() : value === undefined || value === null ? '' : String(value).trim();
const numericValue = (value: unknown) => {
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : null;
};
const booleanValue = (value: unknown) => value === true || value === 1 || String(value).toLowerCase() === 'true';
const asArray = (value: unknown) => Array.isArray(value) ? value.map(stringValue).filter(Boolean) : [];
const hasAgentCapability = (device: Json, capability: string) => asArray(device.agentCapabilities).includes(capability);

function validIpv4(value: unknown) {
  const address = stringValue(value);
  const octets = address.split('.');
  if (octets.length !== 4 || !octets.every(octet => /^\d+$/.test(octet) && Number(octet) >= 0 && Number(octet) <= 255)) return false;
  return address !== '0.0.0.0' && !address.startsWith('127.') && !address.startsWith('169.254.');
}

function networkTest(result: 'PASS' | 'FAIL' | 'UNAVAILABLE', detail: string) {
  return { result, detail };
}

/**
 * Uses only values supplied by the monitoring agent. It intentionally leaves a
 * layer UNAVAILABLE when the agent/OS could not provide a measurement; it never
 * invents a successful connection, latency, SSID, or signal value.
 */
function analyzeWifiDiagnostics(wifi: Json | undefined, settings: Json): Json {
  const unavailable = (detail: string): Json => ({
    status: 'UNAVAILABLE', code: 'WIFI_TELEMETRY_UNAVAILABLE', severity: 'Informational', confidence: 'Low',
    diagnosis: 'Wi-Fi diagnostics are unavailable',
    analysis: detail,
    evidence: [detail],
    recommendedActions: ['Install or update the Windows monitoring agent, then run a network diagnostic.'],
    tests: {
      adapter: networkTest('UNAVAILABLE', detail), connection: networkTest('UNAVAILABLE', detail), ipAddress: networkTest('UNAVAILABLE', detail),
      gateway: networkTest('UNAVAILABLE', detail), gatewayReachability: networkTest('UNAVAILABLE', detail),
      dnsResolution: networkTest('UNAVAILABLE', detail), internetConnectivity: networkTest('UNAVAILABLE', detail),
      internetQuality: networkTest('UNAVAILABLE', detail), signalQuality: networkTest('UNAVAILABLE', detail)
    }
  });
  if (!wifi || !booleanValue(wifi.available)) return unavailable('The agent has not reported a wireless adapter or Windows Wi-Fi diagnostics yet.');

  const adapterStatus = stringValue(wifi.adapterStatus).toUpperCase() || 'UNKNOWN';
  const connectionState = stringValue(wifi.connectionState).toUpperCase() || 'UNKNOWN';
  const ssid = stringValue(wifi.ssid);
  const ipv4 = stringValue(wifi.ipv4);
  const ipv6 = stringValue(wifi.ipv6);
  const gateway = stringValue(wifi.defaultGateway) || stringValue(wifi.defaultGatewayIpv6);
  const signal = numericValue(wifi.signalQuality);
  const latency = numericValue(wifi.avgLatencyMs);
  const packetLoss = numericValue(wifi.packetLossPercent);
  const connected = connectionState === 'CONNECTED' || (connectionState.includes('CONNECTED') && !connectionState.includes('DISCONNECTED'));
  const disabled = adapterStatus.includes('DISABLED');
  const hasUsableIp = validIpv4(ipv4) || Boolean(ipv6 && !ipv6.startsWith('fe80:'));
  const tests: Json = {
    adapter: networkTest(disabled ? 'FAIL' : ['UNKNOWN', 'NOT AVAILABLE'].includes(adapterStatus) ? 'UNAVAILABLE' : 'PASS', `Wireless adapter status: ${adapterStatus}.`),
    connection: networkTest(connected ? 'PASS' : 'FAIL', connected ? `Wireless connection established${ssid ? ` to ${ssid}` : ''}.` : `Wireless connection state: ${connectionState}.`),
    ipAddress: networkTest(hasUsableIp ? 'PASS' : 'FAIL', hasUsableIp ? `Address assigned: ${validIpv4(ipv4) ? ipv4 : ipv6}.` : 'No valid IPv4 or globally scoped IPv6 address was reported.'),
    gateway: networkTest(gateway ? 'PASS' : 'FAIL', gateway ? `Default gateway: ${gateway}.` : 'No default gateway was reported.'),
    gatewayReachability: networkTest(wifi.gatewayReachable === true ? 'PASS' : wifi.gatewayReachable === false ? 'FAIL' : 'UNAVAILABLE', wifi.gatewayReachable === true ? 'Gateway probe succeeded.' : wifi.gatewayReachable === false ? 'Gateway probe failed.' : 'Gateway probe was not available.'),
    dnsResolution: networkTest(wifi.dnsResolution === true ? 'PASS' : wifi.dnsResolution === false ? 'FAIL' : 'UNAVAILABLE', wifi.dnsResolution === true ? 'Configured DNS resolved the diagnostic domain.' : wifi.dnsResolution === false ? 'Configured DNS could not resolve the diagnostic domain.' : 'DNS probe was not available.'),
    internetConnectivity: networkTest(wifi.internetReachable === true ? 'PASS' : wifi.internetReachable === false ? 'FAIL' : 'UNAVAILABLE', wifi.internetReachable === true ? 'At least one external IP or HTTPS connectivity probe succeeded.' : wifi.internetReachable === false ? 'Both external IP and HTTPS connectivity probes failed.' : 'External connectivity probe was not available.'),
    internetQuality: networkTest(packetLoss === null && latency === null ? 'UNAVAILABLE' : packetLoss !== null && packetLoss >= Number(settings.networkPacketLossThresholdPercent) || latency !== null && latency >= Number(settings.networkHighLatencyMs) ? 'FAIL' : 'PASS', packetLoss === null && latency === null ? 'No measured latency or packet-loss result is available.' : `Packet loss ${packetLoss === null ? 'unavailable' : `${packetLoss}%`}; average latency ${latency === null ? 'unavailable' : `${latency} ms`}.`),
    signalQuality: networkTest(signal === null ? 'UNAVAILABLE' : signal <= Number(settings.networkWeakSignalThresholdPercent) ? 'FAIL' : 'PASS', signal === null ? 'Signal quality was not reported by Windows.' : `Signal quality ${signal}%.`)
  };
  const make = (status: string, code: string, severity: string, confidence: string, diagnosis: string, analysis: string, evidence: string[], recommendedActions: string[]) => ({ status, code, severity, confidence, diagnosis, analysis, evidence, recommendedActions, tests });

  if (disabled || connectionState === 'DISCONNECTED') return make('DISCONNECTED', disabled ? 'WIFI_ADAPTER_DISABLED' : 'WIFI_DISCONNECTED', 'High', 'High', 'Wi-Fi Adapter Disconnected', 'The wireless adapter is present but is disabled or has no active wireless connection.', [`Adapter status: ${adapterStatus}.`, `Connection state: ${connectionState}.`, ssid ? `SSID reported: ${ssid}.` : 'SSID is unavailable.'], ['Enable the wireless adapter.', 'Check the hardware wireless switch or flight mode.', 'Reconnect to the approved wireless network.']);
  if (!connected) return make('LIMITED', 'WIFI_CONNECTION_STATE_UNKNOWN', 'Low', 'Low', 'Wi-Fi Connection State Unavailable', 'Windows reported a wireless adapter, but it did not provide a reliable connection state. The system will not label this as disconnected without supporting evidence.', [`Adapter status: ${adapterStatus}.`, `Connection state: ${connectionState}.`, 'SSID and active connectivity probes are unavailable until Windows reports an active wireless interface.'], ['Update the Windows monitoring agent.', 'Check the adapter state locally and run a full network diagnostic again.']);
  if (!hasUsableIp) return make('LOCAL NETWORK ERROR', 'DHCP_IP_ASSIGNMENT_FAILURE', 'High', 'High', 'DHCP / IP Assignment Problem', 'Wi-Fi is connected, but Windows did not report a valid IPv4 or globally scoped IPv6 address for the wireless interface.', [`SSID: ${ssid || 'reported by Windows as unavailable'}.`, 'Wireless connection is established.', 'No valid IPv4 or globally scoped IPv6 address was reported.'], ['Renew the DHCP lease.', 'Restart the wireless adapter.', 'Check the DHCP service and access-point configuration.']);
  if (!gateway) return make('LOCAL NETWORK ERROR', 'DEFAULT_GATEWAY_MISSING', 'High', 'High', 'Local Network Configuration Problem', 'Wi-Fi is connected and has a valid IPv4 address, but no default gateway was reported.', [`IPv4 address: ${ipv4}.`, 'Default gateway is unavailable.'], ['Check DHCP scope options or the static network configuration.', 'Reconnect to Wi-Fi and renew the IP lease.']);
  if (wifi.gatewayReachable === false) return make('LOCAL NETWORK ERROR', 'GATEWAY_UNREACHABLE', 'High', 'Medium', 'Gateway Connectivity Failure', 'The workstation is connected to Wi-Fi and has an IP address, but the ICMP gateway probe did not receive a response. Some gateways block ICMP, so confirm with another local-network test if policy permits.', [`SSID: ${ssid || 'unavailable'}.`, `IPv4 address: ${ipv4}.`, `Default gateway: ${gateway}.`, 'Gateway ICMP probe failed.'], ['Reconnect to Wi-Fi.', 'Check signal quality and access-point reachability.', 'Test another workstation on the same access point.', 'Inspect the router or access point.']);
  if (wifi.internetReachable === false) return make('NO INTERNET', 'INTERNET_UNAVAILABLE', 'High', 'High', 'Internet Connectivity Failure', 'The wireless connection and local gateway are working, but external IP connectivity is unavailable.', [`IPv4 address: ${ipv4}.`, `Default gateway ${gateway} is reachable.`, 'External IP connectivity probe failed.'], ['Check the router WAN connection and upstream internet service.', 'Test another device on the same network.', 'Verify router or firewall egress policy.']);
  if (wifi.internetIcmpReachable === true && wifi.dnsResolution === false) return make('DNS ERROR', 'DNS_RESOLUTION_FAILURE', 'High', 'High', 'DNS Resolution Problem', 'External IP connectivity is available, but the configured DNS resolver cannot resolve the diagnostic domain.', [`Default gateway ${gateway} is reachable.`, 'External IP connectivity probe succeeded.', 'DNS resolution probe failed.'], ['Check the configured DNS servers.', 'Restart the Windows DNS Client service.', 'Test an approved alternate DNS resolver according to local policy.']);
  if (wifi.internetReachable === true && wifi.internetHttpReachable === false) return make('LIMITED', 'INTERNET_HTTP_FAILURE', 'Medium', 'Medium', 'Internet Application Connectivity Problem', 'A lower-layer external connectivity probe succeeded, but the controlled HTTPS connectivity probe failed. This can indicate a captive portal, proxy, firewall policy, or application-layer outage.', ['External connectivity probe succeeded.', 'Controlled HTTPS response probe failed.', `DNS resolution: ${wifi.dnsResolution === true ? 'passed' : wifi.dnsResolution === false ? 'failed' : 'unavailable'}.`], ['Check for captive portal or proxy requirements.', 'Check firewall and web filtering policy.', 'Test an approved HTTPS service from another workstation.']);
  if (packetLoss !== null && packetLoss >= Number(settings.networkPacketLossThresholdPercent)) return make('LIMITED', 'HIGH_PACKET_LOSS', packetLoss >= 50 ? 'Critical' : 'High', 'High', 'Unstable Network Connection', 'Internet access is available, but measured packet loss indicates an unstable connection.', [`Packet loss: ${packetLoss}%.`, `Average latency: ${latency === null ? 'unavailable' : `${latency} ms`}.`, `Failed probes: ${stringValue(wifi.failedProbes) || 'unavailable'}.`], ['Move closer to the access point.', 'Check wireless interference and access-point load.', 'Test another approved wireless network.', 'Inspect the wireless adapter and driver.']);
  if (latency !== null && latency >= Number(settings.networkHighLatencyMs)) return make('LIMITED', 'HIGH_LATENCY', 'Medium', 'High', 'High Network Latency', 'Internet access is available, but measured response time is above the configured threshold.', [`Average latency: ${latency} ms.`, `Maximum latency: ${stringValue(wifi.maxLatencyMs) || 'unavailable'} ms.`, `Configured threshold: ${settings.networkHighLatencyMs} ms.`], ['Check network congestion and access-point utilization.', 'Test another workstation on the same network.', 'Check the upstream network connection.']);
  if (signal !== null && signal <= Number(settings.networkWeakSignalThresholdPercent)) return make('LIMITED', 'WEAK_WIFI_SIGNAL', 'Medium', 'Medium', 'Weak Wi-Fi Signal', 'The workstation is connected, but low measured signal quality may contribute to intermittent connectivity.', [`Signal quality: ${signal}%.`, `Link speed: ${stringValue(wifi.linkSpeedMbps) || 'unavailable'} Mbps.`, `Configured threshold: ${settings.networkWeakSignalThresholdPercent}%.`], ['Move closer to the access point.', 'Check obstructions and wireless interference.', 'Reconnect to a stronger approved access point.', 'Inspect the wireless adapter and driver.']);
  if (wifi.gatewayReachable === true && wifi.internetReachable === true && wifi.dnsResolution === true && wifi.internetHttpReachable === true) return make('ONLINE', 'NETWORK_HEALTHY', 'Informational', 'High', 'Network Operating Normally', 'Wi-Fi, local gateway, DNS resolution, and controlled external connectivity tests all passed.', [`SSID: ${ssid || 'unavailable'}.`, `Address: ${validIpv4(ipv4) ? ipv4 : ipv6}.`, `Default gateway ${gateway} is reachable.`, 'DNS, external IP/HTTPS connectivity probes succeeded.'], []);
  return make('LIMITED', 'NETWORK_TEST_INCOMPLETE', 'Low', 'Medium', 'Network Test Incomplete', 'The wireless connection is active, but one or more network tests were unavailable, so a full root cause cannot be confirmed.', [`SSID: ${ssid || 'unavailable'}.`, `IPv4 address: ${ipv4}.`, `Gateway reachability: ${stringValue(wifi.gatewayReachable) || 'unavailable'}.`, `DNS resolution: ${stringValue(wifi.dnsResolution) || 'unavailable'}.`, `Internet reachability: ${stringValue(wifi.internetReachable) || 'unavailable'}.`], ['Run a full network diagnostic while the monitoring agent is connected.']);
}

function safeTimestamp(value: unknown, fallback: string) {
  const text = stringValue(value);
  const parsed = Date.parse(text);
  return Number.isFinite(parsed) && parsed <= Date.now() + 5 * 60 * 1000 ? text : fallback;
}

function recordNetworkDiagnostics(state: Json, device: Json, telemetry: Json) {
  const wifi = telemetry.wifiDiagnostics && typeof telemetry.wifiDiagnostics === 'object' ? telemetry.wifiDiagnostics as Json : undefined;
  const analysis = analyzeWifiDiagnostics(wifi, state.settings as Json);
  const receivedAt = now();
  const reportedTimestamp = stringValue(wifi?.testedAt);
  const sourceTimestamp = safeTimestamp(reportedTimestamp, receivedAt);
  const sourceTrusted = Boolean(reportedTimestamp) && sourceTimestamp === reportedTimestamp;
  const records = state.networkDiagnostics as Record<string, Json[]>;
  const history = records[String(device.id)] || [];
  const latest = history[0];
  const latestSourceMs = Date.parse(stringValue(latest?.sourceTimestamp));
  const sourceMs = Date.parse(sourceTimestamp);
  // The agent caches a test between configured intervals. Only a strictly newer
  // measurement can affect incidents, recurrence, or recovery verification.
  const isNewMeasurement = !latest || (sourceTrusted && (!Number.isFinite(latestSourceMs) || sourceMs > latestSourceMs));
  if (isNewMeasurement) {
    history.unshift({ id: id('netdiag'), deviceId: device.id, deviceName: device.deviceName, sourceTimestamp, receivedAt, sourceTimestampTrusted: sourceTrusted, ...analysis, wifi: wifi || null });
    records[String(device.id)] = history.slice(0, Number((state.settings as Json).networkHistoryRetentionPoints || 720));
    applyNetworkFinding(state, device, analysis, receivedAt);
    device.latestNetworkDiagnostic = { ...analysis, sourceTimestamp, receivedAt, sourceTimestampTrusted: sourceTrusted, wifi: wifi || null };
    device.lastNetworkTestAt = sourceTimestamp;
    device.lastNetworkTestReceivedAt = receivedAt;
    if (analysis.status === 'ONLINE') device.lastSuccessfulNetworkTestAt = sourceTimestamp;
  }
  return analysis;
}

function applyNetworkFinding(state: Json, device: Json, analysis: Json, measurementAt: string) {
  const issues = state.issues as Json[];
  const tickets = state.tickets as Json[];
  const code = stringValue(analysis.code);
  const healthy = analysis.status === 'ONLINE';
  const actionable = !['WIFI_TELEMETRY_UNAVAILABLE', 'NETWORK_HEALTHY', 'NETWORK_TEST_INCOMPLETE', 'WIFI_CONNECTION_STATE_UNKNOWN'].includes(code);
  const evidence = () => ({ metricName: 'Network diagnostic', metric: code, currentValue: analysis.status, thresholdValue: 'Healthy network', details: (analysis.evidence as string[]).join(' ') });
  const updateIssue = (issue: Json, incrementOccurrence: boolean) => {
    issue.title = analysis.diagnosis; issue.description = analysis.analysis; issue.severity = analysis.severity; issue.evidence = evidence(); issue.possibleCauses = [analysis.analysis]; issue.recommendedAction = Array.isArray(analysis.recommendedActions) ? analysis.recommendedActions[0] : 'Review the network diagnostic evidence.'; issue.recommendedActions = analysis.recommendedActions || []; issue.lastObservedAt = now();
    if (incrementOccurrence) issue.occurrenceCount = Number(issue.occurrenceCount || 1) + 1;
  };
  const openNetworkTicket = () => tickets.find(ticket => ticket.deviceId === device.id && ticket.networkIncident === true && !['Resolved', 'Closed'].includes(String(ticket.status)));
  const ensureTicket = (issue: Json) => {
    let ticket = tickets.find(item => item.id === issue.ticketId);
    // A repeat of the same fault during the configured recurrence window is
    // not a new repair history. Reopen its resolved incident so the technician
    // can see that the earlier resolution did not hold. Closed records remain
    // immutable and a later fault is recorded as a new incident instead.
    if (ticket && ticket.status === 'Resolved') {
      ticket.status = 'Open';
      ticket.reopenedAt = now();
      ticket.recurrenceCount = Number(ticket.recurrenceCount || 0) + 1;
      ticket.verificationStatus = 'Pending';
      ticket.verificationEvidence = undefined;
      ticket.verifiedAt = undefined;
    }
    if (ticket && ticket.status === 'Closed') ticket = undefined;
    ticket ||= openNetworkTicket();
    if (ticket) { issue.ticketId = ticket.id; ticket.issueId = issue.id; ticket.problem = analysis.diagnosis; ticket.diagnosis = analysis.analysis; ticket.title = analysis.diagnosis; ticket.description = analysis.analysis; ticket.severity = analysis.severity; ticket.priority = analysis.severity === 'Critical' ? 'Urgent' : ticket.priority || 'High'; ticket.updatedAt = now(); return; }
    if (analysis.severity !== 'Critical' || (state.settings as Json).autoCreateTicketOnCritical !== true) return;
    ticket = { id: id('ticket'), ticketNumber: `NET-${new Date().getUTCFullYear()}-${String(tickets.length + 1).padStart(4, '0')}`, deviceId: device.id, deviceName: device.deviceName, assetId: device.assetId, issueId: issue.id, problem: analysis.diagnosis, diagnosis: analysis.analysis, title: analysis.diagnosis, description: analysis.analysis, severity: analysis.severity, priority: 'Urgent', status: 'Open', detectedDate: now(), notes: [], attachments: [], createdAt: now(), updatedAt: now(), networkIncident: true };
    tickets.unshift(ticket); issue.ticketId = ticket.id;
  };
  const activeNetworkIssues = issues.filter(issue => issue.deviceId === device.id && stringValue(issue.ruleCode).startsWith('NETWORK_') && issue.status !== 'Resolved');
  if (healthy) {
    for (const issue of activeNetworkIssues) { issue.status = 'Resolved'; issue.resolvedAt = now(); issue.recoveryObservedAt = now(); }
    const measuredMs = Date.parse(measurementAt);
    for (const ticket of tickets.filter(ticket => ticket.deviceId === device.id && ticket.networkIncident === true && ticket.status === 'Resolved' && ticket.verificationStatus === 'Pending')) {
      const resolvedMs = Date.parse(stringValue(ticket.resolvedDate));
      if (Number.isFinite(measuredMs) && Number.isFinite(resolvedMs) && measuredMs >= resolvedMs) {
        ticket.verificationStatus = 'Passed'; ticket.verifiedAt = now(); ticket.verificationEvidence = 'A fresh post-resolution agent network diagnostic passed Wi-Fi, gateway, DNS, and external connectivity checks.'; ticket.updatedAt = now();
      }
    }
    return;
  }
  if (!actionable) return;
  const ruleCode = `NETWORK_${code}`;
  for (const issue of activeNetworkIssues.filter(issue => issue.ruleCode !== ruleCode)) { issue.status = 'Resolved'; issue.resolvedAt = now(); issue.supersededBy = ruleCode; }
  let issue = issues.find(item => item.deviceId === device.id && item.ruleCode === ruleCode && item.status !== 'Resolved');
  if (issue) { updateIssue(issue, true); ensureTicket(issue); return; }
  const cooldownMs = Number((state.settings as Json).networkIncidentCooldownSec || 600) * 1000;
  const previous = issues.find(item => item.deviceId === device.id && item.ruleCode === ruleCode);
  if (previous && previous.resolvedAt && Date.now() - new Date(String(previous.resolvedAt)).getTime() < cooldownMs) {
    previous.status = 'Active'; previous.resolvedAt = undefined; previous.reopenedAt = now(); updateIssue(previous, true); ensureTicket(previous); return;
  }
  issue = { id: id('issue'), deviceId: device.id, deviceName: device.deviceName, assetId: device.assetId, locationName: device.locationId || 'Unassigned', departmentName: device.departmentId || 'Unassigned', ruleCode, title: analysis.diagnosis, description: analysis.analysis, severity: analysis.severity, status: 'Active', detectedAt: now(), lastObservedAt: now(), occurrenceCount: 1, evidence: evidence(), possibleCauses: [analysis.analysis], recommendedAction: Array.isArray(analysis.recommendedActions) ? analysis.recommendedActions[0] : 'Review the network diagnostic evidence.', recommendedActions: analysis.recommendedActions || [] };
  issues.unshift(issue);
  (state.notifications as Json[]).unshift({ id: id('notif'), title: `${analysis.severity}: ${analysis.diagnosis}`, message: analysis.analysis, type: analysis.severity === 'Critical' ? 'critical' : 'warning', deviceId: device.id, deviceName: device.deviceName, issueId: issue.id, isRead: false, createdAt: now() });
  ensureTicket(issue);
}

function queueNetworkDiagnosticCommand(state: Json, device: Json, user: Json, scope: string = 'full', verifyTicketId?: unknown) {
  const commands = (state.deviceCommands as Json[] | undefined) || [];
  const existing = commands.find(command => command.deviceId === device.id && command.type === 'run_network_diagnostic' && ['queued', 'dispatched'].includes(String(command.status)) && Number(command.expiresAt || 0) > Date.now());
  if (existing) return existing;
  const command: Json = { id: id('network-test'), type: 'run_network_diagnostic', scope, deviceId: device.id, deviceName: device.deviceName, requestedBy: user.id, requestedByName: user.fullName, requestedAt: now(), expiresAt: Date.now() + 5 * 60 * 1000, status: 'queued', verifyTicketId: verifyTicketId || undefined };
  commands.unshift(command); state.deviceCommands = commands.slice(0, 200);
  return command;
}

function queueNetworkTicketVerification(state: Json, ticket: Json, user: Json) {
  const device = (state.devices as Json[]).find(item => item.id === ticket.deviceId);
  if (!device) return { command: null, reason: 'The linked device no longer exists.' };
  if (device.connectionState !== 'connected') return { command: null, reason: 'Monitoring Agent Offline. Verification will remain pending until the agent reconnects.' };
  if (!hasAgentCapability(device, 'wifi_diagnostics') || !hasAgentCapability(device, 'network_diagnostic_commands')) return { command: null, reason: 'The connected agent must be updated before a post-repair Wi-Fi verification can run.' };
  const command = queueNetworkDiagnosticCommand(state, device, user, 'full', ticket.id);
  ticket.verificationCommandId = command.id;
  ticket.verificationQueuedAt = now();
  ticket.verificationBlockedReason = undefined;
  return { command, reason: null };
}

function evaluateTelemetry(state: Json, device: Json, telemetry: Json) {
  const issues = state.issues as Json[];
  const notifications = state.notifications as Json[];
  const rules = state.diagnosticRules as Json[];
  const storage = Array.isArray(telemetry.storage) ? telemetry.storage as Json[] : [];
  const lowestFree = storage.reduce((lowest, disk) => Math.min(lowest, Number(disk.capacityBytes || 0) > 0 ? (Number(disk.freeBytes || 0) / Number(disk.capacityBytes)) * 100 : 100), 100);
  const metrics: Record<string, number | undefined> = {
    cpu_usage: Number(telemetry.cpuUsagePercent), ram_usage: Number(telemetry.ramUsagePercent), cpu_temp: telemetry.cpuTempC === undefined ? undefined : Number(telemetry.cpuTempC), disk_free_percent: storage.length ? lowestFree : undefined
  };
  for (const rule of rules) {
    if (rule.enabled === false) continue;
    const current = metrics[String(rule.metric)];
    if (current === undefined || Number.isNaN(current)) continue;
    const violates = rule.metric === 'disk_free_percent' ? current < Number(rule.thresholdValue) : current > Number(rule.thresholdValue);
    const existing = issues.find(issue => issue.deviceId === device.id && issue.ruleCode === rule.code && issue.status !== 'Resolved');
    if (violates) {
      const description = `${rule.name}: observed ${current.toFixed(1)}${rule.thresholdUnit || ''}; configured threshold ${rule.thresholdValue}${rule.thresholdUnit || ''}.`;
      if (existing) { existing.evidence = { metricName: rule.name, metric: rule.metric, currentValue: current, thresholdValue: rule.thresholdValue, details: description }; existing.description = description; }
      else {
        const issue: Json = { id: id('issue'), deviceId: device.id, deviceName: device.deviceName, assetId: device.assetId, locationName: device.locationId || 'Unassigned', departmentName: device.departmentId || 'Unassigned', ruleCode: rule.code, title: rule.name, description, severity: rule.severity || 'Medium', status: 'Active', detectedAt: now(), evidence: { metricName: rule.name, metric: rule.metric, currentValue: current, thresholdValue: rule.thresholdValue, details: description }, possibleCauses: rule.possibleCauses || [], recommendedAction: Array.isArray(rule.recommendedActions) ? rule.recommendedActions[0] : 'Review telemetry evidence.', recommendedActions: rule.recommendedActions || [] };
        issues.unshift(issue);
        notifications.unshift({ id: id('notif'), title: `${rule.severity || 'Warning'}: ${rule.name}`, message: description, type: rule.severity === 'Critical' ? 'critical' : 'warning', deviceId: device.id, deviceName: device.deviceName, issueId: issue.id, isRead: false, createdAt: now() });
        if (rule.autoCreateTicket === true && (state.settings as Json).autoCreateTicketOnCritical === true && rule.severity === 'Critical') {
          const tickets = state.tickets as Json[]; const ticket: Json = { id: id('ticket'), ticketNumber: `INC-${new Date().getUTCFullYear()}-${String(tickets.length + 1).padStart(4, '0')}`, deviceId: device.id, deviceName: device.deviceName, assetId: device.assetId, issueId: issue.id, problem: rule.name, diagnosis: description, title: rule.name, description, severity: 'Critical', priority: 'Urgent', status: 'Open', detectedDate: now(), notes: [], attachments: [], createdAt: now(), updatedAt: now() }; tickets.unshift(ticket); issue.ticketId = ticket.id;
        }
      }
    } else if (existing) { existing.status = 'Resolved'; existing.resolvedAt = now(); }
  }
  if (telemetry.wifiDiagnostics && typeof telemetry.wifiDiagnostics === 'object') recordNetworkDiagnostics(state, device, telemetry);
  const activeForDevice = issues.filter(issue => issue.deviceId === device.id && issue.status !== 'Resolved');
  device.activeIssueCount = activeForDevice.length;
  device.status = activeForDevice.some(issue => issue.severity === 'Critical') ? 'Critical' : activeForDevice.length ? 'Warning' : 'Online';
}

const csvCell = (value: unknown) => `"${String(value ?? '').replaceAll('"', '""')}"`;
function csvDownload(filename: string, headers: string[], rows: unknown[][]) {
  const body = [headers, ...rows].map(row => row.map(csvCell).join(',')).join('\r\n');
  return new Response(body, { headers: { ...cors, 'Content-Type': 'text/csv; charset=utf-8', 'Content-Disposition': `attachment; filename="${filename}"` } });
}

function deviceHealth(state: Json, device: Json) {
  const telemetry = (state.telemetry as Record<string, Json>)[String(device.id)] || device.latestTelemetry as Json | undefined;
  if (!telemetry) return { score: null, level: 'Unavailable', reasons: ['No agent telemetry has been received.'], recommendations: ['Install or reconnect the monitoring agent.'], calculatedAt: now() };
  let score = 100; const reasons: string[] = []; const recommendations: string[] = [];
  const reduce = (points: number, reason: string, recommendation: string) => { score -= points; reasons.push(reason); recommendations.push(recommendation); };
  if (device.connectionState !== 'connected') reduce(25, 'Agent connection is stale or offline.', 'Restore agent connectivity.');
  if (Number(telemetry.cpuUsagePercent || 0) >= 90) reduce(12, `CPU utilization is ${telemetry.cpuUsagePercent}%.`, 'Inspect sustained CPU consumers.');
  else if (Number(telemetry.cpuUsagePercent || 0) >= 80) reduce(6, `CPU utilization is elevated at ${telemetry.cpuUsagePercent}%.`, 'Review running workloads.');
  if (Number(telemetry.ramUsagePercent || 0) >= 90) reduce(12, `Memory utilization is ${telemetry.ramUsagePercent}%.`, 'Reduce memory pressure or evaluate a RAM upgrade.');
  const drives = Array.isArray(telemetry.storage) ? telemetry.storage as Json[] : [];
  const freePercent = drives.reduce((lowest, disk) => Math.min(lowest, Number(disk.capacityBytes || 0) ? (Number(disk.freeBytes || 0) / Number(disk.capacityBytes)) * 100 : 100), 100);
  if (drives.length && freePercent < 5) reduce(22, `Storage free space is ${freePercent.toFixed(1)}%.`, 'Free storage immediately.');
  else if (drives.length && freePercent < 12) reduce(12, `Storage free space is ${freePercent.toFixed(1)}%.`, 'Free at least 15% storage capacity.');
  if (telemetry.cpuTempC !== undefined && Number(telemetry.cpuTempC) >= 82) reduce(18, `CPU temperature is ${telemetry.cpuTempC}°C.`, 'Inspect cooling and airflow.');
  const activeIssues = (state.issues as Json[]).filter(issue => issue.deviceId === device.id && issue.status !== 'Resolved');
  activeIssues.forEach(issue => reduce(issue.severity === 'Critical' ? 12 : issue.severity === 'High' ? 7 : 3, `Active finding: ${issue.title}.`, String(issue.recommendedAction || 'Review diagnostic evidence.')));
  const finalScore = Math.max(0, Math.round(score));
  const level = finalScore >= 90 ? 'Excellent' : finalScore >= 75 ? 'Good' : finalScore >= 60 ? 'Attention Required' : finalScore >= 40 ? 'Warning' : 'Critical';
  return { score: finalScore, level, reasons, recommendations: [...new Set(recommendations)], calculatedAt: now() };
}

function publicDevice(state: Json, device: Json, role: unknown) {
  const safe: Json = { ...device, health: deviceHealth(state, device) };
  delete safe.deviceToken;
  if (!['super_admin', 'it_admin'].includes(String(role))) delete safe.registrationCode;
  if (!['super_admin', 'it_admin', 'technician'].includes(String(role))) {
    delete safe.latestNetworkDiagnostic;
    if (safe.latestTelemetry && typeof safe.latestTelemetry === 'object') {
      const telemetry = { ...(safe.latestTelemetry as Json) };
      delete telemetry.wifiDiagnostics;
      safe.latestTelemetry = telemetry;
    }
  }
  return safe;
}

function databaseHeaders(env: Env) {
  return {
    apikey: env.SUPABASE_SECRET_KEY,
    Authorization: `Bearer ${env.SUPABASE_SECRET_KEY}`,
    'Content-Type': 'application/json'
  };
}

async function load(env: Env): Promise<Json> {
  const response = await fetch(`${env.SUPABASE_URL}/rest/v1/monitoring_state?id=eq.1&select=data`, { headers: databaseHeaders(env) });
  if (!response.ok) throw new Error(`Supabase read failed with status ${response.status}.`);
  const rows = await response.json() as Array<{ data: Json }>;
  if (rows[0]) return initializeState(rows[0].data);
  const state = {
    users: [{ id: 'user-superadmin-01', username: 'admin', email: 'admin@system.local', fullName: 'IT Chief Administrator', role: 'super_admin', passwordHash: await hash('admin123'), createdAt: now() }],
    devices: [], notifications: [], telemetry: {}, sessions: {},
    departments: [], locations: [], tickets: [], issues: []
  };
  await save(env, state);
  return initializeState(state);
}

async function save(env: Env, state: Json) {
  const response = await fetch(`${env.SUPABASE_URL}/rest/v1/monitoring_state?on_conflict=id`, {
    method: 'POST',
    headers: { ...databaseHeaders(env), Prefer: 'resolution=merge-duplicates' },
    body: JSON.stringify({ id: 1, data: state, updated_at: now() })
  });
  if (!response.ok) throw new Error(`Supabase write failed with status ${response.status}.`);
}

function token(request: Request) {
  const header = request.headers.get('Authorization');
  return header?.startsWith('Bearer ') ? header.slice(7) : undefined;
}

function requireUser(state: Json, request: Request) {
  const sessions = state.sessions as Record<string, { userId: string; expiresAt: number }>;
  const session = token(request) && sessions[token(request)!];
  if (!session || session.expiresAt < Date.now()) return null;
  const account = (state.users as Json[]).find(user => user.id === session.userId);
  return account && account.active !== false ? account : null;
}

function safeUser(user: Json) {
  const { passwordHash, ...safe } = user;
  return safe;
}

function agentDownload(type: string, serverUrl: string, registrationCode: string) {
  if (type === 'powershell') return { body: generatePowerShellAgent(serverUrl, registrationCode), filename: 'pc-monitoring-agent.ps1', contentType: 'text/plain; charset=utf-8' };
  if (type === 'python') return { body: generatePythonAgent(serverUrl, registrationCode), filename: 'pc-monitoring-agent.py', contentType: 'text/x-python; charset=utf-8' };
  if (type === 'node') return { body: generateNodeAgent(serverUrl, registrationCode), filename: 'pc-monitoring-agent.mjs', contentType: 'application/javascript; charset=utf-8' };
  return null;
}

function summary(state: Json) {
  const devices = state.devices as Json[];
  const issues = state.issues as Json[];
  const tickets = state.tickets as Json[];
  const count = (status: string) => devices.filter(device => device.status === status).length;
  const activeIssues = issues.filter(issue => issue.status === 'Active' || issue.status === 'Investigating');
  const telemetry = state.telemetry as Record<string, Json>;
  const values = Object.values(telemetry);
  const networkDiagnostics = state.networkDiagnostics as Record<string, Json[]>;
  const latestNetworkDiagnostics = Object.values(networkDiagnostics).map(history => history[0]).filter((record): record is Json => Boolean(record));
  const deviceById = new Map(devices.map(device => [String(device.id), device]));
  const networkIntervalMs = Number((state.settings as Json).networkDiagnosticIntervalSec || 60) * 2000;
  const freshNetworkDiagnostics = latestNetworkDiagnostics.filter(record => {
    const device = deviceById.get(String(record.deviceId));
    const measuredAt = new Date(String(record.receivedAt || 0)).getTime();
    return device?.connectionState === 'connected' && Number.isFinite(measuredAt) && Date.now() - measuredAt <= networkIntervalMs;
  });
  const staleNetworkDiagnostics = latestNetworkDiagnostics.filter(record => !freshNetworkDiagnostics.includes(record));
  const countNetwork = (status: string) => freshNetworkDiagnostics.filter(record => record.status === status).length;
  const activeNetworkIssues = activeIssues.filter(issue => stringValue(issue.ruleCode).startsWith('NETWORK_'));
  const locations = state.locations as Json[];
  const clusterWindow = Date.now() - 15 * 60 * 1000;
  const latestByDevice = new Map(freshNetworkDiagnostics.map(record => [String(record.deviceId), record]));
  const sharedFaultCodes = new Set(['NETWORK_GATEWAY_UNREACHABLE', 'NETWORK_INTERNET_UNAVAILABLE', 'NETWORK_DNS_RESOLUTION_FAILURE', 'NETWORK_HIGH_PACKET_LOSS', 'NETWORK_HIGH_LATENCY']);
  const clusterGroups = new Map<string, Json[]>();
  for (const issue of activeNetworkIssues.filter(issue => new Date(String(issue.detectedAt || 0)).getTime() >= clusterWindow && sharedFaultCodes.has(String(issue.ruleCode)))) {
    const currentRecord = latestByDevice.get(String(issue.deviceId));
    if (!currentRecord || currentRecord.code !== String(issue.ruleCode).replace(/^NETWORK_/, '')) continue;
    const locationId = stringValue((state.devices as Json[]).find(device => device.id === issue.deviceId)?.locationId) || 'unassigned';
    const wifi = currentRecord.wifi as Json | undefined;
    const sharedNetworkKey = `${locationId}|${issue.ruleCode}|${stringValue(wifi?.ssid)}|${stringValue(wifi?.defaultGateway)}`;
    const group = clusterGroups.get(sharedNetworkKey) || []; group.push(issue); clusterGroups.set(sharedNetworkKey, group);
  }
  const networkClusters = Array.from(clusterGroups.entries()).filter(([, issuesAtLocation]) => new Set(issuesAtLocation.map(issue => issue.deviceId)).size >= 2).map(([key, issuesAtLocation]) => {
    const [locationId, ruleCode] = key.split('|');
    return { locationId, locationName: stringValue(locations.find(location => location.id === locationId)?.name) || 'Unassigned', affectedDevices: new Set(issuesAtLocation.map(issue => issue.deviceId)).size, activeIssues: issuesAtLocation.length, detectedWithinMinutes: 15, ruleCode, possibleSharedCause: 'Devices share the same fault pattern and wireless context; check the access point, router, switch, DNS, or upstream network infrastructure.' };
  });
  const scores = devices.map(device => deviceHealth(state, device).score).filter((score): score is number => score !== null);
  return {
    overallHealthScore: scores.length ? Math.round(scores.reduce((sum, score) => sum + score, 0) / scores.length) : null,
    totalDevices: devices.length, onlineDevices: count('Online'), offlineDevices: count('Offline'), warningDevices: count('Warning'),
    criticalDevices: count('Critical'), maintenanceDevices: count('Maintenance'), waitingDevices: count('Waiting for Agent Connection'),
    openTickets: tickets.filter(ticket => !['Resolved', 'Closed'].includes(String(ticket.status))).length,
    resolvedTickets: tickets.filter(ticket => ['Resolved', 'Closed'].includes(String(ticket.status))).length,
    activeIssues: activeIssues.length, criticalIssues: activeIssues.filter(issue => issue.severity === 'Critical').length,
    devicesWithLowStorage: values.filter(item => Array.isArray(item.storage) && (item.storage as Json[]).some(disk => Number(disk.capacityBytes || 0) > 0 && Number(disk.freeBytes || 0) / Number(disk.capacityBytes || 1) <= .15)).length,
    devicesWithHighCpu: values.filter(item => Number(item.cpuUsagePercent || 0) >= 80).length,
    devicesWithHighMemory: values.filter(item => Number(item.ramUsagePercent || 0) >= 85).length,
    devicesWithHighTemp: values.filter(item => Number(item.cpuTempC || 0) >= 80).length,
    networkHealth: {
      monitoredDevices: freshNetworkDiagnostics.length,
      online: countNetwork('ONLINE'), limited: countNetwork('LIMITED'), noInternet: countNetwork('NO INTERNET'),
      localNetworkError: countNetwork('LOCAL NETWORK ERROR'), dnsError: countNetwork('DNS ERROR'), disconnected: countNetwork('DISCONNECTED'),
      critical: activeNetworkIssues.filter(issue => issue.severity === 'Critical').length, activeIncidents: activeNetworkIssues.length,
      unavailable: countNetwork('UNAVAILABLE'), stale: staleNetworkDiagnostics.length, clusters: networkClusters
    },
    statusDistribution: ['Online', 'Warning', 'Critical', 'Offline', 'Maintenance'].map(status => ({ status, count: count(status) })),
    problemsByType: Array.from(new Set(activeIssues.map(issue => String(issue.ruleCode || issue.title || 'Other')))).map(type => ({ type, count: activeIssues.filter(issue => String(issue.ruleCode || issue.title || 'Other') === type).length })),
    problemsBySeverity: ['Critical', 'High', 'Medium', 'Low', 'Informational'].map(severity => ({ severity, count: activeIssues.filter(issue => issue.severity === severity).length })),
    recentAlerts: (state.notifications as Json[]).slice(0, 10), recentTickets: tickets.slice(0, 8)
  };
}

export default {
  async fetch(request: Request, env: Env): Promise<Response> {
    try {
    if (request.method === 'OPTIONS') return new Response(null, { headers: cors });
    const url = new URL(request.url);
    const path = url.pathname;
    const state = await load(env);
    if (path === '/api/health') return json({ status: 'ok', time: now(), runtime: 'cloudflare-workers', database: 'supabase' });

    // Agent scripts and device telemetry use registration/device tokens, not dashboard sessions.
    const downloadMatch = path.match(/^\/api\/agent\/download\/(powershell|python|node)$/);
    if (downloadMatch && request.method === 'GET') {
      const registrationCode = url.searchParams.get('code')?.trim().toUpperCase() || '';
      if (!registrationCode) return json({ error: 'A registration code is required.' }, 400);
      const script = agentDownload(downloadMatch[1], url.origin, registrationCode);
      if (!script) return json({ error: 'Supported types: powershell, python, node' }, 400);
      return new Response(script.body, { headers: { ...cors, 'Content-Type': script.contentType, 'Content-Disposition': `attachment; filename="${script.filename}"` } });
    }

    if (path === '/api/agent/register' && request.method === 'POST') {
      const body = await request.json() as Json;
      const registrationCode = String(body.registrationCode || '').trim().toUpperCase();
      if (!registrationCode) return json({ success: false, error: 'Registration code is required.' }, 400);
      const devices = state.devices as Json[];
      let device = devices.find(item => String(item.registrationCode || '').toUpperCase() === registrationCode);
      if (!device || (device.registrationExpiresAt && Number(device.registrationExpiresAt) < Date.now())) return json({ success: false, error: 'The registration code is invalid, expired, or already used.' }, 401);
      const timestamp = now();
      const deviceToken = String(device.deviceToken || `devtok_${crypto.randomUUID().replaceAll('-', '')}`);
      Object.assign(device, {
        deviceName: body.computerName || body.hostname || device.deviceName,
        deviceToken, status: 'Online', connectionState: 'connected',
        lastHeartbeatAt: timestamp, lastOnlineAt: timestamp, offlineSince: undefined,
        agentVersion: body.agentVersion || device.agentVersion,
        agentCapabilities: Array.isArray(body.agentCapabilities) ? asArray(body.agentCapabilities) : device.agentCapabilities || [],
        operatingSystem: body.osName || body.osVersion || device.operatingSystem,
        serialNumber: body.serialNumber || device.serialNumber,
        specs: {
          deviceId: device.id,
          cpuModel: body.cpuModel || undefined,
          cpuCores: body.cpuCores === undefined ? undefined : Number(body.cpuCores),
          cpuLogicalCores: body.cpuLogicalProcessors === undefined ? undefined : Number(body.cpuLogicalProcessors),
          ramTotalBytes: body.totalRamBytes === undefined ? undefined : Number(body.totalRamBytes),
          gpuModel: body.gpuModel || undefined,
          motherboard: body.motherboard || undefined,
          biosVersion: body.biosVersion || undefined,
          systemArchitecture: body.osArchitecture || undefined,
          osVersion: body.osVersion || body.osName || undefined,
          osBuild: body.osBuild || undefined,
          storageDevices: [],
          lastUpdated: timestamp
        }
      });
      // Pairing material is single-use; the returned agent token is required
      // for every later heartbeat and telemetry upload.
      device.registrationCode = '';
      await save(env, state);
      const settings = state.settings as Json;
      return json({ success: true, token: deviceToken, deviceToken, deviceId: device.id, heartbeatIntervalSec: Number(settings.heartbeatIntervalSec || 30), networkDiagnosticIntervalSec: Number(settings.networkDiagnosticIntervalSec || 60), message: 'Device successfully registered and active.' });
    }

    if ((path === '/api/agent/heartbeat' || path === '/api/agent/telemetry') && request.method === 'POST') {
      const body = await request.json() as Json;
      const deviceToken = request.headers.get('Authorization')?.replace(/^Bearer\s+/i, '') || String(body.deviceToken || '');
      const device = (state.devices as Json[]).find(item => item.deviceToken === deviceToken && (!body.deviceId || item.id === body.deviceId));
      if (!device) return json({ success: false, error: 'Unauthorized device token.' }, 401);
      const receivedAt = now();
      const timestamp = safeTimestamp(body.timestamp, receivedAt);
      // Availability is based on when the Worker received the message, not on a
      // client-controlled clock that could be invalid or in the future.
      Object.assign(device, { status: 'Online', connectionState: 'connected', lastHeartbeatAt: receivedAt, lastOnlineAt: receivedAt, offlineSince: undefined });
      if (body.agentVersion) device.agentVersion = String(body.agentVersion);
      if (Array.isArray(body.agentCapabilities)) device.agentCapabilities = asArray(body.agentCapabilities);
      if (path.endsWith('/telemetry')) {
        const telemetry = (state.telemetry as Record<string, Json>) || {};
        const latestTelemetry: Json = { ...body, deviceId: device.id, timestamp, receivedAt };
        telemetry[String(device.id)] = latestTelemetry;
        // The dashboard reads the current snapshot from each device record.
        device.latestTelemetry = latestTelemetry;
        state.telemetry = telemetry;
        const history = state.telemetryHistory as Record<string, Json[]>;
        const snapshots = history[String(device.id)] || [];
        snapshots.push({ timestamp: receivedAt, sourceTimestamp: timestamp, cpuUsagePercent: latestTelemetry.cpuUsagePercent, cpuTempC: latestTelemetry.cpuTempC, ramUsagePercent: latestTelemetry.ramUsagePercent, networkInKbps: latestTelemetry.network && typeof latestTelemetry.network === 'object' && (latestTelemetry.network as Json).bytesInPerSec !== null ? Math.round(Number((latestTelemetry.network as Json).bytesInPerSec) / 1024) : undefined, networkOutKbps: latestTelemetry.network && typeof latestTelemetry.network === 'object' && (latestTelemetry.network as Json).bytesOutPerSec !== null ? Math.round(Number((latestTelemetry.network as Json).bytesOutPerSec) / 1024) : undefined });
        history[String(device.id)] = snapshots.slice(-Number((state.settings as Json).telemetryRetentionPoints || 1440));
        if (body.network && typeof body.network === 'object') {
          const network = body.network as Json;
          device.ipAddress = network.ip || device.ipAddress;
          device.macAddress = network.mac || device.macAddress;
        }
        evaluateTelemetry(state, device, latestTelemetry);
        const commandResults = Array.isArray(body.commandResults) ? body.commandResults as Json[] : [];
        for (const result of commandResults) {
          const commandId = stringValue(result.id);
          const command = ((state.deviceCommands as Json[] | undefined) || []).find(item => item.id === commandId && item.deviceId === device.id);
          if (command) {
            command.status = 'completed'; command.completedAt = now(); command.result = result;
          }
        }
      }
      await save(env, state);
      const settings = state.settings as Json;
      return json({ success: true, timestamp: receivedAt, agentTimestamp: timestamp, status: device.status, activeIssues: Number(device.activeIssueCount || 0), heartbeatIntervalSec: Number(settings.heartbeatIntervalSec || 30), networkDiagnosticIntervalSec: Number(settings.networkDiagnosticIntervalSec || 60) });
    }

    if (path === '/api/agent/commands' && request.method === 'GET') {
      const deviceId = url.searchParams.get('deviceId');
      const deviceToken = request.headers.get('Authorization')?.replace(/^Bearer\s+/i, '');
      const device = (state.devices as Json[]).find(item => item.id === deviceId && item.deviceToken === deviceToken);
      if (!device) return json({ error: 'Unauthorized device token.' }, 401);
      const commands = [
        ...((state.shutdownCommands as Json[] | undefined) || []),
        ...((state.deviceCommands as Json[] | undefined) || [])
      ];
      let expired = false;
      for (const pending of commands.filter(item => item.deviceId === deviceId && ['queued', 'dispatched'].includes(String(item.status)) && Number(item.expiresAt || 0) <= Date.now())) {
        pending.status = 'expired'; pending.expiredAt = now(); expired = true;
      }
      const command = commands.find(item => item.deviceId === deviceId && item.status === 'queued' && Number(item.expiresAt || 0) > Date.now());
      if (!command) { if (expired) await save(env, state); return json({ command: null }); }
      command.status = 'dispatched';
      command.dispatchedAt = now();
      await save(env, state);
      return json({ command });
    }

    if (path === '/api/auth/login' && request.method === 'POST') {
      const body = await request.json() as Json;
      const suppliedUsername = String(body.username || '').trim().toLowerCase();
      const account = (state.users as Json[]).find(user => String(user.username).toLowerCase() === suppliedUsername || String(user.email).toLowerCase() === suppliedUsername);
      if (!account || account.active === false || account.passwordHash !== await hash(String(body.password || ''))) return json({ error: 'Invalid username or password.' }, 401);
      const sessionToken = `sess_${crypto.randomUUID().replaceAll('-', '')}`;
      (state.sessions as Record<string, Json>)[sessionToken] = { userId: String(account.id), expiresAt: Date.now() + 86400000 };
      account.lastLoginAt = now();
      await save(env, state);
      return json({ success: true, token: sessionToken, user: safeUser(account) });
    }

    const user = requireUser(state, request);
    if (path === '/api/auth/me') return user ? json({ user: safeUser(user), token: token(request) }) : json({ error: 'Authentication is required.' }, 401);
    if (path === '/api/auth/logout' && request.method === 'POST') {
      if (token(request)) delete (state.sessions as Record<string, unknown>)[token(request)!];
      await save(env, state); return json({ success: true });
    }
    if (!user) return json({ error: 'Authentication is required.' }, 401);

    if (path === '/api/reports/summary' && request.method === 'GET') return json(summary(state));
    const exportMatch = path.match(/^\/api\/reports\/export\/(devices|issues|tickets|maintenance)$/);
    if (exportMatch && request.method === 'GET') {
      const type = exportMatch[1];
      if (type === 'devices') return csvDownload('devices-inventory.csv', ['Asset ID', 'Device Name', 'Type', 'Assigned User', 'Status', 'IP Address', 'Operating System', 'Last Seen'], (state.devices as Json[]).map(device => [device.assetId, device.deviceName, device.deviceType, device.assignedUser, device.status, device.ipAddress, device.operatingSystem, device.lastHeartbeatAt]));
      if (type === 'issues') return csvDownload('diagnostic-issues.csv', ['Device', 'Asset ID', 'Finding', 'Severity', 'Status', 'Observed Value', 'Threshold', 'Detected At', 'Resolved At'], (state.issues as Json[]).map(issue => [issue.deviceName, issue.assetId, issue.title, issue.severity, issue.status, (issue.evidence as Json | undefined)?.currentValue, (issue.evidence as Json | undefined)?.thresholdValue, issue.detectedAt, issue.resolvedAt]));
      if (type === 'tickets') return csvDownload('repair-tickets.csv', ['Incident', 'Device', 'Asset ID', 'Problem', 'Severity', 'Priority', 'Status', 'Technician', 'Detected', 'Resolution'], (state.tickets as Json[]).map(ticket => [ticket.ticketNumber, ticket.deviceName, ticket.assetId, ticket.problem || ticket.title, ticket.severity, ticket.priority, ticket.status, ticket.assignedTechnicianName, ticket.detectedDate, ticket.resolution]));
      return csvDownload('maintenance-history.csv', ['Work Order', 'Device', 'Asset ID', 'Date', 'Technician', 'Problem', 'Action Performed', 'Parts Replaced', 'Result', 'Cost'], (state.maintenance as Json[]).map(record => [record.recordNumber, record.deviceName, record.assetId, record.date, record.technicianName, record.problem, record.actionPerformed, record.partsReplaced, record.result, record.cost]));
    }
    if (path === '/api/devices' && request.method === 'GET') return json((state.devices as Json[]).map(device => publicDevice(state, device, user.role)));
    const deviceMatch = path.match(/^\/api\/devices\/([^/]+)$/);
    if (deviceMatch && request.method === 'GET') {
      const device = (state.devices as Json[]).find(item => item.id === deviceMatch[1]);
      return device ? json(publicDevice(state, device, user.role)) : json({ error: 'Device not found.' }, 404);
    }
    const historyMatch = path.match(/^\/api\/devices\/([^/]+)\/telemetry\/history$/);
    if (historyMatch && request.method === 'GET') return json(((state.telemetryHistory as Record<string, Json[]>)[historyMatch[1]] || []));
    const networkDiagnosticsMatch = path.match(/^\/api\/devices\/([^/]+)\/network-diagnostics$/);
    if (networkDiagnosticsMatch && request.method === 'GET') {
      if (!['super_admin', 'it_admin', 'technician'].includes(String(user.role))) return json({ error: 'Detailed Wi-Fi diagnostics require technician or administrator permission.' }, 403);
      const device = (state.devices as Json[]).find(item => item.id === networkDiagnosticsMatch[1]);
      if (!device) return json({ error: 'Device not found.' }, 404);
      const history = (state.networkDiagnostics as Record<string, Json[]>)[String(device.id)] || [];
      const current = device.latestNetworkDiagnostic as Json | undefined;
      const intervalSec = Number((state.settings as Json).networkDiagnosticIntervalSec || 60);
      const lastTestAt = stringValue(current?.sourceTimestamp || device.lastNetworkTestAt);
      const lastReceivedAt = stringValue(history[0]?.receivedAt || device.lastNetworkTestReceivedAt);
      const lastReceivedMs = Date.parse(lastReceivedAt);
      const stale = device.connectionState !== 'connected' || !Number.isFinite(lastReceivedMs) || Date.now() - lastReceivedMs > intervalSec * 2000;
      const commands = (state.deviceCommands as Json[] | undefined) || [];
      let commandStateChanged = false;
      for (const command of commands.filter(item => item.deviceId === device.id && item.type === 'run_network_diagnostic' && ['queued', 'dispatched'].includes(String(item.status)) && Number(item.expiresAt || 0) <= Date.now())) {
        command.status = 'expired'; command.expiredAt = now(); commandStateChanged = true;
      }
      if (commandStateChanged) await save(env, state);
      const lastCommand = commands.find(command => command.deviceId === device.id && command.type === 'run_network_diagnostic') || null;
      const pendingCommand = lastCommand && ['queued', 'dispatched'].includes(String(lastCommand.status)) ? lastCommand : null;
      return json({ deviceId: device.id, agentStatus: device.connectionState === 'connected' ? 'CONNECTED' : 'OFFLINE', lastHeartbeatAt: device.lastHeartbeatAt || null, lastNetworkTestAt: lastTestAt || null, lastNetworkTestReceivedAt: lastReceivedAt || null, lastSuccessfulNetworkTestAt: device.lastSuccessfulNetworkTestAt || null, telemetryStale: stale, networkDiagnosticIntervalSec: intervalSec, supportsOnDemandNetworkDiagnostics: hasAgentCapability(device, 'wifi_diagnostics') && hasAgentCapability(device, 'network_diagnostic_commands'), pendingCommand, lastCommand, current: current || null, history });
    }
    const runNetworkDiagnosticMatch = path.match(/^\/api\/devices\/([^/]+)\/network-diagnostics\/run$/);
    if (runNetworkDiagnosticMatch && request.method === 'POST') {
      if (!['super_admin', 'it_admin', 'technician'].includes(String(user.role))) return json({ error: 'Technician or administrator permission is required.' }, 403);
      const device = (state.devices as Json[]).find(item => item.id === runNetworkDiagnosticMatch[1]);
      if (!device) return json({ error: 'Device not found.' }, 404);
      if (device.connectionState !== 'connected') return json({ error: 'Monitoring Agent Offline. A live network test cannot run until the agent reconnects.', lastHeartbeatAt: device.lastHeartbeatAt || null }, 409);
      if (!hasAgentCapability(device, 'wifi_diagnostics') || !hasAgentCapability(device, 'network_diagnostic_commands')) return json({ error: 'This connected agent does not support on-demand Wi-Fi diagnostics. Download and run the current Windows PowerShell agent, then wait for its next telemetry upload.' }, 409);
      const body = await request.json().catch(() => ({})) as Json;
      const scope = ['gateway', 'dns', 'internet', 'full'].includes(String(body.scope)) ? String(body.scope) : 'full';
      const alreadyQueued = ((state.deviceCommands as Json[] | undefined) || []).some(command => command.deviceId === device.id && command.type === 'run_network_diagnostic' && ['queued', 'dispatched'].includes(String(command.status)) && Number(command.expiresAt || 0) > Date.now());
      const command = queueNetworkDiagnosticCommand(state, device, user, scope);
      if (!alreadyQueued) {
        const audit = state.auditLogs as Json[];
        audit.unshift({ id: id('audit'), userId: user.id, userName: user.fullName, userRole: user.role, action: 'NETWORK_DIAGNOSTIC_REQUESTED', entityType: 'Diagnostic', entityId: command.id, details: `${scope} network diagnostic requested for ${device.deviceName}.`, timestamp: now() });
        state.auditLogs = audit.slice(0, 500);
      }
      await save(env, state);
      return json({ success: true, command, message: alreadyQueued ? 'A network diagnostic is already queued for this device.' : 'The connected agent will run the requested diagnostic and upload the measured result on its next telemetry cycle.' }, 202);
    }
    if (deviceMatch && request.method === 'DELETE') {
      if (!['super_admin', 'it_admin'].includes(String(user.role))) return json({ error: 'Administrator permission is required.' }, 403);
      const device = (state.devices as Json[]).find(item => item.id === deviceMatch[1]);
      if (!device) return json({ error: 'Device not found.' }, 404);
      const body = await request.json().catch(() => ({})) as Json;
      if (body.permanentlyDelete !== true || stringValue(body.confirmAssetId) !== stringValue(device.assetId)) {
        return json({ error: 'Permanent deletion requires the exact Asset ID confirmation.' }, 400);
      }
      const purged = permanentlyPurgeDeviceData(state, String(device.id));
      if (!purged) return json({ error: 'Device not found.' }, 404);
      await save(env, state);
      return json({ success: true, permanentlyDeleted: true, deletedDeviceId: purged.deviceId, deletionSummary: purged.summary });
    }
    const shutdownMatch = path.match(/^\/api\/devices\/([^/]+)\/shutdown$/);
    if (shutdownMatch && request.method === 'POST') {
      if (user.role !== 'super_admin') return json({ error: 'Only a super administrator can request a shutdown.' }, 403);
      const device = (state.devices as Json[]).find(item => item.id === shutdownMatch[1]);
      if (!device) return json({ error: 'Device not found.' }, 404);
      const body = await request.json().catch(() => ({})) as Json;
      const commands = (state.shutdownCommands as Json[] | undefined) || [];
      const command: Json = {
        id: id('shutdown'), type: 'safe_shutdown', deviceId: device.id, deviceName: device.deviceName,
        reason: String(body.reason || 'Building safety shutdown requested by IT.'), requestedBy: user.id,
        requestedAt: now(), expiresAt: Date.now() + 5 * 60 * 1000, status: 'queued'
      };
      commands.unshift(command);
      state.shutdownCommands = commands.slice(0, 100);
      await save(env, state);
      return json({ success: true, command });
    }
    const powerProfileMatch = path.match(/^\/api\/devices\/([^/]+)\/power-profile$/);
    if (powerProfileMatch && request.method === 'POST') {
      if (user.role !== 'super_admin' && user.role !== 'it_admin') return json({ error: 'Only an administrator can change a power profile.' }, 403);
      const device = (state.devices as Json[]).find(item => item.id === powerProfileMatch[1]);
      if (!device) return json({ error: 'Device not found.' }, 404);
      const body = await request.json().catch(() => ({})) as Json;
      const profile = body.profile === 'high_performance' ? 'high_performance' : body.profile === 'balanced' ? 'balanced' : null;
      if (!profile) return json({ error: 'Choose balanced or high_performance.' }, 400);
      const commands = (state.deviceCommands as Json[] | undefined) || [];
      const command: Json = {
        id: id('power'), type: 'power_profile', profile, deviceId: device.id, deviceName: device.deviceName,
        requestedBy: user.id, requestedAt: now(), expiresAt: Date.now() + 5 * 60 * 1000, status: 'queued'
      };
      commands.unshift(command);
      state.deviceCommands = commands.slice(0, 100);
      await save(env, state);
      return json({ success: true, command });
    }
    const remoteSessionMatch = path.match(/^\/api\/devices\/([^/]+)\/remote-session$/);
    if (remoteSessionMatch && request.method === 'POST') {
      if (!['super_admin', 'it_admin', 'technician'].includes(String(user.role))) return json({ error: 'Remote support requires technician or administrator permission.' }, 403);
      const device = (state.devices as Json[]).find(item => item.id === remoteSessionMatch[1]);
      if (!device) return json({ error: 'Device not found.' }, 404);
      if (device.connectionState !== 'connected') return json({ error: 'The device is not connected to its monitoring agent.' }, 409);
      const body = await request.json().catch(() => ({})) as Json;
      if (body.authorized !== true || String(body.reason || '').trim().length < 5) return json({ error: 'User authorization confirmation and a support reason are required.' }, 400);
      const telemetry = device.latestTelemetry as Json | undefined;
      const remote = telemetry?.remoteAccess as Json | undefined;
      if (!remote?.enabled) return json({ error: String(remote?.reason || 'Remote Desktop is not enabled on this device. Enable it locally and ensure network/VPN access before requesting a session.') }, 409);
      const network = telemetry?.network as Json | undefined;
      const host = String(remote.host || network?.ip || device.ipAddress || '');
      if (!host) return json({ error: 'The agent has not reported a reachable remote host.' }, 409);
      const event: Json = { id: id('remote'), deviceId: device.id, deviceName: device.deviceName, requestedBy: user.id, requestedByName: user.fullName, reason: String(body.reason).trim(), requestedAt: now(), protocol: 'rdp', host };
      const audit = (state.remoteSessions as Json[] | undefined) || [];
      audit.unshift(event); state.remoteSessions = audit.slice(0, 200);
      await save(env, state);
      // ms-rd is handled by Microsoft Remote Desktop on supported technician workstations.
      return json({ success: true, session: event, rdpUri: `ms-rd:full address=s:${encodeURIComponent(host)}`, manualCommand: `mstsc /v:${host}`, note: 'Cloudflare authorizes and audits this launch; the RDP connection still travels only over your approved LAN or VPN.' });
    }
    if (path === '/api/devices' && request.method === 'POST') {
      if (!['super_admin', 'it_admin'].includes(String(user.role))) return json({ error: 'Administrator permission is required.' }, 403);
      const body = await request.json() as Json;
      if (!body.deviceName || !body.assetId) return json({ error: 'Device name and Asset ID are required.' }, 400);
      const devices = state.devices as Json[];
      if (devices.some(device => String(device.assetId).toLowerCase() === String(body.assetId).toLowerCase())) return json({ error: 'Asset ID is already registered.' }, 409);
      const device: Json = { ...body, id: id('dev'), registrationCode: `REG-${crypto.randomUUID().slice(0, 8).toUpperCase()}`, registrationExpiresAt: Date.now() + 24 * 60 * 60 * 1000, deviceToken: `devtok_${crypto.randomUUID().replaceAll('-', '')}`, deviceType: body.deviceType || 'Desktop', assignedUser: body.assignedUser || 'Unassigned', status: 'Waiting for Agent Connection', connectionState: 'never_connected', registeredAt: now() };
      devices.unshift(device); (state.notifications as Json[]).unshift({ id: id('notif'), title: `Device Added: ${device.deviceName}`, message: 'Install the monitoring agent to start telemetry.', type: 'info', deviceId: device.id, deviceName: device.deviceName, isRead: false, createdAt: now() });
      await save(env, state); return json(publicDevice(state, device, user.role), 201);
    }
    if (path === '/api/notifications' && request.method === 'GET') return json(state.notifications);
    if (path === '/api/notifications/read-all' && request.method === 'POST') { (state.notifications as Json[]).forEach(notification => notification.isRead = true); await save(env, state); return json({ success: true }); }
    const readMatch = path.match(/^\/api\/notifications\/([^/]+)\/read$/);
    if (readMatch && request.method === 'POST') { const notification = (state.notifications as Json[]).find(item => item.id === readMatch[1]); if (notification) notification.isRead = true; await save(env, state); return json({ success: true }); }

    // User accounts are real persisted identities. Password hashes remain in
    // the server-side state and are never included in any browser response.
    if (path === '/api/users' && request.method === 'GET') {
      return json((state.users as Json[]).map(safeUser));
    }
    if (path === '/api/users' && request.method === 'POST') {
      if (user.role !== 'super_admin') return json({ error: 'Only a super administrator can create user accounts.' }, 403);
      const body = await request.json() as Json;
      const username = String(body.username || '').trim();
      const email = String(body.email || '').trim().toLowerCase();
      const fullName = String(body.fullName || '').trim();
      const password = String(body.password || '');
      const role = String(body.role || '');
      const allowedRoles = ['super_admin', 'it_admin', 'technician', 'department_head', 'viewer'];
      if (!username || !email || !fullName || !email.includes('@') || password.length < 8 || !allowedRoles.includes(role)) {
        return json({ error: 'Enter a unique username, valid email, full name, role, and a password of at least 8 characters.' }, 400);
      }
      const users = state.users as Json[];
      if (users.some(account => String(account.username).toLowerCase() === username.toLowerCase() || String(account.email).toLowerCase() === email)) return json({ error: 'That username or email address is already in use.' }, 409);
      const account: Json = { id: id('user'), username, email, fullName, role, passwordHash: await hash(password), departmentId: body.departmentId || undefined, active: true, mustChangePassword: true, createdAt: now() };
      users.push(account);
      const audit = (state.auditLogs as Json[] | undefined) || [];
      audit.unshift({ id: id('audit'), userId: user.id, userName: user.fullName, userRole: user.role, action: 'USER_CREATED', entityType: 'User', entityId: account.id, details: `Created ${username} with role ${role}.`, timestamp: now() });
      state.auditLogs = audit.slice(0, 500);
      await save(env, state);
      return json(safeUser(account), 201);
    }
    const userMatch = path.match(/^\/api\/users\/([^/]+)$/);
    if (userMatch && request.method === 'PUT') {
      if (user.role !== 'super_admin') return json({ error: 'Only a super administrator can update user accounts.' }, 403);
      const account = (state.users as Json[]).find(item => item.id === userMatch[1]);
      if (!account) return json({ error: 'User account not found.' }, 404);
      const body = await request.json() as Json;
      const allowedRoles = ['super_admin', 'it_admin', 'technician', 'department_head', 'viewer'];
      if (body.email !== undefined) {
        const email = String(body.email).trim().toLowerCase();
        if (!email.includes('@')) return json({ error: 'Enter a valid email address.' }, 400);
        if ((state.users as Json[]).some(item => item.id !== account.id && String(item.email).toLowerCase() === email)) return json({ error: 'That email address is already in use.' }, 409);
        account.email = email;
      }
      if (body.fullName !== undefined && String(body.fullName).trim()) account.fullName = String(body.fullName).trim();
      if (body.role !== undefined) { if (!allowedRoles.includes(String(body.role))) return json({ error: 'Invalid role.' }, 400); account.role = body.role; }
      if (body.departmentId !== undefined) account.departmentId = body.departmentId || undefined;
      if (body.password !== undefined) { const password = String(body.password); if (password.length < 8) return json({ error: 'Password must contain at least 8 characters.' }, 400); account.passwordHash = await hash(password); account.mustChangePassword = true; }
      if (body.active === true) { account.active = true; account.deactivatedAt = undefined; }
      const audit = (state.auditLogs as Json[] | undefined) || [];
      audit.unshift({ id: id('audit'), userId: user.id, userName: user.fullName, userRole: user.role, action: 'USER_UPDATED', entityType: 'User', entityId: account.id, details: `Updated ${account.username}.`, timestamp: now() }); state.auditLogs = audit.slice(0, 500);
      await save(env, state); return json(safeUser(account));
    }
    if (userMatch && request.method === 'DELETE') {
      if (user.role !== 'super_admin') return json({ error: 'Only a super administrator can deactivate user accounts.' }, 403);
      const users = state.users as Json[];
      const removed = users.find(account => account.id === userMatch[1]);
      if (!removed) return json({ error: 'User account not found.' }, 404);
      if (String(removed.id) === String(user.id) || removed.id === 'user-superadmin-01') return json({ error: 'You cannot deactivate this protected administrator account.' }, 409);
      if (removed.role === 'super_admin' && users.filter(account => account.role === 'super_admin' && account.active !== false).length <= 1) return json({ error: 'At least one active super administrator must remain.' }, 409);
      removed.active = false; removed.deactivatedAt = now();
      const sessions = state.sessions as Record<string, Json>;
      for (const [key, session] of Object.entries(sessions)) if (session.userId === removed.id) delete sessions[key];
      const audit = (state.auditLogs as Json[] | undefined) || [];
      audit.unshift({ id: id('audit'), userId: user.id, userName: user.fullName, userRole: user.role, action: 'USER_DEACTIVATED', entityType: 'User', entityId: removed.id, details: `Deactivated ${removed.username}.`, timestamp: now() });
      state.auditLogs = audit.slice(0, 500);
      await save(env, state);
      return json({ success: true });
    }
    if (path === '/api/org/departments') {
      if (request.method === 'GET') return json((state.departments as Json[]).map(department => ({ ...department, deviceCount: (state.devices as Json[]).filter(device => device.departmentId === department.id).length })));
      if (request.method === 'POST') {
        if (!['super_admin', 'it_admin'].includes(String(user.role))) return json({ error: 'Administrator permission is required.' }, 403);
        const body = await request.json() as Json; const name = String(body.name || '').trim(); const code = String(body.code || '').trim().toUpperCase();
        if (!name || !code) return json({ error: 'Department name and code are required.' }, 400);
        if ((state.departments as Json[]).some(item => String(item.code).toUpperCase() === code)) return json({ error: 'Department code already exists.' }, 409);
        const department: Json = { id: id('dept'), name, code, description: String(body.description || ''), headName: String(body.headOfDepartment || body.headName || ''), email: String(body.email || ''), createdAt: now() };
        (state.departments as Json[]).push(department); await save(env, state); return json(department, 201);
      }
    }
    if (path === '/api/org/locations') {
      if (request.method === 'GET') return json((state.locations as Json[]).map(location => ({ ...location, deviceCount: (state.devices as Json[]).filter(device => device.locationId === location.id).length })));
      if (request.method === 'POST') {
        if (!['super_admin', 'it_admin'].includes(String(user.role))) return json({ error: 'Administrator permission is required.' }, 403);
        const body = await request.json() as Json; const name = String(body.name || '').trim();
        if (!name) return json({ error: 'Location name is required.' }, 400);
        const location: Json = { id: id('loc'), name, type: body.type || 'Laboratory', building: String(body.building || ''), floor: String(body.floor || ''), roomNumber: String(body.roomNumber || ''), departmentId: body.departmentId || undefined, description: String(body.description || ''), createdAt: now() };
        (state.locations as Json[]).push(location); await save(env, state); return json(location, 201);
      }
    }
    if (path === '/api/settings') {
      if (request.method === 'GET') return json(state.settings);
      if (request.method === 'PUT') {
        if (!['super_admin', 'it_admin'].includes(String(user.role))) return json({ error: 'Administrator permission is required.' }, 403);
        const body = await request.json() as Json; const settings = state.settings as Json;
        const candidate: Json = { ...settings };
        const limits: Record<string, [number, number]> = {
          heartbeatIntervalSec: [2, 300], connectionLostThresholdSec: [5, 3600], offlineThresholdSec: [10, 86400], telemetryRetentionPoints: [20, 10000], networkHistoryRetentionPoints: [20, 10000], networkDiagnosticIntervalSec: [10, 3600], networkWeakSignalThresholdPercent: [1, 100], networkHighLatencyMs: [1, 10000], networkPacketLossThresholdPercent: [1, 100], networkIncidentCooldownSec: [30, 86400]
        };
        for (const [field, [minimum, maximum]] of Object.entries(limits)) {
          if (body[field] === undefined) continue;
          const value = Number(body[field]);
          if (!Number.isFinite(value) || value < minimum || value > maximum) return json({ error: `${field} must be between ${minimum} and ${maximum}.` }, 400);
          candidate[field] = value;
        }
        if (Number(candidate.connectionLostThresholdSec) < Number(candidate.heartbeatIntervalSec)) return json({ error: 'Connection-lost threshold must be at least the heartbeat interval.' }, 400);
        if (Number(candidate.offlineThresholdSec) <= Number(candidate.connectionLostThresholdSec)) return json({ error: 'Offline threshold must be greater than the connection-lost threshold.' }, 400);
        for (const field of ['autoCreateTicketOnCritical', 'enableSoundAlerts']) if (body[field] !== undefined) candidate[field] = body[field] === true;
        Object.assign(settings, candidate);
        await save(env, state); return json(settings);
      }
    }
    if (path === '/api/diagnostics/rules' && request.method === 'GET') return json(state.diagnosticRules);
    const ruleMatch = path.match(/^\/api\/diagnostics\/rules\/([^/]+)$/);
    if (ruleMatch && request.method === 'PUT') {
      if (!['super_admin', 'it_admin'].includes(String(user.role))) return json({ error: 'Administrator permission is required.' }, 403);
      const rule = (state.diagnosticRules as Json[]).find(item => item.id === ruleMatch[1]); if (!rule) return json({ error: 'Diagnostic rule not found.' }, 404);
      const body = await request.json() as Json;
      for (const field of ['thresholdValue', 'durationSeconds', 'severity', 'enabled', 'autoCreateTicket', 'description']) if (body[field] !== undefined) rule[field] = body[field];
      await save(env, state); return json(rule);
    }
    if (path === '/api/diagnostics/issues' && request.method === 'GET') {
      const deviceId = url.searchParams.get('deviceId'); const status = url.searchParams.get('status');
      return json((state.issues as Json[]).filter(issue => (!deviceId || issue.deviceId === deviceId) && (!status || issue.status === status)));
    }
    const issueStatusMatch = path.match(/^\/api\/diagnostics\/issues\/([^/]+)\/status$/);
    if (issueStatusMatch && (request.method === 'PUT' || request.method === 'POST')) {
      if (!['super_admin', 'it_admin', 'technician'].includes(String(user.role))) return json({ error: 'Technician or administrator permission is required.' }, 403);
      const issue = (state.issues as Json[]).find(item => item.id === issueStatusMatch[1]); if (!issue) return json({ error: 'Diagnostic issue not found.' }, 404);
      const body = await request.json() as Json; issue.status = body.status || issue.status; if (issue.status === 'Resolved') issue.resolvedAt = now(); await save(env, state); return json(issue);
    }
    if (path === '/api/tickets') {
      if (request.method === 'GET') { const deviceId = url.searchParams.get('deviceId'); return json((state.tickets as Json[]).filter(ticket => !deviceId || ticket.deviceId === deviceId)); }
      if (request.method === 'POST') {
        if (!['super_admin', 'it_admin', 'technician'].includes(String(user.role))) return json({ error: 'Technician or administrator permission is required.' }, 403);
        const body = await request.json() as Json; const device = (state.devices as Json[]).find(item => item.id === body.deviceId);
        if (!device || !String(body.problem || body.title || '').trim()) return json({ error: 'A valid device and problem summary are required.' }, 400);
        const number = `INC-${new Date().getUTCFullYear()}-${String((state.tickets as Json[]).length + 1).padStart(4, '0')}`; const detectedDate = now();
        const problem = String(body.problem || body.title).trim(); const diagnosis = String(body.diagnosis || body.description || '').trim();
        const ticket: Json = { id: id('ticket'), ticketNumber: number, deviceId: device.id, deviceName: device.deviceName, assetId: device.assetId, issueId: body.diagnosticIssueId || body.issueId, problem, diagnosis, title: problem, description: diagnosis, severity: body.severity || 'Medium', priority: body.priority || 'Medium', status: body.assignedTechnicianName ? 'Assigned' : 'Open', assignedTechnicianName: body.assignedTechnicianName || undefined, detectedDate, notes: body.notes ? [{ id: id('note'), userId: user.id, userName: user.fullName, userRole: user.role, text: String(body.notes), createdAt: detectedDate }] : [], attachments: [], createdAt: detectedDate, updatedAt: detectedDate };
        (state.tickets as Json[]).unshift(ticket); await save(env, state); return json(ticket, 201);
      }
    }
    const ticketMatch = path.match(/^\/api\/tickets\/([^/]+)$/);
    if (ticketMatch && request.method === 'PUT') {
      if (!['super_admin', 'it_admin', 'technician'].includes(String(user.role))) return json({ error: 'Technician or administrator permission is required.' }, 403);
      const ticket = (state.tickets as Json[]).find(item => item.id === ticketMatch[1]); if (!ticket) return json({ error: 'Ticket not found.' }, 404); const body = await request.json() as Json;
      for (const field of ['status', 'priority', 'severity', 'assignedTechnicianName', 'resolution']) if (body[field] !== undefined) ticket[field] = body[field];
      if (ticket.status === 'Resolved') {
        ticket.resolvedDate ||= now(); ticket.verificationStatus = 'Pending';
        if (ticket.networkIncident === true) {
          const verification = queueNetworkTicketVerification(state, ticket, user);
          if (verification.reason) ticket.verificationBlockedReason = verification.reason;
        }
      }
      if (ticket.status === 'Closed' && ticket.verificationStatus !== 'Passed') return json({ error: 'Post-repair verification must pass before closure.' }, 409);
      ticket.updatedAt = now(); await save(env, state); return json(ticket);
    }
    const ticketResolveMatch = path.match(/^\/api\/tickets\/([^/]+)\/resolve$/);
    if (ticketResolveMatch && request.method === 'POST') {
      if (!['super_admin', 'it_admin', 'technician'].includes(String(user.role))) return json({ error: 'Technician or administrator permission is required.' }, 403);
      const ticket = (state.tickets as Json[]).find(item => item.id === ticketResolveMatch[1]); if (!ticket) return json({ error: 'Ticket not found.' }, 404); const body = await request.json() as Json;
      if (!String(body.resolution || '').trim()) return json({ error: 'Resolution notes are required.' }, 400);
      ticket.status = 'Resolved'; ticket.resolution = body.resolution; ticket.resolvedDate = now(); ticket.verificationStatus = 'Pending'; ticket.updatedAt = now();
      if (ticket.networkIncident === true) {
        const verification = queueNetworkTicketVerification(state, ticket, user);
        if (verification.reason) ticket.verificationBlockedReason = verification.reason;
      }
      if (body.createMaintenanceRecord) { const record: Json = { id: id('mnt'), recordNumber: `MNT-${new Date().getUTCFullYear()}-${String((state.maintenance as Json[]).length + 1).padStart(4, '0')}`, deviceId: ticket.deviceId, deviceName: ticket.deviceName, assetId: ticket.assetId, ticketId: ticket.id, ticketNumber: ticket.ticketNumber, date: now(), technicianId: user.id, technicianName: user.fullName, problem: ticket.problem, diagnosis: ticket.diagnosis, actionPerformed: body.actionPerformed || body.resolution, partsReplaced: body.partsReplaced || '', result: 'Resolved', notes: body.resolution, createdAt: now() }; (state.maintenance as Json[]).unshift(record); }
      await save(env, state); return json(ticket);
    }
    if (path === '/api/maintenance') {
      if (request.method === 'GET') { const deviceId = url.searchParams.get('deviceId'); return json((state.maintenance as Json[]).filter(record => !deviceId || record.deviceId === deviceId)); }
      if (request.method === 'POST') {
        if (!['super_admin', 'it_admin', 'technician'].includes(String(user.role))) return json({ error: 'Technician or administrator permission is required.' }, 403);
        const body = await request.json() as Json; const device = (state.devices as Json[]).find(item => item.id === body.deviceId); if (!device || !String(body.actionPerformed || '').trim()) return json({ error: 'A valid device and action performed are required.' }, 400);
        const record: Json = { id: id('mnt'), recordNumber: `MNT-${new Date().getUTCFullYear()}-${String((state.maintenance as Json[]).length + 1).padStart(4, '0')}`, deviceId: device.id, deviceName: device.deviceName, assetId: device.assetId, date: now(), technicianId: user.id, technicianName: body.technicianName || user.fullName, problem: body.problem || 'Preventive maintenance', diagnosis: body.diagnosis || '', actionPerformed: body.actionPerformed, partsReplaced: body.partsReplaced || '', result: body.result || 'Completed', cost: Number(body.cost || 0), notes: body.notes || '', createdAt: now() }; (state.maintenance as Json[]).unshift(record); await save(env, state); return json(record, 201);
      }
    }
    if (path === '/api/audit' && request.method === 'GET') { if (!['super_admin', 'it_admin'].includes(String(user.role))) return json({ error: 'Administrator permission is required.' }, 403); const limit = Math.min(Number(url.searchParams.get('limit') || 200), 500); return json((state.auditLogs as Json[]).slice(0, limit)); }
    return json({ error: 'Endpoint not yet migrated to the Cloudflare API.' }, 404);
    } catch (error) {
      console.error(JSON.stringify({ event: 'api_error', path: new URL(request.url).pathname, message: error instanceof Error ? error.message : String(error) }));
      if (new URL(request.url).pathname === '/api/health') {
        return json({ status: 'error', database: 'supabase', error: 'The Worker cannot connect to Supabase. Check the database migration and Cloudflare secret.', detail: error instanceof Error ? error.message : 'Unknown database error' }, 503);
      }
      return json({ error: 'The monitoring service encountered an unexpected error.' }, 500);
    }
  }
  ,async scheduled(_controller: { cron?: string }, env: Env, ctx: { waitUntil: (promise: Promise<unknown>) => void }): Promise<void> {
    ctx.waitUntil((async () => {
      const state = await load(env);
      const offlineThresholdMs = Number((state.settings as Json).offlineThresholdSec || 300) * 1000;
      let changed = false;
      for (const device of state.devices as Json[]) {
        if (device.status === 'Waiting for Agent Connection' || !device.lastHeartbeatAt) continue;
        const elapsed = Date.now() - new Date(String(device.lastHeartbeatAt)).getTime();
        if (elapsed > offlineThresholdMs && device.connectionState !== 'offline') {
          device.connectionState = 'offline'; device.status = 'Offline'; device.offlineSince = now(); changed = true;
          (state.notifications as Json[]).unshift({ id: id('notif'), title: `Device Offline: ${device.deviceName}`, message: `No agent heartbeat for ${Math.round(elapsed / 1000)} seconds.`, type: 'offline', deviceId: device.id, deviceName: device.deviceName, isRead: false, createdAt: now() });
        }
      }
      if (changed) { state.notifications = (state.notifications as Json[]).slice(0, 500); await save(env, state); }
    })());
  }
};
