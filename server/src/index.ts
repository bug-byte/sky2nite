import { randomUUID } from 'crypto';
import cors from 'cors';
import dotenv from 'dotenv';
import express from 'express';
import { objectsRouter } from './api/objects/objectsRouter.js';
import getLogger from './util/getLogger.js';

dotenv.config();

const log = getLogger('SERVER');
const app = express();
const PORT = process.env.PORT || 3000;

app.use(cors({
  origin: process.env.NODE_ENV === 'production'
    ? process.env.FRONTEND_URL
    : ['http://localhost:5173', 'http://127.0.0.1:5173'],
  credentials: true,
}));
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Attach request ID and start time for logging in apiHelper
app.use((req, _res, next) => {
  (req as any).id = randomUUID();
  (req as any).started = performance.now();
  next();
});

app.use('/api/objects', objectsRouter);

app.get('/', (_req, res) => {
  res.json({ name: 'Sky2nite API', version: '1.0.0' });
});

app.use((err: Error, _req: express.Request, res: express.Response, _next: express.NextFunction) => {
  log.error('Unhandled error:', err.message);
  res.status(500).json({ err: err.message });
});

app.listen(PORT, () => {
  log.info(`Sky2nite API running on port ${PORT}`);
  log.info(`ANTARES: ${process.env.ANTARES_API_BASE_URL || 'https://api.antares.noirlab.edu/v1'}`);
});

export default app;
