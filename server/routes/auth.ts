import { NextFunction, Request, Response, Router } from 'express';
import { db, hashPassword } from '../db';
import crypto from 'crypto';
import { UserRole } from '../../src/types/index';

const router = Router();

// In-memory token session mapping for API security
const activeSessions: Record<string, { userId: string; expiresAt: number }> = {};

export function verifySession(token: string | undefined) {
  if (!token) return null;
  const session = activeSessions[token];
  if (!session) {
    return null;
  }
  if (Date.now() > session.expiresAt) {
    delete activeSessions[token];
    return null;
  }
  const data = db.get();
  return data.users.find(u => u.id === session.userId) || null;
}

export function requireSession(req: Request, res: Response, next: NextFunction) {
  const authHeader = req.headers.authorization;
  const token = authHeader?.startsWith('Bearer ') ? authHeader.slice(7) : undefined;
  const user = verifySession(token);
  if (!user) return res.status(401).json({ error: 'Authentication is required.' });
  res.locals.user = user;
  next();
}

/** Server-side authorization. UI visibility is never treated as access control. */
export function requireRoles(...roles: UserRole[]) {
  return (req: Request, res: Response, next: NextFunction) => {
    const user = res.locals.user;
    if (!user || !roles.includes(user.role)) {
      return res.status(403).json({ error: 'Your role is not permitted to perform this action.' });
    }
    next();
  };
}

router.post('/login', (req, res) => {
  const { username, password } = req.body;
  if (!username || !password) {
    return res.status(400).json({ error: 'Username and password are required.' });
  }

  const data = db.get();
  const user = data.users.find(u => u.username.toLowerCase() === username.toLowerCase() || u.email.toLowerCase() === username.toLowerCase());

  if (!user) {
    return res.status(401).json({ error: 'Invalid username or password.' });
  }

  const hashedPassword = hashPassword(password);
  if (user.passwordHash !== hashedPassword) {
    return res.status(401).json({ error: 'Invalid username or password.' });
  }

  const token = `sess_${crypto.randomBytes(24).toString('hex')}`;
  activeSessions[token] = {
    userId: user.id,
    expiresAt: Date.now() + (24 * 60 * 60 * 1000) // 24 hours
  };

  user.lastLoginAt = new Date().toISOString();
  db.scheduleSave();

  db.addAuditLog(
    user.id,
    user.fullName,
    user.role,
    'USER_LOGIN',
    'User',
    user.id,
    `User ${user.username} logged into the monitoring console.`,
    req.ip
  );

  const { passwordHash, ...safeUser } = user;
  return res.json({
    success: true,
    token,
    user: safeUser
  });
});

router.get('/me', (req, res) => {
  const authHeader = req.headers.authorization;
  const token = authHeader?.replace('Bearer ', '');
  
  if (!token) return res.status(401).json({ error: 'Authentication is required.' });

  const user = verifySession(token);
  if (!user) {
    return res.status(401).json({ error: 'Session expired or invalid.' });
  }

  const { passwordHash, ...safeUser } = user;
  return res.json({ user: safeUser, token });
});

router.post('/logout', (req, res) => {
  const authHeader = req.headers.authorization;
  const token = authHeader?.replace('Bearer ', '');
  if (token && activeSessions[token]) {
    delete activeSessions[token];
  }
  return res.json({ success: true });
});

export default router;
