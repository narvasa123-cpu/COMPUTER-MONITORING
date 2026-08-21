import { Router } from 'express';
import { db } from '../db';
import { DiagnosticEngine } from '../diagnostic-engine';
import { generatePowerShellAgent, generatePythonAgent, generateNodeAgent } from '../agent-templates';
import { TelemetryPayload, TelemetrySnapshot, HardwareSpecs } from '../../src/types/index';

const router = Router();

// Helper to determine server URL from request
function getBaseUrl(req: any): string {
  const host = req.headers['x-forwarded-host'] || req.headers.host || 'localhost:3000';
  let protocol = req.headers['x-forwarded-proto'] || req.protocol || 'http';
  if (host.includes('.run.app') || host.includes('cloudrun') || req.headers['x-forwarded-proto'] === 'https') {
    protocol = 'https';
  }
  return `${protocol}://${host}`;
}

// 1. POST /api/agent/register
router.post('/register', (req, res) => {
  const body = req.body || {};
  const registrationCode = body.registrationCode || req.query.code;
  const computerName = body.computerName || body.hostname || 'PC-Host';
  const rawSpecs = body.specs || body;

  if (!registrationCode) {
    return res.status(400).json({ success: false, error: 'Registration code is required.' });
  }

  const data = db.get();
  const cleanCode = String(registrationCode).trim().toUpperCase();
  let device = data.devices.find(d => d.registrationCode && d.registrationCode.toUpperCase() === cleanCode);

  const now = new Date().toISOString();

  if (!device) {
    // Auto-provision a new device record for this computer
    const newDeviceId = `dev-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`;
    const assetId = `PC-${Math.floor(1000 + Math.random() * 9000)}`;
    const deviceToken = `tok_${Math.random().toString(36).slice(2)}${Date.now()}`;

    device = {
      id: newDeviceId,
      assetId,
      deviceName: computerName,
      deviceType: (rawSpecs.isLaptop || rawSpecs.chassisType === 'Laptop') ? 'Laptop' : 'Desktop',
      operatingSystem: rawSpecs.osName || rawSpecs.osVersion || 'Windows 11 Pro 64-bit',
      manufacturer: rawSpecs.motherboard?.split(' ')[0] || 'System OEM',
      model: rawSpecs.motherboard || 'Standard Motherboard',
      serialNumber: rawSpecs.serialNumber || `SN-${cleanCode}`,
      departmentId: data.departments[0]?.id || 'dept-cs',
      locationId: data.locations[0]?.id || 'loc-lab-101',
      assignedUser: 'Unassigned',
      notes: 'Automatically provisioned by PC Monitoring Agent',
      status: 'Online',
      connectionState: 'connected',
      registrationCode: cleanCode,
      deviceToken,
      registeredAt: now,
      lastHeartbeatAt: now,
      lastOnlineAt: now,
      activeIssueCount: 0
    };
    data.devices.unshift(device);
  } else {
    // Update existing device record
    device.deviceName = computerName || device.deviceName;
    device.lastHeartbeatAt = now;
    device.lastOnlineAt = now;
    device.connectionState = 'connected';
    device.status = 'Online';
    device.offlineSince = undefined;

    if (rawSpecs.osName || rawSpecs.osVersion) {
      device.operatingSystem = rawSpecs.osName || rawSpecs.osVersion;
    }
    if (rawSpecs.motherboard && device.manufacturer === 'Custom Build') {
      device.manufacturer = rawSpecs.motherboard.split(' ')[0];
    }
  }

  // Store hardware specs
  const fullSpecs: HardwareSpecs = {
    deviceId: device.id,
    cpuModel: rawSpecs.cpuModel || 'Multi-Core Processor',
    cpuCores: Number(rawSpecs.cpuCores) || 4,
    cpuLogicalCores: Number(rawSpecs.cpuLogicalProcessors || rawSpecs.cpuLogicalCores) || 4,
    cpuBaseSpeedGhz: Number(rawSpecs.cpuBaseSpeedGhz) || 2.8,
    ramTotalBytes: Number(rawSpecs.totalRamBytes || rawSpecs.ramTotalBytes) || 16 * (1024 ** 3),
    ramType: rawSpecs.ramType || 'DDR4 / DDR5',
    storageDevices: rawSpecs.storageDevices || rawSpecs.storage || [],
    gpuModel: rawSpecs.gpuModel || 'Integrated Graphics Display Adapter',
    gpuMemoryBytes: rawSpecs.gpuMemoryBytes || 0,
    motherboard: rawSpecs.motherboard || 'OEM Motherboard',
    biosVersion: rawSpecs.biosVersion || '1.0.0',
    systemArchitecture: rawSpecs.osArchitecture || rawSpecs.systemArchitecture || '64-bit',
    osVersion: rawSpecs.osVersion || rawSpecs.osName || device.operatingSystem,
    osBuild: String(rawSpecs.osBuild || '22631'),
    lastUpdated: now
  };
  data.hardwareSpecs[device.id] = fullSpecs;

  db.scheduleSave();

  db.addAuditLog(
    'monitoring-agent',
    computerName || device.deviceName,
    'agent',
    'AGENT_REGISTERED',
    'Agent',
    device.id,
    `PC Monitoring Agent securely registered for ${device.deviceName} (Asset: ${device.assetId}). IP: ${req.ip}. Host: ${computerName}`
  );

  db.addNotification(
    `Agent Connected: ${device.deviceName}`,
    `Physical monitoring agent connected and transmitting hardware telemetry. Device is now ONLINE.`,
    'info',
    device.id,
    device.deviceName
  );

  return res.json({
    success: true,
    token: device.deviceToken,
    deviceToken: device.deviceToken,
    deviceId: device.id,
    heartbeatIntervalSec: data.settings.heartbeatIntervalSec || 10,
    message: 'Device successfully registered and active.'
  });
});

