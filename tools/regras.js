// "A carta faz o que o texto diz": um cenário montado à mão por regra.
const C = require('../src/core.js'); let ok = 0, fail = 0;
const T = (name, cond) => { if (cond) ok++; else { fail++; console.log('FALHOU:', name); } };
function mk(fac = ['mata', 'assom'], opt = {}) { const g = new C.Game({ seed: 3, fac, ...opt }); g.terr = {}; g.units = g.units.filter(u => u.gen); g.p[0].hand = []; g.p[1].hand = []; g.p[0].mana = g.p[1].mana = 9; return g; }
function put(g, o, card, x, y, extra = {}) { const D = C.CARDS[card]; const u = { id: g.uid++, o, card, atk: D.atk, hp: D.hp, max: D.hp, x, y, moved: false, acted: false, sick: false, rooted: 0, stunned: 0, ...extra }; g.units.push(u); return u; }
let g, a, b; const night = g => { g.turn = 7; return g; };
// veneno
g = mk(); a = put(g, 0, 'coral', 2, 3); b = put(g, 1, 'lobis', 2, 2); g.apply({ c: 'attack', id: a.id, x: 2, y: 2 }); T('coral mata unidade que fere', !g.units.includes(b));
g = mk(); g.gen(1).x = 2; g.gen(1).y = 2; a = put(g, 0, 'coral', 2, 3); g.apply({ c: 'attack', id: a.id, x: 2, y: 2 }); T('coral não mata general', g.gen(1).hp === 19);
// guardião
g = mk(); a = put(g, 0, 'onca', 2, 3); b = put(g, 1, 'bicho', 1, 2); put(g, 1, 'corpo', 3, 2); T('guardião: não anda', g.moves(a).length === 0); T('guardião: só ataca ele', g.attacks(a).length === 1 && g.attacks(a)[0] === b);
// fúria
g = mk(); b = put(g, 1, 'lobis', 2, 2); T('fúria inteiro = 3', g.atkOf(b) === 3); b.hp = 2; T('fúria ferido = 5', g.atkOf(b) === 5);
// galope e voo
g = mk(); g.cur = 1; b = put(g, 1, 'mula', 2, 2); T('mula anda 3', g.moves(b).some(([x, y]) => Math.abs(x - 2) + Math.abs(y - 2) === 3));
g = mk(); a = put(g, 0, 'onca', 2, 4); put(g, 0, 'saci', 2, 3); T('a pé não atravessa aliado? (pode passar)', g.moves(a).some(([x, y]) => x === 2 && y === 2));
g = mk(); a = put(g, 0, 'onca', 2, 4); put(g, 1, 'corpo', 2, 3); T('a pé não atravessa inimigo', !g.moves(a).some(([x, y]) => x === 2 && y === 2));
// rápida / chegou
g = mk(); g.p[0].hand = ['onca']; g.apply({ c: 'play', i: 0, x: 2, y: 5 }); a = g.at(2, 5); T('onça rápida age ao entrar', !a.sick);
g = mk(); g.p[0].hand = ['saci']; T('saci entra a até 3 do general', g.playTargets(0, 0).some(([x, y]) => C.cheb({ x, y }, g.gen(0)) === 3));
g = mk(); g.p[0].hand = ['uira']; g.p[0].deck = ['cha']; g.apply({ c: 'play', i: 0, x: 2, y: 5 }); T('uirapuru compra 1', g.p[0].hand.includes('cha'));
// caipora cura no fim do turno
g = mk(); a = put(g, 0, 'caipora', 2, 5); b = put(g, 0, 'saci', 3, 5, { hp: 1 }); g.gen(0).hp = 15; g.apply({ c: 'end' }); T('caipora cura vizinho', b.hp === 2); T('caipora cura general', g.gen(0).hp === 16);
// anhangá enraíza, pisadeira atordoa
g = mk(); b = put(g, 1, 'lobis', 2, 4); g.p[0].hand = ['anhanga']; g.apply({ c: 'play', i: 0, x: 2, y: 5 }); T('anhangá enraíza vizinho', b.rooted === 1);
g = mk(); g.cur = 1; a = put(g, 0, 'mapin', 2, 3); put(g, 0, 'saci', 1, 3); g.p[1].hand = ['pisa']; g.gen(1).y = 1; put(g, 1, 'corpo', 2, 2); g.apply({ c: 'play', i: 0, x: 1, y: 2 }); T('pisadeira atordoa o mais forte', a.stunned === 1);
// capelobo, corpo-seco
g = mk(); g.cur = 1; b = put(g, 1, 'capelobo', 2, 2, { hp: 2 }); a = put(g, 0, 'saci', 2, 3); g.apply({ c: 'attack', id: b.id, x: 2, y: 3 }); T('capelobo recupera tudo ao destruir', b.hp === 5);
g = mk(); b = put(g, 1, 'corpo', 2, 2); a = put(g, 0, 'onca', 2, 3); const c2 = put(g, 0, 'saci', 1, 3); g.apply({ c: 'attack', id: a.id, x: 2, y: 2 }); T('corpo-seco: último suspiro', c2.hp === 1);
// feitiços
g = mk(); g.cur = 1; g.p[1].hand = ['pacto']; g.p[1].deck = ['a', 'b', 'c']; g.apply({ c: 'play', i: 0, x: -1, y: -1 }); T('pacto -2 e +2 cartas', g.gen(1).hp === 18 && g.p[1].hand.length === 2);
g = mk(); g.cur = 1; b = put(g, 1, 'bicho', 2, 3); a = put(g, 0, 'mapin', 2, 4); g.p[1].hand = ['alma']; g.apply({ c: 'play', i: 0, x: 2, y: 3 }); T('alma: 3 nos vizinhos', a.hp === 4 && !g.units.includes(b));
g = night(mk()); a = put(g, 0, 'mapin', 2, 4); g.p[0].hand = ['cha']; a.hp = 1; g.apply({ c: 'play', i: 0, x: 2, y: 4 }); T('chá cura 4', a.hp === 5);
g = mk(); a = put(g, 0, 'mapin', 2, 4); g.p[0].hand = ['cha']; a.hp = 1; g.apply({ c: 'play', i: 0, x: 2, y: 4 }); T('☀️ chá cura 6 de dia', a.hp === 7);
g = mk(); g.p[0].hand = ['arapuca']; g.apply({ c: 'play', i: 0, x: 2, y: 3 }); g.cur = 1; b = put(g, 1, 'lobis', 2, 1); g.apply({ c: 'move', id: b.id, x: 2, y: 3 }); T('arapuca: 3 de dano', b.hp === 0 || !g.units.includes(b));
g = mk(); g.cur = 1; g.p[1].grave = ['lobis']; g.p[1].hand = ['assomb']; g.apply({ c: 'play', i: 0, x: -1, y: -1 }); T('assombração traz de volta', g.units.some(u => u.card === 'lobis' && u.o === 1));
// terreno
g = mk(); g.terr['2,2'] = 'mata'; a = put(g, 0, 'onca', 2, 3); b = put(g, 1, 'mapin', 2, 2); g.apply({ c: 'attack', id: a.id, x: 2, y: 2 }); T('mata: -1 de dano', b.hp === 5);
g = mk(); g.terr['2,2'] = 'mata'; a = put(g, 0, 'uira', 2, 3); b = put(g, 1, 'mapin', 2, 2); g.apply({ c: 'attack', id: a.id, x: 2, y: 2 }); T('mata: mínimo 1', b.hp === 6);
g = mk(); g.terr['2,3'] = 'rio'; a = put(g, 0, 'onca', 2, 4); T('rio: não entra', !g.moves(a).some(([x, y]) => x === 2 && y === 3)); T('rio: não passa', !g.moves(a).some(([x, y]) => x === 2 && y === 2));
g = mk(); g.terr['2,3'] = 'rio'; a = put(g, 0, 'uira', 2, 4); T('voo: pula o rio', g.moves(a).some(([x, y]) => x === 2 && y === 2) && !g.moves(a).some(([x, y]) => x === 2 && y === 3));
g = mk(); g.terr['2,4'] = 'encru'; put(g, 0, 'saci', 2, 4); g.apply({ c: 'end' }); g.apply({ c: 'end' }); T('encruzilhada +1 mana', g.p[0].mana === g.p[0].max + 1);
// poderes
g = mk(); a = put(g, 0, 'saci', 0, 3); g.apply({ c: 'power', x: 0, y: 3 }); T('rastro falso troca de lugar', g.gen(0).x === 0 && g.gen(0).y === 3 && a.x === 2 && a.y === 6);
g = mk(); g.cur = 1; g.gen(1).hp = 15; a = put(g, 0, 'saci', 0, 3); g.apply({ c: 'power', x: 0, y: 3 }); T('feitiço da Cuca: 1 de dano e cura 1', a.hp === 1 && g.gen(1).hp === 16);
// revide
g = mk(); a = put(g, 0, 'onca', 2, 3); b = put(g, 1, 'mapin', 2, 2); g.apply({ c: 'attack', id: a.id, x: 2, y: 2 }); T('revide: quem apanha devolve', !g.units.includes(a));
g = mk(); a = put(g, 0, 'onca', 2, 3); b = put(g, 1, 'mapin', 2, 2, { stunned: 1 }); g.apply({ c: 'attack', id: a.id, x: 2, y: 2 }); T('atordoado não revida', g.units.includes(a));
g = mk(); b = put(g, 1, 'lobis', 2, 2); g.p[0].hand = ['enraizar']; g.apply({ c: 'play', i: 0, x: 2, y: 2 }); T('enraizar: de dia 2 de dano e preso', b.hp === 1 && b.rooted === 1);
// costas e lado
g = mk(); a = put(g, 0, 'onca', 2, 3); b = put(g, 1, 'mapin', 2, 2, { f: [0, -1] }); g.apply({ c: 'attack', id: a.id, x: 2, y: 2 }); T('costas: +1 de dano e sem revide', b.hp === 3 && g.units.includes(a));
g = mk(); a = put(g, 0, 'onca', 2, 3); b = put(g, 1, 'mapin', 3, 3, { f: [0, 1] }); g.apply({ c: 'attack', id: a.id, x: 3, y: 3 }); T('lado: sem revide, dano normal', b.hp === 4 && g.units.includes(a) && a.hp === 2);
g = mk(); a = put(g, 0, 'onca', 2, 3); b = put(g, 1, 'mapin', 2, 2, { f: [0, 1] }); g.apply({ c: 'attack', id: a.id, x: 2, y: 2 }); T('frente: revida como antes', !g.units.includes(a));
g = mk(); a = put(g, 0, 'onca', 2, 3); b = put(g, 1, 'mapin', 3, 3, { f: [0, 1] }); g.apply({ c: 'attack', id: a.id, x: 3, y: 3 }); T('quem apanha se vira', b.f[0] === -1 && b.f[1] === 0);
g = mk(); a = put(g, 0, 'onca', 2, 4); g.apply({ c: 'move', id: a.id, x: 3, y: 4 }); T('andar vira a peça', a.f[0] === 1 && a.f[1] === 0);
// céu
g = mk(); T('rodada 1 é dia', g.sky() === 'dia'); a = put(g, 0, 'onca', 2, 4); T('dia: Mata anda +1', g.moves(a).some(([x, y]) => Math.abs(x - 2) + Math.abs(y - 4) === 3));
g = mk(); g.turn = 7; T('rodada 4 é noite', g.sky() === 'noite'); b = put(g, 1, 'corpo', 2, 2); T('noite: sem bônus geral de ataque (vem das cartas)', g.atkOf(b) === 2);
b = put(g, 1, 'lobis', 3, 2); T('lua: Lobisomem em fúria sem ferida', g.atkOf(b) === 3 + 2); T('noite: general não ganha ataque', g.atkOf(g.gen(1)) === 2);
g = mk(); a = put(g, 1, 'lobis', 2, 3); b = put(g, 0, 'mapin', 2, 2, { f: [0, -1] }); put(g, 0, 'saci', 1, 2); g.cur = 1; g.apply({ c: 'attack', id: a.id, x: 2, y: 2 }); T('bando: Mata com aliado colado não é pega pelas costas', b.hp === 4 && !g.units.includes(a));
// traços de céu nas cartas (☀️/🌙)
g = mk(); a = put(g, 0, 'coral', 2, 3); b = put(g, 1, 'bicho', 2, 2, { f: [0, 1] }); g.apply({ c: 'attack', id: a.id, x: 2, y: 2 }); T('☀️ coral ao sol: sem revide', a.hp === 3 && !g.units.includes(b));
g = night(mk()); g.gen(1).y = 2; a = put(g, 0, 'coral', 2, 3); g.apply({ c: 'attack', id: a.id, x: 2, y: 2 }); T('coral de noite leva revide do general', a.hp === 1);
g = mk(); g.gen(1).y = 2; a = put(g, 0, 'coral', 2, 3); g.apply({ c: 'attack', id: a.id, x: 2, y: 2 }); T('☀️ coral ao sol: general não revida', a.hp === 3);
g = night(mk()); a = put(g, 0, 'onca', 2, 4); T('🌙 onça +1 de noite', g.atkOf(a) === 4);
g = mk(); g.p[0].hand = ['saci']; T('☀️ saci entra em qualquer casa de dia', g.playTargets(0, 0).some(([x, y]) => y === 0)); night(g); T('saci perto do general de noite', !g.playTargets(0, 0).some(([x, y]) => y === 0));
g = mk(); g.p[0].hand = ['uira']; g.p[0].deck = ['cha', 'saci']; g.apply({ c: 'play', i: 0, x: 2, y: 5 }); T('☀️ uirapuru compra 2 de dia', g.p[0].hand.length === 2);
g = night(mk()); a = put(g, 0, 'caipora', 2, 5); b = put(g, 0, 'mapin', 3, 5, { hp: 3 }); g.cur = 0; g.endTurn(); T('🌙 caipora cura 2 de noite', b.hp === 5);
g = mk(); a = put(g, 0, 'mapin', 2, 5, { hp: 3 }); g.endTurn(); T('☀️ mapinguari regenera 3 de dia', a.hp === 6);
g = night(mk()); b = put(g, 1, 'mapin', 2, 4); g.p[0].hand = ['anhanga']; g.apply({ c: 'play', i: 0, x: 2, y: 5 }); T('🌙 anhangá: enraíza e fere 1', b.rooted === 1 && b.hp === 6);
g = night(mk()); g.p[0].hand = ['arapuca']; g.apply({ c: 'play', i: 0, x: 2, y: 3 }); g.cur = 1; b = put(g, 1, 'mapin', 2, 1); g.apply({ c: 'move', id: b.id, x: 2, y: 3 }); T('🌙 arapuca 4 de noite', b.hp === 3);
g = night(mk()); b = put(g, 1, 'corpo', 2, 2); a = put(g, 0, 'mapin', 2, 3); const nb = put(g, 0, 'caipora', 1, 3); g.apply({ c: 'attack', id: a.id, x: 2, y: 2 }); T('🌙 corpo-seco: suspiro 2', nb.hp === 2);
g = night(mk()); b = put(g, 1, 'bicho', 2, 2); a = put(g, 0, 'onca', 2, 3); T('🌙 bicho-papão: −1 no vizinho', g.atkOf(a) === 3); g.turn = 1; T('bicho-papão de dia não assusta', g.atkOf(a) === 3);
g = night(mk()); g.cur = 1; put(g, 0, 'saci', 1, 3); put(g, 0, 'onca', 3, 3); g.p[1].hand = ['pisa']; g.gen(1).y = 1; put(g, 1, 'corpo', 2, 2); g.apply({ c: 'play', i: 0, x: 2, y: 3 - 1 + 1 }); T('🌙 pisadeira atordoa todos', g.units.filter(u => u.o === 0 && u.stunned).length === 2);
g = night(mk()); g.cur = 1; b = put(g, 1, 'mula', 2, 1); T('🌙 mula galopa 4', g.moves(b).some(([x, y]) => Math.abs(x - 2) + Math.abs(y - 1) === 4));
g = night(mk()); g.cur = 1; b = put(g, 1, 'capelobo', 2, 2); a = put(g, 0, 'mapin', 2, 3, { f: [0, -1] }); T('🌙 capelobo +1 de noite', g.atkOf(b) === 6);
g = night(mk()); g.cur = 1; b = put(g, 0, 'mapin', 2, 2); g.p[1].hand = ['grito']; g.apply({ c: 'play', i: 0, x: 2, y: 2 }); T('🌙 grito 3 de noite', b.hp === 4);
g = night(mk()); g.cur = 1; g.p[1].grave = ['lobis']; g.p[1].hand = ['assomb']; g.apply({ c: 'play', i: 0, x: -1, y: -1 }); T('🌙 assombração volta pronta', g.units.some(u => u.card === 'lobis' && !u.sick));
g = mk(); a = put(g, 0, 'saci', 0, 3); g.apply({ c: 'power', x: 0, y: 3 }); T('☀️ rastro falso recarga 1 de dia', g.p[0].cd === 1);
g = night(mk()); g.cur = 1; a = put(g, 0, 'mapin', 0, 3); g.apply({ c: 'power', x: 0, y: 3 }); T('🌙 feitiço da Cuca 2 de noite', a.hp === 5);
g = mk(['mata', 'assom'], { ceuCartas: false }); a = put(g, 0, 'coral', 2, 4); T('sem traços: coral normal', g.atkOf(a) === 1);
// totens e causos
g = mk(['mata', 'assom'], { totem: 3 }); g.terr['1,3'] = g.terr['3,3'] = 'totem'; put(g, 0, 'mapin', 1, 3); g.apply({ c: 'end' }); g.apply({ c: 'end' }); T('totem: 1 causo no começo do turno', g.p[0].causos === 1);
g.apply({ c: 'end' }); g.apply({ c: 'end' }); g.apply({ c: 'end' }); g.apply({ c: 'end' }); T('totem: meta de causos vence', g.over && g.winner === 0);
// troca inicial e guardar mana
g = new C.Game({ seed: 5, troca: true }); const h0 = g.p[0].hand.slice(); T('troca: até 2', !g.apply({ c: 'mull', idx: [0, 1, 2] })); T('troca: devolve e compra', g.apply({ c: 'mull', idx: [0, 2] }) && g.p[0].hand.length === 3 && g.p[0].hand[0] === h0[1]); T('troca só uma vez', !g.apply({ c: 'mull', idx: [0] }));
g = new C.Game({ seed: 5, troca: true }); g.apply({ c: 'end' }); T('troca do 2º jogador no 1º turno dele', g.p[1].mull); g.apply({ c: 'end' }); T('guardar: sobra 1 de mana', g.p[0].mana === g.p[0].max + 1);
g = new C.Game({ seed: 5 }); g.apply({ c: 'end' }); g.apply({ c: 'end' }); T('sem a regra não guarda', g.p[0].mana === g.p[0].max);
console.log(`${ok} ok, ${fail} falhas`);
