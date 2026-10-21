// Prepares the local hosting packages from the one production build (publishing-base-path.md,
// cloudflare-deployment.md). Run `npm run build` first; this script builds nothing and deploys nothing.
//   publication/azure/executive-kpi-analytics-azure.zip   dist/ (with web.config), server.mjs, package.json, package-lock.json
//   publication/cloudflare/web/                           worker.js, wrangler.jsonc (filled), dist/ without .br/.gz copies
// Output lives under publication/, never inside frontend/react/, so it stays out of the runtime source inventory.
import { cpSync, existsSync, mkdirSync, mkdtempSync, readFileSync, readdirSync, rmSync, statSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join, resolve } from 'node:path';
import { execFileSync } from 'node:child_process';
import { fileURLToPath } from 'node:url';

const project = fileURLToPath(new URL('..', import.meta.url));
const app = resolve(project, '../..');
const factory = resolve(app, '../..', 'factory');
const pkg = JSON.parse(readFileSync(join(project, 'package.json'), 'utf8'));
const MOUNT_PATH = '/executive-kpi-analytics/react';
const dist = join(project, 'dist');
if (!existsSync(join(dist, 'index.html'))) throw new Error('No dist/index.html: run npm run build first');
if (!readFileSync(join(dist, 'index.html'), 'utf8').includes(`${MOUNT_PATH}/assets/`)) throw new Error(`dist/ was not built with the ${MOUNT_PATH}/ base`);
if (!existsSync(join(dist, 'web.config'))) throw new Error('dist/web.config is missing (public/web.config)');

// Azure App Service (Linux runs server.mjs; Windows uses dist/web.config).
const azure = join(app, 'publication', 'azure');
mkdirSync(azure, { recursive: true });
const stage = mkdtempSync(join(tmpdir(), 'kpi-azure-'));
cpSync(dist, join(stage, 'dist'), { recursive: true });
for (const name of ['server.mjs', 'package.json', 'package-lock.json']) cpSync(join(project, name), join(stage, name));
const zip = join(azure, 'executive-kpi-analytics-azure.zip');
rmSync(zip, { force: true });
execFileSync('zip', ['-qr', zip, 'dist', 'server.mjs', 'package.json', 'package-lock.json'], { cwd: stage });
rmSync(stage, { recursive: true, force: true });

// Cloudflare: the factory static web Worker, filled for this app.
const web = join(app, 'publication', 'cloudflare', 'web');
rmSync(join(web, 'dist'), { recursive: true, force: true });
mkdirSync(web, { recursive: true });
cpSync(join(factory, 'templates/deploy/cloudflare/web/worker.js'), join(web, 'worker.js'));
const wrangler = readFileSync(join(factory, 'templates/deploy/cloudflare/web/wrangler.jsonc'), 'utf8')
  .replace('// The package step fills the <...> values.\n', '// Filled by frontend/react/scripts/package-hosting.mjs.\n')
  .replace('"name": "<app-id>"', '"name": "executive-kpi-analytics"')
  .replace('"APP_ID": "<app-id>"', '"APP_ID": "executive-kpi-analytics"')
  .replace('"APP_VERSION": "<package.json version>"', `"APP_VERSION": "${pkg.version}"`)
  .replace(/"MOUNT_PATH": "<[^"]*>"/, `"MOUNT_PATH": "${MOUNT_PATH}"`);
if (/<[a-z.]+[^>]*>"/i.test(wrangler.replace(/\/\/.*$/gm, ''))) throw new Error('wrangler.jsonc still has a placeholder');
writeFileSync(join(web, 'wrangler.jsonc'), wrangler);
cpSync(dist, join(web, 'dist'), { recursive: true, filter: (source) => !/\.(br|gz)$/.test(source) && !source.endsWith('web.config') });

const size = (path) => statSync(path).isDirectory() ? readdirSync(path).reduce((sum, name) => sum + size(join(path, name)), 0) : statSync(path).size;
console.log(JSON.stringify({
  azure: { zip: 'publication/azure/executive-kpi-analytics-azure.zip', bytes: statSync(zip).size },
  cloudflare: { directory: 'publication/cloudflare/web', distBytes: size(join(web, 'dist')), mountPath: MOUNT_PATH, version: pkg.version }
}, null, 2));
