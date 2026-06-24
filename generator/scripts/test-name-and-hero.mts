/**
 * Regression test for the Ungenach fixes in orchestrator.ts:
 *  - titleCaseIfAllLower(): title-case ONLY entirely-lowercase scraped names,
 *    leaving already-cased names / acronyms byte-identical.
 *  - scoreImage(): demote site-header/screendesign design-graphics (text baked
 *    into the pixels) below SCORE_THRESHOLD (30) so verein templates fall back
 *    to their clean decor hero — WITHOUT penalising real photos / og:image
 *    heroes that the 7 clean demos rely on.
 *
 * Mirrors scripts/test-team-photos.mts (node:assert/strict, exits non-zero on
 * first failure). Run: npx tsx scripts/test-name-and-hero.mts
 */
import assert from 'node:assert/strict';
import { titleCaseIfAllLower, scoreImage } from '../src/orchestrator.ts';

const THRESHOLD = 30; // SCORE_THRESHOLD in pickMedia()
let pass = 0;
const ok = (cond: boolean, msg: string) => {
  assert.ok(cond, msg);
  pass++;
  console.log('  ✓ ' + msg);
};

console.log('titleCaseIfAllLower:');
// The exact failing case:
ok(titleCaseIfAllLower('musik verein ungenach') === 'Musik Verein Ungenach', 'all-lowercase name → title-cased');
// Connector particles stay lower (except first word):
ok(titleCaseIfAllLower('musikverein an der traun') === 'Musikverein an der Traun', 'connector particles stay lowercase');
// Hyphen compounds:
ok(titleCaseIfAllLower('sankt-georgen') === 'Sankt-Georgen', 'hyphenated compound cased per segment');
// Single word:
ok(titleCaseIfAllLower('musikverein') === 'Musikverein', 'single lowercase word');
// Umlaut-safe (first letter only; ß never expanded):
ok(titleCaseIfAllLower('öko stüberl') === 'Öko Stüberl', 'umlaut first-letter cased (de-AT)');
ok(titleCaseIfAllLower('straße 1') === 'Straße 1', 'ß preserved (not expanded to SS)');
// MUST be byte-identical for the 9 correctly-cased real-lead names:
for (const n of ['Musikverein Gampern', 'Wolf System Bauunternehmen', 'Musikheim der Stadtmusik Vöcklabruck', 'Bauunternehmen Granit GmbH']) {
  ok(titleCaseIfAllLower(n) === n, `already-cased untouched: "${n}"`);
}
// Acronyms (contain uppercase) untouched:
for (const a of ['OETB', 'MV', 'TMK', 'Unbekannt']) {
  ok(titleCaseIfAllLower(a) === a, `acronym/identity untouched: "${a}"`);
}

console.log('scoreImage — site-header/screendesign demotion:');
// Ungenach's actual offending hero — must drop below threshold:
ok(scoreImage('https://www.musikverein-ungenach.at/images/screendesign_v2.jpg', 'MVU_Header_v2') < THRESHOLD, 'screendesign + Header banner demoted below threshold');
ok(scoreImage('https://x/header.jpg', '') < THRESHOLD, 'bare header.jpg demoted');
ok(scoreImage('https://x/webheader-2024.png', 'Seitenkopf') < THRESHOLD, 'webheader/Seitenkopf demoted');
// camelCase UI buttons (Ungenach picked a print button as hero — the
// word-boundary penalty missed them) + event flyers:
ok(scoreImage('https://www.musikverein-ungenach.at/media/system/images/printButton.png', 'Drucken') < THRESHOLD, 'camelCase printButton demoted');
ok(scoreImage('https://www.musikverein-ungenach.at/media/system/images/emailButton.png', 'E-Mail') < THRESHOLD, 'camelCase emailButton demoted');
ok(scoreImage('https://x/2024_10_05_Einladung Tag der offenen Tuer.JPG', '') < THRESHOLD, 'event flyer (Einladung) demoted');

console.log('scoreImage — real photos / clean heroes stay eligible (>= threshold):');
// The 7 clean demos' actual winning heroes must NOT be demoted:
ok(scoreImage('https://x/IMG-20230620-WA0003-1200x628-cro.jpg', 'Hero') >= THRESHOLD, 'stadtmusik og:image photo kept');
ok(scoreImage('https://x/image.jpg', 'Hero') >= THRESHOLD, 'gampern/rosenau og:image photo kept');
ok(scoreImage('https://x/Marschwertung_2025_484.jpg', 'Aufmarsch der Musikkapelle') >= THRESHOLD, 'lenzing real photo kept');
// Legit hero filename containing "header-image" must be SPARED (not demoted):
ok(scoreImage('https://x/header-image.jpg', '') >= THRESHOLD, 'header-image.jpg legit hero spared');
ok(scoreImage('https://x/header-photo-2024.jpg', '') >= THRESHOLD, 'header-photo legit hero spared');

console.log(`\nAll ${pass} name+hero assertions passed`);
