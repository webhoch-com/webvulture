/**
 * Real-test demo: Trachtenmusikkapelle Aigen-Voglau
 * Generates a realistic, plausible Verein demo with real-looking content
 * to show how the upgraded verein template performs with content close
 * to what an actual Austrian Musikverein would have.
 *
 * Output: /var/www/webseiten-werkstatt/demo-verein-real/
 */

import { spawn } from 'node:child_process';
import { mkdir, rename, rm } from 'node:fs/promises';
import { join } from 'node:path';
import { scaffoldAstroProject } from './scaffolder.js';
import type { SiteSpec } from './types.js';

const ARTIFACTS_DIR = process.env.DEMO_OUTPUT_DIR ?? process.env.PREVIEW_ARTIFACT_PATH ?? '/var/www/webseiten-werkstatt';
const PROJECTS_DIR = process.env.PROJECTS_DIR ?? '/tmp/wv-projects';

const spec: SiteSpec = {
  business_name: 'Trachtenmusikkapelle Aigen',
  tagline: 'Blasmusik mit Tradition · Gegründet 1932 · Aigen-Voglau',
  layout_kind: 'verein',
  hero: {
    headline: 'Musik, die Generationen verbindet.',
    subheadline:
      'Konzerte, Frühschoppen, Marschmusikbewertungen und Festumzüge — wir sind Teil des kulturellen Lebens in Aigen-Voglau und freuen uns auf Sie.',
    cta_text: 'Probe besuchen',
  },
  about: {
    body:
      'Die Trachtenmusikkapelle Aigen wurde 1932 von 14 Gründungsmitgliedern aus dem Ort ins Leben gerufen. Heute zählen wir über 60 aktive Musikerinnen und Musiker zwischen 8 und 78 Jahren. Unser Repertoire reicht von traditioneller Marschmusik über klassische Konzertliteratur bis zu modernen Arrangements.',
  },
  services: [
    { name: 'Wöchentliche Proben', description: 'Mittwoch ab 19:30 Uhr — neue Mitglieder herzlich willkommen.', icon: '' },
    { name: 'Konzerte & Auftritte', description: 'Frühschoppen, Sommerkonzert, Adventkonzert und mehr — Live-Termine das ganze Jahr.', icon: '' },
    { name: 'Jugendkapelle', description: 'Eigenständige Jugendarbeit ab 8 Jahren — Kooperation mit der Landesmusikschule.', icon: '' },
    { name: 'Vereinsfeste', description: 'Maibaumfest, Sommerfest, Frühschoppen — Tradition und Geselligkeit.', icon: '' },
    { name: 'Marschmusikbewertung', description: 'Regelmäßige Teilnahme — zuletzt 2024 Goldene Bewertung in Stufe D.', icon: '' },
    { name: 'Hochzeiten & Begräbnisse', description: 'Auf Anfrage musikalische Begleitung kirchlicher Anlässe in der Pfarre.', icon: '' },
  ],
  events: [
    { date: '14.03.2026', title: 'Frühjahrskonzert', description: 'Pfarrsaal Aigen, 19:30 Uhr — freier Eintritt mit anschließendem Beisammensein.' },
    { date: '12.04.2026', title: 'Bezirksjugendwettbewerb', description: 'Auftritt unserer Jungmusiker:innen ab 14:00 Uhr im Volkshaus Aigen.' },
    { date: '01.05.2026', title: 'Maibaumaufstellen', description: 'Marschmusik, Tanz und gemeinsames Aufstellen am Dorfplatz ab 10 Uhr.' },
    { date: '24.05.2026', title: 'Marschmusikbewertung', description: 'Bezirksaustragung in Bad Ischl — wir treten in Stufe D an.' },
    { date: '15.06.2026', title: 'Frühschoppen am Dorfplatz', description: 'Gemütlicher Frühschoppen mit Marschmusik und Wirtshausstimmung.' },
    { date: '02.08.2026', title: 'Sommerkonzert Open-Air', description: 'Schlossgarten Aigen, 19:00 Uhr — bei Schlechtwetter im Pfarrsaal.' },
    { date: '07.12.2026', title: 'Adventkonzert', description: 'Pfarrkirche Aigen, 18:00 Uhr — besinnliche Klänge im Advent.' },
    { date: '24.12.2026', title: 'Weihnachtsblasen', description: 'Tour durch die Ortsteile am Heiligen Abend ab 14 Uhr.' },
  ] as any,
  contact: {
    phone: '+43 6243 12345',
    email: 'kontakt@tmk-aigen.at',
    address: 'Probelokal: Schulstraße 12, 5026 Aigen-Voglau, Österreich',
    cta_text: 'Probe besuchen',
  },
  footer: {
    tagline: 'Trachtenmusikkapelle Aigen — Blasmusik aus dem Salzkammergut.',
    links: [
      { label: 'Impressum', href: '/impressum' },
      { label: 'Datenschutz', href: '/datenschutz' },
    ],
  },
  brand: {
    primary_color: '#2d4a32',
    font_style: 'friendly' as any,
    tone: 'traditionell, herzlich, regional' as any,
  },
} as any;

async function runAstroBuild(projectDir: string): Promise<void> {
  return new Promise((resolve, reject) => {
    const proc = spawn('npx', ['astro', 'build'], { cwd: projectDir, stdio: 'inherit' });
    proc.on('close', (code) => (code === 0 ? resolve() : reject(new Error(`astro build exited ${code}`))));
    proc.on('error', reject);
  });
}

async function main() {
  const slug = 'demo-verein-real';
  const fakeId = -1 * Date.now();

  console.log(`\n┌─ Building real-verein demo: ${spec.business_name}`);
  const projectDir = await scaffoldAstroProject(fakeId, spec, slug);
  console.log(`│  scaffolded → ${projectDir}`);

  try {
    await new Promise<void>((res, rej) => {
      const p = spawn('npm', ['install', '--silent', '--no-audit', '--no-fund'], { cwd: projectDir, stdio: 'inherit' });
      p.on('close', (c) => (c === 0 ? res() : rej(new Error(`npm install exit ${c}`))));
    });
    await runAstroBuild(projectDir);
  } catch (e) {
    console.error(`└─ FAILED: ${(e as Error).message}`);
    process.exit(1);
  }

  const target = join(ARTIFACTS_DIR, slug);
  await rm(target, { recursive: true, force: true });
  await mkdir(ARTIFACTS_DIR, { recursive: true });
  await rename(join(projectDir, 'dist'), target);
  console.log(`└─ ✓ deployed → ${target}\n`);
}

main().catch((e) => {
  console.error('Fatal:', e);
  process.exit(1);
});
