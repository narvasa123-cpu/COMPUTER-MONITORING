import { Router } from 'express';
import { db } from '../db';

const router = Router();

router.get('/', (req, res) => {
  const data = db.get();
  const { entityType, entityId, limit } = req.query;

  let logs = [...data.auditLogs];
  if (entityType) {
    logs = logs.filter(l => l.entityType === entityType);
  }
  if (entityId) {
    logs = logs.filter(l => l.entityId === entityId);
  }

  const max = limit ? Number(limit) : 200;
  return res.json(logs.slice(0, max));
});

export default router;
