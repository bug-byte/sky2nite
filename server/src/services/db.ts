import '../config/loadEnv.js';
import pg from 'pg';
import getLogger from '../util/getLogger.js';

const { Pool } = pg;
const log = getLogger('DB');

if (!process.env.DATABASE_URL) {
  throw new Error('DATABASE_URL is required to start the server.');
}

const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  max: 10,
  idleTimeoutMillis: 30_000,
  connectionTimeoutMillis: 5_000,
});

pool.on('error', (err) => {
  log.error('Unexpected PostgreSQL client error:', err.message);
});

// Verifies that PostgreSQL is reachable before the app starts accepting requests.
export async function initDb(): Promise<void> {
  try {
    const client = await pool.connect();
    await client.query('SELECT 1');
    client.release();
    log.info('PostgreSQL connection established.');
  } catch (err: any) {
    log.error('Could not connect to PostgreSQL:', err.message);
    log.error('Set DATABASE_URL in server/.env and ensure PostgreSQL is running.');
    throw err;
  }
}

export default pool;
