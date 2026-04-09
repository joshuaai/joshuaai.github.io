/**
 * Generates cv.pdf from the built Astro site.
 * Run: node scripts/generate-cv.mjs
 * Output: public/cv.pdf
 */

import puppeteer from 'puppeteer';
import http from 'node:http';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const DIST_DIR = path.resolve(__dirname, '../dist');
const OUT_FILE = path.resolve(__dirname, '../public/cv.pdf');

// ─── Minimal static file server ──────────────────────────────────────────────

const MIME = {
  '.html': 'text/html',
  '.css':  'text/css',
  '.js':   'application/javascript',
  '.ico':  'image/x-icon',
  '.svg':  'image/svg+xml',
  '.png':  'image/png',
  '.jpg':  'image/jpeg',
  '.woff2':'font/woff2',
  '.woff': 'font/woff',
};

function serve(dir) {
  return new Promise((resolve) => {
    const server = http.createServer((req, res) => {
      let urlPath = req.url.split('?')[0];
      if (urlPath === '/') urlPath = '/index.html';

      const filePath = path.join(dir, urlPath);
      const ext = path.extname(filePath);

      fs.readFile(filePath, (err, data) => {
        if (err) {
          res.writeHead(404);
          res.end('Not found');
          return;
        }
        res.writeHead(200, { 'Content-Type': MIME[ext] || 'application/octet-stream' });
        res.end(data);
      });
    });

    server.listen(0, '127.0.0.1', () => {
      const { port } = server.address();
      resolve({ server, port });
    });
  });
}

// ─── Main ─────────────────────────────────────────────────────────────────────

const { server, port } = await serve(DIST_DIR);
const url = `http://127.0.0.1:${port}`;

console.log(`Serving ${DIST_DIR} at ${url}`);

const browser = await puppeteer.launch({ headless: true });
const page = await browser.newPage();

await page.goto(url, { waitUntil: 'networkidle0' });

// Wait for web fonts
await page.evaluateHandle('document.fonts.ready');

// PDF generation using print media
await page.pdf({
  path: OUT_FILE,
  format: 'A4',
  printBackground: false,
  margin: { top: '18mm', right: '18mm', bottom: '18mm', left: '18mm' },
  preferCSSPageSize: false,
});

await browser.close();
server.close();

console.log(`✓ PDF written to ${OUT_FILE}`);