// 2. POST /api/agent/heartbeat
router.post('/heartbeat', (req, res) => {
  const authHeader = req.headers.authorization;
  const token = authHeader?.replace('Bearer ', '') || req.body.deviceToken;
  const deviceId = req.body.deviceId;

  const data = db.get();
  const device = data.devices.find(d => (token && d.deviceToken === token) || (deviceId && d.id === deviceId));

  if (!device) {
    return res.status(401).json({ success: false, error: 'Unauthorized device token.' });
  }

  const now = new Date().toISOString();
  device.lastHeartbeatAt = now;
  device.lastOnlineAt = now;
  device.connectionState = 'connected';
  if (device.status === 'Offline' || device.status === 'Waiting for Agent Connection') {
    device.status = 'Online';
    device.offlineSince = undefined;
    DiagnosticEngine.recalculateDeviceStatus(device);
  }

  db.scheduleSave();
  return res.json({ success: true, timestamp: now });
});

// 3. POST /api/agent/telemetry
router.post('/telemetry', (req, res) => {
  const authHeader = req.headers.authorization;
  const token = authHeader?.replace('Bearer ', '') || req.body.deviceToken;
  const telemetry: TelemetryPayload = req.body;

  const data = db.get();
  const device = data.devices.find(d => (token && d.deviceToken === token) || (telemetry.deviceId && d.id === telemetry.deviceId));

  if (!device) {
    return res.status(401).json({ success: false, error: 'Unauthorized device token or device ID.' });
  }

  const now = telemetry.timestamp || new Date().toISOString();
  device.lastHeartbeatAt = now;
  device.lastOnlineAt = now;
  device.connectionState = 'connected';
  device.offlineSince = undefined;

  if (telemetry.network?.ip) {
    device.ipAddress = telemetry.network.ip;
  }
  if (telemetry.network?.mac) {
    device.macAddress = telemetry.network.mac;
  }

  // Update latest telemetry
  data.latestTelemetry[device.id] = {
    ...telemetry,
    deviceId: device.id,
    timestamp: now
  };

  // Append to historical snapshots (capped at retention limit)
  if (!data.telemetryHistory[device.id]) {
    data.telemetryHistory[device.id] = [];
  }

  const snapshot: TelemetrySnapshot = {
    timestamp: now,
    cpuUsagePercent: telemetry.cpuUsagePercent || 0,
    cpuTempC: telemetry.cpuTempC,
    ramUsagePercent: telemetry.ramUsagePercent || 0,
    networkInKbps: telemetry.network?.bytesInPerSec ? Math.round(telemetry.network.bytesInPerSec / 1024) : undefined,
    networkOutKbps: telemetry.network?.bytesOutPerSec ? Math.round(telemetry.network.bytesOutPerSec / 1024) : undefined
  };

  data.telemetryHistory[device.id].push(snapshot);
  const maxPoints = data.settings.telemetryRetentionPoints || 120;
  if (data.telemetryHistory[device.id].length > maxPoints) {
    data.telemetryHistory[device.id] = data.telemetryHistory[device.id].slice(-maxPoints);
  }

  // Trigger automated diagnostic evaluation
  DiagnosticEngine.processTelemetry(device, telemetry);

  db.scheduleSave();

  return res.json({
    success: true,
    status: device.status,
    activeIssues: device.activeIssueCount || 0
  });
});

// 4. Download agent scripts
router.get('/download/:type', (req, res) => {
  const { type } = req.params;
  const { code } = req.query;
  const serverUrl = getBaseUrl(req);
  const registrationCode = code ? String(code).trim() : '';

  if (type === 'powershell') {
    const script = generatePowerShellAgent(serverUrl, registrationCode);
    res.setHeader('Content-Type', 'text/plain; charset=utf-8');
    res.setHeader('Content-Disposition', `attachment; filename="pc-monitoring-agent.ps1"`);
    return res.send(script);
  }

  if (type === 'python') {
    const script = generatePythonAgent(serverUrl, registrationCode);
    res.setHeader('Content-Type', 'text/x-python; charset=utf-8');
    res.setHeader('Content-Disposition', `attachment; filename="pc-monitoring-agent.py"`);
    return res.send(script);
  }

  if (type === 'node') {
    const script = generateNodeAgent(serverUrl, registrationCode);
    res.setHeader('Content-Type', 'application/javascript; charset=utf-8');
    res.setHeader('Content-Disposition', `attachment; filename="pc-monitoring-agent.mjs"`);
    return res.send(script);
  }

  return res.status(400).json({ error: 'Supported types: powershell, python, node' });
});

