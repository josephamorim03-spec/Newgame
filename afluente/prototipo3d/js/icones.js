// Os ícones do vale: desenhados para o jogo (grade de 24, traço arredondado escuro, cores do Cerrado: água, roça, mata, barro,
// sol), no lugar dos emojis do sistema, que davam a cara genérica. Cada ícone é uma pilha de camadas [caminho SVG, preenchimento,
// traço, espessura]. O mesmo desenho sai em HTML (icSVG, html) e no canvas das plaquinhas do mapa (icDraw, larguraRica, desenhaRico).
const INK = '#21403c';
const C = (x, y, r) => `M${x - r} ${y}a${r} ${r} 0 1 0 ${2 * r} 0a${r} ${r} 0 1 0 ${-2 * r} 0Z`;
const E = (x, y, rx, ry) => `M${x - rx} ${y}a${rx} ${ry} 0 1 0 ${2 * rx} 0a${rx} ${ry} 0 1 0 ${-2 * rx} 0Z`;
const gota = (x, y, s) => `M${x} ${y - 6 * s}c${2.1 * s} ${2.7 * s} ${3.4 * s} ${4.5 * s} ${3.4 * s} ${6.3 * s}a${3.4 * s} ${3.4 * s} 0 0 1 ${-6.8 * s} 0c0 ${-1.8 * s} ${1.3 * s} ${-3.6 * s} ${3.4 * s} ${-6.3 * s}Z`;
const graos = [0, 3.3, 6.6].flatMap(o => [[`M12 ${9.6 + o}c-2.5-.2-3.5-1.7-3.5-3.5 2.1 0 3.5 1.4 3.5 3.5Z`, '#e2b84a'], [`M12 ${9.6 + o}c2.5-.2 3.5-1.7 3.5-3.5-2.1 0-3.5 1.4-3.5 3.5Z`, '#e8c45c']]);
const casaF = (dx = 0, dy = 0, k = 1, parede = '#f6efe0', telha = '#c0583a') => [[`M${dx + 5.5 * k} ${dy + 11 * k}v${8.5 * k}h${13 * k}V${dy + 11 * k}`, parede], [`M${dx + 3.5 * k} ${dy + 11.5 * k}L${dx + 12 * k} ${dy + 4.5 * k}l${8.5 * k} ${7 * k}Z`, telha],
  [`M${dx + 10.6 * k} ${dy + 19.5 * k}v${-4 * k}h${2.8 * k}v${4 * k}`, '#7a4a2a']];
const arvore = (x, y, r, cor = '#4f8f3a') => [[`M${x - 0.6} ${y + r * 0.6}h1.2v${19.5 - (y + r * 0.6)}h-1.2Z`, '#7a5236', null], [C(x, y, r), cor]];

