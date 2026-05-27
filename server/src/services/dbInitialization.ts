import { readFile, readdir } from 'fs/promises';
import path from 'path';
import { fileURLToPath } from 'url';
import pool from './db.js';
import getLogger from '../util/getLogger.js';

const log = getLogger('DB_INIT');

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const scriptsDir = path.resolve(__dirname, '../data/scripts');

export async function initializeDatabaseFromScripts(): Promise<void> {
  await ensureMigrationTracking();

  const scriptFiles = await getSortedScriptFiles();
  if (scriptFiles.length === 0) {
    log.warn(`No database initialization scripts found in ${scriptsDir}`);
    return;
  }

  const executed = await getExecutedScripts();

  for (const scriptName of scriptFiles) {
    if (executed.has(scriptName)) {
      continue;
    }

    const scriptPath = path.join(scriptsDir, scriptName);
    const sql = await readFile(scriptPath, 'utf8');

    const client = await pool.connect();
    try {
      await client.query('BEGIN');
      await client.query(sql);
      await client.query(
        'INSERT INTO sys.executed_scripts (script_name) VALUES ($1) ON CONFLICT (script_name) DO NOTHING;',
        [scriptName],
      );
      await client.query('COMMIT');
      log.info(`Applied database script ${scriptName}`);
    } catch (err: any) {
      await client.query('ROLLBACK');
      log.error(`Failed applying database script ${scriptName}:`, err.message);
      throw err;
    } finally {
      client.release();
    }
  }
}

async function ensureMigrationTracking(): Promise<void> {
  await pool.query('CREATE SCHEMA IF NOT EXISTS sys;');
  await pool.query(`
    CREATE TABLE IF NOT EXISTS sys.executed_scripts (
      script_name TEXT PRIMARY KEY,
      executed_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
    );
  `);
}

async function getExecutedScripts(): Promise<Set<string>> {
  const result = await pool.query<{ script_name: string }>('SELECT script_name FROM sys.executed_scripts;');
  return new Set(result.rows.map((row) => row.script_name));
}

async function getSortedScriptFiles(): Promise<string[]> {
  const files = await readdir(scriptsDir);
  return files
    .filter((fileName) => /^\d{3}\..*\.sql$/i.test(fileName))
    .sort((a, b) => a.localeCompare(b));
}
