// Real requests against a running hosting package (publishing-base-path.md, health-check.md,
// cloudflare-deployment.md "Phase 0 proof 1"). Not code inspection.
//   node scripts/hosting-check.mjs --origin http://127.0.0.1:8080 --target azure-app-service
//   node scripts/hosting-check.mjs --origin http://127.0.0.1:8787 --target cloudflare
// Exit code 0 = every check passed.
const args = process.argv.slice(2);
const option = (name, fallback) => (args.includes('--' + name) ? args[args.indexOf('--' + name) + 1] : fallback);
const origin = option('origin', 'http://127.0.0.1:8080').replace(/\/$/, '');
const target = option('target', 'azure-app-service');
const MOUNT = '/executive-kpi-analytics/react';
const results = [];
const check = (name, passed, detail) => results.push({ name, passed: !!passed, detail });
const get = async (path) => {
  const response = await fetch(origin + path, { headers: { 'accept-encoding': 'gzip, br' } });
  return { status: response.status, type: response.headers.get('content-type') ?? '', cache: response.headers.get('cache-control') ?? '',
    nosniff: response.headers.get('x-content-type-options') ?? '', body: await response.text() };
};

try {
  const page = await get(`${MOUNT}/`);
  check('prefixed app page', page.status === 200 && page.type.startsWith('text/html') && page.body.includes('id="root"'), `${page.status} ${page.type}`);
  const script = page.body.match(new RegExp(`${MOUNT}/assets/[^"']+\\.js`))?.[0];
  check('page references prefixed assets', !!script, script ?? 'no prefixed script in index.html');
  if (script) {
    const prefixed = await get(script);
    check('prefixed asset is the file, not index.html', prefixed.status === 200 && /javascript/.test(prefixed.type), `${prefixed.status} ${prefixed.type}`);
    check('hashed asset cached immutably, nosniff', /immutable/.test(prefixed.cache) && prefixed.nosniff === 'nosniff', `${prefixed.cache}; nosniff=${prefixed.nosniff}`);
    const bare = await get(script.slice(MOUNT.length));
    check('unprefixed asset also served', bare.status === 200 && /javascript/.test(bare.type), `${bare.status} ${bare.type}`);
  }
  const deep = await get(`${MOUNT}/kpis`);
  check('app path falls back to index.html', deep.status === 200 && deep.type.startsWith('text/html') && deep.body.includes('id="root"'), `${deep.status} ${deep.type}`);
  const data = await get(`${MOUNT}/data/analytics.v1.json`);
  check('published fixture served as JSON', data.status === 200 && /json/.test(data.type) && JSON.parse(data.body).facts?.length === 600, `${data.status} ${data.type}`);
  const health = await get('/healthz');
  let fields = {};
  try { fields = JSON.parse(health.body); } catch { /* not JSON */ }
  check('host /healthz reports the build', health.status === 200 && fields.status === 'ok' && fields.service === 'executive-kpi-analytics' && !!fields.version,
    `${health.status} ${JSON.stringify(fields).slice(0, 160)}`);
  const status = await get(`${MOUNT}/healthz`);
  check('React status page under the mount path', status.status === 200 && status.type.startsWith('text/html'), `${status.status} ${status.type}`);
} catch (error) {
  check('host reachable', false, error.message);
}
const failed = results.filter((result) => !result.passed).length;
process.stdout.write(JSON.stringify({ checkedAt: new Date().toISOString(), target, origin, passed: failed === 0, failed, total: results.length, results }, null, 2) + '\n');
process.exitCode = failed ? 1 : 0;
