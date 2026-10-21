// Creates Brotli and gzip copies of text assets for the local Azure-style Node host.
import { readdirSync, readFileSync, statSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { brotliCompressSync, constants, gzipSync } from 'node:zlib';

const distDirectory = fileURLToPath(new URL('../dist/', import.meta.url));
const compressible = /\.(css|html|js|json|map|mjs|svg|txt|wasm|xml)$/i;
const walk = (directory) =>
  readdirSync(directory, { withFileTypes: true }).flatMap((entry) => {
    const path = join(directory, entry.name);
    return entry.isDirectory() ? walk(path) : [path];
  });

let files = 0;
for (const path of walk(distDirectory)) {
  if (!compressible.test(path)) continue;
  const content = readFileSync(path);
  if (content.length < 1024) continue;
  const brotli = brotliCompressSync(content, {
    params: {
      [constants.BROTLI_PARAM_QUALITY]: 11,
      [constants.BROTLI_PARAM_SIZE_HINT]: content.length,
    },
  });
  const gzip = gzipSync(content, { level: 9 });
  if (brotli.length < content.length) writeFileSync(`${path}.br`, brotli);
  if (gzip.length < content.length) writeFileSync(`${path}.gz`, gzip);
  files += 1;
}

console.log(`precompress: created compressed variants for ${files} assets.`);
