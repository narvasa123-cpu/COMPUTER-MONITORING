import { Router } from 'express';
import { db } from '../db';
import { DiagnosticEngine } from '../diagnostic-engine';
import { RepairTicket, MaintenanceRecord } from '../../src/types/index';

const router = Router();

// GET all tickets
router.get('/', (req, res) => {
  const data = db.get();
  const { deviceId, status, severity, technicianId } = req.query;

  let tickets = [...data.repairTickets];

  if (deviceId) {
    tickets = tickets.filter(t => t.deviceId === deviceId);
  }
  if (status) {
    tickets = tickets.filter(t => t.status === status);
  }
  if (severity) {
    tickets = tickets.filter(t => t.severity === severity);
  }
  if (technicianId) {
    tickets = tickets.filter(t => t.assignedTechnicianId === technicianId);
  }

  // Sort by updatedAt descending
  tickets.sort((a, b) => new Date(b.updatedAt).getTime() - new Date(a.updatedAt).getTime());

  return res.json(tickets);
});

// GET single ticket
router.get('/:id', (req, res) => {
  const data = db.get();
  const ticket = data.repairTickets.find(t => t.id === req.params.id);
  if (!ticket) {
    return res.status(404).json({ error: 'Ticket not found.' });
  }
  return res.json(ticket);
});

// POST create ticket
router.post('/', (req, res) => {
  const { 
    deviceId, 
    issueId, 
    title, 
    severity, 
    priority, 
    description, 
    assignedTechnicianId 
  } = req.body;

  if (!deviceId || !title) {
    return res.status(400).json({ error: 'Device ID and Title are required.' });
  }

  const data = db.get();
  const device = data.devices.find(d => d.id === deviceId);
  if (!device) {
    return res.status(404).json({ error: 'Device not found.' });
  }

  const count = data.repairTickets.length + 1;
  const ticketNumber = `TKT-${new Date().getFullYear()}-${String(count).padStart(4, '0')}`;
  const tech = data.users.find(u => u.id === assignedTechnicianId);

  const newTicket: RepairTicket = {
    id: `ticket-${Date.now()}-${Math.random().toString(36).substring(2, 7)}`,
    ticketNumber,
    deviceId: device.id,
    deviceName: device.deviceName,
    assetId: device.assetId,
    issueId,
    title: title.trim(),
    severity: severity || 'Medium',
    priority: priority || 'Medium',
    description: (description || '').trim(),
    status: assignedTechnicianId ? 'Assigned' : 'Open',
    assignedTechnicianId,
    assignedTechnicianName: tech?.fullName,
    detectedDate: new Date().toISOString(),
    notes: [],
    attachments: [],
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString()
  };

  data.repairTickets.unshift(newTicket);

  if (issueId) {
    const issue = data.diagnosticIssues.find(i => i.id === issueId);
    if (issue) {
      issue.ticketId = newTicket.id;
      issue.status = 'Investigating';
    }
  }

  db.scheduleSave();

  db.addAuditLog(
    'system-admin',
    'Administrator',
    'it_admin',
    'TICKET_CREATED',
    'Ticket',
    newTicket.id,
    `Created ticket ${ticketNumber} for ${device.deviceName} (${device.assetId}). Priority: ${newTicket.priority}`
  );

  return res.status(201).json(newTicket);
});

// PUT update ticket
router.put('/:id', (req, res) => {
  const data = db.get();
  const ticket = data.repairTickets.find(t => t.id === req.params.id);
  if (!ticket) {
    return res.status(404).json({ error: 'Ticket not found.' });
  }

  const { 
    status, 
    priority, 
    severity, 
    assignedTechnicianId, 
    resolution, 
    description 
  } = req.body;

  const prevStatus = ticket.status;

  if (status) ticket.status = status;
  if (priority) ticket.priority = priority;
  if (severity) ticket.severity = severity;
  if (description) ticket.description = description;
  if (resolution !== undefined) ticket.resolution = resolution;

  if (assignedTechnicianId !== undefined) {
    ticket.assignedTechnicianId = assignedTechnicianId;
    const tech = data.users.find(u => u.id === assignedTechnicianId);
    ticket.assignedTechnicianName = tech ? tech.fullName : undefined;
    if (ticket.status === 'Open' && assignedTechnicianId) {
      ticket.status = 'Assigned';
    }
  }

  if (status === 'In Repair' && !ticket.startedDate) {
    ticket.startedDate = new Date().toISOString();
  }
  if (status === 'Resolved' && !ticket.resolvedDate) {
    ticket.resolvedDate = new Date().toISOString();
  }
  if (status === 'Closed' && !ticket.closedDate) {
    ticket.closedDate = new Date().toISOString();
  }

  ticket.updatedAt = new Date().toISOString();

  // If ticket is resolved, also check if linked issue should be resolved
  if (status === 'Resolved' && ticket.issueId) {
    const issue = data.diagnosticIssues.find(i => i.id === ticket.issueId);
    if (issue && issue.status !== 'Resolved') {
      issue.status = 'Resolved';
      issue.resolvedAt = new Date().toISOString();
    }
  }

  db.scheduleSave();

  db.addAuditLog(
    'system-admin',
    'Administrator',
    'it_admin',
    'TICKET_UPDATED',
    'Ticket',
    ticket.id,
    `Updated ticket ${ticket.ticketNumber}. Status changed: ${prevStatus} -> ${ticket.status}. Assigned: ${ticket.assignedTechnicianName || 'None'}`
  );

  return res.json(ticket);
});

