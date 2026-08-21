import express from 'express';
import path from 'path';
import { createServer as createViteServer } from 'vite';
import { DiagnosticEngine } from './server/diagnostic-engine';

// Import Route Handlers
import authRoutes, { requireSession } from './server/routes/auth';
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
    res.setHeader('Access-Control-Allow-Origin', '*');
    res.setHeader('Access-Control-Allow-Methods', 'GET, POST, PUT, DELETE, OPTIONS');
    res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization, X-Requested-With');
    if (req.method === 'OPTIONS') {
      return res.sendStatus(200);
    }
    next();
  });

  // API Routes
  app.use('/api/auth', authRoutes);
  app.use('/api/devices', requireSession, deviceRoutes);
  app.use('/api/agent', agentRoutes);
  app.use('/api/diagnostics', requireSession, diagnosticRoutes);
  app.use('/api/tickets', requireSession, ticketRoutes);
  app.use('/api/maintenance', requireSession, maintenanceRoutes);
  app.use('/api/org', requireSession, orgRoutes);
  app.use('/api/users', requireSession, userRoutes);
  app.use('/api/settings', requireSession, settingsRoutes);
  app.use('/api/audit', requireSession, auditRoutes);
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
