// Entry point per Plesk Node.js (Phusion Passenger)
// Plesk usa di default app.js o server.js come entry; questo wrapper avvia Next.js standalone.

const path = require('path');
const { spawn } = require('child_process');

const port = process.env.PORT || 3000;

// Se è presente la build standalone (output: 'standalone' in next.config) la usiamo,
// altrimenti facciamo fallback a `next start`.
const standalonePath = path.join(__dirname, '.next', 'standalone', 'server.js');
const fs = require('fs');

if (fs.existsSync(standalonePath)) {
  process.env.PORT = String(port);
  require(standalonePath);
} else {
  const next = spawn(process.execPath, [path.join(__dirname, 'node_modules', 'next', 'dist', 'bin', 'next'), 'start', '-p', String(port)], {
    stdio: 'inherit',
    env: process.env,
  });
  next.on('exit', (code) => process.exit(code ?? 0));
}
