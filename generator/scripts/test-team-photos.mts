/**
 * PR-A8 verification harness for matchTeamPhotos + isSafePhotoUrl.
 *
 * The generator has no test runner; this is a standalone tsx script that
 * exercises the photo-matching logic with synthetic fixtures and asserts the
 * outcomes. Run with:  npx tsx scripts/test-team-photos.mts
 *
 * Lives outside src/ so `tsc` (include: ["src"]) never compiles it into dist/.
 * Exits non-zero on the first failed assertion.
 */
import assert from 'node:assert/strict';
import { matchTeamPhotos } from '../src/orchestrator.ts';
import { isSafePhotoUrl, renderBoardSection, renderKuenstlerischeLeitung } from '../src/templates/_editorial.ts';
import type { RebuildPackage, SiteSpec } from '../src/types.ts';

type Team = NonNullable<SiteSpec['team']>;

function pkgWith(images: Array<{ src: string; alt?: string }>): RebuildPackage {
  return {
    business: { name: 'Musikverein Test', category: 'Verein', city: 'Test' },
    extracted: { images },
  } as RebuildPackage;
}

let passed = 0;
function check(label: string, fn: () => void) {
  fn();
  passed += 1;
  console.log(`  ✓ ${label}`);
}

console.log('matchTeamPhotos:');

check('attaches a portrait when the alt carries first + last name', () => {
  const team: Team = [{ role: 'Obmann', name: 'Hans Müller' }];
  matchTeamPhotos(team, pkgWith([
    { src: '/storage/leads/1/assets/abc.jpg', alt: 'Obmann Hans Müller' },
  ]));
  assert.equal(team[0].photo, '/storage/leads/1/assets/abc.jpg');
});

check('matches case- and diacritic-insensitively (ü vs UE-less)', () => {
  const team: Team = [{ role: 'Kapellmeister', name: 'Jürgen Gruber' }];
  matchTeamPhotos(team, pkgWith([
    { src: 'https://cdn.example.com/jg.png', alt: 'JÜRGEN  gruber, kapellmeister' },
  ]));
  assert.equal(team[0].photo, 'https://cdn.example.com/jg.png');
});

check('does NOT match when only the last name is present', () => {
  const team: Team = [{ role: 'Kassier', name: 'Anna Huber' }];
  matchTeamPhotos(team, pkgWith([
    { src: '/x.jpg', alt: 'Familie Huber beim Fest' },
  ]));
  assert.equal(team[0].photo, undefined);
});

check('whole-token match: nested surnames do not cross-assign (Bauer ⊄ Neubauer)', () => {
  const team: Team = [{ role: 'Beisitzer', name: 'Ed Bauer' }];
  // "friederike" contains "ed", "neubauer" contains "bauer" — substring
  // matching would wrongly attach this; whole-token matching must not.
  matchTeamPhotos(team, pkgWith([
    { src: '/wrong.jpg', alt: 'Friederike Neubauer, Schriftführerin' },
  ]));
  assert.equal(team[0].photo, undefined);
});

check('skips collective/group captions even with both names', () => {
  const team: Team = [{ role: 'Obmann', name: 'Hans Müller' }];
  matchTeamPhotos(team, pkgWith([
    { src: '/group.jpg', alt: 'Vorstand 2024: Hans Müller, Anna Huber, …' },
  ]));
  assert.equal(team[0].photo, undefined);
});

check('never assigns the same image to two members', () => {
  const team: Team = [
    { role: 'Obmann', name: 'Hans Müller' },
    { role: 'Obmann-Stv', name: 'Hans Müller-Berger' },
  ];
  // A single image whose alt happens to contain both members' tokens.
  matchTeamPhotos(team, pkgWith([
    { src: '/only.jpg', alt: 'Hans Müller Berger' },
  ]));
  const assigned = team.map(m => m.photo).filter(Boolean);
  assert.equal(new Set(assigned).size, assigned.length); // no dup URL
});

