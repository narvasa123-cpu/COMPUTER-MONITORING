import { Router } from 'express';
import { db } from '../db';
import { MaintenanceRecord } from '../../src/types/index';

const router = Router();

// GET all maintenance records
router.get('/', (req, res) => {
  const data = db.get();
  const { deviceId } = req.query;

  let records = [...data.maintenanceRecords];
  if (deviceId) {
    records = records.filter(r => r.deviceId === deviceId);
  }

  records.sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());
  return res.json(records);
});

// POST add manual maintenance record
router.post('/', (req, res) => {
  const { 
    deviceId, 
    ticketId, 
    technicianId, 
    technicianName, 
    problem, 
    diagnosis, 
    actionPerformed, 
    partsReplaced, 
    softwareInstalled, 
    result, 
    notes,
    date 
  } = req.body;

  if (!deviceId || !problem || !actionPerformed) {
    return res.status(400).json({ error: 'Device ID, Problem description, and Action Performed are required.' });
  }

  const data = db.get();
  const device = data.devices.find(d => d.id === deviceId);
  if (!device) {
    return res.status(404).json({ error: 'Device not found.' });
  }

  const count = data.maintenanceRecords.length + 1;
  const recordNumber = `MNT-${new Date().getFullYear()}-${String(count).padStart(4, '0')}`;

  const newRecord: MaintenanceRecord = {
    id: `mnt-${Date.now()}-${Math.random().toString(36).substring(2, 7)}`,
    recordNumber,
    deviceId: device.id,
    deviceName: device.deviceName,
    assetId: device.assetId,
    ticketId,
    date: date || new Date().toISOString(),
    technicianId: technicianId || 'tech-01',
    technicianName: technicianName || 'Hardware Technician',
    problem: problem.trim(),
    diagnosis: (diagnosis || '').trim(),
    actionPerformed: actionPerformed.trim(),
    partsReplaced: (partsReplaced || '').trim(),
    softwareInstalled: (softwareInstalled || '').trim(),
    result: result || 'Resolved',
    notes: (notes || '').trim(),
    createdAt: new Date().toISOString()
  };

  data.maintenanceRecords.unshift(newRecord);
  db.scheduleSave();

  db.addAuditLog(
    technicianId || 'system-admin',
    technicianName || 'Technician',
    'user',
    'MAINTENANCE_LOGGED',
    'Maintenance',
    newRecord.id,
    `Logged maintenance ${recordNumber} for ${device.deviceName} (${device.assetId}). Result: ${newRecord.result}`
  );

  return res.status(201).json(newRecord);
});

export default router;
