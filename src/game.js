(function () {
  'use strict';
  const C=window.RingCore,$=id=>document.getElementById(id);
  const canvas=$('board'),ctx=canvas.getContext('2d'),modal=$('modal');
  const colors=['#96ebd3','#baafff','#edc47c','#f28da7'],radii=[166,120,74],names=['Externo','Médio','Interno'];
  const rewardColors=['#62ffd1','#b995ff','#ffda72','#ff82ba'];
  const machine=document.querySelector('.machine');
  const SAVE='ring-break-save-0.2',ATLAS='ring-break-atlas-0.1',OPTIONS='ring-break-options-0.2',ONBOARD='ring-break-onboarding-0.2';
  const defaults={sound:true,speed:1,reduced:matchMedia('(prefers-reduced-motion: reduce)').matches};
  function read(key,fallback) {try{return JSON.parse(localStorage.getItem(key))||fallback;}catch{return fallback;}}
  let options={...defaults,...read(OPTIONS,{})},atlas=read(ATLAS,{}),selected=0,busy=false,ghost=null,drag=null;
  if(![1,2,4].includes(options.speed))options.speed=1;
  options.sound=Boolean(options.sound);options.reduced=Boolean(options.reduced);
  if(typeof atlas!=='object' || Array.isArray(atlas)) atlas={};
  let state=null,visual=null,audioContext=null,audioBus=null,audioPrimed=false,toastTimer=null;
  const fxCanvas=$('reward-fx'),fxContext=fxCanvas.getContext('2d');
  let effects=[],fxFrame=0,rewardTimer=0;
  const portrait=$('anomaly-portrait');let enemyTimer=0;
  function updateEnemy(s){
    const kind=s.mode==='free'?'free':C.ENCOUNTERS[s.encounter].kind,art=AnomalyArt.characters[kind];
    if(portrait.dataset.kind!==kind){
      clearTimeout(enemyTimer);delete portrait.dataset.reaction;
      portrait.innerHTML=AnomalyArt.svg(kind,'main');portrait.dataset.kind=kind;
    }
    const safe=!s.intent || s.intent.neutralized || s.intent.kind==='parasite' && s.locks[s.intent.edge]===0;
    portrait.dataset.pose=safe?'quiet':s.intent.count===1?'armed':'idle';
    portrait.style.setProperty('--enemy-accent',art.accent);
    const angle=(s.intent?.sector||0)*Math.PI/4-Math.PI/2;
    portrait.style.setProperty('--look-x',Math.cos(angle)*1.6+'px');portrait.style.setProperty('--look-y',Math.sin(angle)*1.6+'px');
    portrait.setAttribute('aria-label','Conhecer '+art.name+' — '+art.role);
    $('anomaly-role').textContent=art.role;
  }
  function reactEnemy(reaction){
    clearTimeout(enemyTimer);delete portrait.dataset.reaction;
    // Restart only this finite, local reaction. No idle animation or camera movement.
    if(!options.reduced)void portrait.offsetWidth;
    portrait.dataset.reaction=reaction;
    enemyTimer=setTimeout(()=>{delete portrait.dataset.reaction;},reaction==='broken'?520:300);
  }
  const format=n=>new Intl.NumberFormat('pt-BR',{maximumFractionDigits:1,notation:n>=100000?'compact':'standard'}).format(n);
  const esc=str=>String(str).replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
  const toneHTML=t=>'<span class="glyph t'+t+'" role="img" aria-label="'+C.TONES[t]+'"></span>';
  function persist() {
    try {localStorage.setItem(SAVE,JSON.stringify({version:C.VERSION,seed:state.seed,mode:state.mode,actions:state.actions}));localStorage.setItem(ATLAS,JSON.stringify(atlas));localStorage.setItem(OPTIONS,JSON.stringify(options));}
    catch {$('save-note').textContent='Este navegador não permitiu salvar o progresso.';}
  }
  function toast(text) {
    document.querySelector('.toast')?.remove();clearTimeout(toastTimer);
    const el=document.createElement('div');el.className='toast';el.textContent=text;document.body.append(el);
    toastTimer=setTimeout(()=>el.remove(),3200);
  }
  function feedback(text,preview=false) {$('feedback').textContent=text;$('feedback').classList.toggle('preview',preview);}
  function unlockAudio(force=false) {
    if(force)options.sound=true;
    if(!options.sound)return false;
    try {
      const AudioCtor=window.AudioContext||window.webkitAudioContext;
      if(!AudioCtor)return false;
      audioContext ||= new AudioCtor();
      if(!audioBus){
        audioBus=audioContext.createGain();audioBus.gain.value=.7;
        const limiter=audioContext.createDynamicsCompressor();limiter.threshold.value=-18;limiter.ratio.value=4;limiter.attack.value=.005;limiter.release.value=.12;
        audioBus.connect(limiter);limiter.connect(audioContext.destination);
      }
      audioBus.gain.setValueAtTime(.7,audioContext.currentTime);
      if(audioContext.state==='suspended')audioContext.resume().catch(()=>{});
      // iOS/WebKit can require a source node to be started inside the user gesture.
      if(!audioPrimed){
        const osc=audioContext.createOscillator(),gain=audioContext.createGain(),now=audioContext.currentTime;
        gain.gain.setValueAtTime(.00001,now);osc.connect(gain);gain.connect(audioBus);osc.start(now);osc.stop(now+.012);
        osc.onended=()=>{osc.disconnect();gain.disconnect();};audioPrimed=true;
      }
      return true;
    }catch{return false;}
  }
  function enableSoundFromGesture(){
    options.sound=true;
    const ok=unlockAudio(true);
    persist();render();
    if(ok){sound('install');toast('Som ativado.');}
    else toast('Seu navegador bloqueou o áudio. Toque em Som: on novamente.');
  }
  function sound(type,wave=1,tier=1) {
    if(!options.sound){if(audioBus)audioBus.gain.setValueAtTime(0,audioContext.currentTime);return;}
    if(!audioContext || !audioBus)return;
    try {
      const time=audioContext.currentTime;
      function note(frequency,delay,duration,volume,timbre='sine',end=frequency){
        const oscillator=audioContext.createOscillator(),gain=audioContext.createGain(),start=time+delay;
        oscillator.type=timbre;oscillator.frequency.setValueAtTime(frequency,start);oscillator.frequency.exponentialRampToValueAtTime(end,start+duration);
        gain.gain.setValueAtTime(0,start);gain.gain.linearRampToValueAtTime(volume,start+.006);gain.gain.exponentialRampToValueAtTime(.0001,start+duration);
        oscillator.connect(gain);gain.connect(audioBus);oscillator.onended=()=>{oscillator.disconnect();gain.disconnect();};oscillator.start(start);oscillator.stop(start+duration+.015);
      }
      if(type==='move')note(220,0,.045,.012,'sine',150);
      if(type==='lock'){note(330,0,.09,.022);note(440,.025,.11,.016);}
      if(type==='resonance'){
        const pitch=[1,1.125,1.25,1.5,2][Math.min(Math.max(wave-1,0),4)];
        note(110,0,.18,tier>1?.09:.045,'sine',55);
        note(261.63*pitch,.01,.26,.042);note(392*pitch,.045,.32,.024);
        if(tier>1){note(523.25*pitch,.085,.34,.021);note(659.25*pitch,.13,.30,.012);}
      }
      if(type==='win'){
        note(130.81,0,.42,.065,'sine',65.4);
        [261.63,329.63,392,523.25,783.99].forEach((f,i)=>note(f,i*.065,.40,i===4?.023:.04));
      }
      if(type==='install'){note(392,0,.18,.026);note(523.25,.06,.24,.026);}
      if(type==='damage'){note(98,0,.16,.05,'triangle',65);note(73.4,0,.12,.04);}
    }catch{}
  }
  // An independent transparent overlay: never redraws gameplay, intercepts input,
  // consumes gameplay RNG or runs a permanent animation loop. Hard cap: 64 effects.
  function clearEffects(){
    cancelAnimationFrame(fxFrame);fxFrame=0;effects=[];fxContext.clearRect(0,0,fxCanvas.width,fxCanvas.height);fxCanvas.dataset.active='false';
    clearTimeout(rewardTimer);delete machine.dataset.reward;$('floating').classList.remove('show');
  }
  function rewardTier(matches,wave,victory=false){return victory?3:state.mode==='free'?1:wave>1||matches.length>1?2:1;}
  function rewardMood(tier,color){
    clearTimeout(rewardTimer);machine.style.setProperty('--reward-color',color);
    machine.dataset.reward=String(tier);
    rewardTimer=setTimeout(()=>{delete machine.dataset.reward;},options.reduced?450:850/Math.sqrt(options.speed));
  }
  function effectFrame(now){
    fxFrame=0;
    if(options.reduced || document.hidden){clearEffects();return;}
    const scale=fxCanvas.width/420;fxContext.setTransform(scale,0,0,scale,0,0);fxContext.clearRect(0,0,420,420);
    effects=effects.filter(e=>now-e.start<e.life);
    for(const e of effects){
      const t=Math.max(0,(now-e.start)/e.life),ease=1-(1-t)**2;
      fxContext.save();fxContext.globalAlpha=(1-t)**1.5*e.alpha;fxContext.strokeStyle=e.color;fxContext.fillStyle=e.color;
      if(e.kind==='bloom'){
        const r=e.radius+ease*e.travel,g=fxContext.createRadialGradient(e.x,e.y,0,e.x,e.y,r);
        g.addColorStop(0,e.color);g.addColorStop(1,e.color+'00');fxContext.fillStyle=g;fxContext.fillRect(e.x-r,e.y-r,r*2,r*2);
      }else if(e.kind==='ring' || e.kind==='arc'){
        fxContext.lineWidth=e.width||1.4;fxContext.lineCap='round';fxContext.beginPath();
        const angle=(e.angle||0)+ease*.25;
        fxContext.arc(e.x,e.y,e.radius+ease*e.travel,angle,angle+(e.kind==='arc'?Math.PI*.36:Math.PI*2));fxContext.stroke();
      }else if(e.kind==='mote'){
        // Energy travels from the matched pieces into the core, with a tiny curved tail.
        const p=1-(1-t)**3,x=e.x+(210-e.x)*p+Math.sin(t*Math.PI)*e.bend,y=e.y+(210-e.y)*p;
        fxContext.globalAlpha=Math.sin(Math.PI*t)*e.alpha;
        fxContext.beginPath();fxContext.arc(x,y,e.size*(1-t*.5),0,Math.PI*2);fxContext.fill();
        fxContext.globalAlpha*=.3;fxContext.beginPath();fxContext.arc(x+(e.x-210)*.045,y+(e.y-210)*.045,e.size*.6,0,Math.PI*2);fxContext.fill();
      }else{
        const x=e.x+e.dx*ease,y=e.y+e.dy*ease+t*t*6;
        fxContext.translate(x,y);fxContext.rotate(e.angle+t*.7);
        fxContext.fillRect(-e.size/2,-e.size/2,e.size,e.size);
      }
      fxContext.restore();
    }
    fxCanvas.dataset.active=String(effects.length>0);
    if(effects.length)fxFrame=requestAnimationFrame(effectFrame);
  }
  function rewardFX(matches=[],wave=1,victory=false){
    const tier=rewardTier(matches,wave,victory),palette=tier>1?rewardColors:colors;
    rewardMood(tier,victory?rewardColors[2]:tier>1?rewardColors[1]:colors[matches[0]?.tone??0]);
    if(options.reduced || document.hidden)return;
    const now=performance.now(),life=(victory?800:tier>1?620:520)/Math.sqrt(options.speed);
    const add=e=>effects.push({...e,start:now,life,alpha:e.alpha??.8});
    if(victory){
      add({kind:'bloom',x:210,y:210,radius:40,travel:100,color:palette[2],alpha:.22});
      add({kind:'ring',x:210,y:210,radius:42,travel:140,color:palette[2],alpha:.8,width:2});
      for(let i=0;i<4;i++)add({kind:'arc',x:210,y:210,radius:65,travel:105,angle:i*Math.PI/2,color:palette[i],alpha:.85,width:3});
      for(let i=0;i<24;i++){
        const a=i*Math.PI*2/24,r=70+i%3*28;
        add({kind:'spark',x:210+Math.cos(a)*r,y:210+Math.sin(a)*r,dx:Math.cos(a)*42,dy:Math.sin(a)*42,angle:a,size:2+i%3,color:palette[i%4],alpha:.9});
      }
    }else{
      for(const m of matches.slice(0,3)){
        const a=m.sector*Math.PI/4-Math.PI/2,color=palette[m.tone];
        for(const r of radii){
          const x=210+Math.cos(a)*r,y=210+Math.sin(a)*r;
          add({kind:'ring',x,y,radius:15,travel:tier>1?16:7,color,alpha:.7});
          add({kind:'mote',x,y,size:tier>1?3.5:2.5,bend:(r===120?-1:1)*15,color,alpha:.9});
          for(let i=0;i<(tier>1?4:1);i++){
            const angle=a+i*Math.PI*.62+r*.03;
            add({kind:'spark',x,y,dx:Math.cos(angle)*(tier>1?28:12),dy:Math.sin(angle)*(tier>1?28:12),angle,size:2+i%2,color});
          }
        }
      }
      add({kind:'bloom',x:210,y:210,radius:24,travel:tier>1?55:22,color:palette[tier>1?1:0],alpha:tier>1?.25:.12});
      if(tier>1)for(let i=0;i<3;i++)add({kind:'arc',x:210,y:210,radius:44,travel:18,angle:i*Math.PI*2/3,color:palette[(i+1)%4],alpha:.8,width:2.5});
    }
    effects=effects.slice(-64);fxCanvas.dataset.active='true';
    if(!fxFrame)fxFrame=requestAnimationFrame(effectFrame);
  }
  function haptic(ms=8) {if(!options.reduced && navigator.vibrate)navigator.vibrate(ms);}
  function circle(x,y,r,fill,stroke,width=1) {ctx.beginPath();ctx.arc(x,y,r,0,Math.PI*2);if(fill){ctx.fillStyle=fill;ctx.fill();}if(stroke){ctx.strokeStyle=stroke;ctx.lineWidth=width;ctx.stroke();}}
  function glyph(t,x,y,size=11,alpha=1) {
    ctx.save();ctx.globalAlpha=alpha;ctx.fillStyle=colors[t];ctx.strokeStyle=colors[t];ctx.lineWidth=2;
    if(t===0)circle(x,y,size*.73,colors[t]);
    if(t===1){ctx.beginPath();ctx.moveTo(x,y-size);ctx.lineTo(x+size,y);ctx.lineTo(x,y+size);ctx.lineTo(x-size,y);ctx.closePath();ctx.fill();}
    if(t===2){ctx.beginPath();ctx.moveTo(x,y-size);ctx.lineTo(x+size*.94,y+size*.8);ctx.lineTo(x-size*.94,y+size*.8);ctx.closePath();ctx.fill();}
    if(t===3){ctx.beginPath();ctx.roundRect(x-size*.75,y-size*.75,size*1.5,size*1.5,3);ctx.fill();}
    // A single restrained highlight gives each existing glyph a ceramic edge.
    ctx.fillStyle='#ffffff';ctx.globalAlpha=alpha*.23;
    ctx.beginPath();ctx.arc(x-size*.18,y-size*.30,1.5,0,Math.PI*2);ctx.fill();
    ctx.restore();
  }
  function draw(board=visual?.board||state.board,offsets=[0,0,0],matches=[]) {
    const scale=canvas.width/420;ctx.setTransform(scale,0,0,scale,0,0);ctx.clearRect(0,0,420,420);
    const center=210,matchSet=new Set(matches.map(m=>m.sector)),intent=visual?.intent??state.intent;
    circle(center,center,190,'#151823','#2d3141');
    // Stationary sector spokes and numbered intent markers.
    for(let i=0;i<8;i++) {
      const a=i*Math.PI/4-Math.PI/2,edge=a-Math.PI/8;
      ctx.beginPath();ctx.moveTo(center+Math.cos(edge)*47,center+Math.sin(edge)*47);ctx.lineTo(center+Math.cos(edge)*186,center+Math.sin(edge)*186);ctx.strokeStyle='#323548';ctx.lineWidth=1;ctx.stroke();
      const x=center+Math.cos(a)*199,y=center+Math.sin(a)*199;
      ctx.font='10px ui-monospace,monospace';ctx.textAlign='center';ctx.textBaseline='middle';ctx.fillStyle=intent && i===intent.sector?'#ff9cb0':'#7b829c';
      if(intent && i===intent.sector)circle(x,y,10,intent.neutralized?'#29554b':'#553143');
      ctx.fillStyle=intent && i===intent.sector?'#ffb9c6':'#7b829c';ctx.fillText(String(i+1),x,y);
      if(intent && i===intent.sector && !intent.neutralized) {
        ctx.beginPath();ctx.moveTo(center+Math.cos(a)*44,center+Math.sin(a)*44);ctx.lineTo(center+Math.cos(a)*184,center+Math.sin(a)*184);ctx.strokeStyle='#ff8b9d30';ctx.lineWidth=31;ctx.stroke();
      }
      if(matchSet.has(i)) {
        ctx.beginPath();ctx.moveTo(center+Math.cos(a)*44,center+Math.sin(a)*44);ctx.lineTo(center+Math.cos(a)*184,center+Math.sin(a)*184);ctx.strokeStyle='#96ebd344';ctx.lineWidth=34;ctx.stroke();
      }
    }
    const isPreview=ghost!==null;
    for(let r=0;r<3;r++) {
      circle(center,center,radii[r],null,selected===r?'#444057':'#292d3e',38);
      circle(center,center,radii[r]+20,null,selected===r?'#8d81b980':'#3b4054',1);
      circle(center,center,radii[r]-20,null,'#3b4054',1);
      if(state.jam===r) {
        ctx.save();ctx.setLineDash([4,6]);circle(center,center,radii[r]+20,null,'#f28da7',2);ctx.restore();
      }
      if(isPreview && ghost.dirs[r]) {
        ctx.save();ctx.setLineDash([5,8]);circle(center,center,radii[r]+21,null,'#baafff',2);ctx.restore();
      }
      for(let i=0;i<8;i++) {
        const a=(i+offsets[r])*Math.PI/4-Math.PI/2;
        const x=center+Math.cos(a)*radii[r],y=center+Math.sin(a)*radii[r];
        const targeted=intent && intent.sector===i;
        circle(x,y,16.5,targeted && !intent.neutralized?'#322331':'#151824',matchSet.has(i)?'#96ebd3':targeted?(intent.neutralized?'#96ebd3':'#ff8b9d'):'#4c5168',matchSet.has(i)||targeted?2:1);
        glyph(board[r][i].tone,x,y,10.7,isPreview?.85:1);
      }
    }
    const locks=visual?.locks||state.locks;
    for(let edge=0;edge<2;edge++) {
      const a=Math.PI/8+Math.PI/2,rr=(radii[edge]+radii[edge+1])/2;
      const x=center+Math.cos(a)*rr,y=center+Math.sin(a)*rr;
      circle(x,y,10,'#191a29',locks[edge]?'#baafff':'#474b64');
      ctx.fillStyle=locks[edge]?'#d6ceff':'#747c97';ctx.font='10px ui-monospace,monospace';ctx.fillText(String(locks[edge]),x,y);
    }
    circle(center,center,40,'#1d2132','#575570',1);
    circle(center,center,34,null,'#38384f',1);
    ctx.fillStyle=busy?'#96ebd3':'#b9bfd5';ctx.font='9px ui-monospace,monospace';ctx.fillText(isPreview?'PREVIEW':busy?'PULSO':'CORE',center,center-9);
    ctx.fillStyle='#f1efff';ctx.font='bold 18px ui-monospace,monospace';ctx.fillText(isPreview?ghost.matches.length?ghost.matches.length+' ◎':'↔':state.maxWave>=2?'×'+2**Math.min(state.maxWave-1,10):'◉',center,center+10);
  }
  function resize() {const dpr=Math.min(window.devicePixelRatio||1,2);canvas.width=Math.round(420*dpr);canvas.height=canvas.width;fxCanvas.width=canvas.width;fxCanvas.height=canvas.height;draw();}
  function render(s=state) {
    const free=s.mode==='free',encounter=C.ENCOUNTERS[s.encounter];
    machine.dataset.mode=free?'free':'run';
    updateEnemy(s);
    $('stage').textContent=free?'LABORATÓRIO · SEM AMEAÇAS':'ENCONTRO 0'+(s.encounter+1)+' / 03';$('anomaly-name').textContent=free?'LIVRE':encounter.name;
    $('energy').textContent=free?format(s.energy):s.breaks;$('goal').textContent=free?'':' / '+encounter.breakGoal;$('goal-label').textContent=free?'Energia produzida':'Rupturas no núcleo';
    $('energy-bar').style.width=free?'100%':Math.min(s.breaks/encounter.breakGoal*100,100)+'%';
    $('health').innerHTML=Array.from({length:3},(_,i)=>'<span class="health-pip '+(i>=s.hp?'off':'')+'"></span>').join('')+(s.shield?'<span class="health-pip shield"></span>':'');$('health').setAttribute('aria-label',s.hp+' de 3 pontos de integridade'+(s.shield?', escudo ativo':''));
    const i=s.intent;$('intent').classList.toggle('safe',!i || i.neutralized || i.kind==='parasite' && s.locks[i.edge]===0);
    if(!i){$('intent-text').textContent='Experimente. Não há limite de movimentos.';$('countdown').textContent='∞';}
    else if(i.kind==='parasite'){$('intent-text').textContent='PONTO FRACO '+(i.sector+1)+' · ou esvazie link 0'+(i.edge+1)+'↔0'+(i.edge+2)+' antes do ataque.';$('countdown').textContent=i.count;}
    else {$('intent-text').textContent=(s.jam>=0?names[s.jam]+' preso · ':'')+'ROMPA O SETOR '+(i.sector+1)+' antes do ataque.';$('countdown').textContent=i.count;}
    $('queue').innerHTML=s.queue.slice(0,s.protocols.includes('foretell')?12:6).map(toneHTML).join('');
    for(let e=0;e<2;e++) $('link'+e).innerHTML=[0,1].map(j=>'<span class="charge '+(j<s.locks[e]?'on':'')+'"></span>').join('');
    $('link-description').textContent=s.protocols.includes('drive')?'Carregados: giram juntos no mesmo sentido.':'Carregados: girar um arrasta o vizinho ao contrário.';
    $('protocol-count').textContent=s.protocols.length+' / 3';
    $('protocols').innerHTML=s.protocols.length?s.protocols.map(id=>{const p=C.PROTOCOLS.find(x=>x.id===id);return '<button class="protocol-chip" data-protocol="'+id+'"><strong>'+p.name+'</strong><small>'+p.family+'</small><span>'+p.description+'</span></button>';}).join(''):'<p class="empty">'+(free?'Modo livre: teste qualquer um dos 8 Protocolos nas opções.':'Rompa a primeira Anomalia para escolher uma nova regra.')+'</p>';
    $('total').textContent=format(s.total);$('best-chain').textContent='×'+2**Math.min(Math.max(0,s.maxWave-1),10);$('moves').textContent=s.turn;$('links-used').textContent=s.locksUsed;$('seed-label').textContent=s.seed;
    $('atlas-count').textContent=Object.keys(atlas).length+' / 3';
    $('atlas').innerHTML=[['phase','Acoplamento'],['cascade','Cascata'],['triad','Nova gramática']].map(([id,title])=>'<button class="atlas-entry '+(!atlas[id]?'locked':'')+'" data-atlas="'+id+'">'+(atlas[id]?title:'??? · interação '+(['phase','cascade','triad'].indexOf(id)+1))+'</button>').join('');
    document.querySelectorAll('[data-ring]').forEach(el=>{const r=Number(el.dataset.ring);el.classList.toggle('active',r===selected);el.setAttribute('aria-pressed',String(r===selected));el.textContent='';const n=document.createElement('span');n.textContent='0'+(r+1);el.append(n,' '+names[r]+(s.jam===r?' · preso':''));});
    for(const id of ['left','right']) $(id).disabled=busy || s.status!=='playing' || s.jam===selected;
    document.documentElement.classList.toggle('reduced',options.reduced);$('sound').textContent=options.sound?'Som: on':'Som: off';$('sound').setAttribute('aria-label',options.sound?'Desativar som':'Ativar som');
  }
  function show(html,locked=false) {ghost=null;draw();$('modal-content').innerHTML=html;modal.dataset.locked=String(locked);if(!modal.open)modal.showModal();}
  function closeModal() {modal.close();draw();}
  const onboardingSteps=[
    ()=>'<div class="onboard-progress"><span class="on"></span><span></span><span></span><span></span></div><div class="eyebrow">01 · OBJETIVO</div><h2>Não é sobre girar.<br>É sobre acertar.</h2><div class="onboard-focus target"><strong>⌖ PONTO FRACO</strong><p>O setor rosa é o alvo. Faça <b>três tons iguais</b> exatamente ali para causar 1 Ruptura.</p></div><p>Energia e cascatas ajudam sua máquina, mas <strong>não vencem sozinhas</strong>. Needle cai com 3 Rupturas.</p>',
    ()=>'<div class="onboard-progress"><span></span><span class="on"></span><span></span><span></span></div><div class="eyebrow">02 · DECISÃO</div><h2>Veja antes<br>de comprometer.</h2><div class="onboard-focus preview"><strong>SEGURE → PREVIEW</strong><p>Segure um botão de giro ou arraste um anel. A previsão mostra quais anéis se moverão e se a jogada cria uma Ressonância.</p></div><p>Se aparecer <strong>RUPTURA NO ALVO</strong>, você sabe que aquela ação realmente avança o combate.</p>',
    ()=>'<div class="onboard-progress"><span></span><span></span><span class="on"></span><span></span></div><div class="eyebrow">03 · PHASE LOCK</div><h2>Construa a máquina.</h2><div class="rule"><span class="rule-symbol">↔</span><div><strong>Dois iguais em anéis vizinhos</strong><p>Criam uma carga. Ao girar um deles, o vizinho é arrastado no sentido oposto.</p></div></div><div class="rule"><span class="rule-symbol">×2</span><div><strong>Cascatas são potência, não piloto automático</strong><p>Refills podem ressoar de novo e multiplicar energia. Só a primeira onda direta pode causar Ruptura.</p></div></div>',
    ()=>'<div class="onboard-progress"><span></span><span></span><span></span><span class="on"></span></div><div class="eyebrow">04 · PRIMEIRO MOVIMENTO</div><h2>Escute a máquina.</h2><p>O som confirma giro, acoplamento, ressonância, dano e ruptura. Em iPhone/Safari ele precisa ser liberado por um toque seu.</p><div class="onboard-focus sound"><strong>COMEÇO GARANTIDO</strong><p>Nesta seed inicial, <b>Externo ↷</b> já cria a primeira Ruptura no setor 1. Segure para ver antes de soltar.</p></div>'
  ];
  function onboarding(step=0,locked=true){
    step=Math.max(0,Math.min(onboardingSteps.length-1,step));
    const nav='<div class="onboard-nav">'+(step?'<button data-action="onboard-back" data-step="'+(step-1)+'">Voltar</button>':'<button data-action="onboard-skip">Pular</button>')+(step<onboardingSteps.length-1?'<button class="primary" data-action="onboard-next" data-step="'+(step+1)+'">Próximo</button>':'<button class="primary" data-action="onboard-start">Ativar som e começar</button>')+'</div>';
    show('<div class="onboarding">'+onboardingSteps[step]()+nav+'</div>',locked);
  }
  function help(){onboarding(0,false);}
  function finishOnboarding(withSound=true){
    try{localStorage.setItem(ONBOARD,'done');}catch{}
    if(withSound)enableSoundFromGesture();
    closeModal();feedback('OBJETIVO · setor 1. Segure Externo ↷ para prever a primeira Ruptura.');
  }
  function settings() {
    show('<div class="modal-top"><div class="eyebrow">CONTROLE DA MÁQUINA</div><button class="close" data-action="close">Fechar</button></div><h2>Seu ritmo.</h2><div class="option-row"><span>Velocidade das animações</span><button data-action="speed">'+options.speed+'×</button></div><div class="option-row"><span>Movimento reduzido</span><button data-action="reduced">'+(options.reduced?'Ativo':'Desativado')+'</button></div><div class="option-row"><span>Som sintetizado</span><button data-action="sound">'+(options.sound?'Ativo':'Desativado')+'</button></div><p>PC: Q/A externo; W/S médio; E/D interno. ←/→ gira o anel selecionado. 1/2/3 seleciona. Arraste de volta à origem para cancelar.</p><button class="wide" data-action="seed">Jogar uma seed</button><div class="two-buttons"><button data-action="export">Exportar replay</button><button data-action="import">Importar replay</button></div>'+(state.mode==='free'?'<button class="wide" data-action="lab">Testar Protocolos</button>':'')+'<p>O replay inclui a seed e todas as decisões. Importar reconstrói a máquina e substitui o progresso local.</p>');
  }
  function draft() {
    const prev=C.ENCOUNTERS[state.encounter];
    show('<div class="eyebrow">'+prev.name+' · ROMPIDA</div><h2>Mude uma regra.</h2><p>Escolha um Protocolo. Ele permanece até o fim desta mini-run.</p>'+state.offers.map(id=>{const p=C.PROTOCOLS.find(x=>x.id===id);return '<button class="protocol-offer" data-choice="'+id+'"><span class="family">'+p.family+'</span><strong>'+p.name+'</strong><p>'+p.description+'</p></button>';}).join('')+'<button class="wide" data-action="rewrite" '+(!state.rewrites?'disabled':'')+'>Rewrite · '+state.rewrites+' restante</button>',true);
  }
  function finish() {
    const won=state.status==='won';
    show('<div class="eyebrow">'+(won?'MÁQUINA ESTÁVEL':'COLAPSO')+'</div><h2>'+(won?'Você rompeu o sistema.':'Mais uma ideia?')+'</h2><p>'+(won?'Três Anomalias. Uma máquina construída por você. Teste outra seed ou experimente livremente.':esc(state.cause))+'</p><div class="run-summary"><div><span>Energia total</span><strong>'+format(state.total)+'</strong></div><div><span>Melhor cascata</span><strong>×'+2**Math.min(Math.max(0,state.maxWave-1),10)+'</strong></div><div><span>Melhor movimento</span><strong>'+format(state.bestMove)+'</strong></div><div><span>Acoplamentos usados</span><strong>'+state.locksUsed+'</strong></div></div><button class="primary wide" data-action="retry">Tentar a mesma seed</button><div class="two-buttons"><button data-action="new">Nova seed</button><button data-action="free">Modo livre</button></div><button class="wide" data-action="export">Exportar esta run</button>',true);
  }
  function start(seed=newSeed(),mode='run') {clearEffects();clearTimeout(enemyTimer);delete portrait.dataset.reaction;state=C.create(seed,mode);visual=null;ghost=null;selected=0;closeModal();render();draw();persist();feedback('Gire o anel externo para a direita.');}
  function newSeed() {return 'RB-'+Date.now().toString(36).toUpperCase()+'-'+Math.floor(Math.random()*65536).toString(36).toUpperCase();}
  function resetDialog(mode) {if(!state.turn){start(newSeed(),mode);return;}show('<div class="eyebrow">NOVA MÁQUINA</div><h2>'+(mode==='free'?'Explorar livremente?':'Começar outra run?')+'</h2><p>A partida atual será substituída. Você pode exportar o replay nas opções.</p><button class="primary wide" data-action="'+(mode==='free'?'free':'new')+'">'+(mode==='free'?'Entrar no modo livre':'Nova seed')+'</button><button class="wide" data-action="close">Continuar esta partida</button>');}
  function setPreview(ring,direction) {
    if(busy || modal.open || state.status!=='playing')return;
    const p=C.preview(state,ring,direction);if(!p){feedback(names[ring]+' está preso. Acoplamentos ainda podem movê-lo.');return;}
    selected=ring;ghost=p;render();draw(p.board,[0,0,0],p.matches);
    const movement=p.dirs.map((d,i)=>d?names[i]+' '+(d>0?'↷':'↶'):null).filter(Boolean).join(' · ');
    const breaks=state.mode==='run' && state.intent && p.matches.some(m=>m.sector===state.intent.sector);
    feedback(movement+(breaks?' · RUPTURA NO ALVO':p.matches.length?' · '+p.matches.length+' ressonância'+(p.matches.length>1?'s':''):' · sem ressonância'),true);
  }
  function clearPreview() {ghost=null;draw();feedback(state.turn?'Gire. Teste a próxima combinação.':'Gire o anel externo para a direita.');}
  function pause(ms) {return new Promise(resolve=>setTimeout(resolve,options.reduced?0:ms/options.speed));}
  function animateMove(event) {
    if(options.reduced){draw();return Promise.resolve();}
    return new Promise(resolve=>{const start=performance.now(),duration=190/options.speed;function frame(time){const t=Math.min((time-start)/duration,1),ease=1-(1-t)**3;draw(event.board,event.dirs.map(d=>d*ease));if(t<1)requestAnimationFrame(frame);else resolve();}requestAnimationFrame(frame);});
  }
  function floating(text,label='') {
    const el=$('floating');el.replaceChildren();const value=document.createElement('strong');value.textContent=text;el.append(value);
    if(label){const caption=document.createElement('small');caption.textContent=label;el.append(caption);}
    el.classList.remove('show');if(!options.reduced){void el.offsetWidth;el.classList.add('show');}
  }
  async function commit(ring,direction) {
    if(busy || modal.open || state.status!=='playing')return;
    unlockAudio();const result=C.step(state,ring,direction);if(result.invalid){clearPreview();return;}
    busy=true;ghost=null;visual=C.copy(state);render();
    try {
      for(const event of result.events) {
        if(event.type==='move') {sound('move');haptic();await animateMove(event);visual.board=event.board.map((r,i)=>event.dirs[i]?r.map((_,j)=>r[(j-event.dirs[i]+8)%8]):r);visual.locks=event.locks;draw();}
        if(event.type==='bonus') {visual.energy+=event.energy;visual.total+=event.energy;feedback(event.label+' +'+event.energy);}
        if(event.type==='resonance') {
          const tier=rewardTier(event.matches,event.wave),label=event.wave>1?'CASCATA ×'+event.multiplier:event.matches.length>1?event.matches.length+' RESSONÂNCIAS':'';
          visual.board=event.board;visual.energy=event.encounterEnergy;visual.total=event.total;render(visual);draw(event.board,[0,0,0],event.matches);sound('resonance',event.wave,tier);haptic(tier>1?18:8);
          rewardFX(event.matches,event.wave);feedback((label||'RESSONÂNCIA')+' · +'+format(event.energy)+' energia');floating('+'+format(event.energy),label);await pause(tier>1?290:240);
        }
        if(event.type==='refill'){visual.board=event.board;visual.queue=event.queue;render(visual);draw();await pause(90);}
        if(event.type==='lock'){visual.locks=event.locks;sound('lock');feedback('ACOPLAMENTO · '+names[event.edge]+' ↔ '+names[event.edge+1]);render(visual);draw();await pause(80);}
        if(event.type==='break'){visual.breaks=event.breaks;visual.intent.neutralized=true;reactEnemy('hit');feedback('RUPTURA '+event.breaks+' / '+event.goal+' · SETOR '+(event.sector+1));floating(event.breaks+' / '+event.goal,'RUPTURAS');await pause(120);}
        if(event.type==='discovery' && !atlas[event.id]) {atlas[event.id]={title:event.title,text:event.text};toast('Descoberta: '+event.title);}
        if(event.type==='damage'){reactEnemy('attack');sound('damage');haptic(25);feedback('IMPACTO · −1 integridade');await pause(160);}
        if(event.type==='evade')feedback(event.label);
        if(event.type==='blocked'){reactEnemy('attack');feedback('ESCUDO · IMPACTO ABSORVIDO');}
        if(event.type==='limit')feedback(event.label);
        if(event.type==='win'){reactEnemy('broken');sound('win');rewardFX([],1,true);floating('RUPTURA','ANOMALIA SUPERADA');feedback('RUPTURA · '+C.ENCOUNTERS[state.encounter].name+' superada');await pause(550);}
      }
      state=result.state;persist();
    } finally {busy=false;visual=null;render();draw();}
    if(state.status==='draft')draft();else if(['won','lost'].includes(state.status))finish();
    else if(result.events.some(e=>e.type==='resonance')) {
      const energy=result.events.filter(e=>e.type==='resonance'||e.type==='bonus').reduce((sum,e)=>sum+e.energy,0);
      const broke=result.events.some(e=>e.type==='break');
      feedback(broke?'PONTO FRACO ROMPIDO · novo alvo marcado':'+'+format(energy)+' energia · '+(state.locks.some(Boolean)?'use os acoplamentos para alcançar o alvo':'energia não rompe a Anomalia sozinha'));
    } else if(!result.events.some(e=>['damage','evade','lock','blocked','break'].includes(e.type)))feedback('Sem ruptura. Reposicione pensando no setor rosa.');
  }
  // Both touch and mouse use the tangential distance around the center, with one step per gesture.
  function point(event) {const rect=canvas.getBoundingClientRect();return {x:(event.clientX-rect.left)*420/rect.width-210,y:(event.clientY-rect.top)*420/rect.height-210};}
  canvas.addEventListener('pointerdown',event=>{
    if(busy || modal.open || state.status!=='playing' || drag)return;
    const p=point(event),radius=Math.hypot(p.x,p.y);if(radius<48 || radius>189)return;
    const ring=radius>=143?0:radius>=97?1:2;
    if(state.jam===ring){feedback(names[ring]+' preso. Gire um vizinho acoplado.');return;}
    selected=ring;drag={id:event.pointerId,ring,angle:Math.atan2(p.y,p.x),direction:0};canvas.setPointerCapture(event.pointerId);unlockAudio();render();draw();
  });
  canvas.addEventListener('pointermove',event=>{
    if(!drag || event.pointerId!==drag.id)return;
    const p=point(event);let angle=Math.atan2(p.y,p.x)-drag.angle;angle=Math.atan2(Math.sin(angle),Math.cos(angle));
    const direction=Math.abs(angle)>.095?Math.sign(angle):0;
    if(direction!==drag.direction){drag.direction=direction;direction?setPreview(drag.ring,direction):clearPreview();}
  });
  canvas.addEventListener('pointerup',event=>{if(!drag || event.pointerId!==drag.id)return;const d=drag;drag=null;canvas.releasePointerCapture(event.pointerId);if(d.direction)commit(d.ring,d.direction);else clearPreview();});
  canvas.addEventListener('pointercancel',()=>{drag=null;clearPreview();});
  canvas.addEventListener('lostpointercapture',()=>{if(drag){drag=null;clearPreview();}});
  document.querySelectorAll('[data-ring]').forEach(el=>el.addEventListener('click',()=>{if(!busy){selected=Number(el.dataset.ring);clearPreview();render();}}));
  for(const [id,direction] of [['left',-1],['right',1]]) {
    const el=$(id);let held=false;
    el.addEventListener('pointerdown',event=>{if(el.disabled || busy || modal.open)return;held=true;el.setPointerCapture(event.pointerId);unlockAudio();setPreview(selected,direction);});
    el.addEventListener('pointerup',event=>{if(!held)return;held=false;el.releasePointerCapture(event.pointerId);const rect=el.getBoundingClientRect();if(event.clientX>=rect.left && event.clientX<=rect.right && event.clientY>=rect.top && event.clientY<=rect.bottom)commit(selected,direction);else clearPreview();});
    el.addEventListener('pointercancel',()=>{held=false;clearPreview();});
    el.addEventListener('click',event=>{if(event.detail===0)commit(selected,direction);});
  }
  document.addEventListener('keydown',event=>{
    if(modal.open || busy || event.repeat || event.target.matches('input,textarea,select'))return;
    const key=event.key.toLowerCase(),map={q:[0,1],a:[0,-1],w:[1,1],s:[1,-1],e:[2,1],d:[2,-1]};
    if(map[key]){event.preventDefault();selected=map[key][0];commit(...map[key]);}
    else if(['1','2','3'].includes(key)){event.preventDefault();selected=Number(key)-1;render();draw();}
    else if(['arrowleft','arrowright'].includes(key)){event.preventDefault();commit(selected,key==='arrowright'?1:-1);}
  });
  $('sound').addEventListener('click',()=>{if(!options.sound)enableSoundFromGesture();else{options.sound=false;if(audioBus)audioBus.gain.setValueAtTime(0,audioContext.currentTime);persist();render();toast('Som desativado.');}});
  $('help').addEventListener('click',()=>{if(!busy)help();});$('settings').addEventListener('click',()=>{if(!busy)settings();});
  portrait.addEventListener('click',()=>{
    if(busy)return;
    const kind=portrait.dataset.kind,art=AnomalyArt.characters[kind];
    show('<div class="eyebrow">'+art.role+'</div><div class="enemy-inspector-art" aria-hidden="true">'+AnomalyArt.svg(kind,'inspect')+'</div><h2>'+art.name+'</h2><p>'+art.description+'</p><p class="enemy-rule">'+art.rule+'</p><button class="primary wide" data-action="close">Entendi</button>');
  });
  $('new-run').addEventListener('click',()=>{if(!busy)resetDialog('run');});$('free-play').addEventListener('click',()=>{if(!busy)resetDialog('free');});
  $('queue-help').addEventListener('click',()=>{if(!busy)show('<div class="eyebrow">REPOSIÇÃO</div><h2>O futuro tem uma ordem.</h2><p>Após ressoar, os três tons são substituídos pelos próximos da fila: externo → médio → interno.</p><p>Se vários setores ressoam juntos, a fila preenche primeiro o menor número de setor. A nova combinação pode iniciar uma cascata.</p><button class="primary wide" data-action="close">Entendi</button>');});
  $('lock-help').addEventListener('click',()=>{if(!busy)show('<div class="eyebrow">PHASE LOCK</div><h2>Uma carga. Dois anéis.</h2><p>Um novo par igual em anéis vizinhos cria uma carga, até 2 por link. Cada giro usa uma carga para arrastar o vizinho. Se o próximo link também tiver carga, o movimento continua até o terceiro anel.</p><p>Exemplo: externo ↷, médio ↶, interno ↷. Segure o botão para ver exatamente o que vai se mover.</p><p>Um link usado descansa nesta ação e não recarrega imediatamente. Um mesmo par de glifos que permanece junto também não cria cargas repetidas.</p><button class="primary wide" data-action="close">Entendi</button>');});
  $('protocols').addEventListener('click',event=>{const el=event.target.closest('[data-protocol]');if(!el || busy)return;const p=C.PROTOCOLS.find(x=>x.id===el.dataset.protocol);show('<div class="eyebrow">'+p.family+'</div><h2>'+p.name+'</h2><p>'+p.description+'</p><p>Ativações nesta run: '+(state.activations[p.id]||0)+'</p><button class="primary wide" data-action="close">Continuar</button>');});
  $('atlas').addEventListener('click',event=>{const el=event.target.closest('[data-atlas]');if(!el || busy)return;const entry=atlas[el.dataset.atlas];if(!entry){toast('Esta interação ainda espera uma descoberta.');return;}show('<div class="eyebrow">CONHECIMENTO REGISTRADO</div><h2>'+esc(entry.title)+'</h2><p>'+esc(entry.text)+'</p><button class="primary wide" data-action="close">Continuar</button>');});
  function exportReplay() {
    const data={version:C.VERSION,seed:state.seed,mode:state.mode,actions:state.actions,summary:{total:state.total,turns:state.turn,maxWave:state.maxWave,status:state.status}};
    const url=URL.createObjectURL(new Blob([JSON.stringify(data,null,2)],{type:'application/json'}));const link=document.createElement('a');link.href=url;link.download='ring-break-replay.json';link.click();setTimeout(()=>URL.revokeObjectURL(url),30000);toast('Replay exportado.');
  }
  modal.addEventListener('cancel',event=>{if(modal.dataset.locked==='true')event.preventDefault();});
  modal.addEventListener('click',event=>{
    const choice=event.target.closest('[data-choice]');if(choice){clearEffects();state=C.choose(state,choice.dataset.choice);sound('install');closeModal();render();draw();persist();feedback('PROTOCOLO ATIVO · '+C.PROTOCOLS.find(p=>p.id===choice.dataset.choice).name);return;}
    const lab=event.target.closest('[data-lab]');if(lab){const id=lab.dataset.lab;let protocols=state.protocols.slice();if(protocols.includes(id))protocols=protocols.filter(p=>p!==id);else if(protocols.length<3)protocols.push(id);else{toast('Máximo de 3 Protocolos. Remova um primeiro.');return;}state=C.configure(state.seed,protocols);persist();render();draw();labDialog();return;}
    const action=event.target.closest('[data-action]')?.dataset.action;if(!action)return;
    if(action==='close')closeModal();
    if(action==='onboard-next'||action==='onboard-back'){onboarding(Number(event.target.closest('[data-step]').dataset.step),modal.dataset.locked==='true');}
    if(action==='onboard-start'){finishOnboarding(true);return;}
    if(action==='onboard-skip'){finishOnboarding(false);return;}
    if(action==='rewrite'){state=C.rewrite(state);persist();draft();}
    if(action==='new')start();if(action==='retry')start(state.seed,state.mode);if(action==='free')start(newSeed(),'free');
    if(action==='speed'){options.speed=options.speed===4?1:options.speed*2;persist();settings();}
    if(action==='reduced'){options.reduced=!options.reduced;if(options.reduced)clearEffects();persist();render();settings();}
    if(action==='sound'){if(!options.sound)enableSoundFromGesture();else{options.sound=false;if(audioBus)audioBus.gain.setValueAtTime(0,audioContext.currentTime);persist();render();}settings();}
    if(action==='export')exportReplay();if(action==='import')$('import-file').click();if(action==='lab')labDialog();
    if(action==='seed')show('<div class="eyebrow">MESMO PROBLEMA, OUTRA SOLUÇÃO</div><h2>Jogar uma seed.</h2><p>Digite a seed para iniciar uma mini-run. O progresso atual será substituído.</p><input type="text" id="seed-input" maxlength="80" value="'+esc(state.seed)+'" aria-label="Seed"><button class="primary wide" data-action="seed-play">Começar</button><button class="wide" data-action="close">Cancelar</button>');
    if(action==='seed-play'){const seed=$('seed-input').value.trim();if(seed)start(seed);}
  });
  function labDialog() {show('<div class="modal-top"><div class="eyebrow">LABORATÓRIO · 3 SLOTS</div><button class="close" data-action="close">Fechar</button></div><h2>Teste uma hipótese.</h2><p>Escolha até 3 regras. Alterações no laboratório começam um novo registro de replay mantendo a seed; o tabuleiro é reiniciado para garantir reprodução.</p>'+C.PROTOCOLS.map(p=>'<button class="protocol-offer" data-lab="'+p.id+'"><span class="family">'+p.family+' · '+(state.protocols.includes(p.id)?'ATIVO':'DESATIVADO')+'</span><strong>'+p.name+'</strong><p>'+p.description+'</p></button>').join(''));}
  $('import-file').addEventListener('change',async event=>{const file=event.target.files[0];if(!file)return;try{if(file.size>2000000)throw Error('Arquivo muito grande.');const data=JSON.parse(await file.text());const restored=C.replay(data);state=restored;visual=null;selected=0;closeModal();render();draw();persist();if(state.status==='draft')draft();else if(['won','lost'].includes(state.status))finish();toast('Replay reconstruído: '+state.turn+' movimentos.');}catch(error){toast('Não foi possível importar: '+error.message);}event.target.value='';});
  addEventListener('resize',resize);
  document.addEventListener('visibilitychange',()=>{if(document.hidden)clearEffects();});
  const seedParam=new URLSearchParams(location.search).get('seed');
  const saved=read(SAVE,null);try{if(!seedParam && saved)state=C.replay(saved);}catch{}
  const fresh=!state;if(!state)state=C.create(seedParam||'FIRST-LIGHT-2');
  const onboarded=read(ONBOARD,null)==='done';
  render();resize();
  if(state.status==='draft')draft();else if(['won','lost'].includes(state.status))finish();else if(!onboarded)onboarding(0,true);else feedback(fresh?'OBJETIVO · setor 1. Segure Externo ↷ para prever a primeira Ruptura.':'Sua máquina está aqui. Continue de onde parou.');
  // Test integration: the engine stays separate from rendering and is inspectable without network services.
  window.RingGame={getState:()=>C.copy(state),getBusy:()=>busy};
})();
