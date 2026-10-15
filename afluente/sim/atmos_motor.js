function Atmos(){
  /* Afluente v2.0 — a atmosfera do vale (pura, determinística, sem DOM). Ver afluente/CLIMA.md.
     Unidades de verdade: °C, %, hPa, m, m/s, mm/h. 1 unidade do vale = 20 m (a mesma tabela métrica da v1.9).
     Eixos: x para leste (direita da tela), y para o sul (baixo da tela); a câmera olha para o norte.
     O clima não dá pontos nem peças: é o mundo respondendo ao mapa e às estações do jogo.
     - Estações = a monção sul-americana vista do Cerrado: nas Águas o vento vem de noroeste, úmido (da Amazônia);
       na Seca vem de leste/sudeste, seco (do anticiclone do Atlântico Sul).
     - Temperatura e ponto de orvalho seguem uma climatologia aproximada de Brasília (1.100 m) mais o efeito do mapa:
       água viva e mata põem umidade no ar (evapotranspiração), mata refresca a tarde, vila esquenta.
     - Umidade relativa pela fórmula de Magnus; base das nuvens cúmulo pelo nível de condensação (125 m por °C entre
       temperatura e ponto de orvalho); convecção pelo aquecimento do chão ao longo do dia.
     - Gêneros de nuvem da OMM (Ci, Cc, Cs, Ac, As, Ns, Sc, St, Cu, Cb) com altura e tamanho reais.
     - Pancadas: células de cúmulo-nimbo com cortina de chuva (mm/h), frente de rajada e raios; gotas pela distribuição
       de Marshall-Palmer e velocidade terminal de Atlas et al. (1973).
     - Sol pela posição astronômica (latitude 15,8° S): de manhã a leste, à tarde a oeste; no inverno (Seca) ao norte.
     Relógios: o dia anda com as jogadas (1 jogada = 1 h de dia, 3 h de noite); o vento leva as nuvens em velocidade
     real (m/s); a vida de uma nuvem de chuva é acelerada (cerca de 15×), como num time-lapse. */
  const M=20,LAT=-15.8,ALT=1100,RAD=Math.PI/180;
  const clamp=(v,a,b)=>v<a?a:v>b?b:v,c01=v=>clamp(v,0,1),lerp=(a,b,u)=>a+(b-a)*u;
  const sst=(a,b,v)=>{const t=c01((v-a)/(b-a));return t*t*(3-2*t);};
  function hashStr(s){let h=1779033703^s.length;for(let i=0;i<s.length;i++){h=Math.imul(h^s.charCodeAt(i),3432918353);h=h<<13|h>>>19;}h=Math.imul(h^h>>>16,2246822507);h=Math.imul(h^h>>>13,3266489909);return(h^h>>>16)>>>0;}
  function mulberry32(a){return function(){a|=0;a=a+0x6D2B79F5|0;let t=Math.imul(a^a>>>15,1|a);t=t+Math.imul(t^t>>>7,61|t)^t;return((t^t>>>14)>>>0)/4294967296;};}
  // ruído suave 1D com semente (valores em -1..1)
  const nh=(s,i)=>((hashStr(s+':'+i)%20001)/10000)-1;
  function noise1(s,x){const i=Math.floor(x),f=x-i,u=f*f*(3-2*f);return lerp(nh(s,i),nh(s,i+1),u);}

  // ---------- climatologia por estação: pontos [andamento da estação (0..1), valor], interpolados
  // Águas ≈ meados de outubro a abril; Seca ≈ maio a meados de outubro. Valores arredondados, de ordem de grandeza
  // das normais de Brasília: Seca com tarde a 15–25% de umidade em agosto e setembro; Águas com mais de 90% da chuva.
  const CLIM={
    aguas:{tmin:[[0,18],[0.5,17.8],[1,16.5]],tmax:[[0,28.5],[0.3,27.5],[1,27.2]],td:[[0,13],[0.3,16.3],[0.8,16.3],[1,14]],
      from:[[0,330],[1,315]],wind:[[0,2.8],[0.5,2.4],[1,2.6]],cape:[[0,0.8],[0.25,1],[0.75,1],[1,0.6]],
      vis:[[0,25],[0.2,50],[1,45]],ci:[[0,0.3],[1,0.3]]},
    seca:{tmin:[[0,15],[0.35,12.5],[0.7,14],[1,17]],tmax:[[0,25.5],[0.3,25],[0.7,28],[1,30]],td:[[0,10],[0.4,3],[0.7,1],[1,7]],
      from:[[0,100],[0.5,95],[1,60]],wind:[[0,3.2],[0.6,4.4],[1,3.4]],cape:[[0,0.1],[0.6,0],[0.85,0.15],[1,0.35]],
      vis:[[0,40],[0.5,22],[0.8,12],[1,14]],ci:[[0,0.25],[0.6,0.4],[1,0.35]]},
  };
  const curve=(pts,u)=>{if(u<=pts[0][0])return pts[0][1];for(let i=1;i<pts.length;i++)if(u<=pts[i][0]){const[a,va]=pts[i-1],[b,vb]=pts[i];return lerp(va,vb,(u-a)/(b-a));}return pts[pts.length-1][1];};
  function regime(phase,sp){const C=phase?CLIM.seca:CLIM.aguas,o={phase,sp};for(const k in C)o[k]=curve(C[k],sp);
    o.doy=phase?(120+sp*168)%365:(288+sp*197)%365;return o;}

  // ---------- sol: elevação e azimute (graus; azimute a partir do norte, sentido horário)
  function sun(doy,hour){const d=23.44*Math.sin(2*Math.PI*(284+doy)/365)*RAD,f=LAT*RAD,H=(hour-12)*15*RAD;
    const e=Math.asin(Math.sin(f)*Math.sin(d)+Math.cos(f)*Math.cos(d)*Math.cos(H));
    const az=Math.atan2(-Math.cos(d)*Math.sin(H),Math.sin(d)*Math.cos(f)-Math.cos(d)*Math.sin(f)*Math.cos(H));
    return{elev:e/RAD,az:((az/RAD)%360+360)%360};}
  // hora do dia a partir do relógio de jogadas: 12 jogadas de sol (6 h às 18 h) e 4 de noite (3 h cada)
  function hourOf(u){u=((u%16)+16)%16;return u<12?6+u:(18+(u-12)*3)%24;}
  // quantas horas do dia passam entre dois instantes do relógio de jogadas
  function hoursBetween(u0,u1){const step=u=>{const r=((u%16)+16)%16;return r<12?1:3;};
    if(u1<=u0)return 0;if(u1-u0>16)return(u1-u0)*1.5;let h=0,u=u0;while(u<u1){const n=Math.min(u1,Math.floor(u)+1);h+=(n-u)*step(u);u=n;}return h;}

  // ---------- termodinâmica
  const es=T=>6.112*Math.exp(17.62*T/(243.12+T));                    // pressão de vapor de saturação (hPa), Magnus
  const rhOf=(T,Td)=>100*es(Td)/es(T);
  const lclOf=(T,Td)=>Math.max(0,125*(T-Td));                         // base do cúmulo (m acima do chão)
  const P0=1013.25*Math.pow(1-2.2577e-5*ALT,5.2559);                 // pressão no vale (≈ 888 hPa a 1.100 m)
  const rhoOf=T=>P0*100/(287.05*(T+273.15));                         // densidade do ar (kg/m³)
  // ciclo diário da temperatura: mínima ao nascer do sol (6 h), máxima às 15 h
  function diurnal(h){h=((h%24)+24)%24;const x=h<6?h+24:h;return x<=15?0.5-0.5*Math.cos(Math.PI*(x-6)/9):0.5+0.5*Math.cos(Math.PI*(x-15)/15);}
  // aquecimento do chão (0..1): é ele que levanta as térmicas que fazem os cúmulos; pico perto das 13h45
  const heating=h=>h>8.5&&h<19?Math.sin(Math.PI*(h-8.5)/10.5):0;

  // ---------- vento
  const BFT=[0.3,1.6,3.4,5.5,8.0,10.8,13.9,17.2,20.8,24.5,28.5,32.7];
  const BFN=['calmaria','aragem','brisa leve','brisa fraca','brisa moderada','brisa forte','vento fresco','vento forte','ventania','ventania forte','tempestade','tempestade violenta','furacão'];
  const beaufort=v=>{let b=0;while(b<BFT.length&&v>=BFT[b])b++;return{n:b,name:BFN[b]};};
  const COMP=['N','NE','L','SE','S','SO','O','NO'];
  const compass=from=>COMP[Math.round((((from%360)+360)%360)/45)%8];
  // vetor de movimento (para onde o ar vai) a partir da direção de onde ele vem; x leste, y sul
  const toVec=(from,v)=>{const a=(from+180)*RAD;return[Math.sin(a)*v,-Math.cos(a)*v];};
  // rugosidade do chão (m) e vento na altura z pelo perfil logarítmico; vento de referência a 10 m
  const Z0={A:0.0002,G:0.03,C:0.08,V:0.6,B:1.0};
  const atHeight=(v10,z,z0)=>v10*Math.log(Math.max(z,z0*1.5)/z0)/Math.log(10/z0);

  // ---------- chuva: gotas (Marshall-Palmer) e velocidade terminal (Atlas, Srivastava e Sekhon, 1973)
  function drops(R){if(!(R>0.02))return null;const L=4.1*Math.pow(R,-0.21),D0=3.67/L,vt=9.65-10.3*Math.exp(-0.6*D0);
    return{D0,vt,NT:8000/L,L};} // D0 diâmetro mediano (mm), vt (m/s), NT gotas por m³
  const visRain=R=>R>0.02?12*Math.pow(R,-0.6):1e9; // visibilidade na chuva (km), ordem de grandeza

  // ---------- moinho (torre de 4 velas): gira com razão de velocidade de ponta ≈ 2 (Cp ≈ 0,17), começa a girar em
  // vazio com 2,2 m/s no cubo e é freado com as velas recolhidas acima de 11 m/s. Raio das velas 4,4 m, cubo a 6 m
  // de altura (o modelo do atlas).
  const MILL={R:4.4,hub:6,tsr:2,cp:0.17,cutIn:2.2,furl:11};
  function mill(v10,z0,T){const v=atHeight(v10,MILL.hub,z0||0.08),run=v>=MILL.cutIn&&v<MILL.furl;
    const w=run?MILL.tsr*v/MILL.R:0;return{v,run,furled:v>=MILL.furl,omega:w,rpm:w*60/(2*Math.PI),
      P:run?0.5*rhoOf(T==null?22:T)*Math.PI*MILL.R*MILL.R*MILL.cp*v*v*v:0};}

  // ---------- nuvens: gêneros da OMM, altura da base e do topo (m) e largura típica (m) no Cerrado
  const GEN={
    Ci:{name:'Cirros',lvl:'alta',base:[8000,11000],thick:[300,1200],w:[1500,6000],note:'fios de gelo; o vento lá em cima penteia'},
    Cc:{name:'Cirrocúmulos',lvl:'alta',base:[7000,10000],thick:[200,500],w:[1000,4000],note:'grãos de gelo em fileiras'},
    Cs:{name:'Cirrostratos',lvl:'alta',base:[7000,10000],thick:[500,2000],w:[30000,80000],note:'véu de gelo; faz halo de 22° em volta do sol'},
    Ac:{name:'Altocúmulos',lvl:'média',base:[2500,5000],thick:[200,800],w:[800,3000],note:'carneirinhos em fileiras'},
    As:{name:'Altostratos',lvl:'média',base:[2500,5500],thick:[1000,3000],w:[30000,80000],note:'véu cinza; o sol parece atrás de vidro fosco'},
    Ns:{name:'Nimbostratos',lvl:'baixa a média',base:[600,1500],thick:[2000,4000],w:[50000,200000],note:'teto escuro de chuva contínua'},
    Sc:{name:'Estratocúmulos',lvl:'baixa',base:[600,1500],thick:[200,800],w:[600,2500],note:'rolos e placas com frestas de céu'},
    St:{name:'Estratos',lvl:'baixa',base:[50,500],thick:[100,400],w:[2000,20000],note:'camada lisa; névoa que levantou'},
    Cu:{name:'Cúmulos',lvl:'baixa',base:[800,2500],thick:[200,4000],w:[200,1800],note:'torres de ar quente que condensou'},
    Cb:{name:'Cúmulo-nimbos',lvl:'baixa a alta',base:[800,1600],thick:[8000,12000],w:[3000,12000],note:'nuvem de tempestade com bigorna'},
  };
  const CU_SP=tw=>tw<0.3?'humilis (de bom tempo)':tw<0.65?'mediocris':'congestus (em torre)';

  // ---------- o céu de um vale: estado que anda com o tempo
  function Sky(seedKey){
    const seed=hashStr('ceu:'+seedKey),sk='c'+seed;
    const S={tf:null,phase:null,cells:[],flashes:[],plans:new Map(),Rs:null,anvil:0,rainHist:0,t:0,frontOut:0,
      out:null,windA:null};
    // o enfeite do céu de cada dia (altocúmulos, cirros...): sorteado por dia
    function plan(day,ph){const key=day+':'+ph;let p=S.plans.get(key);if(p)return p;const r=mulberry32(hashStr(sk+':d'+key)),R=regime(ph,0.5);
      p={ac:r()<0.35,acAmt:0.15+0.2*r(),ci:r()<R.ci,ciAmt:0.1+0.25*r(),cc:r()<0.08,cs:r()<0.12};
      S.plans.set(key,p);if(S.plans.size>60)S.plans.delete(S.plans.keys().next().value);return p;}
    // episódios de cada estação, em jogadas desde o começo dela: ZCAS e veranico nas Águas, friagem na Seca
    function eplan(season,ph,len){const key='e'+season+':'+ph;let p=S.plans.get(key);if(p)return p;const r=mulberry32(hashStr(sk+':'+key));
      p={zcas:null,veranico:null,fria:null};
      if(!ph){if(r()<0.25){const st=1+r()*(len-4.5);p.zcas={start:st,dur:Math.min(2+r()*1.5,len-1.6-st)};}if(r()<0.3)p.veranico={start:r()*(len-3),dur:2+r()*2};}
      else if(r()<0.35)p.fria={start:r()*Math.max(0.5,len-2.5),dur:1.5+r()};
      S.plans.set(key,p);return p;}
    // episódio em andamento: rampa de entrada e de saída (em jogadas)
    const episode=(e,x,ramp)=>e?sst(e.start-ramp,e.start,x)*(1-sst(e.start+e.dur,e.start+e.dur+ramp,x)):0;
    function regimeAt(phase,sp,tf,season,len){const R=regime(phase,sp),p=plan(Math.floor(tf/16),phase),e=eplan(season,phase,len),xs=sp*len;
      const fr=episode(e.fria,xs,0.6);if(fr>0){R.tmax-=4*fr;R.tmin-=3*fr;R.td-=3*fr;R.wind+=1.5*fr;}R.fria=fr;
      const z=e.zcas,pre=z?sst(z.start-1.5,z.start-0.2,xs)*(1-sst(z.start+z.dur,z.start+z.dur+0.6,xs)):0;
      return{R,p:{...p,zc:episode(z,xs,0.6),pre,veranico:episode(e.veranico,xs,0.3)>0.5},xs};}
    // ingredientes da convecção: o aquecimento, a umidade e uma base baixa o bastante
    function convection(R,p,h,lcl,m,zc){const base=lcl<2600?1:Math.max(0,1-(lcl-2600)/1200);
      return R.cape*heating(h)*(p.veranico?0.35:1)*(0.75+0.5*m)*base*(1-0.85*zc);}
    function thermo(R,h,map,oc,cool,wet){
      const d=diurnal(h);
      let T=R.tmin+0.6*oc*(1-d)+(R.tmax-R.tmin)*(1-0.4*oc)*d+(0.8*map.vila-1.0*map.veg)*d-3.5*cool;
      let Td=R.td+2.0*map.m-0.6+1.2*wet;if(Td>T)Td=T;
      return{T,Td,RH:rhOf(T,Td),lcl:lclOf(T,Td)};}
    function covers(R,p,h,th,CI,map,anvil,rainHist){
      const zc=p.zc,pre=p.pre;
      const c={Cu:0,tw:0,Sc:0,St:0,Ac:0,As:0,Ns:zc,Ci:0,Cc:0,Cs:0,Cb:0};
      if(CI>0.04&&th.lcl<3400){c.Cu=clamp(0.06+0.45*CI,0,0.55);c.tw=c01((CI-0.3)/0.55);}
      if(!R.phase){
        c.Sc=R.cape*sst(16.5,18.5,h)*(1-sst(21,24,h))*0.45;                       // fim de tarde: os cúmulos se espalham
        c.Sc=Math.max(c.Sc,c01(rainHist)*0.5*(h>4&&h<11?1-sst(8,10.5,h):0));       // manhã depois de noite de chuva
        const far=R.cape*heating(h-1.5)*(p.veranico?0.3:1);c.Cb=c01((far-0.45)/0.4); // tempestades ao longe
      }else if(R.sp>0.8)c.Cb=c01((R.cape*heating(h-1.5)-0.2)/0.3)*0.5;              // fim da seca: torres secas (virga)
      if(R.fria)c.Sc=Math.max(c.Sc,0.55*R.fria*(h<14?1:0.5));                       // friagem: frente fria com placas baixas
      if(p.ac)c.Ac=p.acAmt*(h<12?1:0.6);
      c.As=Math.max(pre*0.85,zc*0.6);c.Cs=Math.max(p.cs?0.45:0,pre*0.6);
      c.Ci=Math.max(p.ci?p.ciAmt:0,anvil*0.5);if(p.cc)c.Cc=0.2;
      if(zc>0.3){c.Cu*=1-zc;c.Ac*=1-zc;}
      c.oc=Math.max(c.Ns,c.As*0.8,c.Sc*0.6,c.Cs*0.25,c.Cu*0.3);
      c.zc=zc;c.pre=pre;return c;}
    function fogOf(th,wind,h,oc,water){const night=h>=19||h<11?1:0,pool=2.5*(1-oc)*c01(1-wind/3)*(h>=19||h<9?1:c01((10-h)/1.5));
      const sp=th.T-pool*(water?1:0.4)-(th.Td+(water?1.5:0));return c01((1.2-sp)/1.0)*c01(1-(wind-0.6)/2.4)*night;}
    // ---------- pancadas: células com cortina de chuva que nascem perto do vale e andam com o vento das nuvens
    function spawnCell(n,R,th,CI,steer,forced){const r=mulberry32(hashStr(sk+':cel'+n));
      const virga=R.phase===1,rad=forced?520:250+r()*350,R0=virga?0:forced?38:6+60*Math.pow(r(),2)*(0.6+0.4*c01(CI));
      const life=forced?210:110+r()*90,sp=Math.hypot(steer[0],steer[1])||1,ux=steer[0]/sp,uy=steer[1]/sp;
      const b=(forced?(r()-0.5)*0.4:(r()-0.5)*2.2)*rad,a0=-(forced?0.9:0.3+r()*0.9)*rad;
      return{id:n,x:a0*ux-b*uy,y:a0*uy+b*ux,r:rad,R0,life,lifeH:forced?2:0.9+r()*0.8,gh:0,age:0,vx:steer[0],vy:steer[1],virga,
        g:virga?0:c01(1-(th.lcl-1600)/1200)*0.6+0.4,flash:R0>18?(forced?5:9+r()*10):0,nextF:forced?1.5:2+r()*4,seed:r()*1e6|0,top:9000+r()*4000,forced:!!forced};}
    const prog=c=>Math.max(c.age/c.life,c.gh/c.lifeH),act=c=>{const u=prog(c);return sst(0.12,0.3,u)*(1-sst(0.72,1,u));};
    function rainAt(x,y){let R=0;if(S.phase===1)return 0;for(const c of S.cells){const a=act(c);if(a<=0||c.virga)continue;const q=Math.hypot(x-c.x,y-c.y)/c.r;if(q>=1)continue;
        R+=c.R0*c.g*a*(1-0.35*q*q)*(1-sst(0.78,1,q))*(S.taper??1);}
      return R+(S.out&&(S.taper??1)>0?S.out.nsR:0);} // v2.3: a garoa de fundo vem do quadro anterior; com as chuvas já paradas (taper 0) ela não entra
    function outflowAt(x,y){let ux=0,uy=0,cool=0;for(const c of S.cells){const a=act(c);if(a<0.25)continue;
        const dx=x-c.x,dy=y-c.y,d=Math.hypot(dx,dy)||1,u=prog(c),rf=c.r*(1+1.2*sst(0.25,0.8,u)),G=(2.5+c.R0/9)*a;
        const k=Math.exp(-(((d-rf)/(0.5*c.r))**2))+(d<rf?0.55:0);ux+=dx/d*G*k;uy+=dy/d*G*k;cool=Math.max(cool,a*(d<rf*1.2?1:Math.exp(-(((d-rf*1.2)/c.r)**2))));}
      return[ux,uy,cool];}
    // inp: {tf, phase, sp, map:{m,veg,vila}, lesson, focus:[x,y] em m}; dt em segundos de verdade
    function step(dt,inp){
      dt=Math.min(0.25,Math.max(0,dt));S.t+=dt;const tf=inp.tf,h=inp.lesson?10:hourOf(tf);
      const phase=inp.phase?1:0,sp=inp.lesson?0.4:c01(inp.sp),map=inp.map||{m:0.5,veg:0.3,vila:0.1};
      const slen=inp.slen||(phase?4:8),rg=regimeAt(phase,sp,inp.lesson?10:tf,inp.season||0,slen),R=rg.R,p=inp.lesson?{...rg.p,zc:0,pre:0,ci:false,ac:false,cc:false,cs:false,veranico:true}:rg.p;
      if(inp.lesson)R.fria=0;
      // as estações mudam devagar (a monção vira em cerca de uma jogada)
      if(!S.Rs||inp.jump)S.Rs={...R};else{const k=Math.min(1,dt*0.25);for(const q of['tmin','tmax','td','wind','cape','vis','ci'])S.Rs[q]+=(R[q]-S.Rs[q])*k;
        S.Rs.phase=R.phase;S.Rs.sp=R.sp;S.Rs.doy=R.doy;S.Rs.fria=R.fria;}
      const Rs=S.Rs;
      // quanto falta para a seca (em jogadas): nas últimas jogadas das Águas a chuva rareia e para
      const left=Math.min((1-sp)*slen,inp.left??99),taper=phase||inp.lesson?1:sst(1,2.4,left);S.taper=taper; // inp.left: jogadas que faltam no jogo (sem o atraso suave do relógio)
      // vento sinótico (de onde vem): NO nas Águas, L/SE na Seca; serpenteia devagar; friagem traz vento do sul
      let from=R.fria?lerp(R.from,180,R.fria):R.from;from+=25*noise1(sk+'wa',S.t/90)+10*noise1(sk+'wb',S.t/23);
      if(S.windA==null||inp.jump)S.windA=from;else{let d=((from-S.windA+540)%360)-180;S.windA=(S.windA+d*Math.min(1,dt*0.08)+360)%360;}
      // de dia o sol mistura o ar e o vento chega ao chão; de noite o ar parado se separa e o vento cai
      const mix=0.45+0.8*heating(h)+0.1*Math.sin(Math.PI*h/24),th0=thermo(Rs,h,map,S.out?S.out.oc:0,0,c01(S.rainHist));
      let v=Math.max(0.2,Rs.wind*mix*(1+0.18*noise1(sk+'ws',S.t/40)));
      // turbulência (v2.3): u = U·(1 + Iu·n), com n de média zero e desvio 1, feito de redemoinhos de 1,6 s, 6 s e 25 s
      // (rajada, lufada e as pausas das térmicas). Iu = σu/U é a intensidade de turbulência de campo aberto:
      // ~0,10 de noite (ar estável) e ~0,27 na tarde de sol (térmicas). A rajada de pico fica em 1,5–1,8 × o vento médio,
      // como nas estações do Cerrado. Antes as rajadas só somavam (o vento médio de verdade ficava ~20% acima do anunciado)
      // e vinham num pulso regular a cada 46 s.
      const Iu=0.1+0.17*heating(h),nT=(0.55*noise1(sk+'t1',S.t/1.6)+0.45*noise1(sk+'t2',S.t/6)+0.35*noise1(sk+'t3',S.t/25))/0.394;
      const vg=Math.max(0.15*v,v*(1+Iu*nT));
      const steer=toVec(S.windA+15,Rs.wind*1.6+1.8); // vento na altura das nuvens: mais forte e um pouco girado
      // eventos de jogada: pancadas (determinísticas pela semente e pela jogada)
      const prevPhase=S.phase;S.phase=phase;
      const maxSeason0=S.maxSeason;S.maxSeason=Math.max(S.maxSeason||0,inp.season||0);
      if(S.tf==null||inp.jump||Math.abs(tf-S.tf)>3)S.tf=tf;
      const z0=Math.floor(S.tf),z1=Math.floor(tf);
      if(!inp.lesson){
        if(prevPhase===1&&phase===0&&(inp.season||0)>(maxSeason0||0))S.cells.push(spawnCell('chuva'+z1,R,th0,1,steer,true)); // as chuvas voltam: a frente chega
        for(let n=z0+1;n<=z1&&n<=z0+2;n++){const hn=hourOf(n+0.5),thn=thermo(Rs,hn,map,0,0,0),CIn=convection(Rs,p,hn-2,thn.lcl,map.m,p.zc);
          let P=phase?(sp>0.75?0.3*c01(CIn*3):0):clamp(0.55*CIn*CIn,0,0.5)*taper;
          if(!phase&&(hn>=21||hn<5))P+=0.06*Rs.cape*(p.veranico?0.3:1)*taper; // chuva de madrugada (sistemas que vêm de longe)
          if(S.cells.length<3&&mulberry32(hashStr(sk+':p'+n))()<P)S.cells.push(spawnCell(n,R,thn,CIn,steer,false));}
      }
      S.tf=tf;
      S.flashes.length=0;
      const dH=hoursBetween(S.tf0==null?tf:S.tf0,tf);S.tf0=tf;
      for(let i=S.cells.length-1;i>=0;i--){const c=S.cells[i];if(phase===1&&!c.virga){c.virga=true;c.flash=0;c.R0=0;} // v2.3: na seca a pancada vira nuvem seca
        c.age+=dt*(phase===1?5:1);c.gh+=dH;c.x+=c.vx*dt;c.y+=c.vy*dt;if(prog(c)>=1){S.cells.splice(i,1);continue;}
        const a=act(c);c.act=a;c.u=prog(c);c.R0e=c.virga?0:c.R0*(S.taper??1);if(c.flash&&a>0.45&&c.R0e>12){c.nextF-=dt;if(c.nextF<=0){const r=mulberry32(c.seed+(c.age*1000|0));c.nextF=c.flash*(0.4+1.2*r());
          const fx=c.x+(r()-0.5)*c.r*1.6,fy=c.y+(r()-0.5)*c.r*1.6,fd=Math.hypot(fx,fy);S.flashes.push({x:fx,y:fy,dist:fd,delay:fd/343,power:0.5+0.5*r(),cell:c.id});}}}
      S.anvil=Math.max(S.anvil*Math.exp(-dt/240),...S.cells.map(c=>c.virga?0:act(c)));
      const fo=inp.focus||[0,0],[ox,oy,cool]=outflowAt(fo[0],fo[1]);
      const Rv=rainAt(0,0),Rf=rainAt(fo[0],fo[1]);
      S.rainHist=Math.max(S.rainHist*Math.exp(-dt/400),c01(Math.max(Rv,Rf)/5));
      const oc0=S.out?S.out.oc:0,th=thermo(Rs,h,map,oc0,cool,c01(S.rainHist));
      const CI=convection(Rs,p,h,th.lcl,map.m,p.zc);
      const cv=covers(Rs,p,h,th,CI,map,S.anvil,S.rainHist);
      const nsR=cv.zc*taper*(1.2+2.5*c01(0.5+0.5*noise1(sk+'ns',S.t/50)));
      // vento final: o sinótico com rajadas mais a frente de rajada das pancadas
      const[wx0,wy0]=toVec(S.windA,vg),[mx0,my0]=toVec(S.windA,v),wx=wx0+ox,wy=wy0+oy,wv=Math.hypot(wx,wy),wfrom=((Math.atan2(-wx,wy)/RAD)+360)%360;
      const sunp=sun(Rs.doy,h),fog=inp.lesson?0:fogOf(th,v,h,cv.oc,false),fogW=inp.lesson?0:fogOf(th,v,h,cv.oc,true);
      // a neblina da madrugada levanta e vira estrato quando o sol esquenta o chão
      cv.St=Math.max(cv.St,c01(Math.max(fog,fogW*0.6)*1.4)*sst(6.5,8,h)*(1-sst(9.5,11,h)));cv.oc=Math.max(cv.oc,cv.St*0.9);
      const dr=drops(Rf);
      const vis=1/(1/Rs.vis+1/visRain(Rf)+fog*2+cv.Ns*0.05);
      S.out={hour:h,T:th.T,Td:th.Td,RH:th.RH,lcl:th.lcl,p:P0,rho:rhoOf(th.T),R:Rf,Rv,nsR,drops:dr,vis,fog,fogW,
        wind:{ms:wv,mean:v,base:Math.hypot(mx0+ox,my0+oy),bx:mx0+ox,by:my0+oy,iu:Iu,from:wfrom,x:wx,y:wy,bft:beaufort(wv),dir:compass(wfrom),gust:Math.max(0,vg-v)},steer,
        sun:sunp,cv,oc:cv.oc,CI,cells:S.cells,flashes:S.flashes,phase,sp,fria:Rs.fria||0,veranico:p.veranico,zcas:cv.zc,cool,regime:Rs};
      return S.out;}
    return{step,rainAt,outflowAt,act,state:S};
  }
  // descrição curta do céu (para o boletim do Contemplar e o caderno)
  function describe(o){if(!o)return'';const c=o.cv,list=[];
    if(o.fog>0.35)list.push(['neblina',o.fog]);
    if(c.Ns>0.3)list.push(['Ns',c.Ns]);if(c.As>0.3)list.push(['As',c.As*0.9]);
    if(o.cells.some(x=>!x.virga&&x.act>0.1))list.push(['Cb',0.95]);
    if(c.Cu>0.05)list.push(['Cu',c.Cu*(1+c.tw)]);if(c.Sc>0.1)list.push(['Sc',c.Sc]);if(c.St>0.1)list.push(['St',c.St]);
    if(c.Ac>0.1)list.push(['Ac',c.Ac*0.8]);if(c.Cs>0.2)list.push(['Cs',c.Cs*0.6]);if(c.Ci>0.1)list.push(['Ci',c.Ci*0.6]);if(c.Cc>0.1)list.push(['Cc',c.Cc*0.5]);
    list.sort((a,b)=>b[1]-a[1]);
    if(!list.length)return'céu limpo';
    const top=list[0][0];if(top==='neblina')return'neblina no vale';
    const g=GEN[top];let s=g.name;if(top==='Cu')s+=' '+CU_SP(c.tw)+`, base a ${(Math.round(o.lcl/100)*100).toLocaleString('pt-BR')} m`;
    else if(top==='Cb')s+=', pancada por perto';
    return s;}
  return{M,LAT,ALT,CLIM,GEN,MILL,Z0,regime,sun,hourOf,hoursBetween,es,rhOf,lclOf,rhoOf,diurnal,heating,beaufort,compass,toVec,atHeight,drops,visRain,mill,Sky,describe,noise1,hashStr,mulberry32,CU_SP};
}
