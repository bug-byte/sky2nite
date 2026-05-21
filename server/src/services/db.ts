import pg from 'pg';
import getLogger from '../util/getLogger.js';

const { Pool } = pg;
const log = getLogger('DB');

const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  max: 10,
  idleTimeoutMillis: 30_000,
  connectionTimeoutMillis: 5_000,
});

pool.on('error', (err) => {
  log.error('Unexpected PostgreSQL client error:', err.message);
});

/**
 * Verifies the database connection on startup.
 * Logs a warning but does not crash the server if the database is unavailable,
 * so existing non-database functionality continues to work.
 */
export async function initDb(): Promise<void> {
  try {
    const client = await pool.connect();
    await client.query('SELECT 1');
    client.release();
    log.info('PostgreSQL connection established.');
  } catch (err: any) {
    log.warn('Could not connect to PostgreSQL:', err.message);
    log.warn('Set DATABASE_URL in server/.env and ensure PostgreSQL is running.');
    log.warn('Some features will be unavailable until a connection is established.');
  }
}

export default pool;
