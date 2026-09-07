/**
 * The performance budget. Runs after `vite build` and fails the build when
 * the first download grows past what a five-year-old phone on a slow link
 * should be asked to pull before it sees the map.
 *
 *   entry JS (gzipped)   <= ENTRY_GZIP_KB
 *   entry CSS (gzipped)  <= CSS_GZIP_KB
 *   any file the UI renders under public/ that is not build output
 *   and not an asset stage render        <= IMAGE_KB
 *
 * Numbers are budgets, not targets: lower them when the build gets under
 * them, never raise them to make a red build green.
 */
import {readFileSync, readdirSync, statSync} from 'node:fs';
import {join} from 'node:path';
import {gzipSync} from 'node:zlib';

const ENTRY_GZIP_KB = 200;
const CSS_GZIP_KB = 30;
const IMAGE_KB = 150;

const html = readFileSync('dist/index.html', 'utf8');
const entry = html.match(/src="\/assets\/(index-[^"]+\.js)"/)?.[1];
const css = html.match(/href="\/assets\/(index-[^"]+\.css)"/)?.[1];
if (!entry) throw new Error('budget: could not find the entry script in dist/index.html');

const gzKb = (p) => Math.round(gzipSync(readFileSync(p)).length / 1024);
const failures = [];
const entryKb = gzKb(join('dist/assets', entry));
console.log(`entry ${entry}: ${entryKb} KB gzipped (budget ${ENTRY_GZIP_KB})`);
if (entryKb > ENTRY_GZIP_KB) failures.push(`entry JS ${entryKb} KB > ${ENTRY_GZIP_KB} KB`);
if (css) {
  const cssKb = gzKb(join('dist/assets', css));
  console.log(`css ${css}: ${cssKb} KB gzipped (budget ${CSS_GZIP_KB})`);
  if (cssKb > CSS_GZIP_KB) failures.push(`entry CSS ${cssKb} KB > ${CSS_GZIP_KB} KB`);
}

// Every other chunk, for the record.
for (const name of readdirSync('dist/assets').sort()) {
  if (name === entry || name === css || !/\.(js|css)$/.test(name)) continue;
  console.log(`  chunk ${name}: ${gzKb(join('dist/assets', name))} KB gzipped`);
}

// Rendered images. Asset stage renders (public/assets/<id>/rNN.webp) have
// their own pipeline; everything else the UI shows must stay small.
const walk = (dir, out = []) => {
  for (const name of readdirSync(dir)) {
    const p = join(dir, name);
    if (statSync(p).isDirectory()) walk(p, out);
    else out.push(p);
  }
  return out;
};
for (const p of walk('public')) {
  if (/^public[\\/]assets[\\/]/.test(p)) continue;
  if (!/\.(webp|png|jpe?g|gif|svg)$/i.test(p)) continue;
  // Designer source PNGs beside their WebP derivatives are never rendered.
  if (/^public[\\/]trade-post[\\/].*\.png$/i.test(p)) continue;
  const kb = Math.round(statSync(p).size / 1024);
  if (kb > IMAGE_KB) failures.push(`${p} is ${kb} KB > ${IMAGE_KB} KB`);
}

if (failures.length) {
  console.error('\nBUDGET EXCEEDED:\n  ' + failures.join('\n  '));
  process.exit(1);
}
console.log('budget ok');
