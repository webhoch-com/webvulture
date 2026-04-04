import { query } from '../db/index.js';
import { encrypt, decrypt } from '../utils/encryption.js';

export async function getSetting(key) {
  const { rows } = await query('SELECT * FROM settings WHERE key = $1', [key]);
  if (!rows[0]) return null;
  const row = rows[0];
  if (row.is_encrypted && row.value) {
    try { row.value = decrypt(row.value); } catch { row.value = ''; }
  }
  return row.value;
}

export async function setSetting(key, value, isEncrypted = false) {
  const storedValue = isEncrypted ? encrypt(value) : value;
  await query(
    `INSERT INTO settings (key, value, is_encrypted, updated_at) VALUES ($1, $2, $3, NOW())
     ON CONFLICT (key) DO UPDATE SET value = $2, is_encrypted = $3, updated_at = NOW()`,
    [key, storedValue, isEncrypted]
  );
}

export async function getAllSettings() {
  const { rows } = await query('SELECT key, value, is_encrypted, updated_at FROM settings ORDER BY key');
  return rows.map(row => ({
    key: row.key,
    value: row.is_encrypted ? maskValue(row.value) : row.value,
    is_encrypted: row.is_encrypted,
    updated_at: row.updated_at,
  }));
}

function maskValue(encrypted) {
  try {
    const decrypted = decrypt(encrypted);
    if (decrypted.length <= 4) return '****';
    return '****' + decrypted.slice(-4);
  } catch {
    return '****';
  }
}
