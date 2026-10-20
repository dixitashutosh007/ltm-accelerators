/**
 * Serves Accelerators/ the way Amplify Hosting does for tests: the response headers from
 * customHttp.yml (including the Content-Security-Policy) and extensionless page routes
 * (/strategy-iq -> strategy-iq.html).
 *
 * Usage: node tests/support/static-server.mjs [port]
 * The local dev server (scripts/dev-server.ts) reuses serveSite() for the same behaviour.
 */
import { createServer } from 'node:http';
import { readFileSync, existsSync, statSync } from 'node:fs';
import { join, extname, resolve, normalize } from 'node:path';
import { fileURLToPath } from 'node:url';
import YAML from 'yaml';

const root = resolve(fileURLToPath(new URL('../../', import.meta.url)));
const siteDir = join(root, 'Accelerators');

const { customHeaders = [] } = YAML.parse(readFileSync(join(root, 'customHttp.yml'), 'utf8'));

const MIME = {
  '.html': 'text/html; charset=utf-8', '.js': 'application/javascript; charset=utf-8',
  '.css': 'text/css; charset=utf-8', '.json': 'application/json; charset=utf-8',
  '.png': 'image/png', '.jpg': 'image/jpeg', '.svg': 'image/svg+xml', '.md': 'text/markdown; charset=utf-8'
};

function globToRegExp(pattern) {
  if (pattern === '**') return /.*/;
  const escaped = pattern.replace(/[.+^${}()|[\]\\]/g, '\\$&').replace(/\*\*/g, '.*').replace(/(?<!\.)\*/g, '[^/]*');
  return new RegExp('^' + escaped + '$');
}
const headerRules = customHeaders.map(rule => ({ re: globToRegExp(rule.pattern), headers: rule.headers }));

function resolveFile(urlPath) {
  const clean = normalize(decodeURIComponent(urlPath)).replace(/^([/\\])+/, '');
  const candidates = clean === '' ? ['index.html'] : [clean, clean + '.html', join(clean, 'index.html')];
  for (const rel of candidates) {
    const abs = join(siteDir, rel);
    if (!abs.startsWith(siteDir)) return null;
    if (existsSync(abs) && statSync(abs).isFile()) return { abs, rel };
  }
  return null;
}

/** Serves one request from Accelerators/ with the customHttp.yml headers. */
export function serveSite(req, res) {
  const urlPath = new URL(req.url, 'http://localhost').pathname;
  const file = resolveFile(urlPath);
  if (!file) {
    res.writeHead(404, { 'Content-Type': 'text/plain' });
    res.end('Not found');
    return;
  }
  const headers = { 'Content-Type': MIME[extname(file.abs)] || 'application/octet-stream' };
  for (const rule of headerRules) {
    if (rule.re.test(file.rel)) for (const h of rule.headers) headers[h.key] = h.value;
  }
  res.writeHead(200, headers);
  res.end(readFileSync(file.abs));
}

if (process.argv[1] && resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  const port = Number(process.argv[2] || process.env.PORT || 4173);
  createServer(serveSite).listen(port, () => console.log(`Serving ${siteDir} with customHttp.yml headers on http://localhost:${port}`));
}
