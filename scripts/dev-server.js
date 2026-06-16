#!/usr/bin/env node
'use strict';

const fs = require('fs');
const http = require('http');
const os = require('os');
const path = require('path');
const { URL } = require('url');

const PORT = Number(process.env.PORT) || 5501;
const HOST = process.env.HOST || '0.0.0.0';
const ROOT = path.resolve(__dirname, '..');

const MIME = {
  '.html': 'text/html; charset=utf-8',
  '.css': 'text/css; charset=utf-8',
  '.js': 'text/javascript; charset=utf-8',
  '.json': 'application/json; charset=utf-8',
  '.png': 'image/png',
  '.jpg': 'image/jpeg',
  '.jpeg': 'image/jpeg',
  '.gif': 'image/gif',
  '.webp': 'image/webp',
  '.svg': 'image/svg+xml',
  '.ico': 'image/x-icon',
  '.mp4': 'video/mp4',
  '.m4v': 'video/mp4',
  '.webm': 'video/webm',
  '.woff': 'font/woff',
  '.woff2': 'font/woff2',
  '.txt': 'text/plain; charset=utf-8',
};

function lanAddresses() {
  try {
    const ifaces = os.networkInterfaces();
    const out = [];

    Object.values(ifaces || {}).forEach((entries) => {
      (entries || []).forEach((entry) => {
        if (entry.family === 'IPv4' && !entry.internal) {
          out.push(entry.address);
        }
      });
    });

    return [...new Set(out)];
  } catch (_) {
    return [];
  }
}

function safePath(root, requestPath) {
  const decoded = decodeURIComponent(requestPath.split('?')[0].split('#')[0]);
  const relative = decoded.replace(/^\/+/, '');
  const filePath = path.resolve(root, relative);

  if (filePath !== root && !filePath.startsWith(root + path.sep)) {
    return null;
  }

  return filePath;
}

function sendFile(res, filePath) {
  const ext = path.extname(filePath).toLowerCase();
  const type = MIME[ext] || 'application/octet-stream';

  fs.stat(filePath, (err, stat) => {
    if (err || !stat.isFile()) {
      res.writeHead(404, { 'Content-Type': 'text/plain; charset=utf-8' });
      res.end('Not found');
      return;
    }

    res.writeHead(200, {
      'Content-Type': type,
      'Content-Length': stat.size,
      'Cache-Control': 'no-store',
    });

    fs.createReadStream(filePath).pipe(res);
  });
}

const server = http.createServer((req, res) => {
  if (!req.url) {
    res.writeHead(400);
    res.end();
    return;
  }

  let pathname;
  try {
    pathname = new URL(req.url, 'http://localhost').pathname;
  } catch (_) {
    res.writeHead(400);
    res.end();
    return;
  }

  if (pathname === '/') pathname = '/index.html';

  const filePath = safePath(ROOT, pathname);
  if (!filePath) {
    res.writeHead(403);
    res.end('Forbidden');
    return;
  }

  fs.stat(filePath, (err, stat) => {
    if (!err && stat.isDirectory()) {
      const indexPath = path.join(filePath, 'index.html');
      fs.stat(indexPath, (indexErr, indexStat) => {
        if (!indexErr && indexStat.isFile()) sendFile(res, indexPath);
        else {
          res.writeHead(404, { 'Content-Type': 'text/plain; charset=utf-8' });
          res.end('Not found');
        }
      });
      return;
    }

    if (!err && stat.isFile()) {
      sendFile(res, filePath);
      return;
    }

    res.writeHead(404, { 'Content-Type': 'text/plain; charset=utf-8' });
    res.end('Not found');
  });
});

server.listen(PORT, HOST, () => {
  console.log(`Serving ${ROOT}`);
  console.log(`\nOn this Mac:  http://localhost:${PORT}/`);

  const lans = lanAddresses();
  if (lans.length) {
    console.log('\nOn your phone (same Wi‑Fi) — do NOT use localhost on mobile:');
    lans.forEach((ip) => {
      console.log(`  http://${ip}:${PORT}/`);
    });
  } else {
    console.log(`\nOn your phone: http://<your-mac-ip>:${PORT}/`);
    console.log('Find your IP: ipconfig getifaddr en0');
  }

  console.log('\nPress Ctrl+C to stop.');
});

process.on('SIGINT', () => process.exit(0));
process.on('SIGTERM', () => process.exit(0));
