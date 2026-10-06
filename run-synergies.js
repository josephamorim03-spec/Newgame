'use strict';
const SYNERGY_DEFS={
  rupture:{name:'Rupture',symbol:'✕✦',requires:['blood','fracture'],desc:'Se a linha que fecha o Loop também cria Crosses, cada Cross amplifica ainda mais o fechamento.'},
  chorus:{name:'Chorus',symbol:'∥↗',requires:['mirror','crescendo'],desc:'Um Echo que fecha o Loop transforma repetição em crescendo e recebe um multiplicador extra.'},
  needlework:{name:'Needlework',symbol:'○△',requires:['clean','trinity'],desc:'Um triângulo limpo preserva parte da tensão para o próximo Loop, permitindo encadear precisão.'},
  kaleidoscope:{name:'Kaleidoscope',symbol:'↔◇',requires:['reflection','prism'],desc:'Um Loop de 4+ pontos fechado ao criar um novo par espelhado ganha uma explosão geométrica.'},
  orbit:{name:'Orbit',symbol:'◎⊙',requires:['heart','halo'],desc:'Um Loop que envolve o centro e é fechado por uma linha central recebe um grande impulso.'},
  constellation:{name:'Constellation',symbol:'—☆',requires:['long','star'],desc:'Loops de 5+ vértices escalam com a quantidade de arestas longas dentro da própria forma.'},
  lattice:{name:'Lattice',symbol:'✣≋',requires:['junction','braid'],desc:'Uma única linha que é Echo e também cria Cross converte o encontro em pontos e tensão imediatos.'}
};
function synergyActive(id,build){const s=SYNERGY_DEFS[id];return !!s&&s.requires.every(k=>build.includes(k))}
function activeSynergies(build){return Object.entries(SYNERGY_DEFS).filter(([,s])=>s.requires.every(k=>build.includes(k))).map(([id,s])=>({id,...s}))}
function synergiesCompletedBy(candidate,build){return Object.entries(SYNERGY_DEFS).filter(([,s])=>s.requires.includes(candidate)&&s.requires.every(k=>k===candidate||build.includes(k))).map(([id,s])=>({id,...s}))}
function synergyPartners(candidate){return Object.values(SYNERGY_DEFS).filter(s=>s.requires.includes(candidate)).flatMap(s=>s.requires.filter(k=>k!==candidate))}
if(typeof module!=='undefined'&&module.exports)module.exports={SYNERGY_DEFS,synergyActive,activeSynergies,synergiesCompletedBy,synergyPartners};
