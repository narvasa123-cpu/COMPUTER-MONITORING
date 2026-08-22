import { generateNodeAgent, generatePowerShellAgent, generatePythonAgent } from '../server/agent-templates';

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
  if (rows[0]) return rows[0].data;
  const state = {
    users: [{ id: 'user-superadmin-01', username: 'admin', email: 'admin@system.local', fullName: 'IT Chief Administrator', role: 'super_admin', passwordHash: await hash('admin123'), createdAt: now() }],
    devices: [], notifications: [], telemetry: {}, sessions: {},
    departments: [], locations: [], tickets: [], issues: []
  };
  await save(env, state);
  return state;
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
  return (state.users as Json[]).find(user => user.id === session.userId) || null;
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
  const count = (status: string) => devices.filter(device => device.status === status).length;
  return {
    totalDevices: devices.length, onlineDevices: count('Online'), offlineDevices: count('Offline'), warningDevices: count('Warning'),
    criticalDevices: count('Critical'), maintenanceDevices: count('Maintenance'), waitingDevices: count('Waiting for Agent Connection'),
    openTickets: 0, resolvedTickets: 0, activeIssues: 0, criticalIssues: 0, devicesWithLowStorage: 0,
    devicesWithHighCpu: 0, devicesWithHighMemory: 0, devicesWithHighTemp: 0,
    statusDistribution: ['Online', 'Warning', 'Critical', 'Offline', 'Maintenance'].map(status => ({ status, count: count(status) })),
    problemsByType: [], problemsBySeverity: [], recentAlerts: (state.notifications as Json[]).slice(0, 10), recentTickets: []
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
      if (!device) return json({ success: false, error: 'The registration code is invalid.' }, 401);
      const timestamp = now();
      const deviceToken = String(device.deviceToken || `devtok_${crypto.randomUUID().replaceAll('-', '')}`);
      Object.assign(device, {
        deviceName: body.computerName || body.hostname || device.deviceName,
        deviceToken, status: 'Online', connectionState: 'connected',
        lastHeartbeatAt: timestamp, lastOnlineAt: timestamp, offlineSince: undefined,
        operatingSystem: body.osName || body.osVersion || device.operatingSystem
      });
      await save(env, state);
      return json({ success: true, token: deviceToken, deviceToken, deviceId: device.id, heartbeatIntervalSec: 10, message: 'Device successfully registered and active.' });
    }

    if ((path === '/api/agent/heartbeat' || path === '/api/agent/telemetry') && request.method === 'POST') {
      const body = await request.json() as Json;
      const deviceToken = request.headers.get('Authorization')?.replace(/^Bearer\s+/i, '') || String(body.deviceToken || '');
      const device = (state.devices as Json[]).find(item => item.deviceToken === deviceToken || (body.deviceId && item.id === body.deviceId));
      if (!device) return json({ success: false, error: 'Unauthorized device token.' }, 401);
      const timestamp = String(body.timestamp || now());
      Object.assign(device, { status: 'Online', connectionState: 'connected', lastHeartbeatAt: timestamp, lastOnlineAt: timestamp, offlineSince: undefined });
      if (path.endsWith('/telemetry')) {
        const telemetry = (state.telemetry as Record<string, Json>) || {};
        const latestTelemetry: Json = { ...body, deviceId: device.id, timestamp };
        telemetry[String(device.id)] = latestTelemetry;
        // The dashboard reads the current snapshot from each device record.
        device.latestTelemetry = latestTelemetry;
        state.telemetry = telemetry;
        if (body.network && typeof body.network === 'object') {
          const network = body.network as Json;
          device.ipAddress = network.ip || device.ipAddress;
          device.macAddress = network.mac || device.macAddress;
        }
      }
      await save(env, state);
      return json({ success: true, timestamp, status: device.status, activeIssues: Number(device.activeIssueCount || 0) });
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
      const command = commands.find(item => item.deviceId === deviceId && item.status === 'queued' && Number(item.expiresAt || 0) > Date.now());
      if (!command) return json({ command: null });
      command.status = 'dispatched';
      command.dispatchedAt = now();
      await save(env, state);
      return json({ command });
    }

    if (path === '/api/auth/login' && request.method === 'POST') {
      const body = await request.json() as Json;
      const account = (state.users as Json[]).find(user => user.username === body.username || user.email === body.username);
      if (!account || account.passwordHash !== await hash(String(body.password || ''))) return json({ error: 'Invalid username or password.' }, 401);
      const sessionToken = `sess_${crypto.randomUUID().replaceAll('-', '')}`;
      (state.sessions as Record<string, Json>)[sessionToken] = { userId: String(account.id), expiresAt: Date.now() + 86400000 };
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
    if (path === '/api/devices' && request.method === 'GET') return json(state.devices);
    const deviceMatch = path.match(/^\/api\/devices\/([^/]+)$/);
    if (deviceMatch && request.method === 'GET') {
      const device = (state.devices as Json[]).find(item => item.id === deviceMatch[1]);
      return device ? json(device) : json({ error: 'Device not found.' }, 404);
    }
    if (deviceMatch && request.method === 'DELETE') {
      const devices = state.devices as Json[];
      const index = devices.findIndex(item => item.id === deviceMatch[1]);
      if (index < 0) return json({ error: 'Device not found.' }, 404);
      const [deleted] = devices.splice(index, 1);
      const telemetry = state.telemetry as Record<string, Json> | undefined;
      if (telemetry) delete telemetry[String(deleted.id)];
      await save(env, state);
      return json({ success: true, deletedDeviceId: deleted.id });
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
      const body = await request.json() as Json;
      if (!body.deviceName || !body.assetId) return json({ error: 'Device name and Asset ID are required.' }, 400);
      const devices = state.devices as Json[];
      if (devices.some(device => String(device.assetId).toLowerCase() === String(body.assetId).toLowerCase())) return json({ error: 'Asset ID is already registered.' }, 409);
      const device: Json = { ...body, id: id('dev'), registrationCode: `REG-${crypto.randomUUID().slice(0, 8).toUpperCase()}`, deviceToken: `devtok_${crypto.randomUUID().replaceAll('-', '')}`, deviceType: body.deviceType || 'Desktop', assignedUser: body.assignedUser || 'Unassigned', status: 'Waiting for Agent Connection', connectionState: 'never_connected', registeredAt: now() };
      devices.unshift(device); (state.notifications as Json[]).unshift({ id: id('notif'), title: `Device Added: ${device.deviceName}`, message: 'Install the monitoring agent to start telemetry.', type: 'info', deviceId: device.id, deviceName: device.deviceName, isRead: false, createdAt: now() });
      await save(env, state); return json(device, 201);
    }
    if (path === '/api/notifications' && request.method === 'GET') return json(state.notifications);
    if (path === '/api/notifications/read-all' && request.method === 'POST') { (state.notifications as Json[]).forEach(notification => notification.isRead = true); await save(env, state); return json({ success: true }); }
    const readMatch = path.match(/^\/api\/notifications\/([^/]+)\/read$/);
    if (readMatch && request.method === 'POST') { const notification = (state.notifications as Json[]).find(item => item.id === readMatch[1]); if (notification) notification.isRead = true; await save(env, state); return json({ success: true }); }
    if (path === '/api/org/departments' || path === '/api/org/locations') return json(path.endsWith('departments') ? state.departments : state.locations);
    if (['/api/tickets', '/api/diagnostics/issues', '/api/maintenance', '/api/users', '/api/audit'].includes(path)) return json([]);
    return json({ error: 'Endpoint not yet migrated to the Cloudflare API.' }, 404);
    } catch (error) {
      console.error(JSON.stringify({ event: 'api_error', path: new URL(request.url).pathname, message: error instanceof Error ? error.message : String(error) }));
      if (new URL(request.url).pathname === '/api/health') {
        return json({ status: 'error', database: 'supabase', error: 'The Worker cannot connect to Supabase. Check the database migration and Cloudflare secret.', detail: error instanceof Error ? error.message : 'Unknown database error' }, 503);
      }
      return json({ error: 'The monitoring service encountered an unexpected error.' }, 500);
    }
  }
};
