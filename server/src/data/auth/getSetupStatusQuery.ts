import pool from '../../services/db.js';

export interface SetupStatus {
  isSetupComplete: boolean;
}

export async function getSetupStatusQuery(): Promise<SetupStatus> {
  const result = await pool.query<{ count: string }>('SELECT COUNT(*)::text AS count FROM users;');
  const count = parseInt(result.rows[0]?.count ?? '0', 10);
  return { isSetupComplete: count > 0 };
}
