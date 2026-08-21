import { Router } from 'express';
import { db, hashPassword } from '../db';
import { User, UserRole } from '../../src/types/index';

const router = Router();

// GET all users
router.get('/', (req, res) => {
  const data = db.get();
  const safeUsers = data.users.map(({ passwordHash, ...user }) => user);
  return res.json(safeUsers);
});

// POST create user
router.post('/', (req, res) => {
  const { username, email, fullName, role, password, departmentId } = req.body;

  if (!username || !email || !fullName || !role) {
    return res.status(400).json({ error: 'Username, email, full name, and role are required.' });
  }

  const data = db.get();
  const existing = data.users.find(u => u.username.toLowerCase() === username.toLowerCase() || u.email.toLowerCase() === email.toLowerCase());
  if (existing) {
    return res.status(400).json({ error: 'A user with this username or email already exists.' });
  }

  const newUser = {
    id: `user-${Date.now()}`,
    username: username.trim(),
    email: email.trim().toLowerCase(),
    fullName: fullName.trim(),
    role: role as UserRole,
    departmentId,
    passwordHash: hashPassword(password || 'admin123'),
    createdAt: new Date().toISOString()
  };

  data.users.push(newUser);
  db.scheduleSave();

  db.addAuditLog(
    'system-admin',
    'Administrator',
    'super_admin',
    'USER_CREATED',
    'User',
    newUser.id,
    `Created user account ${newUser.username} (${newUser.fullName}, Role: ${newUser.role}).`
  );

  const { passwordHash, ...safeUser } = newUser;
  return res.status(201).json(safeUser);
});

// PUT update user
router.put('/:id', (req, res) => {
  const data = db.get();
  const user = data.users.find(u => u.id === req.params.id);
  if (!user) {
    return res.status(404).json({ error: 'User not found.' });
  }

  const { email, fullName, role, password, departmentId } = req.body;
  if (email) user.email = email.trim().toLowerCase();
  if (fullName) user.fullName = fullName.trim();
  if (role) user.role = role as UserRole;
  if (departmentId !== undefined) user.departmentId = departmentId;
  if (password) user.passwordHash = hashPassword(password);

  db.scheduleSave();

  db.addAuditLog(
    'system-admin',
    'Administrator',
    'super_admin',
    'USER_UPDATED',
    'User',
    user.id,
    `Updated user profile ${user.username} (Role: ${user.role}).`
  );

  const { passwordHash, ...safeUser } = user;
  return res.json(safeUser);
});

// DELETE user
router.delete('/:id', (req, res) => {
  const data = db.get();
  if (req.params.id === 'user-superadmin-01') {
    return res.status(400).json({ error: 'Cannot delete primary root administrator account.' });
  }

  const index = data.users.findIndex(u => u.id === req.params.id);
  if (index === -1) {
    return res.status(404).json({ error: 'User not found.' });
  }

  const [removed] = data.users.splice(index, 1);
  db.scheduleSave();

  db.addAuditLog(
    'system-admin',
    'Administrator',
    'super_admin',
    'USER_DELETED',
    'User',
    removed.id,
    `Deleted user account ${removed.username}.`
  );

  return res.json({ success: true });
});

export default router;
