import { Router } from 'express';
import { db } from '../db';
import { SystemSettings } from '../../src/types/index';

const router = Router();

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

  if (heartbeatIntervalSec !== undefined) data.settings.heartbeatIntervalSec = Number(heartbeatIntervalSec);
  if (connectionLostThresholdSec !== undefined) data.settings.connectionLostThresholdSec = Number(connectionLostThresholdSec);
  if (offlineThresholdSec !== undefined) data.settings.offlineThresholdSec = Number(offlineThresholdSec);
  if (telemetryRetentionPoints !== undefined) data.settings.telemetryRetentionPoints = Number(telemetryRetentionPoints);
  if (autoCreateTicketOnCritical !== undefined) data.settings.autoCreateTicketOnCritical = Boolean(autoCreateTicketOnCritical);
  if (enableSoundAlerts !== undefined) data.settings.enableSoundAlerts = Boolean(enableSoundAlerts);

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
