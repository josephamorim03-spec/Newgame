// O menu do vale (núcleo v5): a tela de início por cima do vale (continuar a partida salva, o vale do dia, um vale novo),
// o menu de pausa (☰ no canto), "Como jogar" com as regras em cartões, os ajustes (som, vibração, qualidade gráfica,
// botões de girar o mapa) e as confirmações das coisas que não têm volta (recomeçar, passar a peça).
// Só desenho e cliques: quem sabe do jogo é o board5.js, que passa as funções em `ctx`.

const CSS = `
  #menu5,#conf5{position:fixed;inset:0;z-index:40;display:flex;align-items:center;justify-content:center;padding:16px;
    background:linear-gradient(to bottom,rgba(15,35,35,.15),rgba(15,35,35,.55));-webkit-tap-highlight-color:transparent}
  #menu5[hidden],#conf5[hidden]{display:none}
  #menu5 .folha,#conf5 .folha{width:100%;max-width:400px;max-height:calc(100dvh - 32px);overflow:auto;background:var(--paper);border-radius:26px;padding:20px 18px 16px;
    box-shadow:0 12px 40px rgba(0,0,0,.32);backdrop-filter:blur(12px);-webkit-backdrop-filter:blur(12px);animation:sobeM .3s cubic-bezier(.2,1.3,.4,1)}
  @keyframes sobeM{from{transform:translateY(30px);opacity:0}to{transform:none;opacity:1}}
  #menu5 .tit{font:800 40px/1 "Baloo 2",system-ui;margin:0;text-align:center;letter-spacing:.5px}
  #menu5 .sub{margin:4px 0 16px;text-align:center;font:700 15px Nunito,system-ui;opacity:.75}
  #menu5 h2{margin:0 0 10px;font:800 24px "Baloo 2",system-ui}
  #menu5 .bts{display:flex;flex-direction:column;gap:10px}
  #menu5 button,#conf5 button{font:800 17px "Baloo 2",system-ui;border-radius:16px;min-height:52px;padding:8px 16px;cursor:pointer;border:2px solid var(--line);background:#fff;color:var(--ink);
    display:flex;align-items:center;gap:12px;text-align:left;transition:transform .08s ease}
  #menu5 button:active,#conf5 button:active{transform:scale(.97)}
  #menu5 button:focus:not(:focus-visible),#conf5 button:focus:not(:focus-visible){outline:none}
  #menu5 button.pri,#conf5 button.pri{background:var(--ink);color:#fff;border-color:var(--ink)}
  #menu5 button .ic{font-size:24px;width:30px;text-align:center;flex:none}
  #menu5 button small{display:block;font:700 13px Nunito,system-ui;opacity:.75;margin-top:1px}
  #menu5 button.pri small{opacity:.85}
  #menu5 .voltar{background:none;border:0;min-height:44px;justify-content:center;font:700 15px Nunito,system-ui;opacity:.8;margin-top:4px}
  #menu5 .regra{display:flex;gap:12px;align-items:flex-start;padding:10px 0;border-top:1px solid var(--line)}
  #menu5 .regra:first-of-type{border-top:0}
  #menu5 .regra .ic{font-size:26px;width:34px;text-align:center;flex:none;line-height:1.1}
  #menu5 .regra b{display:block;font:800 16px "Baloo 2",system-ui}
  #menu5 .regra p{margin:2px 0 0;font:600 14.5px/1.4 Nunito,system-ui}
  #menu5 .ctl{margin:6px 0 4px;padding:10px 12px;border-radius:14px;background:rgba(29,59,58,.06);font:600 14px/1.5 Nunito,system-ui}
  #menu5 .aj{display:flex;align-items:center;justify-content:space-between;gap:12px;padding:10px 0;border-top:1px solid var(--line);font:700 16px Nunito,system-ui}
  #menu5 .aj:first-of-type{border-top:0}
  #menu5 .aj small{display:block;font:600 13px Nunito,system-ui;opacity:.7}
  #menu5 .chips{display:flex;gap:4px;flex-wrap:wrap;justify-content:flex-end}
  #menu5 .chips button,#menu5 .sw{min-height:40px;padding:4px 12px;border-radius:999px;font:800 14px Nunito,system-ui;justify-content:center}
  #menu5 .chips button[aria-pressed="true"],#menu5 .sw[aria-pressed="true"]{background:var(--ink);color:#fff;border-color:var(--ink)}
  #menu5 .rec{display:flex;justify-content:center;gap:18px;margin:-6px 0 14px;font:700 13px Nunito,system-ui;opacity:.8}
  #conf5{z-index:45;background:rgba(15,35,35,.35)}
  #conf5 h2{margin:0 0 6px;font:800 21px "Baloo 2",system-ui}#conf5 p{margin:0 0 14px;font:600 15px/1.4 Nunito,system-ui}
  #conf5 .bts{display:flex;gap:10px}#conf5 .bts button{flex:1;justify-content:center}
  #menuBtn{position:fixed;top:calc(max(12px,env(safe-area-inset-top)) + 4px);right:calc(max(12px,env(safe-area-inset-right)) + 38px);width:32px;height:32px;border:0;background:none;padding:4px;z-index:6;
    color:#fff;filter:drop-shadow(0 1px 3px rgba(0,0,0,.45));line-height:0;cursor:pointer}
  #menuBtn svg{width:24px;height:24px;display:block}`;

