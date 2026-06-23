/**
 * Regression test for assertWebhookEnv() — the fail-fast startup guard that
 * prevents the prod incident where the generator scaffolds but can never call
 * back to Laravel (missing LARAVEL_APP_URL) and demos hang at "generating".
 *
 * webhook.ts reads process.env at module-load time, so each case re-imports
 * the module with a unique query string to get a fresh instance with the env
 * set for that case. Run:  npx tsx scripts/test-webhook-env.mts
 */
let pass = 0;
let fail = 0;
const ok = (cond: boolean, msg: string) => {
  if (cond) { pass++; console.log('  ✓ ' + msg); }
  else { fail++; console.log('  ✗ ' + msg); }
};

const clear = () => {
  for (const k of ['GENERATOR_SECRET', 'WV_SECRET', 'LARAVEL_APP_URL', 'APP_URL']) {
    delete process.env[k];
  }
};
const load = (n: number) => import(`../src/webhook.ts?case=${n}`);

console.log('assertWebhookEnv:');

// Case 1: both required vars present → must NOT throw
clear();
process.env.GENERATOR_SECRET = 'test-secret';
process.env.LARAVEL_APP_URL = 'https://app.example.com';
{
  const { assertWebhookEnv } = await load(1);
  let threw = false;
  try { assertWebhookEnv(); } catch { threw = true; }
  ok(!threw, 'passes when GENERATOR_SECRET + LARAVEL_APP_URL are set');
}

// Case 2: webhook origin missing → must throw, naming LARAVEL_APP_URL
clear();
process.env.GENERATOR_SECRET = 'test-secret';
{
  const { assertWebhookEnv } = await load(2);
  let msg = '';
  try { assertWebhookEnv(); } catch (e) { msg = (e as Error).message; }
  ok(msg.includes('LARAVEL_APP_URL'), 'throws naming LARAVEL_APP_URL when webhook origin is missing');
}

// Case 3: HMAC secret missing → must throw, naming GENERATOR_SECRET
clear();
process.env.LARAVEL_APP_URL = 'https://app.example.com';
{
  const { assertWebhookEnv } = await load(3);
  let msg = '';
  try { assertWebhookEnv(); } catch (e) { msg = (e as Error).message; }
  ok(msg.includes('GENERATOR_SECRET'), 'throws naming GENERATOR_SECRET when HMAC secret is missing');
}

// Case 4: APP_URL is accepted as a fallback for LARAVEL_APP_URL
clear();
process.env.GENERATOR_SECRET = 'test-secret';
process.env.APP_URL = 'https://app.example.com';
{
  const { assertWebhookEnv } = await load(4);
  let threw = false;
  try { assertWebhookEnv(); } catch { threw = true; }
  ok(!threw, 'accepts APP_URL as fallback for LARAVEL_APP_URL');
}

console.log(fail === 0 ? `\nAll ${pass} webhook-env assertions passed` : `\n${fail} of ${pass + fail} FAILED`);
process.exit(fail === 0 ? 0 : 1);
