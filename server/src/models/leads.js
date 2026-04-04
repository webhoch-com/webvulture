import { query } from '../db/index.js';

const ALLOWED_SORT = ['name', 'url', 'rating', 'status', 'branche', 'created_at', 'total_cost'];
const ALLOWED_ORDER = ['asc', 'desc'];

export async function findAll({ page = 1, limit = 25, sort = 'created_at', order = 'desc', status, rating, branche, dateFrom, dateTo, search } = {}) {
  const safSort = ALLOWED_SORT.includes(sort) ? sort : 'created_at';
  const safOrder = ALLOWED_ORDER.includes(order) ? order : 'desc';

  const conditions = [];
  const values = [];
  let i = 1;

  if (status) { conditions.push(`l.status = $${i++}::lead_status`); values.push(status); }
  if (rating) { conditions.push(`l.rating = $${i++}`); values.push(parseInt(rating)); }
  if (branche) { conditions.push(`l.branche ILIKE '%' || $${i++} || '%'`); values.push(branche); }
  if (dateFrom) { conditions.push(`l.created_at >= $${i++}`); values.push(dateFrom); }
  if (dateTo) { conditions.push(`l.created_at <= $${i++}`); values.push(dateTo); }
  if (search) { conditions.push(`(l.name ILIKE '%' || $${i} || '%' OR l.url ILIKE '%' || $${i++} || '%')`); values.push(search); }

  const where = conditions.length ? 'WHERE ' + conditions.join(' AND ') : '';
  const offset = (page - 1) * limit;

  const countResult = await query(`SELECT COUNT(*) FROM leads l ${where}`, values);
  const total = parseInt(countResult.rows[0].count);

  values.push(limit, offset);
  const { rows } = await query(
    `SELECT l.*, sj.target_group, sj.region as search_region
     FROM leads l LEFT JOIN search_jobs sj ON l.search_job_id = sj.id
     ${where} ORDER BY l.${safSort} ${safOrder} LIMIT $${i++} OFFSET $${i}`,
    values
  );

  return { leads: rows, total, page, limit, pages: Math.ceil(total / limit) };
}

export async function findById(id) {
  const { rows } = await query(
    `SELECT l.*, sj.target_group, sj.region as search_region
     FROM leads l LEFT JOIN search_jobs sj ON l.search_job_id = sj.id
     WHERE l.id = $1`, [id]
  );
  return rows[0] || null;
}

export async function create(data) {
  const { rows } = await query(
    `INSERT INTO leads (name, url, email, phone, branche, region, address, ssl, mobile, speed, rating, suggestions, analysis_raw, analysis_cost, status, total_cost, search_job_id)
     VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13,$14,$15,$16,$17)
     RETURNING *`,
    [data.name, data.url, data.email, data.phone, data.branche, data.region, data.address,
     data.ssl, data.mobile, data.speed, data.rating, data.suggestions, data.analysis_raw,
     data.analysis_cost, data.status || 'new', data.analysis_cost || 0, data.search_job_id]
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
    `UPDATE leads SET ${sets.join(', ')} WHERE id = $${i} RETURNING *`,
    values
  );
  return rows[0];
}

export async function updateStatus(id, status) {
  return update(id, { status });
}

export async function bulkUpdateStatus(ids, status) {
  const { rows } = await query(
    `UPDATE leads SET status = $1::lead_status, updated_at = NOW() WHERE id = ANY($2) RETURNING id`,
    [status, ids]
  );
  return rows;
}

export async function remove(id) {
  await query('DELETE FROM leads WHERE id = $1', [id]);
}
