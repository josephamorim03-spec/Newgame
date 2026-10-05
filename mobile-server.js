'use strict';

// Serves only the game's static files to devices on the same local network.
// No dependency, upload, write endpoint, or directory listing.
const http = require('node:http');
const fs = require('node:fs');
const path = require('node:path');
const os = require('node:os');

const root = __dirname;
const port = Number(process.env.KAIJU_PORT || 8765);
const directFiles = new Set([
  'index.html', 'game.css', 'game-core.js', 'game-ui.js',
  'assets/audio/synth.js'
]);
const imagePath = /^assets\/(?:art|icons|portraits|sprites)\/(?:[a-z0-9_-]+\/)*[a-z0-9_-]+\.svg$/i;
const contentTypes = { '.html': 'text/html', '.css': 'text/css', '.js': 'text/javascript', '.svg': 'image/svg+xml' };

function allowedFile(requestUrl) {
  let pathname;
  try { pathname = decodeURIComponent(new URL(requestUrl, 'http://localhost').pathname); }
  catch { return null; }
  const relative = pathname === '/' ? 'index.html' : pathname.replace(/^\//, '');
  if (!directFiles.has(relative) && !imagePath.test(relative)) return null;
  return path.join(root, ...relative.split('/'));
}

const server = http.createServer((request, response) => {
  if (request.method !== 'GET' && request.method !== 'HEAD') {
    response.writeHead(405, { Allow: 'GET, HEAD' }).end();
    return;
  }
  const file = allowedFile(request.url);
  if (!file) {
    response.writeHead(404).end('Arquivo não encontrado');
    return;
  }
  fs.stat(file, (error, stats) => {
    if (error || !stats.isFile()) {
      response.writeHead(404).end('Arquivo não encontrado');
      return;
    }
    response.writeHead(200, {
      'Content-Type': `${contentTypes[path.extname(file)]}; charset=utf-8`,
      'Content-Length': stats.size,
      'Cache-Control': 'no-store',
      'X-Content-Type-Options': 'nosniff'
    });
    if (request.method === 'HEAD') { response.end(); return; }
    fs.createReadStream(file).on('error', () => response.destroy()).pipe(response);
  });
});

server.on('error', error => {
  console.error(error.code === 'EADDRINUSE'
    ? `A porta ${port} já está em uso. Feche outro servidor ou escolha KAIJU_PORT.`
    : `Não foi possível iniciar: ${error.message}`);
  process.exitCode = 1;
});

server.listen(port, '0.0.0.0', () => {
  console.log('\nKAIJU 2048 — JOGAR NO CELULAR');
  console.log('Mantenha esta janela aberta. Conecte celular e computador ao mesmo Wi-Fi.');
  const addresses = Object.entries(os.networkInterfaces()).flatMap(([adapter, entries]) =>
    entries.filter(entry => entry.family === 'IPv4' && !entry.internal && !entry.address.startsWith('169.254.'))
      .map(entry => ({ adapter, address: entry.address })));
  if (!addresses.length) console.log('Nenhum endereço de rede encontrado. Verifique o Wi-Fi do computador.');
  for (const { adapter, address } of addresses)
    console.log(`Abra no navegador do celular: http://${address}:${port}/  (${adapter})`);
  console.log(`Teste neste computador: http://localhost:${port}/`);
  console.log('Se o Windows perguntar, permita acesso na rede privada. Ctrl+C encerra.\n');
});
