// Procura comentário de linha (//) que engoliu código: quando um comentário entra no meio da linha, tudo o que vem depois
// dele vira comentário sem aviso (já apagou o lenço, a fase do passo e as normais do corpo). O teste: a cauda do comentário
// compila como JavaScript e tem cara de comando (termina em ; ou }), coisa que texto em português não faz.
// Uso: node sim/caca_comentarios.js [pasta]   (padrão: prototipo3d/js) — sai com erro se achar algum
const fs = require('fs'), path = require('path');
const base = process.argv[2] || path.join(__dirname, '../prototipo3d/js');
let achou = 0;
for (const f of fs.readdirSync(base).filter(f => f.endsWith('.js') && !f.startsWith('three')).sort()) {
  fs.readFileSync(path.join(base, f), 'utf8').split('\n').forEach((l, n) => {
    let q = null, pos = -1;
    for (let i = 0; i < l.length - 1; i++) { const c = l[i]; if (q) { if (c === '\\') { i++; continue; } if (c === q) q = null; } else if ('"\'`'.includes(c)) q = c; else if (c === '/' && l[i + 1] === '/' && l[i - 1] !== ':') { pos = i; break; } }
    if (pos < 0) return; const cauda = l.slice(pos + 2).trim().replace(/[}\s]+$/, '');
    if (!/[;)]$/.test(cauda) || !/[(=]/.test(cauda)) return;
    // tira do começo palavras soltas (o texto do comentário) até sobrar algo que compile
    const pal = cauda.split(' ');
    for (let k = 0; k < pal.length; k++) { const resto = pal.slice(k).join(' '); if (resto.length < 8) break;
      try { new Function(resto); if (/[;]/.test(resto) && /\w\s*\(|\w\s*=[^=]/.test(resto) && !/^[a-zà-ú]+ [a-zà-ú]+ [a-zà-ú]+/i.test(resto)) { console.log(`${f}:${n + 1}: // …${resto.slice(0, 120)}`); achou++; } break; } catch (e) {} }
  }); }
console.log(`${achou} comentário(s) engolindo código`); process.exit(achou ? 1 : 0);
