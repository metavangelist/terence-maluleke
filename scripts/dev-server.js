#!/usr/bin/env node
'use strict';

const httpServer = require('http-server');
const os = require('os');
const path = require('path');

const PORT = Number(process.env.PORT) || 5500;
const HOST = process.env.HOST || '0.0.0.0';
const ROOT = path.resolve(__dirname, '..');

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

const server = httpServer.createServer({
  root: ROOT,
  cache: -1,
  cors: true,
});

server.listen(PORT, HOST, () => {
  console.log(`Serving ${ROOT}`);
  console.log(`\nOn this Mac:  http://127.0.0.1:${PORT}/`);

  const lans = lanAddresses();
  if (lans.length) {
    console.log('\nOn your phone (same Wi‑Fi):');
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