export const ICONES = {
  agua: [[gota(12, 13.5, 1.3), '#5fb0dc'], ['M9.3 14.4a3 3 0 0 0 2.2 2.6', null, '#e6f6ff', 1.6]],
  gente: [['M3.4 19.6c0-3.4 2.4-5.6 5.6-5.6s5.6 2.2 5.6 5.6Z', '#e08a5a'], [C(9, 9.2, 2.9), '#f3d7b5'], ['M10.4 20.2c0-3 2.2-5 5-5s5 2 5 5Z', '#4f8a8a'], [C(15.4, 10.7, 2.5), '#f3d7b5']],
  peca: [['M12 2.8l7.9 4.6v9.2L12 21.2l-7.9-4.6V7.4Z', '#9cc95a'], ['M12 12L4.1 7.4v9.2Z', '#6aa03a', null], ['M4.6 15.4C8 13.6 10 11.6 12 12s5 3.4 7.4 2.2', null, '#3f8fc0', 2.2], ['M12 2.8l7.9 4.6v9.2L12 21.2l-7.9-4.6V7.4Z', null]],
  sol: [[C(12, 12, 4.3), '#f2b33a'], ['M12 2.8v2.3M12 18.9v2.3M2.8 12h2.3M18.9 12h2.3M5.5 5.5l1.6 1.6M16.9 16.9l1.6 1.6M5.5 18.5l1.6-1.6M16.9 7.1l1.6-1.6', null, '#d98a22', 1.9]],
  chuva: [['M7 15.6a3.8 3.8 0 0 1 .4-7.6 5 5 0 0 1 9.4 1.2 3.2 3.2 0 0 1 .2 6.4Z', '#eef4f6'], ['M8.6 18.2l-.8 2.3M12.6 18.2l-.8 2.3M16.6 18.2l-.8 2.3', null, '#3f8fc0', 1.9]],
  casa: [...casaF(), ['M5.5 16.6h13', null, '#3f78b0', 1.8]],
  lavoura: [['M12 21V7.4', null, '#a8822a', 1.7], ...graos, ['M12 6.4c-1-1-1-2.7 0-3.7 1 1 1 2.7 0 3.7Z', '#e2b84a']],
  mata: [['M11 21v-4.6h2V21Z', '#7a5236'], ['M12 3.2c3.6 0 6.2 2.6 6.2 5.8 0 .7-.1 1.3-.3 1.9 1 .8 1.6 2 1.6 3.3 0 2.5-2.1 4.4-4.6 4.4H9.1c-2.5 0-4.6-1.9-4.6-4.4 0-1.3.6-2.5 1.6-3.3a5.9 5.9 0 0 1-.3-1.9c0-3.2 2.6-5.8 6.2-5.8Z', '#4f8f3a'],
    ['M8.8 8.6a3.4 3.4 0 0 1 2.7-2.5', null, '#a6d870', 1.4]],
  campo: [['M7.2 20c0-4-1.6-6.8-3.4-8.6 3 .6 5 3.6 5.2 8.6', '#7fb84a'], ['M11.8 20c0-5.4.4-9.6 1.6-13 .8 3.6 1 8 .2 13', '#93c85a'], ['M15.6 20c.4-3.6 2-6.2 4.6-7.6-1.6 2.2-2.4 4.8-2.6 7.6', '#7fb84a'],
    [C(17.4, 8.6, 1.6), '#f2c12e'], ['M3.5 20.4h17', null]],
  ampulheta: [['M7.8 3.8c0 4.4 4.2 5.6 4.2 8.2s-4.2 3.8-4.2 8.2h8.4c0-4.4-4.2-5.6-4.2-8.2s4.2-3.8 4.2-8.2Z', '#f6efe0'], ['M9.3 7h5.4c-.6 1.6-2.7 2.6-2.7 4-0-1.4-2.1-2.4-2.7-4Z', '#e2b84a', null],
    ['M9 19.6c.6-2 2-2.6 3-3.6 1 1 2.4 1.6 3 3.6Z', '#e2b84a', null], ['M6.4 3.5h11.2M6.4 20.5h11.2', null, INK, 1.8]],
  brilho: [['M11.5 2.5c.8 4.6 2.9 6.7 7.5 7.5-4.6.8-6.7 2.9-7.5 7.5-.8-4.6-2.9-6.7-7.5-7.5 4.6-.8 6.7-2.9 7.5-7.5Z', '#f2c12e'], ['M18.6 14.8c.3 1.7 1 2.4 2.7 2.7-1.7.3-2.4 1-2.7 2.7-.3-1.7-1-2.4-2.7-2.7 1.7-.3 2.4-1 2.7-2.7Z', '#fbe39a']],
  murcho: [['M12 21v-6.4c0-3 2.6-3.6 4-6.2', null, '#8a6a3a', 1.7], ['M16 8.4c1.6.4 2.4 2.2 1.6 4-1.8-.2-2.6-2.2-1.6-4Z', '#c49a5a'], ['M12 15c-2.8-.2-4.4-1.8-4.6-4.4 2.8 0 4.4 1.6 4.6 4.4Z', '#b8925a'], ['M7 21h10', null]],
  olho: [[E(12, 16.6, 8, 3.2), '#bfe3f5'], [E(12, 16.6, 4.6, 1.7), '#5fb0dc', null], [gota(12, 9.2, 0.95), '#5fb0dc']],
  jogar: [[C(12, 12, 9), '#f2c12e'], ['M10 8.1v7.8l6.1-3.9Z', INK, null]],
  dia: [['M7.3 14.4a4.7 4.7 0 0 1 9.4 0Z', '#f2b33a'], ['M12 5.2v1.9M6.2 7.6l1.3 1.3M17.8 7.6l-1.3 1.3', null, '#d98a22', 1.8], ['M2.6 19.6c2.6-3.6 5.4-5.2 8-5.2s4.4 1.4 5.6 2.6c1.2-1 2.4-1.4 3.6-1.4 1 0 1.6.2 1.8.4v3.6Z', '#7fb84a']],
  novo: [['M12 2.8l7.9 4.6v9.2L12 21.2l-7.9-4.6V7.4Z', '#9cc95a'], ['M12 8.4v7.2M8.4 12h7.2', null, INK, 2.2]],
  livro: [['M3.5 5.5c3-1 5.8-.8 8.5 1v13c-2.7-1.8-5.5-2-8.5-1Z', '#f6efe0'], ['M20.5 5.5c-3-1-5.8-.8-8.5 1v13c2.7-1.8 5.5-2 8.5-1Z', '#e9dcc0'], ['M6 9.3c1.4-.3 2.8-.2 4 .4M6 12.3c1.4-.3 2.8-.2 4 .4M14 9.7c1.2-.6 2.6-.7 4-.4', null, '#a8906a', 1.2]],
  medalha: [['M8.4 3h3.1l1.8 5.2-3 1.4Z', '#c0583a'], ['M15.6 3h-3.1l-1.8 5.2 3 1.4Z', '#3f78b0'], [C(12, 14.6, 5.6), '#f2c12e'], ['M12 11.4l1 2 2.2.3-1.6 1.5.4 2.2-2-1.1-2 1.1.4-2.2-1.6-1.5 2.2-.3Z', '#fbe39a', '#b07a12', 1]],
  ajustes: [['M4 7h16M4 12h16M4 17h16', null, INK, 1.8], [C(9, 7, 2.3), '#f2c12e'], [C(15, 12, 2.3), '#5fb0dc'], [C(7.4, 17, 2.3), '#e08a5a']],
  broto: [['M12 21v-8.2', null, '#5a8a2a', 1.9], ['M12 13c-.4-3.6-2.6-5.6-6.4-5.6.2 3.6 2.6 5.6 6.4 5.6Z', '#7fb84a'], ['M12 11.4c.2-3.4 2.4-5.6 6-5.8 0 3.4-2.2 5.6-6 5.8Z', '#9fd06a'], ['M7.5 21h9', null]],
  recomecar: [['M18.5 12a6.5 6.5 0 1 1-2.1-4.8', null, INK, 2.1], ['M17.5 3.4l-.7 4.3-4.3-.7', null, INK, 2.1]],
  passar: [['M4.6 15.6c1.6-4.6 4.6-7 8-7s5.6 1.8 7 4.8', null, INK, 2.1], ['M20.4 8.4l-.8 4.9-4.7-1.4', null, INK, 2.1], [C(5, 18.6, 1.7), '#e08a5a']],
  compartilhar: [['M5 13.4v5.6h14v-5.6', null, INK, 1.9], ['M12 15.2V4.4M8 8.2l4-4 4 4', null, '#3f78b0', 2.2]],
  trofeu: [['M7.5 4h9v4.2a4.5 4.5 0 0 1-9 0Z', '#f2c12e'], ['M7.5 5.5H5a2.6 2.6 0 0 0 2.8 3.6M16.5 5.5H19a2.6 2.6 0 0 1-2.8 3.6', null, INK, 1.5], ['M11 12.6h2v3.4h-2Z', '#c08a1a'], ['M8.4 16h7.2v3.6H8.4Z', '#7a5236']],
  folha: [['M19.5 4.5c-8.6 0-14 4.4-14 10.6 0 1.6.4 3 1 4.2 6.8-.2 13-4.6 13-14.8Z', '#9fd06a'], ['M6.5 19.4c2.8-4.4 6-7.6 10-10.2', null, '#4f8a2a', 1.4]],
  troca: [['M5 9.4h11.5M13.5 5.9l3.5 3.5-3.5 3.5', null, '#3f78b0', 2.1], ['M19 14.6H7.5M10.5 11.1L7 14.6l3.5 3.5', null, '#c0583a', 2.1]],
  chama: [['M12 21c-3.6 0-6-2.4-6-5.6 0-3.4 2.8-5.2 3.6-8.6 1.6 1.2 2.2 2.8 2.2 4.4 1-.8 1.6-2.2 1.6-3.8 2.6 1.8 4.6 4.6 4.6 8 0 3.2-2.4 5.6-6 5.6Z', '#f08a3a'],
    ['M12 20c-1.6 0-2.6-1-2.6-2.4 0-1.6 1.2-2.4 1.8-3.8 1.6 1 3.4 2.2 3.4 3.8 0 1.4-1 2.4-2.6 2.4Z', '#f6c94a', null]],
  cadeado: [['M8 11V8.2a4 4 0 0 1 8 0V11', null, INK, 1.9], ['M7 11h10a1 1 0 0 1 1 1v7a1 1 0 0 1-1 1H7a1 1 0 0 1-1-1v-7a1 1 0 0 1 1-1Z', '#cbc1b0'], [C(12, 15.2, 1.3), INK, null]],
  check: [['M5 12.6l4.2 4.2L19 7', null, '#2f7a4a', 2.8]],
  gema: [['M7 4.5h10l3.5 5L12 20 3.5 9.5Z', '#7fd0e0'], ['M3.5 9.5h17M9 4.5l3 15.5 3-15.5', null, '#3a8aa0', 1.1], ['M7 4.5h10l3.5 5L12 20 3.5 9.5Z', null]],
  floresta: [...arvore(6.4, 11.4, 3.2, '#5f9a3a'), ...arvore(17.6, 11.4, 3.2, '#5f9a3a'), ...arvore(12, 8.6, 4.1, '#3f7f35'), ['M3 19.6h18', null]],
  vilas: [['M13.5 9.6h6.2v5.2h-6.2Z', '#f0d9a8'], ['M12.4 9.8l4.2-3.6 4.2 3.6Z', '#b4563a'], ['M4.2 12.6h7.6v7H4.2Z', '#f6efe0'], ['M3 12.8L8 8.2l5 4.6Z', '#c0583a'], ['M7.2 19.6v-3h1.6v3', '#7a4a2a'], ['M3 19.6h18', null]],
  vila5: [['M15 19.6V8.6l2.5-3 2.5 3v11Z', '#f6efe0'], ['M15 8.6l2.5-3 2.5 3Z', '#3f78b0'], [C(17.5, 11.2, 0.9), INK, null], ['M4.2 12.6h7.6v7H4.2Z', '#f6efe0'], ['M3 12.8L8 8.2l5 4.6Z', '#c0583a'], ['M7.2 19.6v-3h1.6v3', '#7a4a2a'], ['M3 19.6h18', null]],
  mapa: [['M3.5 6.5l5-2 7 2 5-2v13l-5 2-7-2-5 2Z', '#f6efe0'], ['M8.5 4.5v13M15.5 6.5v13', null, '#b8a07a', 1.2], ['M5.6 15c2-3 4-1 6-3.5s3.5-3 6.4-2.5', null, '#c0583a', 1.5], [C(18, 9, 1.4), '#c0583a', null]],
  festa: [['M3 6c6 3 12 3 18 0', null, INK, 1.4], ['M5 7l1.4 4.6L8.2 8Z', '#c0583a'], ['M10 8.4l1.6 4.6 1.8-4.5Z', '#f2c12e'], ['M15.4 8.2l1.6 4.4 1.6-4.8Z', '#3f78b0'], [C(6, 17, 1.1), '#7fb84a', null], [C(12, 18.6, 1.1), '#e08a5a', null], [C(18, 16.6, 1.1), '#5fb0dc', null]],
  vale: [[C(17, 6.6, 2.5), '#f2b33a'], ['M2.5 16c3-4 6-6 9-6s5.5 2 10 6v4h-19Z', '#9cc95a'], ['M2.5 18c3.4-2.4 6.6-3.2 9.6-2.6 3.2.6 5.4 2 9.4 1.4V20h-19Z', '#6aa03a'], ['M11 20c.6-1.6 2-2.6 3.6-3.2', null, '#5fb0dc', 1.9]],
  gotas: [[gota(7.2, 12.4, 0.75), '#5fb0dc'], [gota(16.8, 12.4, 0.75), '#5fb0dc'], [gota(12, 18.2, 0.75), '#7fc4e8']],
  peixe: [['M3.5 12c3-4.2 8.6-5 13.2-1.6l3.8-2.6v8.4l-3.8-2.6C12.1 17 6.5 16.2 3.5 12Z', '#7fb0c0'], [C(7.6, 11.2, 0.9), INK, null]],
};

