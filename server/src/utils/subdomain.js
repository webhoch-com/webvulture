import { query } from '../db/index.js';

const UMLAUT_MAP = { 'ä': 'ae', 'ö': 'oe', 'ü': 'ue', 'ß': 'ss', 'Ä': 'Ae', 'Ö': 'Oe', 'Ü': 'Ue' };

export function nameToSubdomain(name) {
  let sub = name.toLowerCase();
  for (const [char, replacement] of Object.entries(UMLAUT_MAP)) {
    sub = sub.replaceAll(char, replacement);
  }
  sub = sub.replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '').slice(0, 50);
  return sub || 'teaser';
}

export async function uniqueSubdomain(name) {
  let base = nameToSubdomain(name);
  let candidate = base;
  let i = 2;
  while (true) {
    const { rows } = await query('SELECT id FROM leads WHERE teaser_subdomain = $1', [candidate]);
    if (rows.length === 0) return candidate;
    candidate = `${base}-${i}`;
    i++;
  }
}
