(function () {
  'use strict';
  const core = window.KaijuCore, audio = window.KaijuAudio;
  const $ = selector => document.querySelector(selector);
  const board = $('#board'), cells = [];
  const reducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)');
  const SAVE_KEY = 'kaiju2048.campaign.v2';
  const SHAPES = {
    row: 'LINHA HORIZONTAL', column: 'COLUNA', 'diag-down': 'DIAGONAL ↘',
    'diag-up': 'DIAGONAL ↗', x: 'X DIAGONAL', cross: 'CRUZ +',
    square3: 'ÁREA 3×3', box2: 'ÁREA 2×2', single: 'ALVO ÚNICO', seal: 'SELO DE BLOCO'
  };
  const KAIJU_COLORS = {
    gunner: ['#b14cff', '#7b418f', '#2b1439', '#f7cbff'],
    piercer: ['#80d0ff', '#498ca0', '#122a39', '#d5f4ff'],
    reaper: ['#ff1493', '#aa307b', '#301426', '#ffd6ef'],
    devastator: ['#5fd068', '#3c8044', '#142917', '#e0ffe0'],
    hunter: ['#ff4c8a', '#a83d57', '#2e1423', '#ffe0e8'],
    jailer: ['#8ee65b', '#5d913b', '#1c2d19', '#dcffc5'],
    architect: ['#ff4c4c', '#a5363b', '#2a1119', '#ffe1c9']
  };
  const TYPES = { chassis: 'CHASSIS / ROBÔ', head: 'CABEÇA / INFORMAÇÃO', arm: 'BRAÇO / AÇÃO', leg: 'PERNAS / MOVIMENTO' };
  let progress = loadProgress();
  let selectedBuild = sanitizeBuild(progress.build || {});
  let pendingLevel = progress.unlocked;
  let state = core.createGame(Math.random, pendingLevel, selectedBuild);
  let turnStart = core.copy(state);
  let started = false, busy = false, attackAnimating = false;
  let mode = null, firstSwap = null, pointerStart = null, suppressClickUntil = 0, toastTimer = 0;

  for (let index = 0; index < 16; index++) {
    const cell = document.createElement('button');
    cell.type = 'button'; cell.className = 'cell'; cell.setAttribute('role', 'gridcell');
    cell.dataset.index = String(index); board.appendChild(cell); cells.push(cell);
  }
  function loadProgress() {
    try {
      const raw = JSON.parse(localStorage.getItem(SAVE_KEY) || '{}');
      return { unlocked: Number.isInteger(raw.unlocked) ? Math.max(0, Math.min(core.LEVELS.length - 1, raw.unlocked)) : 0,
        completed: Array.isArray(raw.completed) ? raw.completed.map(Boolean) : [],
        challenges: Array.isArray(raw.challenges) ? raw.challenges.map(Boolean) : [], build: raw.build || {} };
    } catch (_) { return { unlocked: 0, completed: [], challenges: [], build: {} }; }
  }
  function saveProgress() { try { localStorage.setItem(SAVE_KEY, JSON.stringify(progress)); } catch (_) {} }
  function completedCount() { return progress.completed.filter(Boolean).length; }
  function sanitizeBuild(build) {
    const normalized = core.normalizeBuild(build), count = completedCount();
    for (const type of Object.keys(core.PARTS)) {
      const part = core.PARTS[type].find(item => item.id === normalized[type]);
      if (part.unlock > count) normalized[type] = core.PARTS[type][0].id;
    }
    return normalized;
  }
  function part(type, id) { return core.PARTS[type].find(item => item.id === id); }
  function sound(event, options) { audio?.play(event, options); }
  function delay(ms) { return new Promise(resolve => setTimeout(resolve, ms)); }
  function kaijuArt(level) {
    const art = core.KAIJUS[level.kaiju].art;
    return art === 'artilheiro' ? 'assets/portraits/kaijus/artilheiro.svg' : `assets/sprites/kaijus/${art}/idle.svg`;
  }
  function applyKaijuTheme(level) {
    const names = ['--kaiju-accent', '--kaiju-border', '--kaiju-shadow', '--kaiju-soft'];
    KAIJU_COLORS[level.kaiju].forEach((color, index) => document.documentElement.style.setProperty(names[index], color));
  }
  function toast(message) {
    const node = $('#toast'); node.textContent = message; node.classList.add('show');
    clearTimeout(toastTimer); toastTimer = setTimeout(() => node.classList.remove('show'), 1700);
  }
  function flash(kind) {
    if (reducedMotion.matches) return;
    const node = $('#screenFlash'); node.className = ''; void node.offsetWidth;
    node.classList.add(kind); setTimeout(() => node.classList.remove(kind), 340);
  }
  function shake() {
    if (reducedMotion.matches) return;
    const node = $('#app'); node.classList.remove('shake'); void node.offsetWidth;
    node.classList.add('shake'); setTimeout(() => node.classList.remove('shake'), 250);
  }
  function burst(index, color, count = 9) {
    if (reducedMotion.matches) return;
    const rect = cells[index].getBoundingClientRect(), x = rect.left + rect.width / 2, y = rect.top + rect.height / 2;
    for (let i = 0; i < count; i++) {
      const node = document.createElement('i'), angle = i / count * Math.PI * 2, distance = 18 + Math.random() * 35;
      node.className = 'fx-particle'; node.style.left = `${x}px`; node.style.top = `${y}px`;
      node.style.setProperty('--fx-color', color);
      node.style.setProperty('--dx', `${Math.cos(angle) * distance}px`);
      node.style.setProperty('--dy', `${Math.sin(angle) * distance}px`);
      $('#fxLayer').appendChild(node);
      node.addEventListener('animationend', () => node.remove(), { once: true });
      setTimeout(() => node.remove(), 650);
    }
  }

  // Every piece is a separate pixel-art layer; both the briefing and board
  // render the same assembled silhouette, so equipment is visible in play.
  function robotSvg(build) {
    const torso = build.chassis === 'flux'
      ? '<rect x="19" y="27" width="26" height="23" fill="#101018"/><rect x="21" y="29" width="22" height="18" fill="#6B2D8C"/><rect x="25" y="31" width="14" height="12" fill="#B14CFF"/>'
      : '<rect x="19" y="27" width="26" height="23" fill="#101018"/><rect x="21" y="29" width="22" height="18" fill="#3098A0"/><rect x="25" y="31" width="14" height="12" fill="#4FE0E0"/>';
    const legs = {
      standard: '<rect x="20" y="48" width="10" height="13" fill="#101018"/><rect x="34" y="48" width="10" height="13" fill="#101018"/><rect x="22" y="49" width="6" height="9" fill="#3098A0"/><rect x="36" y="49" width="6" height="9" fill="#3098A0"/>',
      vector: '<rect x="18" y="47" width="12" height="15" fill="#101018"/><rect x="34" y="47" width="12" height="15" fill="#101018"/><rect x="20" y="49" width="8" height="9" fill="#80D0FF"/><rect x="36" y="49" width="8" height="9" fill="#80D0FF"/><rect x="19" y="57" width="10" height="3" fill="#FFD93D"/><rect x="35" y="57" width="10" height="3" fill="#FFD93D"/>',
      strider: '<path d="M21 48h9v5h-4v6h-12v-4h5v-7zm13 0h9v7h6v4H37v-6h-3z" fill="#101018"/><path d="M22 49h6v4h-5v4h-6v-2h4zm14 0h6v6h5v2h-7v-4h-4z" fill="#5FD068"/>',
      transposer: '<rect x="18" y="47" width="12" height="14" fill="#101018"/><rect x="34" y="47" width="12" height="14" fill="#101018"/><rect x="20" y="49" width="8" height="9" fill="#B14CFF"/><rect x="36" y="49" width="8" height="9" fill="#B14CFF"/><rect x="21" y="55" width="6" height="2" fill="#00FFCC"/><rect x="37" y="55" width="6" height="2" fill="#00FFCC"/>'
    }[build.leg];
    const arms = {
      discharge: '<rect x="8" y="30" width="13" height="17" fill="#101018"/><rect x="43" y="30" width="13" height="17" fill="#101018"/><rect x="10" y="32" width="9" height="12" fill="#FF8C42"/><rect x="45" y="32" width="9" height="12" fill="#FF8C42"/><rect x="8" y="36" width="5" height="4" fill="#FFD93D"/><rect x="51" y="36" width="5" height="4" fill="#FFD93D"/>',
      cryo: '<rect x="7" y="28" width="14" height="20" fill="#101018"/><rect x="43" y="30" width="13" height="17" fill="#101018"/><rect x="9" y="30" width="10" height="15" fill="#80D0FF"/><rect x="45" y="32" width="9" height="12" fill="#3098A0"/><rect x="5" y="32" width="4" height="9" fill="#F0F0F8"/>',
      aegis: '<rect x="5" y="27" width="16" height="23" fill="#101018"/><rect x="43" y="30" width="13" height="17" fill="#101018"/><rect x="7" y="29" width="12" height="19" fill="#4FE0E0"/><rect x="10" y="32" width="6" height="12" fill="#80F0F0"/><rect x="45" y="32" width="9" height="12" fill="#3098A0"/>',
      permuter: '<rect x="7" y="30" width="14" height="17" fill="#101018"/><rect x="43" y="30" width="14" height="17" fill="#101018"/><rect x="9" y="32" width="10" height="12" fill="#B14CFF"/><rect x="45" y="32" width="10" height="12" fill="#B14CFF"/><rect x="6" y="35" width="5" height="5" fill="#00FFCC"/><rect x="53" y="35" width="5" height="5" fill="#00FFCC"/>'
    }[build.arm];
    const head = {
      optic: '<rect x="22" y="13" width="20" height="16" fill="#101018"/><rect x="24" y="15" width="16" height="11" fill="#4FE0E0"/><rect x="27" y="19" width="10" height="4" fill="#FFD93D"/>',
      predictor: '<rect x="22" y="12" width="20" height="17" fill="#101018"/><rect x="24" y="14" width="16" height="12" fill="#80D0FF"/><rect x="27" y="18" width="10" height="4" fill="#FFD93D"/><rect x="30" y="6" width="4" height="7" fill="#101018"/><rect x="31" y="5" width="2" height="4" fill="#FF4C4C"/>',
      scanner: '<rect x="20" y="12" width="24" height="17" fill="#101018"/><rect x="22" y="14" width="20" height="12" fill="#5FD068"/><rect x="24" y="18" width="6" height="5" fill="#FFD93D"/><rect x="34" y="18" width="6" height="5" fill="#FFD93D"/><rect x="19" y="17" width="4" height="7" fill="#101018"/><rect x="41" y="17" width="4" height="7" fill="#101018"/>'
    }[build.head];
    return `<svg viewBox="0 0 64 64" xmlns="http://www.w3.org/2000/svg" shape-rendering="crispEdges" aria-hidden="true"><rect x="27" y="24" width="10" height="7" fill="#101018"/>${legs}${torso}${arms}<rect x="29" y="35" width="6" height="6" fill="#FFD93D"/>${head}</svg>`;
  }

  function showDialog(dialog) {
    dialog.tabIndex = -1;
    dialog.showModal();
    dialog.focus({ preventScroll: true });
    dialog.scrollTop = 0;
    requestAnimationFrame(() => { dialog.scrollTop = 0; });
  }

  function openBriefing(levelIndex) {
    pendingLevel = levelIndex;
    selectedBuild = sanitizeBuild(selectedBuild);
    const level = core.LEVELS[levelIndex], kaiju = core.KAIJUS[level.kaiju];
    applyKaijuTheme(level);
    $('#briefSector').textContent = `SETOR ${String(levelIndex + 1).padStart(2, '0')} / ${String(core.LEVELS.length).padStart(2, '0')}`;
    $('#briefKaiju').src = kaijuArt(level); $('#briefKaiju').alt = kaiju.name;
    $('#briefKaijuName').textContent = kaiju.name.toUpperCase();
    $('#briefKaijuRules').textContent = `Mira ${kaiju.aim === 'mech' ? 'o robô' : 'o maior bloco'}. ${kaiju.normal}. ${kaiju.special === 'Nenhum' ? 'Sem especial.' : `Especial: ${kaiju.special}.`} A área anunciada não muda.`;
    $('#briefGoal').textContent = `${core.goalLabel(level.goal)} após a resolução do Kaiju.`;
    $('#briefLimit').textContent = `LIMITE ${level.limit} TURNOS · EXTRA: ${level.challenge.label}`;
    renderBuildOptions();
    $('#buildGroups').scrollTop = 0;
    showDialog($('#briefingDialog'));
  }
  function renderBuildOptions() {
    const groups = $('#buildGroups'); groups.replaceChildren();
    const count = completedCount();
    for (const type of Object.keys(core.PARTS)) {
      const group = document.createElement('section'); group.className = 'build-group';
      const title = document.createElement('strong'); title.textContent = TYPES[type]; group.appendChild(title);
      const options = document.createElement('div'); options.className = 'build-options';
      for (const item of core.PARTS[type]) {
        const button = document.createElement('button'); button.type = 'button';
        const locked = item.unlock > count;
        button.className = `part-option${selectedBuild[type] === item.id ? ' selected' : ''}${locked ? ' locked' : ''}`;
        button.disabled = locked; button.dataset.type = type; button.dataset.part = item.id;
        button.innerHTML = `<b>${item.name}</b><small>${locked ? `LIBERA APÓS FASE ${item.unlock}` : item.text}</small>`;
        button.setAttribute('aria-pressed', String(selectedBuild[type] === item.id));
        options.appendChild(button);
      }
      group.appendChild(options); groups.appendChild(group);
    }
    $('#briefRobot').innerHTML = robotSvg(selectedBuild);
  }
  function renderLevelList() {
    const list = $('#levelList'); list.replaceChildren();
    core.LEVELS.forEach((level, i) => {
      const button = document.createElement('button'), locked = i > progress.unlocked;
      button.type = 'button'; button.disabled = locked; button.dataset.level = String(i);
      button.className = `level-card${i === state.level ? ' current' : ''}`;
      button.innerHTML = `<span class="level-number">${String(i + 1).padStart(2, '0')}</span><span class="level-copy"><strong>${level.name.toUpperCase()}</strong><small>${core.goalLabel(level.goal)} · ${core.KAIJUS[level.kaiju].name}</small></span><span class="level-mark">${locked ? '▣' : progress.challenges[i] ? '★' : progress.completed[i] ? '✓' : '›'}</span>`;
      button.setAttribute('aria-label', `${level.name}, ${locked ? 'bloqueada' : 'disponível'}`);
      list.appendChild(button);
    });
  }

  function cellLabel(i, prediction) {
    const tile = state.tiles[i];
    let label = `Linha ${core.row(i) + 1}, coluna ${core.col(i) + 1}: ${i === state.mech ? 'robô' : tile ? `bloco ${tile.value}` : 'vazia'}`;
    if (tile?.sealed) label += `, selado até fusão ${tile.sealed} ou maior`;
    if (tile?.shielded) label += ', protegido';
    if (i === state.frozenIndex) label += ', congelado';
    if (prediction.cells.includes(i)) label += ', na área anunciada';
    if (prediction.targets?.some(t => t.index === i)) label += ', alvo previsto';
    return label;
  }
  function renderBoard(mergeIndexes = [], spawnIndex = null) {
    const prediction = core.forecast(state);
    const legTargets = mode === 'leg' && !busy ? new Set(core.legalLegTargets(state)) : new Set();
    const armTargets = mode === 'arm' && !busy ? new Set(core.legalArmTargets(state)) :
      mode === 'arm-second' && !busy ? new Set(core.legalArmTargets(state, firstSwap)) : new Set();
    for (let i = 0; i < 16; i++) {
      const tile = state.tiles[i], isMech = i === state.mech;
      const classes = ['cell'];
      if (tile) {
        classes.push('tile', `v${tile.value <= 2048 ? tile.value : 'high'}`);
        if (tile.value >= 128 && tile.value !== 512 && tile.value !== 2048) classes.push('high');
        if (tile.value >= 1024) classes.push('long');
        if (tile.shielded) classes.push('shielded');
        if (tile.sealed) classes.push('sealed');
        if (i === state.frozenIndex) classes.push('frozen');
      }
      if (isMech) classes.push('mech');
      if (prediction.kind !== 'cancelled' && prediction.cells.includes(i)) classes.push(prediction.kind === 'charge' ? 'windup' : 'threat');
      if (prediction.targets?.some(t => t.index === i) || prediction.kind === 'seal' && prediction.valid && prediction.target === i) classes.push('hit-target');
      if (legTargets.has(i) || armTargets.has(i)) classes.push('selectable');
      if (armTargets.has(i)) classes.push('arm-select');
      if (mergeIndexes.includes(i)) classes.push('merge-pop');
      if (spawnIndex === i) classes.push('spawn-pop');
      cells[i].className = classes.join(' ');
      cells[i].setAttribute('aria-label', cellLabel(i, prediction));
      if (isMech) cells[i].innerHTML = robotSvg(state.build);
      else if (tile) cells[i].innerHTML = `<span class="tile-value">${tile.value}</span>${tile.sealed ? '<span class="tile-status">▣</span>' : tile.shielded ? '<span class="tile-status">◆</span>' : i === state.frozenIndex ? '<span class="tile-status">✳</span>' : ''}`;
      else cells[i].textContent = '';
    }
  }
  function forecastSentence(prediction) {
    if (prediction.kind === 'charge') return `PREPARANDO ESPECIAL: ${SHAPES[prediction.shape]}. Não ataca neste turno; área travada para o próximo.`;
    if (prediction.kind === 'cancelled') return 'DESCARGA INTERROMPEU O ATAQUE DESTE TURNO.';
    if (prediction.kind === 'seal') return prediction.valid ? `SELARÁ O BLOCO ${prediction.value} MARCADO; liberte com fusão ${prediction.value}+.` : 'SELO FALHARÁ: O BLOCO MARCADO SAIU DA CASA.';
    const destroyed = prediction.targets.filter(t => !t.blocked), blocked = prediction.targets.filter(t => t.blocked);
    const pieces = [];
    if (destroyed.length) pieces.push(`${destroyed.length > 1 ? 'BLOCOS' : 'BLOCO'} ${destroyed.map(t => t.value).join(' + ')} ${destroyed.length > 1 ? 'DESTRUÍDOS' : 'DESTRUÍDO'}`);
    if (blocked.length) pieces.push(`${blocked.length} BLOCO${blocked.length > 1 ? 'S' : ''} PROTEGIDO${blocked.length > 1 ? 'S' : ''}`);
    if (prediction.mechDamage) pieces.push(`ROBÔ −${prediction.mechDamage} PV`);
    return pieces.length ? pieces.join(' · ') : 'ATAQUE ERRARÁ: NENHUM ALVO NA ÁREA.';
  }
  function hint() {
    if (attackAnimating) return 'Kaiju resolvendo a intenção anunciada…';
    if (mode === 'leg') return state.build.leg === 'transposer' ? 'Toque um bloco adjacente para trocar com o robô.' : 'Toque uma casa destacada para mover o robô.';
    if (mode === 'arm-second') return 'Agora toque o segundo bloco vizinho para permutar.';
    if (mode === 'arm') return `Toque um bloco destacado para usar ${part('arm', state.build.arm).name}.`;
    if (state.didSlide && state.didReact) return 'Pronto. Confira a perda prevista e confirme.';
    if (state.didSlide) return 'Deslize feito. Você pode reagir ou confirmar.';
    if (state.didReact && !core.legalSlides(state).length) return 'Sem deslize após a reação. Desfaça e tente outra.';
    if (state.didReact) return 'Reação feita. Agora faça um deslize válido.';
    if (!core.legalSlides(state).length) return 'Grade travada. Use uma reação para abrir um deslize.';
    return 'Faça um deslize e, se quiser, uma reação antes ou depois.';
  }
  function headIntel() {
    if (state.build.head === 'predictor') return `PREDITOR · Próximo padrão: ${core.nextPattern(state)}.`;
    if (state.build.head === 'scanner') {
      const summary = core.DIRECTIONS.map(dir => {
        const merge = core.slideTiles(state, dir).merges;
        return `${{ up: '↑', right: '→', down: '↓', left: '←' }[dir]} ${merge.length ? Math.max(...merge.map(m => m.value)) : '—'}`;
      });
      return `SCANNER · Maior fusão por direção: ${summary.join('  ')}`;
    }
    return 'ÓPTICA · A área e as perdas previstas estão marcadas na grade.';
  }
  function render(mergeIndexes = [], spawnIndex = null) {
    const level = core.LEVELS[state.level], kaiju = core.KAIJUS[level.kaiju];
    applyKaijuTheme(level);
    const prediction = core.forecast(state), slides = new Set(core.legalSlides(state));
    const canReact = started && state.phase === 'playing' && !state.didReact && !busy;
    renderBoard(mergeIndexes, spawnIndex);
    $('#sectorEyebrow').textContent = `SETOR ${String(state.level + 1).padStart(2, '0')} / ${String(core.LEVELS.length).padStart(2, '0')} · ${level.name.toUpperCase()}`;
    $('#kaijuPortrait').src = kaijuArt(level); $('#kaijuPortrait').alt = `Kaiju ${kaiju.name}`;
    $('#kaijuName').textContent = kaiju.name.toUpperCase();
    $('#kaijuAbility').textContent = `Mira ${state.intent.aim === 'mech' ? 'o robô' : 'o maior bloco'}. ${kaiju.normal}.`;
    $('#intentBadge').textContent = `${state.intent.kind === 'charge' ? 'PREPARANDO ' : state.intent.special ? 'ESPECIAL · ' : ''}${SHAPES[state.intent.shape]}`;
    $('#intentBadge').classList.toggle('charge', state.intent.kind === 'charge' || state.intent.special);
    $('#forecastText').textContent = forecastSentence(prediction);
    $('#missionSector').textContent = `FASE ${String(state.level + 1).padStart(2, '0')} · ${level.name.toUpperCase()}`;
    $('#missionGoal').textContent = `${core.goalLabel(level.goal)} após o ataque.`;
    $('#missionGoal').style.color = core.goalSatisfied(state) ? '#5fd068' : '';
    $('#challengeText').textContent = `EXTRA · ${level.challenge.label}`;
    $('#turnValue').textContent = `${String(state.turn).padStart(2, '0')}/${level.limit}`;
    $('#boardStep').textContent = state.didSlide ? 'DESLIZE FEITO' : slides.size ? 'DESLIZE DISPONÍVEL' : 'GRADE TRAVADA';
    $('#boardStep').style.color = state.didSlide ? '#5fd068' : slides.size ? '#ffd93d' : '#ff4c4c';
    $('#gameRobot').innerHTML = robotSvg(state.build);
    $('#robotName').textContent = part('chassis', state.build.chassis).name.toUpperCase();
    $('#robotBuild').textContent = `${part('head', state.build.head).name} · ${part('arm', state.build.arm).name} · ${part('leg', state.build.leg).name}`;
    $('#hpValue').textContent = `${state.hp}/${state.maxHp}`;
    $('#hpFill').style.width = `${Math.max(0, state.hp / state.maxHp * 100)}%`;
    $('#reactionCount').textContent = state.didReact ? 'REAÇÃO USADA' : '1 REAÇÃO DISPONÍVEL';
    $('#nextValue').textContent = state.nextValue;
    $('#hintText').textContent = hint();
    $('#headIntel').textContent = headIntel();
    $('#legName').textContent = part('leg', state.build.leg).name.toUpperCase();
    $('#legHelp').textContent = state.build.leg === 'transposer' ? 'Trocar com bloco' : 'Mover robô';
    $('#armName').textContent = part('arm', state.build.arm).name.toUpperCase();
    $('#armHelp').textContent = state.build.arm === 'aegis' && state.turn < state.aegisReadyTurn ? 'Recarregando' :
      state.build.arm === 'discharge' ? 'Cancelar ataque' : state.build.arm === 'cryo' ? 'Ancorar bloco' : state.build.arm === 'aegis' ? 'Proteger bloco' : 'Trocar 2 blocos';
    for (const button of document.querySelectorAll('[data-direction]'))
      button.disabled = !started || busy || !slides.has(button.dataset.direction);
    $('#legButton').disabled = !canReact || !core.legalLegTargets(state).length;
    $('#armButton').disabled = !canReact || !core.legalArmTargets(state).length;
    $('#legButton').classList.toggle('selected', mode === 'leg');
    $('#armButton').classList.toggle('selected', mode === 'arm' || mode === 'arm-second');
    $('#legButton').setAttribute('aria-pressed', String(mode === 'leg'));
    $('#armButton').setAttribute('aria-pressed', String(mode === 'arm' || mode === 'arm-second'));
    $('#undoButton').disabled = !started || busy || state.phase !== 'playing' || !state.didSlide && !state.didReact;
    $('#confirmButton').disabled = !started || busy || state.phase !== 'playing' || !state.didSlide;
  }

  async function animateSlide(motions) {
    if (reducedMotion.matches || !Element.prototype.animate) return;
    const moving = motions.filter(m => m.from !== m.to || m.merged), ghosts = [], hidden = new Set(), promises = [];
    for (const motion of moving) {
      const source = cells[motion.from], start = source.getBoundingClientRect(), end = cells[motion.to].getBoundingClientRect();
      const ghost = source.cloneNode(true); ghost.removeAttribute('id');
      Object.assign(ghost.style, { position: 'fixed', left: `${start.left}px`, top: `${start.top}px`,
        width: `${start.width}px`, height: `${start.height}px`, pointerEvents: 'none', zIndex: '61' });
      $('#fxLayer').appendChild(ghost); ghosts.push(ghost); source.style.visibility = 'hidden'; hidden.add(source);
      const animation = ghost.animate([{ transform: 'translate(0,0)' },
        { transform: `translate(${end.left - start.left}px,${end.top - start.top}px)` }],
        { duration: 190, easing: 'cubic-bezier(.22,.75,.25,1)', fill: 'forwards' });
      promises.push(animation.finished.catch(() => {}));
    }
    await Promise.all(promises);
    ghosts.forEach(node => node.remove()); hidden.forEach(node => { node.style.visibility = ''; });
  }
  async function slide(direction) {
    if (!started || busy || state.phase !== 'playing' || anyDialogOpen()) return;
    const result = core.slide(state, direction);
    if (!result.ok) { sound('blocked'); toast(result.reason === 'no-change' ? 'ESSA DIREÇÃO NÃO MOVE BLOCOS' : 'DESLIZE INDISPONÍVEL'); return; }
    busy = true; mode = null; firstSwap = null; sound('slide');
    try { await animateSlide(result.motions); } finally { busy = false; }
    state = result.state; render(result.merges.map(m => m.to));
    for (const merge of result.merges) {
      sound('merge', { value: merge.value }); burst(merge.to, merge.value >= 32 ? '#ff8c42' : '#ffd93d', merge.value >= 32 ? 14 : 8);
      if (merge.value >= 32) { flash('win'); shake(); }
    }
    for (const released of result.released) burst(released, '#b14cff', 9);
    if (result.merges.length) toast(result.merges.length > 1 ? `${result.merges.length} FUSÕES!` : `FUSÃO ${result.merges[0].value}!`);
  }
  function chooseMode(next) {
    if (!started || busy || state.phase !== 'playing' || state.didReact || anyDialogOpen()) return;
    const legal = next === 'leg' ? core.legalLegTargets(state) : core.legalArmTargets(state);
    if (!legal.length) return;
    mode = mode === next ? null : next; firstSwap = null; sound('ui'); render();
  }
  function onCell(index) {
    if (!started || busy || state.phase !== 'playing' || anyDialogOpen() || performance.now() < suppressClickUntil) return;
    if (mode === 'leg') {
      const result = core.useLeg(state, index);
      if (!result.ok) { sound('blocked'); toast('ESCOLHA UMA CASA OU BLOCO DESTACADO'); return; }
      state = result.state; mode = null; sound('move'); render(); burst(index, '#4fe0e0', 5); return;
    }
    if (mode === 'arm' && state.build.arm === 'permuter') {
      if (!core.legalArmTargets(state).includes(index)) { sound('blocked'); return; }
      firstSwap = index; mode = 'arm-second'; sound('ui'); render(); return;
    }
    if (mode === 'arm' || mode === 'arm-second') {
      const result = core.useArm(state, mode === 'arm-second' ? firstSwap : index, mode === 'arm-second' ? index : null);
      if (!result.ok) { sound('blocked'); toast('ESCOLHA UM BLOCO DESTACADO'); return; }
      state = result.state; mode = null; firstSwap = null;
      sound(state.build.arm === 'discharge' ? 'shot' : 'ui'); render();
      burst(index, state.build.arm === 'cryo' ? '#80d0ff' : state.build.arm === 'aegis' ? '#4fe0e0' : '#ffd93d', 10);
      toast(`${part('arm', state.build.arm).name.toUpperCase()} ATIVADO`); return;
    }
    if (index === state.mech && !state.didReact) chooseMode('leg');
    else if (core.legalArmTargets(state).includes(index)) toast(`TOQUE EM ${part('arm', state.build.arm).name.toUpperCase()} PARA USAR O BRAÇO`);
  }
  function undo() {
    if (!started || busy || state.phase !== 'playing' || !state.didSlide && !state.didReact) return;
    state = core.copy(turnStart); mode = null; firstSwap = null; sound('ui'); render(); toast('JOGADA DESFEITA');
  }
  async function confirm() {
    if (!started || busy || state.phase !== 'playing' || anyDialogOpen()) return;
    if (!state.didSlide) { sound('blocked'); toast('FAÇA UM DESLIZE VÁLIDO'); return; }
    busy = true; mode = null; firstSwap = null; attackAnimating = true;
    const prediction = core.forecast(state); render();
    if (prediction.kind === 'attack' || prediction.kind === 'seal') {
      sound('enemy', { kind: core.LEVELS[state.level].kaiju });
      for (const i of prediction.cells) cells[i].classList.add('firing');
    } else if (prediction.kind === 'charge') sound('ui');
    await delay(reducedMotion.matches ? 30 : 270);
    const result = core.commit(state);
    if (!result.ok) { busy = false; attackAnimating = false; render(); return; }
    const interim = core.copy(state);
    for (const loss of result.lostTiles) { interim.tiles[loss.index] = null; burst(loss.index, '#ff2020', 11); }
    interim.hp = result.state.hp;
    if (prediction.kind === 'seal' && prediction.valid) interim.tiles[prediction.target].sealed = prediction.value;
    if (prediction.mechDamage) { sound('hit'); flash('hit'); shake(); burst(state.mech, '#ff2020', 13); }
    if (prediction.kind === 'charge') toast('KAIJU PREPARA UM ESPECIAL!');
    else if (prediction.kind === 'cancelled') toast('ATAQUE CANCELADO');
    else if (prediction.kind === 'seal') toast(prediction.valid ? `BLOCO ${prediction.value} SELADO` : 'SELO EVITADO');
    else toast(result.lostTiles.length || prediction.mechDamage ? 'ATAQUE RESOLVIDO' : 'ATAQUE ERROU');
    state = interim; render();
    await delay(reducedMotion.matches ? 25 : 210);
    state = result.state; turnStart = core.copy(state); attackAnimating = false; busy = false;
    render([], result.spawn?.index ?? null);
    if (result.spawn) { sound('spawn'); burst(result.spawn.index, '#f0f0f8', 5); }
    if (state.phase === 'won') { sound('win'); flash('win'); showResult(true); }
    else if (state.phase === 'lost') { sound('lose'); showResult(false); }
  }
  function showResult(won) {
    const level = core.LEVELS[state.level], bonus = core.challengeComplete(state), dialog = $('#resultDialog');
    if (won) {
      progress.completed[state.level] = true; if (bonus) progress.challenges[state.level] = true;
      progress.unlocked = Math.max(progress.unlocked, Math.min(core.LEVELS.length - 1, state.level + 1));
      progress.build = { ...selectedBuild }; saveProgress();
    }
    dialog.classList.toggle('lost', !won);
    $('#resultTag').textContent = won ? `SETOR ${String(state.level + 1).padStart(2, '0')} CONCLUÍDO` : 'MISSÃO FALHOU';
    $('#resultSymbol').textContent = won ? level.goal.kind === 'reach' ? level.goal.value : '✓' : '×';
    $('#resultTitle').textContent = won ? state.level === core.LEVELS.length - 1 ? 'Cidade salva!' : 'Setor protegido!' : 'O Kaiju venceu esta rodada.';
    $('#resultDescription').textContent = won
      ? `${core.goalLabel(level.goal)} resistiu à resolução. ${state.level === core.LEVELS.length - 1 ? 'A campanha foi concluída.' : 'A próxima fase e novas peças foram liberadas.'}`
      : state.hp <= 0 ? 'O robô ficou sem PV. Reposicione-o antes de confirmar ataques perigosos.'
        : state.turn >= level.limit ? 'O limite de turnos acabou. Procure uma fusão mais direta.'
          : 'A grade travou. Troque a build ou preserve mais espaço livre.';
    $('#resultChallenge').textContent = won ? bonus ? `★ DESAFIO EXTRA CUMPRIDO · ${level.challenge.label}` : `DESAFIO EXTRA NÃO CUMPRIDO · ${level.challenge.label}` : `DESAFIO EXTRA · ${level.challenge.label}`;
    $('#resultStats').innerHTML = `<div>TURNOS<b>${state.turn}</b></div><div>FUSÕES<b>${state.totalMerges}</b></div><div>MAIOR<b>${core.maxTile(state)}</b></div>`;
    $('#continueButton').hidden = !won || state.level === core.LEVELS.length - 1;
    $('#retryButton').textContent = won ? 'REJOGAR FASE' : 'TENTAR NOVAMENTE';
    showDialog(dialog);
  }
  function anyDialogOpen() { return ['briefingDialog', 'resultDialog', 'levelDialog', 'helpDialog'].some(id => $(`#${id}`).open); }
  function updateSoundButton() {
    const button = $('#soundButton');
    if (!audio?.isSupported()) { button.disabled = true; button.textContent = '×'; button.setAttribute('aria-label', 'Som indisponível'); return; }
    button.textContent = audio.isMuted() ? '◖×' : '◖))';
    button.setAttribute('aria-label', audio.isMuted() ? 'Ativar som' : 'Desativar som');
    button.setAttribute('aria-pressed', String(!audio.isMuted()));
  }

  document.addEventListener('pointerdown', () => audio?.unlock(), { capture: true, once: true });
  document.addEventListener('keydown', () => audio?.unlock(), { capture: true, once: true });
  $('#soundButton').addEventListener('click', () => { audio?.setMuted(!audio.isMuted()); updateSoundButton(); sound('ui'); });
  $('#levelButton').addEventListener('click', () => { if (busy) return; renderLevelList(); showDialog($('#levelDialog')); });
  $('#closeLevelButton').addEventListener('click', () => $('#levelDialog').close());
  $('#levelList').addEventListener('click', event => {
    const button = event.target.closest('[data-level]'); if (!button || button.disabled) return;
    const index = Number(button.dataset.level); $('#levelDialog').close(); openBriefing(index);
  });
  $('#helpButton').addEventListener('click', () => { if (!busy) showDialog($('#helpDialog')); });
  $('#closeHelpButton').addEventListener('click', () => $('#helpDialog').close());
  $('#buildGroups').addEventListener('click', event => {
    const button = event.target.closest('[data-part]'); if (!button || button.disabled) return;
    selectedBuild[button.dataset.type] = button.dataset.part; sound('ui'); renderBuildOptions();
  });
  $('#deployButton').addEventListener('click', () => {
    selectedBuild = sanitizeBuild(selectedBuild);
    progress.build = { ...selectedBuild }; saveProgress();
    state = core.createGame(Math.random, pendingLevel, selectedBuild);
    turnStart = core.copy(state); mode = null; firstSwap = null; started = true; busy = false;
    $('#briefingDialog').close(); render(); window.scrollTo({ top: 0, behavior: 'auto' });
  });
  $('#retryButton').addEventListener('click', () => {
    $('#resultDialog').close(); state = core.createGame(Math.random, state.level, selectedBuild);
    turnStart = core.copy(state); mode = null; started = true; render();
  });
  $('#changeBuildButton').addEventListener('click', () => { const level = state.level; $('#resultDialog').close(); openBriefing(level); });
  $('#continueButton').addEventListener('click', () => {
    const next = state.level + 1; if (next >= core.LEVELS.length) return;
    $('#resultDialog').close(); openBriefing(next);
  });
  $('#briefingDialog').addEventListener('cancel', event => event.preventDefault());
  $('#resultDialog').addEventListener('cancel', event => event.preventDefault());
  $('#legButton').addEventListener('click', () => chooseMode('leg'));
  $('#armButton').addEventListener('click', () => chooseMode('arm'));
  $('#undoButton').addEventListener('click', undo);
  $('#confirmButton').addEventListener('click', confirm);
  document.querySelectorAll('[data-direction]').forEach(button => button.addEventListener('click', () => slide(button.dataset.direction)));
  board.addEventListener('click', event => { const cell = event.target.closest('.cell'); if (cell) onCell(Number(cell.dataset.index)); });
  board.addEventListener('pointerdown', event => {
    if (event.pointerType === 'mouse' && event.button !== 0) return;
    pointerStart = { x: event.clientX, y: event.clientY, id: event.pointerId };
  });
  board.addEventListener('pointerup', event => {
    if (!pointerStart || pointerStart.id !== event.pointerId) return;
    const dx = event.clientX - pointerStart.x, dy = event.clientY - pointerStart.y;
    pointerStart = null;
    const major = Math.max(Math.abs(dx), Math.abs(dy)), minor = Math.min(Math.abs(dx), Math.abs(dy));
    if (major < 28) return;
    suppressClickUntil = performance.now() + 350;
    if (minor > major * .55) return;
    slide(Math.abs(dx) > Math.abs(dy) ? dx > 0 ? 'right' : 'left' : dy > 0 ? 'down' : 'up');
  });
  board.addEventListener('pointercancel', () => { pointerStart = null; });
  document.addEventListener('keydown', event => {
    if (anyDialogOpen() || busy || !started) return;
    if (event.key === 'Escape') { mode = null; firstSwap = null; render(); return; }
    const key = event.key.toLowerCase(), directions = { arrowup: 'up', w: 'up', arrowright: 'right', d: 'right', arrowdown: 'down', s: 'down', arrowleft: 'left', a: 'left' };
    if (directions[key]) { event.preventDefault(); slide(directions[key]); return; }
    if (key === 'm') { chooseMode('leg'); return; }
    if (key === 'f') { chooseMode('arm'); return; }
    if (key === 'z' && (event.ctrlKey || event.metaKey)) { event.preventDefault(); undo(); return; }
    if (event.key === 'Enter' && event.target.tagName !== 'BUTTON') { event.preventDefault(); confirm(); }
  });
  document.addEventListener('visibilitychange', () => { if (document.hidden) audio?.suspend(); });

  updateSoundButton(); render(); openBriefing(pendingLevel);
})();