// os emojis que ainda aparecem em textos (as regras do núcleo, os avisos) viram ícones na hora de mostrar
const EMO = { '💧': 'agua', '👥': 'gente', '🧩': 'peca', '☀️': 'sol', '☀': 'sol', '🌧️': 'chuva', '🌧': 'chuva', '🏠': 'casa', '🏡': 'casa', '🌾': 'lavoura', '🌳': 'mata', '🌿': 'campo', '🐄': 'campo',
  '⏳': 'ampulheta', '✨': 'brilho', '🎯': 'brilho', '🥀': 'murcho', '🫧': 'olho', '▶️': 'jogar', '▶': 'jogar', '🌅': 'dia', '🎲': 'novo', '📖': 'livro', '🏅': 'medalha', '⚙️': 'ajustes', '⚙': 'ajustes',
  '🌱': 'broto', '🔁': 'recomecar', '↷': 'passar', '🏆': 'trofeu', '💡': 'folha', '🔄': 'troca', '🔥': 'chama', '🔒': 'cadeado', '✓': 'check', '💎': 'gema', '🏞️': 'floresta', '🏞': 'floresta',
  '🏘️': 'vilas', '🏘': 'vilas', '🏙️': 'vila5', '🏙': 'vila5', '🗺️': 'mapa', '🗺': 'mapa', '🎉': 'festa', '🌄': 'vale', '💦': 'gotas', '🐟': 'peixe' };