check('leaves photo unset when there are no images', () => {
  const team: Team = [{ role: 'Obmann', name: 'Hans Müller' }];
  matchTeamPhotos(team, pkgWith([]));
  assert.equal(team[0].photo, undefined);
});

check('matches against the downloaded gallery bucket (public_url)', () => {
  const team: Team = [{ role: 'Schriftführer', name: 'Eva Bauer' }];
  const pkg = {
    business: { name: 'MV', category: 'Verein', city: 'x' },
    extracted: { images: [] },
    images: { gallery: [{ public_url: '/storage/eva.jpg', alt: 'Eva Bauer' }] },
  } as unknown as RebuildPackage;
  matchTeamPhotos(team, pkg);
  assert.equal(team[0].photo, '/storage/eva.jpg');
});

check('PR-A8: prefers the dedicated team bucket over a gallery shot', () => {
  const team: Team = [{ role: 'Obmann', name: 'Hans Müller' }];
  const pkg = {
    business: { name: 'MV', category: 'Verein', city: 'x' },
    extracted: { images: [] },
    images: {
      // both captions name the same person — the board-detected portrait
      // (team bucket) must win over the incidental gallery shot.
      team: [{ public_url: '/storage/portrait-hans.jpg', alt: 'Obmann Hans Müller' }],
      gallery: [{ public_url: '/storage/group-hans.jpg', alt: 'Hans Müller beim Konzert' }],
    },
  } as unknown as RebuildPackage;
  matchTeamPhotos(team, pkg);
  assert.equal(team[0].photo, '/storage/portrait-hans.jpg');
});

console.log('isSafePhotoUrl:');

check('accepts absolute http(s) + same-origin path', () => {
  assert.equal(isSafePhotoUrl('https://x.com/a.jpg'), true);
  assert.equal(isSafePhotoUrl('http://x.com/a.jpg'), true);
  assert.equal(isSafePhotoUrl('/storage/leads/1/a.jpg'), true);
});

check('rejects javascript:/data:/protocol-relative/empty/non-string', () => {
  assert.equal(isSafePhotoUrl('javascript:alert(1)'), false);
  assert.equal(isSafePhotoUrl('data:image/png;base64,AAAA'), false);
  assert.equal(isSafePhotoUrl('//evil.com/a.jpg'), false);
  assert.equal(isSafePhotoUrl(''), false);
  assert.equal(isSafePhotoUrl(undefined), false);
  assert.equal(isSafePhotoUrl(123 as unknown), false);
});

console.log('renderBoardSection / renderKuenstlerischeLeitung:');

check('renders <img> for a member with a safe photo, monogram otherwise', () => {
  const html = renderBoardSection([
    { role: 'Obmann', name: 'Hans Müller', photo: '/storage/hans.jpg' },
    { role: 'Kassier', name: 'Anna Huber' },
  ]);
  assert.match(html, /<img src="\/storage\/hans\.jpg" alt="Hans Müller"/);
  assert.match(html, /board-monogram[^>]*><span>AH<\/span>/);   // Anna Huber → AH monogram
  assert.equal(html.match(/<img /g)?.length, 1);                 // exactly one photo
});

check('drops an unsafe photo URL back to the monogram', () => {
  const html = renderBoardSection([
    { role: 'Obmann', name: 'Bad Actor', photo: 'javascript:alert(1)' },
  ]);
  assert.doesNotMatch(html, /<img /);
  assert.doesNotMatch(html, /javascript:/);
  assert.match(html, /board-monogram/);
});

check('Künstlerische Leitung renders the matched portrait', () => {
  const html = renderKuenstlerischeLeitung([
    { role: 'Kapellmeister', name: 'Eva Bauer', photo: 'https://cdn.x/eva.jpg' },
  ]);
  assert.match(html, /leitung-portrait has-photo/);
  assert.match(html, /<img src="https:\/\/cdn\.x\/eva\.jpg" alt="Eva Bauer"/);
});

console.log(`\nAll ${passed} assertions passed.`);
