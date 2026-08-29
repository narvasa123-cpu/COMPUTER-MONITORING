import { Router } from 'express';
import { db } from '../db';
import { SystemSettings } from '../../src/types/index';

const router = Router();

const numericLimits: Record<string, [number, number]> = {
  heartbeatIntervalSec: [2, 300],
  connectionLostThresholdSec: [5, 3600],
  offlineThresholdSec: [10, 86400],
  telemetryRetentionPoints: [20, 10000],
  networkHistoryRetentionPoints: [20, 10000],
  networkDiagnosticIntervalSec: [10, 3600],
  networkWeakSignalThresholdPercent: [1, 100],
  networkHighLatencyMs: [1, 10000],
  networkPacketLossThresholdPercent: [1, 100],
  networkIncidentCooldownSec: [30, 86400]
};

router.get('/', (req, res) => {
  const data = db.get();
  return res.json(data.settings);
});

router.put('/', (req, res) => {
  const data = db.get();
  const { 
    heartbeatIntervalSec, 
    connectionLostThresholdSec, 
    offlineThresholdSec, 
    telemetryRetentionPoints, 
    autoCreateTicketOnCritical, 
    enableSoundAlerts 
  } = req.body;

  for (const [field, [minimum, maximum]] of Object.entries(numericLimits)) {
    if (req.body[field] === undefined) continue;
    const value = Number(req.body[field]);
    if (!Number.isFinite(value) || value < minimum || value > maximum) {
      return res.status(400).json({ error: `${field} must be between ${minimum} and ${maximum}.` });
    }
    (data.settings as unknown as Record<string, number>)[field] = value;
  }
  if (data.settings.connectionLostThresholdSec < data.settings.heartbeatIntervalSec) {
    return res.status(400).json({ error: 'Connection-lost threshold must be at least the heartbeat interval.' });
  }
  if (data.settings.offlineThresholdSec <= data.settings.connectionLostThresholdSec) {
    return res.status(400).json({ error: 'Offline threshold must be greater than the connection-lost threshold.' });
  }
  if (autoCreateTicketOnCritical !== undefined) data.settings.autoCreateTicketOnCritical = autoCreateTicketOnCritical === true;
  if (enableSoundAlerts !== undefined) data.settings.enableSoundAlerts = enableSoundAlerts === true;

  db.scheduleSave();

  db.addAuditLog(
    'system-admin',
    'Administrator',
    'super_admin',
    'SETTINGS_UPDATED',
    'Settings',
    'global_settings',
    `Updated monitoring thresholds: Heartbeat ${data.settings.heartbeatIntervalSec}s, Offline timeout ${data.settings.offlineThresholdSec}s.`
  );

  return res.json(data.settings);
});

export default router;
