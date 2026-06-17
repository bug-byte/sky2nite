import { randomUUID } from 'crypto';
import cors from 'cors';
import express from 'express';
import helmet from 'helmet';
import { rateLimit } from 'express-rate-limit';
import path from 'path';
import { fileURLToPath } from 'url';
import './config/loadEnv.js';
import { authRouter } from './api/auth/authRouter.js';
import { requireAuth, requireAuthOrGuestMode } from './api/auth/authMiddleware.js';
import { objectsRouter } from './api/objects/objectsRouter.js';
import { observationsRouter } from './api/observations/observationsRouter.js';
import { settingsRouter } from './api/settings/settingsRouter.js';
import { filterPresetsRouter } from './api/filterPresets/filterPresetsRouter.js';
import { initDb } from './services/db.js';
import { initializeDatabaseFromScripts } from './services/dbInitialization.js';
import getLogger from './util/getLogger.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);


const log = getLogger('SERVER');
const app = express();
const PORT = process.env.PORT || 3001;

// Security headers
app.use(helmet({
  contentSecurityPolicy: {
    directives: {
      ...helmet.contentSecurityPolicy.getDefaultDirectives(),
      'script-src': ["'self'", 'https://maps.googleapis.com', 'https://maps.gstatic.com'],
      'script-src-elem': ["'self'", 'https://maps.googleapis.com', 'https://maps.gstatic.com'],
      'img-src': ["'self'", 'data:', 'https://alasky.cds.unistra.fr', 'https://maps.gstatic.com', 'https://maps.googleapis.com'],
      'connect-src': ["'self'", 'https://maps.googleapis.com'],
      'upgrade-insecure-requests': null,
    },
  },
}));

// CORS — in production, only allow the explicitly configured frontend origin.
// If FRONTEND_URL is unset, fall back to same-origin only (no cross-origin access).
const corsOrigin = process.env.NODE_ENV === 'production'
  ? (process.env.FRONTEND_URL || false)
  : ['http://localhost:5173', 'http://127.0.0.1:5173'];

app.use(cors({
  origin: corsOrigin,
  credentials: true,
}));

// Rate limiting on auth endpoints — 20 requests per minute per IP
const authLimiter = rateLimit({
  windowMs: 60 * 1000,
  max: 20,
  standardHeaders: true,
  legacyHeaders: false,
  message: { err: 'Too many requests, please try again later.' },
});
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Attach request ID and start time for logging in apiHelper
app.use((req, _res, next) => {
  (req as any).id = randomUUID();
  (req as any).started = performance.now();
  next();
});

app.use('/api/auth', authLimiter, authRouter);
app.use('/api/objects', requireAuthOrGuestMode, objectsRouter);
app.use('/api/observations', requireAuth, observationsRouter);
app.use('/api/settings', requireAuth, settingsRouter);
app.use('/api/filter-presets', requireAuth, filterPresetsRouter);

if (process.env.NODE_ENV !== 'production') {
  app.get('/', (_req, res) => {
    res.json({ name: 'Sky2nite API', version: '1.0.0' });
  });
}

if (process.env.NODE_ENV === 'production') {
  const publicDir = path.join(__dirname, '..', 'public');
  app.use(express.static(publicDir));
  app.get('*', (_req, res) => {
    res.sendFile(path.join(publicDir, 'index.html'));
  });
}

app.use((err: Error, _req: express.Request, res: express.Response, _next: express.NextFunction) => {
  log.error('Unhandled error:', err.message);
  const message = process.env.NODE_ENV === 'production' ? 'An unexpected error occurred.' : err.message;
  res.status(500).json({ err: message });
});

async function startServer(): Promise<void> {
  await initDb();
  await initializeDatabaseFromScripts();

  app.listen(PORT, () => {
    log.info(`Sky2nite API running on port ${PORT}`);
    log.info(`ANTARES: ${process.env.ANTARES_API_BASE_URL || 'https://api.antares.noirlab.edu/v1'}`);
  });
}

void startServer().catch((err: Error) => {
  log.error('Failed to start server:', err.message);
  process.exit(1);
});

export default app;