// 5. POST /api/agent/emulator/send (Development & Testing mode runner)
router.post('/emulator/send', (req, res) => {
  const { deviceId, cpuUsage, ramUsage, diskFreePercent, cpuTemp, isCharging, batteryPercent, simulateOffline } = req.body;

  const data = db.get();
  const device = data.devices.find(d => d.id === deviceId);
  if (!device) {
    return res.status(404).json({ error: 'Device not found.' });
  }

  if (simulateOffline) {
    device.connectionState = 'offline';
    device.status = 'Offline';
    device.offlineSince = new Date().toISOString();
    DiagnosticEngine.checkHeartbeats();
    db.scheduleSave();
    return res.json({ success: true, message: `Simulated device ${device.deviceName} going offline.` });
  }

  const now = new Date().toISOString();
  const totalRam = 16 * (1024 ** 3);
  const ramPct = Number(ramUsage) || 45;
  const usedRam = Math.round((ramPct / 100) * totalRam);

  const diskFree = Number(diskFreePercent) || 35;
  const totalDisk = 512 * (1024 ** 3);
  const freeDisk = Math.round((diskFree / 100) * totalDisk);
  const usedDisk = totalDisk - freeDisk;

  const telemetry: TelemetryPayload = {
    deviceId: device.id,
    timestamp: now,
    cpuUsagePercent: Number(cpuUsage) || 25,
    cpuTempC: cpuTemp ? Number(cpuTemp) : undefined,
    ramUsedBytes: usedRam,
    ramTotalBytes: totalRam,
    ramUsagePercent: ramPct,
    storage: [
      {
        drive: 'C:',
        label: 'System SSD',
        capacityBytes: totalDisk,
        usedBytes: usedDisk,
        freeBytes: freeDisk,
        fsType: 'NTFS',
        health: diskFree < 10 ? 'Warning' : 'Healthy',
        smartStatus: 'OK',
        usagePercent: Math.round(100 - diskFree)
      },
      {
        drive: 'D:',
        label: 'Lab Data',
        capacityBytes: 1024 * (1024 ** 3),
        usedBytes: 320 * (1024 ** 3),
        freeBytes: 704 * (1024 ** 3),
        fsType: 'NTFS',
        health: 'Healthy',
        smartStatus: 'OK',
        usagePercent: 31.2
      }
    ],
    battery: device.deviceType === 'Laptop' ? {
      present: true,
      percentage: batteryPercent !== undefined ? Number(batteryPercent) : 85,
      isCharging: isCharging !== undefined ? Boolean(isCharging) : true,
      healthPercent: 94,
      timeRemainingMin: 180
    } : undefined,
    network: {
      ip: device.ipAddress || '192.168.1.145',
      mac: device.macAddress || 'A4:83:E7:22:9B:4C',
      adapterName: 'Intel Wi-Fi 6E AX211 160MHz',
      isConnected: true,
      bytesInPerSec: 142000,
      bytesOutPerSec: 58000
    },
    uptimeSeconds: 84200,
    lastBootTime: new Date(Date.now() - 84200000).toISOString(),
    processes: [
      { pid: 4892, name: cpuUsage > 80 ? 'HeavyCompileWorker.exe' : 'chrome.exe', cpuPercent: Math.max(1.5, (cpuUsage * 0.45)), memMb: 1420, user: device.assignedUser },
      { pid: 1204, name: 'Code.exe', cpuPercent: Math.max(0.8, (cpuUsage * 0.2)), memMb: 890, user: device.assignedUser },
      { pid: 884, name: 'mysqld.exe', cpuPercent: 1.4, memMb: 512, user: 'SYSTEM' },
      { pid: 612, name: 'explorer.exe', cpuPercent: 0.9, memMb: 240, user: device.assignedUser },
      { pid: 4, name: 'System', cpuPercent: 0.5, memMb: 180, user: 'SYSTEM' }
    ]
  };

  // Process as real telemetry
  device.lastHeartbeatAt = now;
  device.lastOnlineAt = now;
  device.connectionState = 'connected';
  device.offlineSince = undefined;

  data.latestTelemetry[device.id] = telemetry;

  if (!data.telemetryHistory[device.id]) {
    data.telemetryHistory[device.id] = [];
  }
  data.telemetryHistory[device.id].push({
    timestamp: now,
    cpuUsagePercent: telemetry.cpuUsagePercent,
    cpuTempC: telemetry.cpuTempC,
    ramUsagePercent: telemetry.ramUsagePercent,
    networkInKbps: 142,
    networkOutKbps: 58
  });

  if (data.telemetryHistory[device.id].length > 120) {
    data.telemetryHistory[device.id] = data.telemetryHistory[device.id].slice(-120);
  }

  DiagnosticEngine.processTelemetry(device, telemetry);
  db.scheduleSave();

  return res.json({
    success: true,
    status: device.status,
    telemetry
  });
});

export default router;