const REGRAS = [
  ['🧩', 'Encaixe', 'Toque numa casa com faixa branca: a peça aparece lá. Toque de novo (ou na peça da mão) para girar, e em "Colocar". Rio só encosta em rio, e terra só em terra; a faixa escura diz onde ela não cabe (toque para ver por quê).'],
  ['💧', 'A água é o orçamento', 'Cada nascente dá um tanto de água (💧 no placar). Cada lavoura ou vila encostada no rio bebe 1, e a água chega primeiro a quem está mais perto da nascente. Quando acaba, o resto seca (🥀).'],
  ['🫧', 'Olhos-d\'água', 'Espalhados no Cerrado. Leve o rio até um deles e a nascente ganha a água dele.'],
  ['🏠', 'As vilas pedem', 'A plaquinha de cada vila diz o que ela quer: água, lavoura, mata, campo ou crescer. Atendeu: chegam pessoas (os pontos), +2 peças, e você escolhe o pacote das próximas. Faixa dourada: ali a peça ajuda um pedido.'],
  ['☀️', 'A seca', 'A cada 8 jogadas de águas vêm 4 de seca, e as nascentes dão a metade (o vale avisa antes quem vai secar). Quando a seca chega, a colheita: 1 peça a cada 2 lavouras com água.'],
  ['✨', 'A pilha é a vida', 'Cada jogada gasta uma peça (passar a peça também). Peça perfeita, com os 6 lados combinando, devolve uma. Acabou a pilha, acabou o vale: conte as pessoas.'],
];

