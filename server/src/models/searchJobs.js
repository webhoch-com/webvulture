import { query } from '../db/index.js';

export async function create({ targetGroup, region, count, userId }) {
  const { rows } = await query(
    `INSERT INTO search_jobs (target_group, region, count, status, user_id)
     VALUES ($1, $2, $3, 'running', $4) RETURNING *`,
    [targetGroup, region, count, userId]
  );
  return rows[0];
}

export async function update(id, fields) {
  const sets = [];
  const values = [];
  let i = 1;
  for (const [key, val] of Object.entries(fields)) {
    sets.push(`${key} = $${i++}`);
    values.push(val);
  }
  sets.push('updated_at = NOW()');
  values.push(id);
  const { rows } = await query(
    `UPDATE search_jobs SET ${sets.join(', ')} WHERE id = $${i} RETURNING *`,
    values
  );
  return rows[0];
}

export async function findAll() {
  const { rows } = await query(
    `SELECT sj.*, u.username,
     (SELECT COUNT(*) FROM leads WHERE search_job_id = sj.id) as lead_count
     FROM search_jobs sj LEFT JOIN users u ON sj.user_id = u.id
     ORDER BY sj.created_at DESC`
  );
  return rows;
}

export async function findById(id) {
  const { rows } = await query('SELECT * FROM search_jobs WHERE id = $1', [id]);
  return rows[0] || null;
}
