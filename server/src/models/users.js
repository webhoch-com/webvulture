import { query } from '../db/index.js';

export async function findByUsername(username) {
  const { rows } = await query('SELECT * FROM users WHERE username = $1', [username]);
  return rows[0] || null;
}

export async function findById(id) {
  const { rows } = await query('SELECT id, username, email, role, created_at, updated_at FROM users WHERE id = $1', [id]);
  return rows[0] || null;
}

export async function findAll() {
  const { rows } = await query('SELECT id, username, email, role, created_at, updated_at FROM users ORDER BY created_at');
  return rows;
}

export async function create({ username, email, passwordHash, role = 'editor' }) {
  const { rows } = await query(
    'INSERT INTO users (username, email, password_hash, role) VALUES ($1, $2, $3, $4) RETURNING id, username, email, role, created_at',
    [username, email, passwordHash, role]
  );
  return rows[0];
}

export async function update(id, { username, email, role, passwordHash }) {
  const sets = [];
  const values = [];
  let i = 1;
  if (username) { sets.push(`username = $${i++}`); values.push(username); }
  if (email) { sets.push(`email = $${i++}`); values.push(email); }
  if (role) { sets.push(`role = $${i++}`); values.push(role); }
  if (passwordHash) { sets.push(`password_hash = $${i++}`); values.push(passwordHash); }
  sets.push(`updated_at = NOW()`);
  values.push(id);
  const { rows } = await query(
    `UPDATE users SET ${sets.join(', ')} WHERE id = $${i} RETURNING id, username, email, role`,
    values
  );
  return rows[0];
}

export async function remove(id) {
  await query('DELETE FROM users WHERE id = $1', [id]);
}
