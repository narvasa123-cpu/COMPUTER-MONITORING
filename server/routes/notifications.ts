import { Router } from 'express';
import { db } from '../db';

const router = Router();

router.get('/', (req, res) => {
  const data = db.get();
  return res.json(data.notifications);
});

router.post('/:id/read', (req, res) => {
  const data = db.get();
  const notif = data.notifications.find(n => n.id === req.params.id);
  if (notif) {
    notif.isRead = true;
    db.scheduleSave();
  }
  return res.json({ success: true });
});

router.post('/read-all', (req, res) => {
  const data = db.get();
  data.notifications.forEach(n => { n.isRead = true; });
  db.scheduleSave();
  return res.json({ success: true });
});

export default router;