// POST add note to ticket
router.post('/:id/notes', (req, res) => {
  const data = db.get();
  const ticket = data.repairTickets.find(t => t.id === req.params.id);
  if (!ticket) {
    return res.status(404).json({ error: 'Ticket not found.' });
  }

  const { text, userName, userRole } = req.body;
  if (!text) {
    return res.status(400).json({ error: 'Note text is required.' });
  }

  const newNote = {
    id: `note-${Date.now()}`,
    userId: req.body.userId || 'admin',
    userName: userName || 'Technician',
    userRole: userRole || 'technician',
    text: text.trim(),
    createdAt: new Date().toISOString()
  };

  ticket.notes.push(newNote);
  ticket.updatedAt = new Date().toISOString();

  db.scheduleSave();
  return res.status(201).json(ticket);
});

// POST resolve ticket and log maintenance in one unified step
router.post('/:id/resolve-and-log', (req, res) => {
  const data = db.get();
  const ticket = data.repairTickets.find(t => t.id === req.params.id);
  if (!ticket) {
    return res.status(404).json({ error: 'Ticket not found.' });
  }

  const { 
    diagnosis, 
    actionPerformed, 
    partsReplaced, 
    softwareInstalled, 
    result, 
    notes,
    technicianName 
  } = req.body;

  const now = new Date().toISOString();
  ticket.status = 'Resolved';
  ticket.resolvedDate = now;
  ticket.resolution = actionPerformed || 'Maintenance completed successfully.';
  ticket.updatedAt = now;

  // Resolve linked issue if present
  if (ticket.issueId) {
    const issue = data.diagnosticIssues.find(i => i.id === ticket.issueId);
    if (issue) {
      issue.status = 'Resolved';
      issue.resolvedAt = now;
    }
  }

  // Create Maintenance Record
  const count = data.maintenanceRecords.length + 1;
  const recordNumber = `MNT-${new Date().getFullYear()}-${String(count).padStart(4, '0')}`;

  const maintenance: MaintenanceRecord = {
    id: `mnt-${Date.now()}-${Math.random().toString(36).substring(2, 7)}`,
    recordNumber,
    deviceId: ticket.deviceId,
    deviceName: ticket.deviceName,
    assetId: ticket.assetId,
    ticketId: ticket.id,
    ticketNumber: ticket.ticketNumber,
    date: now,
    technicianId: ticket.assignedTechnicianId || 'tech-01',
    technicianName: technicianName || ticket.assignedTechnicianName || 'Hardware Specialist',
    problem: ticket.title,
    diagnosis: diagnosis || ticket.description,
    actionPerformed: actionPerformed || 'Diagnostic troubleshooting and hardware optimization.',
    partsReplaced: partsReplaced || '',
    softwareInstalled: softwareInstalled || '',
    result: result || 'Resolved',
    notes: notes || '',
    createdAt: now
  };

  data.maintenanceRecords.unshift(maintenance);

  // Recalculate device status
  const device = data.devices.find(d => d.id === ticket.deviceId);
  if (device) {
    DiagnosticEngine.recalculateDeviceStatus(device);
  }

  db.scheduleSave();

  db.addAuditLog(
    'system-admin',
    technicianName || 'Technician',
    'technician',
    'TICKET_RESOLVED_MAINTENANCE_LOGGED',
    'Maintenance',
    maintenance.id,
    `Resolved ticket ${ticket.ticketNumber} and saved maintenance record ${recordNumber} for ${ticket.deviceName}.`
  );

  return res.json({
    ticket,
    maintenance
  });
});

export default router;
