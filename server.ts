import express from 'express';
import path from 'path';
import { createServer as createViteServer } from 'vite';
import { DiagnosticEngine } from './server/diagnostic-engine';

// Import Route Handlers
import authRoutes, { requireSession, requireRoles } from './server/routes/auth';
import deviceRoutes from './server/routes/devices';
import agentRoutes from './server/routes/agent';
import diagnosticRoutes from './server/routes/diagnostics';
import ticketRoutes from './server/routes/tickets';
import maintenanceRoutes from './server/routes/maintenance';
import orgRoutes from './server/routes/org';
import userRoutes from './server/routes/users';
import settingsRoutes from './server/routes/settings';
import auditRoutes from './server/routes/audit';
import notificationRoutes from './server/routes/notifications';
import reportRoutes from './server/routes/reports';

async function startServer() {
  const app = express();
  const PORT = Number(process.env.PORT) || 3000;

  // Standard middleware
  app.use(express.json({ limit: '10mb' }));
  app.use(express.urlencoded({ extended: true, limit: '10mb' }));

  // CORS & Security headers for agent communication
  app.use((req, res, next) => {
    const allowedOrigins = (process.env.CORS_ORIGIN || '').split(',').map(value => value.trim()).filter(Boolean);
    const requestOrigin = req.headers.origin;
    if (requestOrigin && (allowedOrigins.length === 0 ? requestOrigin === `${req.protocol}://${req.headers.host}` : allowedOrigins.includes(requestOrigin))) {
      res.setHeader('Access-Control-Allow-Origin', requestOrigin);
      res.setHeader('Vary', 'Origin');
    }
    res.setHeader('Access-Control-Allow-Methods', 'GET, POST, PUT, DELETE, OPTIONS');
    res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization, X-Requested-With');
    res.setHeader('X-Content-Type-Options', 'nosniff');
    res.setHeader('X-Frame-Options', 'DENY');
    res.setHeader('Referrer-Policy', 'same-origin');
    if (req.method === 'OPTIONS') {
      return res.sendStatus(200);
    }
    next();
  });

  // API Routes
  app.use('/api/auth', authRoutes);
  // Read access is authenticated for every console route. Mutations are also
  // enforced here, independent of whether the web UI happens to show a button.
  const controlWrite = (req: express.Request, res: express.Response, next: express.NextFunction) => {
    const user = res.locals.user;
    const isAdmin = user?.role === 'super_admin';
    const isUser = user?.role === 'user';
    const route = req.baseUrl;
    if (route.endsWith('/users')) {
      return isAdmin ? next() : res.status(403).json({ error: 'Only the Super Admin can manage user accounts.' });
    }
    if (req.method === 'GET') return next();
    if (route.endsWith('/settings') || route.endsWith('/org')) {
      return isAdmin ? next() : res.status(403).json({ error: 'Administrative permission is required.' });
    }
    if (route.endsWith('/devices')) {
      return isAdmin ? next() : res.status(403).json({ error: 'Device inventory changes require IT administrator permission.' });
    }
    if (route.endsWith('/diagnostics') || route.endsWith('/maintenance')) {
      return isAdmin ? next() : res.status(403).json({ error: 'Administrator permission is required.' });
    }
    if (route.endsWith('/tickets')) {
      return (isAdmin || (isUser && req.method === 'POST')) ? next() : res.status(403).json({ error: 'Only Super Admins can manage tickets; Users may report a problem.' });
    }
    next();
  };

  app.use('/api/devices', requireSession, requireRoles('super_admin', 'user'), deviceRoutes);
  app.use('/api/agent', agentRoutes);
  app.use('/api/diagnostics', requireSession, controlWrite, diagnosticRoutes);
  app.use('/api/tickets', requireSession, controlWrite, ticketRoutes);
  app.use('/api/maintenance', requireSession, controlWrite, maintenanceRoutes);
  app.use('/api/org', requireSession, controlWrite, orgRoutes);
  app.use('/api/users', requireSession, controlWrite, userRoutes);
  app.use('/api/settings', requireSession, controlWrite, settingsRoutes);
  app.use('/api/audit', requireSession, requireRoles('super_admin'), auditRoutes);
  app.use('/api/notifications', requireSession, notificationRoutes);
  app.use('/api/reports', requireSession, reportRoutes);

  // Health check
  app.get('/api/health', (req, res) => {
    res.json({ status: 'ok', time: new Date().toISOString() });
  });

  // Background Heartbeat Monitor Loop (every 5 seconds)
  setInterval(() => {
    try {
      DiagnosticEngine.checkHeartbeats();
    } catch (err) {
      console.error('[Heartbeat Monitor Error]:', err);
    }
  }, 5000);

  // Vite development middleware or static production serving
  if (process.env.NODE_ENV !== 'production') {
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: 'spa',
    });
    app.use(vite.middlewares);
  } else {
    const distPath = path.join(process.cwd(), 'dist');
    app.use(express.static(distPath));
    app.get('*', (req, res) => {
      res.sendFile(path.join(distPath, 'index.html'));
    });
  }

  app.listen(PORT, '0.0.0.0', () => {
    console.log(`[PC Monitoring Server] running at http://0.0.0.0:${PORT}`);
  });
}

startServer().catch(err => {
  console.error('Failed to start PC monitoring server:', err);
});
