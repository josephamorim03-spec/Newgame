(function(root){
  'use strict';
  // Faceted vector sculptures, not raster portraits: readable at 64px, fully offline.
  // A shared graphite shell, upper-left key light and one luminous sensory core.
  const characters={
    needle:{name:'NEEDLE',role:'O perfurador',accent:'#f28da7',description:'Frio e preciso. O olho acompanha o setor que será perfurado.',rule:'Ressoe no setor marcado antes da contagem zerar para desarmar o ataque.'},
    parasite:{name:'PARASITE',role:'O drenador',accent:'#baafff',description:'Um núcleo faminto cercado por três garras. Ele se fecha sobre a energia acumulada.',rule:'Gaste todas as cargas do link marcado antes do ataque. Se restar carga, ele drena o link e causa dano.'},
    clamp:{name:'THE CLAMP',role:'O carcereiro',accent:'#edc47c',description:'Pesado e obstinado. Duas mandíbulas de cerâmica comprimem um olho central.',rule:'O anel preso não pode ser escolhido, mas pode girar por acoplamento. Ressoe no setor marcado para evitar dano.'},
    free:{name:'LIVRE',role:'Núcleo em repouso',accent:'#96ebd3',description:'A máquina está segura. Um pequeno núcleo aberto indica ausência de ameaça.',rule:'Experimente acoplamentos e Protocolos sem ataques ou limite de movimentos.'}
  };
  function svg(kind,instance='main'){
    const key=Object.hasOwn(characters,kind)?kind:'free',character=characters[key];
    const id='anomaly-'+key+'-'+String(instance).replace(/[^a-z0-9_-]/gi,'').slice(0,32);
    const paint=name=>'url(#'+id+'-'+name+')';
    const defs=`<defs>
      <linearGradient id="${id}-shell" x1="0" y1="0" x2="1" y2="1"><stop stop-color="#73728f"/><stop offset=".42" stop-color="#42465d"/><stop offset="1" stop-color="#202332"/></linearGradient>
      <linearGradient id="${id}-edge" x1="0" y1="0" x2="1" y2="1"><stop stop-color="#c4c2d8"/><stop offset="1" stop-color="#4d536e"/></linearGradient>
      <linearGradient id="${id}-side" x1="0" y1="0" x2="1" y2="1"><stop stop-color="#303447"/><stop offset="1" stop-color="#141722"/></linearGradient>
      <radialGradient id="${id}-light"><stop stop-color="${character.accent}" stop-opacity=".19"/><stop offset="1" stop-color="${character.accent}" stop-opacity="0"/></radialGradient>
      <radialGradient id="${id}-core" cx=".35" cy=".28"><stop stop-color="#f5f1ff"/><stop offset=".32" stop-color="${character.accent}"/><stop offset="1" stop-color="${character.accent}" stop-opacity=".45"/></radialGradient>
    </defs>`;
    let sculpture='';
    if(key==='needle')sculpture=`
      <g class="enemy-shell">
        <path d="M60 10 83 36 65 94 60 111 55 94 37 36Z" fill="${paint('side')}" stroke="#252938"/>
        <path d="M60 10 37 36 60 51Z" fill="${paint('edge')}"/>
        <path d="M60 10 83 36 60 51Z" fill="${paint('shell')}"/>
        <path d="m37 36 23 15v55Z" fill="${paint('shell')}"/>
        <path d="M83 36 60 51v55Z" fill="${paint('side')}"/>
        <path d="m60 13-20 23 20 13" fill="none" stroke="#d5cfe2" stroke-opacity=".5"/>
        <path d="m28 46 9-10 11 35Z" fill="${paint('side')}" stroke="#585b74" stroke-width=".7"/>
        <path d="m92 46-9-10-11 35Z" fill="${paint('side')}" stroke="#444960" stroke-width=".7"/>
        <path d="m49 41 11-8 11 8-11 11Z" fill="#131622" stroke="#a27691" stroke-width=".8"/>
        <g class="enemy-eye"><path class="enemy-light" d="m53 41 7-4 7 4-7 6Z" fill="${paint('core')}"/><path d="M60 39v5" stroke="#fff1f4" stroke-width="1.5"/></g>
        <path class="enemy-light" d="M60 56v30" stroke="${character.accent}" stroke-width="1" stroke-opacity=".7"/>
      </g>`;
    if(key==='parasite')sculpture=`
      <g class="enemy-shell">
        <circle cx="60" cy="59" r="28" fill="${paint('side')}" stroke="#66627d"/>
        <path d="M38 57a24 24 0 0 1 37-17" fill="none" stroke="#8b859f" stroke-width="1.3"/>
        <circle cx="60" cy="59" r="20" fill="#121522"/>
        <g class="enemy-eye"><ellipse class="enemy-light" cx="59" cy="59" rx="12" ry="15" fill="${paint('core')}"/><ellipse cx="59" cy="59" rx="4.2" ry="8.5" fill="#171827"/><circle cx="55.5" cy="53" r="2.2" fill="#f0eaff"/></g>
        <g class="parasite-claws">
          ${[0,120,240].map(angle=>`<g transform="rotate(${angle} 60 59)"><path d="M47 30 55 13 77 24 88 48 75 47 69 33 58 29 55 39Z" fill="${paint('shell')}" stroke="#6f6b88" stroke-width=".7"/><path d="m55 13 22 11-8 9-11-4-3 10-8-9Z" fill="${paint('edge')}" opacity=".6"/><path d="m77 24 11 24-13-1-6-14Z" fill="${paint('side')}"/><path class="enemy-light" d="m76 43-7-10" fill="none" stroke="${character.accent}" stroke-width="1.3"/></g>`).join('')}
        </g>
      </g>`;
    if(key==='clamp')sculpture=`
      <g class="enemy-shell">
        <path d="M35 23 45 16h30l10 7v17H35Z" fill="${paint('side')}" stroke="#575b72"/>
        <path d="m35 23 10-7h30l10 7-10 8H45Z" fill="${paint('edge')}"/>
        <path d="M46 33h28v54H46Z" fill="#171a26" stroke="#5c5a70"/>
        <g class="enemy-eye"><path class="enemy-light" d="M43 55h34v12H43Z" fill="${paint('core')}"/><path d="M52 60h16" stroke="#fff2d8" stroke-width="2"/></g>
        <g class="clamp-jaw left-jaw"><path d="M22 27h22v20H36v30h8v19H23L13 86V39Z" fill="${paint('shell')}" stroke="#676b81"/><path d="m22 27-9 12h23l8-12Z" fill="${paint('edge')}"/><path d="M13 39h9v47l-9 0Z" fill="${paint('side')}"/><path d="M36 47h8l-4 8h-4m0 15h4l4 7h-8" fill="${paint('edge')}"/><path class="enemy-light" d="M27 48v27" stroke="${character.accent}" stroke-width="1.4"/></g>
        <g class="clamp-jaw right-jaw"><path d="M76 27h22l9 12v47l-10 10H76V77h8V47h-8Z" fill="${paint('shell')}" stroke="#676b81"/><path d="m76 27 8 12h23l-9-12Z" fill="${paint('edge')}"/><path d="M98 39h9v47l-9 10Z" fill="${paint('side')}"/><path d="M76 47h8v8h-4m0 15h4v7h-8" fill="${paint('edge')}"/><path class="enemy-light" d="M93 48v27" stroke="${character.accent}" stroke-width="1.4"/></g>
        <path d="M44 88h32l-7 13H51Z" fill="${paint('shell')}" stroke="#5f6279"/>
      </g>`;
    if(key==='free')sculpture=`<g class="enemy-shell"><ellipse cx="60" cy="64" rx="36" ry="29" fill="${paint('side')}" stroke="#77798f"/><ellipse cx="60" cy="57" rx="36" ry="29" fill="${paint('shell')}" stroke="${paint('edge')}"/><ellipse cx="60" cy="57" rx="24" ry="18" fill="#181c29" stroke="#5b6677"/><ellipse class="enemy-light" cx="60" cy="57" rx="11" ry="9" fill="${paint('core')}"/><path d="M32 38 43 46m34 21 11 9" stroke="#96ebd3" stroke-opacity=".6"/></g>`;
    return `<svg class="enemy-sculpture" viewBox="0 0 120 120" xmlns="http://www.w3.org/2000/svg" aria-hidden="true" focusable="false">${defs}<circle class="enemy-aura" cx="60" cy="57" r="52" fill="${paint('light')}"/><ellipse cx="60" cy="107" rx="29" ry="4" fill="#050912" opacity=".45"/><g class="enemy-body">${sculpture}</g></svg>`;
  }
  root.AnomalyArt={characters,svg};
  if(typeof module!=='undefined' && module.exports)module.exports=root.AnomalyArt;
})(typeof window!=='undefined'?window:globalThis);
