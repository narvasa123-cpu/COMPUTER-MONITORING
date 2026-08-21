interface Env { DB: D1Database }
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

async function load(env: Env): Promise<Json> {
  const row = await env.DB.prepare('SELECT data FROM monitoring_state WHERE id = 1').first<{ data: string }>();
  if (row) return JSON.parse(row.data);
  const state = {
    users: [{ id: 'user-superadmin-01', username: 'admin', email: 'admin@system.local', fullName: 'IT Chief Administrator', role: 'super_admin', passwordHash: await hash('admin123'), createdAt: now() }],
    devices: [], notifications: [], telemetry: {}, sessions: {},
    departments: [], locations: [], tickets: [], issues: []
  };
  await save(env, state);
  return state;
}

async function save(env: Env, state: Json) {
  await env.DB.prepare('INSERT INTO monitoring_state (id, data, updated_at) VALUES (1, ?, ?) ON CONFLICT(id) DO UPDATE SET data = excluded.data, updated_at = excluded.updated_at')
    .bind(JSON.stringify(state), now()).run();
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
    if (request.method === 'OPTIONS') return new Response(null, { headers: cors });
    const url = new URL(request.url);
    const path = url.pathname;
    if (path === '/api/health') return json({ status: 'ok', time: now(), runtime: 'cloudflare-workers' });
    const state = await load(env);

    if (path === '/api/auth/login' && request.method === 'POST') {
      const body = await request.json<Json>();
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
    if (path === '/api/devices' && request.method === 'POST') {
      const body = await request.json<Json>();
      if (!body.deviceName || !body.assetId) return json({ error: 'Device name and Asset ID are required.' }, 400);
      const devices = state.devices as Json[];
      if (devices.some(device => String(device.assetId).toLowerCase() === String(body.assetId).toLowerCase())) return json({ error: 'Asset ID is already registered.' }, 409);
      const device = { ...body, id: id('dev'), registrationCode: `REG-${crypto.randomUUID().slice(0, 8).toUpperCase()}`, deviceToken: `devtok_${crypto.randomUUID().replaceAll('-', '')}`, deviceType: body.deviceType || 'Desktop', assignedUser: body.assignedUser || 'Unassigned', status: 'Waiting for Agent Connection', connectionState: 'never_connected', registeredAt: now() };
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
  }
};
