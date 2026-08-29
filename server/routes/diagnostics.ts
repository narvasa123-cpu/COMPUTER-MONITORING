import { Router } from 'express';
import { db } from '../db';
import { DiagnosticEngine } from '../diagnostic-engine';
import { DiagnosticIssue, DiagnosticRule, RepairTicket } from '../../src/types/index';

const router = Router();

// GET all diagnostic issues
router.get('/issues', (req, res) => {
  const data = db.get();
  const { deviceId, status, severity } = req.query;

  let issues = [...data.diagnosticIssues];

  if (deviceId) {
    issues = issues.filter(i => i.deviceId === deviceId);
  }
  if (status) {
    issues = issues.filter(i => i.status === status);
  }
  if (severity) {
    issues = issues.filter(i => i.severity === severity);
  }

  // Sort active first, then newest
  issues.sort((a, b) => {
    if (a.status === 'Active' && b.status !== 'Active') return -1;
    if (a.status !== 'Active' && b.status === 'Active') return 1;
    return new Date(b.detectedAt).getTime() - new Date(a.detectedAt).getTime();
  });

  return res.json(issues);
});

// GET diagnostic rules
router.get('/rules', (req, res) => {
  const data = db.get();
  return res.json(data.diagnosticRules);
});

// PUT update diagnostic rule threshold or configuration
router.put('/rules/:id', (req, res) => {
  const data = db.get();
  const rule = data.diagnosticRules.find(r => r.id === req.params.id);
  if (!rule) {
    return res.status(404).json({ error: 'Diagnostic rule not found.' });
  }

  const { thresholdValue, durationSeconds, severity, enabled, description } = req.body;
  if (thresholdValue !== undefined) rule.thresholdValue = Number(thresholdValue);
  if (durationSeconds !== undefined) rule.durationSeconds = Number(durationSeconds);
  if (severity !== undefined) rule.severity = severity;
  if (enabled !== undefined) rule.enabled = Boolean(enabled);
  if (description !== undefined) rule.description = description;

  db.scheduleSave();

  db.addAuditLog(
    'system-admin',
    'Administrator',
    'user',
    'RULE_UPDATED',
    'Settings',
    rule.id,
    `Updated diagnostic rule "${rule.name}" (Threshold: ${rule.thresholdValue} ${rule.thresholdUnit}, Severity: ${rule.severity}, Enabled: ${rule.enabled})`
  );

  return res.json(rule);
});

// POST acknowledge or change status of issue
router.post('/issues/:id/status', (req, res) => {
  const { status } = req.body;
  const data = db.get();
  const issue = data.diagnosticIssues.find(i => i.id === req.params.id);
  if (!issue) {
    return res.status(404).json({ error: 'Issue not found.' });
  }

  issue.status = status;
  if (status === 'Resolved') {
    issue.resolvedAt = new Date().toISOString();
  }

  // Recalculate device status
  const device = data.devices.find(d => d.id === issue.deviceId);
  if (device) {
    DiagnosticEngine.recalculateDeviceStatus(device);
  }

  db.scheduleSave();
  return res.json(issue);
});

// POST create a repair ticket from a diagnostic issue
router.post('/issues/:id/create-ticket', (req, res) => {
  const data = db.get();
  const issue = data.diagnosticIssues.find(i => i.id === req.params.id);
  if (!issue) {
    return res.status(404).json({ error: 'Issue not found.' });
  }

  const device = data.devices.find(d => d.id === issue.deviceId);
  if (!device) {
    return res.status(404).json({ error: 'Associated device not found.' });
  }

  const { assignedTechnicianId, priority, notes } = req.body;
  const count = data.repairTickets.length + 1;
  const ticketNumber = `TKT-${new Date().getFullYear()}-${String(count).padStart(4, '0')}`;

  const tech = data.users.find(u => u.id === assignedTechnicianId);

  const newTicket: RepairTicket = {
    id: `ticket-${Date.now()}-${Math.random().toString(36).substring(2, 7)}`,
    ticketNumber,
    deviceId: device.id,
    deviceName: device.deviceName,
    assetId: device.assetId,
    issueId: issue.id,
    title: req.body.title || `Remediation for ${issue.title}`,
    severity: issue.severity,
    priority: priority || (issue.severity === 'Critical' ? 'Urgent' : 'High'),
    description: req.body.description || `Diagnostic finding: ${issue.evidence.details}\nEvidence Metric: ${issue.evidence.currentValue}\nRecommended Action:\n- ${issue.recommendedActions.join('\n- ')}`,
    status: assignedTechnicianId ? 'Assigned' : 'Open',
    assignedTechnicianId,
    assignedTechnicianName: tech?.fullName,
    detectedDate: issue.detectedAt,
    notes: notes ? [
      {
        id: `note-${Date.now()}`,
        userId: 'admin',
        userName: 'IT Administrator',
        userRole: 'user',
        text: notes,
        createdAt: new Date().toISOString()
      }
    ] : [],
    attachments: [],
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString()
  };

  data.repairTickets.unshift(newTicket);
  issue.ticketId = newTicket.id;
  issue.status = 'Investigating';

  db.scheduleSave();

  db.addAuditLog(
    'system-admin',
    'Administrator',
    'user',
    'TICKET_CREATED_FROM_ISSUE',
    'Ticket',
    newTicket.id,
    `Created ticket ${ticketNumber} from diagnostic issue ${issue.title}.`
  );

  return res.status(201).json(newTicket);
});

export default router;