const RE = new RegExp(Object.keys(EMO).sort((a, b) => b.length - a.length).map(k => k.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')).join('|') + '|\\{(' + Object.keys(ICONES).join('|') + ')\\}', 'gu');

export function icSVG(nome, cls = 'ic5') { const L = ICONES[nome]; if (!L) return '';
  return `<svg class="${cls}" viewBox="0 0 24 24" aria-hidden="true" focusable="false">${L.map(([d, f, s = INK, w = 1.5]) => `<path d="${d}" fill="${f || 'none'}"${s ? ` stroke="${s}" stroke-width="${w}" stroke-linecap="round" stroke-linejoin="round"` : ''}/>`).join('')}</svg>`; }
// texto (já seguro para HTML) com os emojis trocados pelos ícones
export const html = s => String(s).replace(RE, (m, nome) => icSVG(nome || EMO[m]));
export const esc = s => String(s).replace(/[&<>"]/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]));
export const textoHTML = s => html(esc(s));
// ---------- no canvas
const P2 = {}; const path = d => P2[d] || (P2[d] = new Path2D(d));
export function icDraw(g, nome, x, y, size) { const L = ICONES[nome]; if (!L) return; g.save(); g.translate(x, y); g.scale(size / 24, size / 24); g.lineCap = 'round'; g.lineJoin = 'round';
  for (const [d, f, s = INK, w = 1.5] of L) { const p = path(d); if (f) { g.fillStyle = f; g.fill(p); } if (s) { g.strokeStyle = s; g.lineWidth = w; g.stroke(p); } } g.restore(); }
// pedaços de um texto: [{t: 'texto'} | {ic: 'nome'}]
export function pedacos(s) { const out = []; let i = 0; String(s).replace(RE, (m, nome, at) => { if (at > i) out.push({ t: s.slice(i, at) }); out.push({ ic: nome || EMO[m] }); i = at + m.length; return m; }); if (i < s.length) out.push({ t: s.slice(i) }); return out; }
export function larguraRica(g, s, px) { return pedacos(s).reduce((w, p) => w + (p.ic ? px * 1.12 : g.measureText(p.t).width), 0); }
// desenha centrado em (cx, cy) com a fonte já posta em g; o modo diz se é preenchimento ou contorno (para o texto com borda)
export function desenhaRico(g, s, cx, cy, px, modo = 'fill') { const P = pedacos(s), W = larguraRica(g, s, px); let x = cx - W / 2; const al = g.textAlign; g.textAlign = 'left';
  for (const p of P) { if (p.ic) { if (modo === 'fill') icDraw(g, p.ic, x + px * 0.04, cy - px * 0.54, px * 1.04); x += px * 1.12; } else { modo === 'fill' ? g.fillText(p.t, x, cy) : g.strokeText(p.t, x, cy); x += g.measureText(p.t).width; } }
  g.textAlign = al; }
export const ICONE_CSS = `.ic5{width:1.2em;height:1.2em;vertical-align:-0.24em;display:inline-block;flex:none}`;