export function createMenu(ctx) {
  const st = document.createElement('style'); st.textContent = CSS; document.head.appendChild(st);
  const m = document.createElement('div'); m.id = 'menu5'; m.hidden = true; m.setAttribute('role', 'dialog'); m.setAttribute('aria-modal', 'true'); document.body.appendChild(m);
  const cf = document.createElement('div'); cf.id = 'conf5'; cf.hidden = true; cf.setAttribute('role', 'alertdialog'); cf.setAttribute('aria-modal', 'true'); document.body.appendChild(cf);
  const mb = document.createElement('button'); mb.type = 'button'; mb.id = 'menuBtn'; mb.setAttribute('aria-label', 'Menu');
  mb.innerHTML = '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.4" stroke-linecap="round" aria-hidden="true"><path d="M4 6.5h16M4 12h16M4 17.5h16"/></svg>';
  document.body.appendChild(mb);
  let tela = null, deOnde = 'inicio';
  const click = () => ctx.som && ctx.som('page');
  const btn = (ic, t, sub, fn, pri) => { const b = document.createElement('button'); b.type = 'button'; if (pri) b.className = 'pri';
    b.innerHTML = `<span class="ic" aria-hidden="true">${ic}</span><span>${t}${sub ? `<small>${sub}</small>` : ''}</span>`; b.onclick = () => { click(); fn(); }; return b; };
  const folha = (html) => { m.innerHTML = `<div class="folha">${html}</div>`; m.hidden = false; return m.querySelector('.folha'); };
  const voltar = (f, txt = 'Voltar') => { const b = document.createElement('button'); b.type = 'button'; b.className = 'voltar'; b.textContent = txt; b.onclick = () => { click(); f(); }; return b; };

  // ---------- a tela de início: o vale aparece atrás, já montado
  function inicio() { tela = 'inicio'; deOnde = 'inicio'; const s = ctx.estado(), f = folha(`<p class="tit">Afluente</p><p class="sub">o vale da nascente</p>${s.recorde ? `<div class="rec"><span>🏆 recorde: ${s.recorde} pessoas</span>${s.partidas ? `<span>🌄 ${s.partidas} vale${s.partidas === 1 ? '' : 's'}</span>` : ''}</div>` : ''}<div class="bts"></div>`), b = f.querySelector('.bts');
    const hoje = s.diarioFeito ? `hoje você fez ${s.diarioFeito} pessoas` : 'o mesmo vale para todo mundo, hoje';
    if (s.salva) b.append(btn('▶️', 'Continuar', `${s.salva.nome} · jogada ${s.salva.jogadas} · 👥 ${s.salva.gente}`, fechar, true));
    else if (s.fim) b.append(btn('🌄', 'Olhar o vale', `a partida acabou com ${s.fim} pessoas`, fechar));
    else b.append(btn('▶️', 'Jogar', s.atual.seed === s.diario ? `vale do dia · ${hoje}` : s.atual.nome, fechar, true));
    if (s.atual.seed !== s.diario) b.append(btn('🌅', 'Vale do dia', hoje, () => conf('Jogar o vale do dia?', 'A partida de agora fica para trás.', ctx.diario, !!s.salva)));
    b.append(btn('🎲', 'Vale novo', 'um vale sorteado', () => conf('Começar um vale novo?', 'A partida de agora fica para trás.', ctx.novo, !!s.salva), !!s.fim));
    b.append(btn('📖', 'Como jogar', 'as regras em seis cartões', comoJogar), btn('⚙️', 'Ajustes', 'som, vibração, gráficos', ajustes));
    f.querySelector('button').focus({ preventScroll: true }); }
  // ---------- pausa (☰ durante o jogo)
  function pausa() { tela = 'pausa'; deOnde = 'pausa'; const s = ctx.estado(), f = folha(`<h2>Pausa</h2><div class="bts"></div>`), b = f.querySelector('.bts');
    b.append(btn('▶️', 'Voltar ao vale', `${s.atual.nome} · jogada ${s.atual.jogadas} · 🧩 ${s.atual.pilha} na pilha`, fechar, true));
    if (s.atual.podePassar) b.append(btn('↷', 'Passar a peça', 'ela vai embora e a jogada conta', () => conf('Passar a peça na mão?', 'Ela sai da pilha sem ser colocada, e o relógio das estações anda uma jogada.', () => { fechar(); ctx.passar(); }, true)));
    b.append(btn('📖', 'Como jogar', '', comoJogar), btn('🌱', 'A história do vale', '', () => { fechar(); ctx.historia(); }), btn('⚙️', 'Ajustes', '', ajustes));
    b.append(btn('🔁', 'Recomeçar este vale', 'o mesmo sorteio, do começo', () => conf('Recomeçar este vale?', 'O que você fez nele se perde.', ctx.recomecar, true)));
    b.append(btn('🏡', 'Menu inicial', 'vale do dia, vale novo', inicio)); }
  // ---------- como jogar
  function comoJogar() { tela = 'regras'; const f = folha(`<h2>Como jogar</h2>${REGRAS.map(([i, t, x]) => `<div class="regra"><span class="ic" aria-hidden="true">${i}</span><div><b>${t}</b><p>${x}</p></div></div>`).join('')}
      <div class="ctl"><b>No mapa:</b> arraste para andar · pinça para aproximar · dois dedos girando para virar o vale (a peça da mão gira junto) · toque nas plaquinhas para entender.</div>`);
    f.append(voltar(() => deOnde === 'pausa' ? pausa() : inicio())); }
  // ---------- ajustes
  function ajustes() { tela = 'ajustes'; const a = ctx.ajustes(), f = folha(`<h2>Ajustes</h2>
      <div class="aj"><span>Som</span><button type="button" class="sw" data-k="som" aria-pressed="${a.som}">${a.som ? 'Ligado' : 'Desligado'}</button></div>
      <div class="aj"><span>Vibração<small>nos toques e no baque da peça</small></span><button type="button" class="sw" data-k="vib" aria-pressed="${a.vib}">${a.vib ? 'Ligada' : 'Desligada'}</button></div>
      <div class="aj"><span>Gráficos<small>Auto ajusta sozinho ao celular</small></span><div class="chips" data-k="q">${[['auto', 'Auto'], ['2', 'Leve'], ['1', 'Médio'], ['0', 'Alto']].map(([v, t]) => `<button type="button" data-v="${v}" aria-pressed="${String(a.q) === v}">${t}</button>`).join('')}</div></div>
      <div class="aj"><span>Botões de girar<small>⟲ ⟳ no canto do mapa</small></span><button type="button" class="sw" data-k="giro" aria-pressed="${a.giro}">${a.giro ? 'Mostrar' : 'Esconder'}</button></div>`);
    f.querySelectorAll('.sw').forEach(b => b.onclick = () => { click(); const k = b.dataset.k; ctx.ajustar(k, b.getAttribute('aria-pressed') !== 'true'); ajustes(); });
    f.querySelectorAll('.chips button').forEach(b => b.onclick = () => { click(); ctx.ajustar('q', b.dataset.v === 'auto' ? 'auto' : +b.dataset.v); ajustes(); });
    f.append(voltar(() => deOnde === 'pausa' ? pausa() : inicio())); }
  // ---------- confirmação (só pergunta quando há o que perder)
  function conf(t, p, sim, perguntar = true) { if (!perguntar) { sim(); return; }
    cf.innerHTML = `<div class="folha"><h2>${t}</h2>${p ? `<p>${p}</p>` : ''}<div class="bts"><button type="button" class="nao">Não</button><button type="button" class="pri sim">Sim</button></div></div>`; cf.hidden = false;
    cf.querySelector('.nao').onclick = () => { click(); cf.hidden = true; }; cf.querySelector('.sim').onclick = () => { click(); cf.hidden = true; sim(); }; cf.querySelector('.sim').focus({ preventScroll: true }); }
  function fechar() { m.hidden = true; tela = null; if (ctx.fechou) ctx.fechou(); }
  mb.onclick = () => { click(); if (m.hidden) pausa(); else fechar(); };
  addEventListener('keydown', e => { if (e.key !== 'Escape') return; if (!cf.hidden) { cf.hidden = true; return; } if (m.hidden) pausa(); else if (tela === 'regras' || tela === 'ajustes') (deOnde === 'pausa' ? pausa : inicio)(); else if (tela === 'pausa') fechar(); });
  return { inicio, pausa, comoJogar, fechar, aberto: () => !m.hidden || !cf.hidden, conf };
}
