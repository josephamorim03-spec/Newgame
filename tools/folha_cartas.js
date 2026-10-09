// Folha de comparação dos ícones das cartas: traço (ICO_CARTA) × pintado (js/cartas_pintadas.js),
// grande e nos tamanhos em que aparecem no jogo (18 px na mesa, 24 no deck, 34 na loja, 38 no detalhe),
// e dos símbolos dos "Bons momentos" do fim da partida: texto × pintado (js/momentos_pintados.js).
// Uso: node tools/folha_cartas.js   (saída em builds/cartas-comparacao.png)
const { chromium } = require('playwright');
const fs = require('fs');
const path = require('path');

const RAIZ = path.join(__dirname, '..');
const SAIDA = path.join(RAIZ, 'builds', 'cartas-comparacao.png');
const TAMANHOS = [18, 24, 34, 38];

const fonte = fs.readFileSync(path.join(RAIZ, 'js', 'jogo.js'), 'utf8');
const bloco = fonte.match(/const ICO_CARTA = \{([\s\S]*?)\n  \};/)[1];
const traco = Object.fromEntries([...bloco.matchAll(/^\s*(\w+): svg\('(.*)'\),?$/gm)].map(m => [m[1], m[2]]));
Object.assign(traco, JSON.parse(fs.readFileSync(path.join(RAIZ, 'arte', 'cartas.json'), 'utf8')).simbolos_vetor || {});
global.window = {};
eval(fs.readFileSync(path.join(RAIZ, 'js', 'cartas_pintadas.js'), 'utf8'));
const pintado = window.CARTAS_PINTADAS || {};
eval(fs.readFileSync(path.join(RAIZ, 'js', 'momentos_pintados.js'), 'utf8'));
const momentos = Object.entries(JSON.parse(fonte.match(/const MOMENTO_ID = (\{.*\});/)[1].replace(/'/g, '"')));
const linhaMomento = ([c, id]) => `<tr><th>${id}</th><td class="g"><span style="font-size:72px">${c}</span></td><td class="g">${img(window.MOMENTOS_PINTADOS[id], 96)}</td>
  <td colspan="4"><span style="font-size:18px">${c}</span>${img(window.MOMENTOS_PINTADOS[id], 28)}</td></tr>`;

const svg = (d, t) => `<svg viewBox="0 0 24 24" width="${t}" height="${t}" fill="none" stroke="#c4843a" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">${d}</svg>`;
const img = (s, t) => s ? `<img src="${s}" width="${t}" height="${t}">` : `<span class="nada" style="width:${t}px;height:${t}px"></span>`;
const linha = id => `<tr><th>${id}</th>
  <td class="g">${svg(traco[id], 96)}</td><td class="g">${img(pintado[id], 96)}</td>
  ${TAMANHOS.map(t => `<td>${svg(traco[id], t)}${img(pintado[id], t)}</td>`).join('')}</tr>`;
const html = `<!doctype html><html><head><style>
  body { margin: 0; padding: 20px; background: #fbf1df; color: #3a2a2e; font: 14px Nunito, Arial, sans-serif; }
  table { border-collapse: collapse; } th, td { padding: 6px 10px; border-bottom: 1px solid #f1dfc2; text-align: center; vertical-align: middle; }
  th { text-align: left; font-weight: 800; } td { white-space: nowrap; } td > * { vertical-align: middle; margin: 0 4px; }
  td.g { background: #fffaf0; } .nada { display: inline-block; border: 1px dashed #c9b59a; border-radius: 4px; }
  h1 { font-size: 20px; margin: 0 0 10px; } thead th { text-align: center; font-size: 12px; color: #7a6560; }
</style></head><body><h1>Ícones das cartas: traço × pintado</h1><table>
  <thead><tr><th></th><th>traço</th><th>pintado</th>${TAMANHOS.map(t => `<th>${t} px<br>traço · pintado</th>`).join('')}</tr></thead>
  <tbody>${Object.keys(traco).map(linha).join('')}</tbody></table>
  <h1 style="margin-top:24px">Bons momentos (fim da partida): texto × pintado</h1><table>
  <thead><tr><th></th><th>texto</th><th>pintado</th><th colspan="4">no jogo (18 px · 28 px)</th></tr></thead>
  <tbody>${momentos.map(linhaMomento).join('')}</tbody></table></body></html>`;

(async () => {
  const navegador = await chromium.launch(process.env.CHROMIUM ? { executablePath: process.env.CHROMIUM } : {});
  const pg = await navegador.newPage({ viewport: { width: 980, height: 400 }, deviceScaleFactor: Number(process.env.ESCALA || 1) });
  await pg.setContent(html);
  fs.mkdirSync(path.dirname(SAIDA), { recursive: true });
  await pg.screenshot({ path: SAIDA, fullPage: true });
  await navegador.close();
  console.log(path.relative(RAIZ, SAIDA));
})();
