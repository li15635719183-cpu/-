const fs = require('node:fs/promises');
const path = require('node:path');
const root = path.resolve(__dirname, '..');

async function walk(directory) {
  const entries = await fs.readdir(directory, { withFileTypes: true });
  return (await Promise.all(entries.map(entry => entry.isDirectory()
    ? walk(path.join(directory, entry.name))
    : path.join(directory, entry.name)))).flat();
}

async function main() {
  const names = (await fs.readdir(root)).filter(name => /\.(?:html|css|js)$/.test(name));
  const files = [...names.map(name => path.join(root, name)), ...await walk(path.join(root, 'assets'))];
  for (const filename of files) {
    const stat = await fs.stat(filename);
    if (stat.size > 25 * 1024 * 1024) throw new Error(`Asset exceeds Cloudflare's 25 MiB limit: ${path.relative(root, filename)}`);
  }
  const missing = [];
  for (const name of names) {
    const content = await fs.readFile(path.join(root, name), 'utf8');
    const references = name.endsWith('.html')
      ? [...content.matchAll(/\b(?:src|href|data-motion-src)=["']([^"']+)["']/g)].map(match => match[1])
      : name.endsWith('.css')
        ? [...content.matchAll(/url\(\s*["']?([^)"'\s]+)["']?\s*\)/g)].map(match => match[1])
        : [];
    if (name.endsWith('.html')) {
      for (const match of content.matchAll(/\bsrcset=["']([^"']+)["']/g)) {
        if (match[1].startsWith('data:')) continue;
        for (const variant of match[1].split(',')) references.push(variant.trim().split(/\s+/)[0]);
      }
    }
    for (const reference of references) {
      if (!reference || /^(?:#|[a-z][a-z\d+.-]*:|\/\/)/i.test(reference)) continue;
      const clean = decodeURIComponent(reference.split(/[?#]/)[0]);
      if (!clean) continue;
      const filename = path.resolve(root, '.' + (clean.startsWith('/') ? clean : '/' + clean));
      if (!filename.startsWith(root + path.sep)) throw new Error(`Invalid asset path: ${reference}`);
      try { await fs.access(filename); } catch { missing.push(`${name}: ${reference}`); }
    }
  }
  if (missing.length) throw new Error(`Missing website files:\n${missing.join('\n')}`);
  if (!names.includes('index.html')) throw new Error('index.html is missing');
  console.log(`Static site verified: ${names.filter(name => name.endsWith('.html')).length} pages, ${files.length} public files. Cloudflare serves these files directly; no application server is required.`);
}
main().catch(error => { console.error(error.message); process.exitCode = 1; });
