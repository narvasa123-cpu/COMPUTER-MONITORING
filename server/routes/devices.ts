import { Router } from 'express';
import { db } from '../db';
import { DiagnosticEngine } from '../diagnostic-engine';
import { Device, HardwareSpecs } from '../../src/types/index';
import crypto from 'crypto';
import { calculateDeviceHealth } from '../health';
import { permanentlyPurgeDeviceData } from '../../src/lib/device-purge';

const router = Router();

function generateRegistrationCode(): string {
  const segment1 = Math.random().toString(36).substring(2, 6).toUpperCase();
  const segment2 = Math.random().toString(36).substring(2, 6).toUpperCase();
  return `REG-${segment1}-${segment2}`;
}

// GET all devices with active counts and latest telemetry
router.get('/', (req, res) => {
  const data = db.get();
  const { departmentId, locationId, status, search, deviceType } = req.query;

  let devices = data.devices.map(device => {
    const specs = data.hardwareSpecs[device.id];
    const latestTelemetry = data.latestTelemetry[device.id];
    const activeIssues = data.diagnosticIssues.filter(i => i.deviceId === device.id && i.status === 'Active');
    const openTickets = data.repairTickets.filter(t => t.deviceId === device.id && (t.status === 'Open' || t.status === 'Assigned' || t.status === 'Diagnosing' || t.status === 'In Repair'));

    const maintenance = data.maintenanceRecords.filter(m => m.deviceId === device.id);
    return {
      ...device,
      specs,
      latestTelemetry,
      activeIssueCount: activeIssues.length,
      openTicketCount: openTickets.length
      ,health: calculateDeviceHealth(device, latestTelemetry, data.diagnosticIssues.filter(i => i.deviceId === device.id), maintenance)
    };
  });

  if (departmentId) {
    devices = devices.filter(d => d.departmentId === departmentId);
  }
  if (locationId) {
    devices = devices.filter(d => d.locationId === locationId);
  }
  if (status) {
    devices = devices.filter(d => d.status === status);
  }
  if (deviceType) {
    devices = devices.filter(d => d.deviceType === deviceType);
  }
  if (search) {
    const q = String(search).toLowerCase();
    devices = devices.filter(d => 
      d.deviceName.toLowerCase().includes(q) ||
      d.assetId.toLowerCase().includes(q) ||
      d.assignedUser.toLowerCase().includes(q) ||
      d.serialNumber.toLowerCase().includes(q) ||
      (d.ipAddress && d.ipAddress.includes(q))
    );
  }

  // Sort: Critical & Warning first, then Online, then Waiting, then Offline
  const statusWeight: Record<string, number> = {
    'Critical': 1,
    'Warning': 2,
    'Online': 3,
    'Maintenance': 4,
    'Waiting for Agent Connection': 5,
    'Offline': 6
  };

  devices.sort((a, b) => (statusWeight[a.status] || 99) - (statusWeight[b.status] || 99));

  return res.json(devices);
});

// GET single device details
router.get('/:id', (req, res) => {
  const data = db.get();
  const device = data.devices.find(d => d.id === req.params.id);
  if (!device) {
    return res.status(404).json({ error: 'Device not found.' });
  }

  const specs = data.hardwareSpecs[device.id];
  const latestTelemetry = data.latestTelemetry[device.id];
  const history = data.telemetryHistory[device.id] || [];
  const issues = data.diagnosticIssues.filter(i => i.deviceId === device.id);
  const tickets = data.repairTickets.filter(t => t.deviceId === device.id);
  const maintenance = data.maintenanceRecords.filter(m => m.deviceId === device.id);
  const location = data.locations.find(l => l.id === device.locationId);
  const department = data.departments.find(d => d.id === device.departmentId);

  return res.json({
    ...device,
    specs,
    latestTelemetry,
    history,
    issues,
    tickets,
    maintenance,
    location,
    department
    ,health: calculateDeviceHealth(device, latestTelemetry, issues, maintenance)
  });
});

// POST register a new computer (generates registration code)
router.post('/', (req, res) => {
  const { 
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
  } = req.body;

  if (!deviceName || !assetId) {
    return res.status(400).json({ error: 'Device name and Asset ID are required.' });
  }

  const data = db.get();
  const existingAsset = data.devices.find(d => d.assetId.toLowerCase() === assetId.toLowerCase());
  if (existingAsset) {
    return res.status(400).json({ error: `A device with Asset ID "${assetId}" is already registered.` });
  }

  const registrationCode = generateRegistrationCode();
  const deviceToken = `devtok_${crypto.randomBytes(24).toString('hex')}`;
  const deviceId = `dev-${Date.now()}-${Math.random().toString(36).substring(2, 6)}`;

  const newDevice: Device = {
    id: deviceId,
    registrationCode,
    deviceToken,
    deviceName: deviceName.trim(),
    assetId: assetId.trim(),
    deviceType: deviceType || 'Desktop',
    assignedUser: (assignedUser || 'Unassigned').trim(),
    departmentId: departmentId || (data.departments[0]?.id || ''),
    locationId: locationId || (data.locations[0]?.id || ''),
    manufacturer: (manufacturer || 'Custom Build').trim(),
    model: (model || 'Standard Workstation').trim(),
    serialNumber: (serialNumber || `SN-${Date.now()}`).trim(),
    operatingSystem: operatingSystem || 'Windows 11 Pro (64-bit)',
    purchaseDate: purchaseDate || new Date().toISOString().split('T')[0],
    warrantyExpiration: warrantyExpiration || '',
    status: 'Waiting for Agent Connection',
    connectionState: 'never_connected',
    notes: (notes || '').trim(),
    registeredAt: new Date().toISOString()
  };

  data.devices.unshift(newDevice);
  db.scheduleSave();

  db.addAuditLog(
    'system-admin',
    'Administrator',
    'it_admin',
    'DEVICE_REGISTERED',
    'Device',
    newDevice.id,
    `Registered new device ${newDevice.deviceName} (Asset: ${newDevice.assetId}). Generated registration code ${registrationCode}.`
  );

  db.addNotification(
    `Device Added: ${newDevice.deviceName}`,
    `Device registered. Install the PC Monitoring Agent and enter registration code ${registrationCode} to connect.`,
    'info',
    newDevice.id,
    newDevice.deviceName
  );

  return res.status(201).json(newDevice);
});

// PUT update device metadata
router.put('/:id', (req, res) => {
  const data = db.get();
  const device = data.devices.find(d => d.id === req.params.id);
  if (!device) {
    return res.status(404).json({ error: 'Device not found.' });
  }

  const { 
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
    status,
    notes 
  } = req.body;

  if (deviceName) device.deviceName = deviceName.trim();
  if (assetId) device.assetId = assetId.trim();
  if (deviceType) device.deviceType = deviceType;
  if (assignedUser !== undefined) device.assignedUser = assignedUser.trim();
  if (departmentId) device.departmentId = departmentId;
  if (locationId) device.locationId = locationId;
  if (manufacturer) device.manufacturer = manufacturer.trim();
  if (model) device.model = model.trim();
  if (serialNumber) device.serialNumber = serialNumber.trim();
  if (operatingSystem) device.operatingSystem = operatingSystem;
  if (purchaseDate !== undefined) device.purchaseDate = purchaseDate;
  if (warrantyExpiration !== undefined) device.warrantyExpiration = warrantyExpiration;
  if (notes !== undefined) device.notes = notes;

  if (status && (status === 'Maintenance' || (device.status === 'Maintenance' && status !== 'Maintenance'))) {
    device.status = status;
    if (status !== 'Maintenance') {
      DiagnosticEngine.recalculateDeviceStatus(device);
    }
  }

  db.scheduleSave();

  db.addAuditLog(
    'system-admin',
    'Administrator',
    'it_admin',
    'DEVICE_UPDATED',
    'Device',
    device.id,
    `Updated settings for device ${device.deviceName} (${device.assetId}).`
  );

  return res.json(device);
});

// DELETE device
router.delete('/:id', (req, res) => {
  const data = db.get();
  const device = data.devices.find(d => d.id === req.params.id);
  if (!device) {
    return res.status(404).json({ error: 'Device not found.' });
  }
  if (req.body?.permanentlyDelete !== true || String(req.body?.confirmAssetId || '').trim() !== String(device.assetId || '').trim()) {
    return res.status(400).json({ error: 'Permanent deletion requires the exact Asset ID confirmation.' });
  }

  // The local backend uses different collection names than the Worker. Present
  // a normalized view to the shared, tested permanent-purge operation.
  const localState = data as unknown as Record<string, unknown>;
  localState.issues = data.diagnosticIssues;
  localState.tickets = data.repairTickets;
  localState.maintenance = data.maintenanceRecords;
  const purged = permanentlyPurgeDeviceData(localState, device.id);
  data.diagnosticIssues = (localState.issues || []) as typeof data.diagnosticIssues;
  data.repairTickets = (localState.tickets || []) as typeof data.repairTickets;
  data.maintenanceRecords = (localState.maintenance || []) as typeof data.maintenanceRecords;
  delete localState.issues;
  delete localState.tickets;
  delete localState.maintenance;
  if (!purged) return res.status(404).json({ error: 'Device not found.' });

  db.scheduleSave();
  return res.json({ success: true, permanentlyDeleted: true, deletedDeviceId: purged.deviceId, deletionSummary: purged.summary });
});

// GET telemetry history
router.get('/:id/telemetry/history', (req, res) => {
  const data = db.get();
  const history = data.telemetryHistory[req.params.id] || [];
  return res.json(history);
});

// POST regenerate registration code
router.post('/:id/regenerate-token', (req, res) => {
  const data = db.get();
  const device = data.devices.find(d => d.id === req.params.id);
  if (!device) {
    return res.status(404).json({ error: 'Device not found.' });
  }

  device.registrationCode = generateRegistrationCode();
  device.deviceToken = `devtok_${crypto.randomBytes(24).toString('hex')}`;
  db.scheduleSave();

  return res.json({
    registrationCode: device.registrationCode,
    deviceToken: device.deviceToken
  });
});

export default router;
