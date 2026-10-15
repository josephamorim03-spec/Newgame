// Régua do 3D: cada coisa do vale é medida em metros e comparada com o tamanho de verdade.
// Regra (a mesma ideia da tabela métrica do jogo, CLIMA.md §11, adaptada ao 3D com zoom): tudo o que tem 30 cm ou mais
// é desenhado no tamanho real; o que é menor ganha um exagero suave, sempre o mesmo e sem trocar a ordem,
// READ3(L) = 0,3·(L/0,3)^0,6 — borboleta de 8 cm vira ~14 cm, libélula de 7 cm vira ~13 cm.
// O painel "Régua" mostra a tabela medida agora e põe bonecos de 1,70 m pelo vale para comparar a olho.
import * as THREE from 'three';

export const READ3 = L => L >= 0.3 ? L : 0.3 * Math.pow(L / 0.3, 0.6);
// tamanho de verdade (h = altura total acima do chão; l = maior medida na horizontal), em metros
export const TABELA = {
  'pessoa (referência)': { h: [1.6, 1.8] },
  'homem': { h: [1.6, 1.98] },
  'mulher': { h: [1.48, 1.84] },
  'criança': { h: [0.95, 1.5] },
  'árvore do cerrado': { h: [3, 8], l: [2.5, 9] },
  'ipê': { h: [5, 12] },
  'árvore da mata de galeria': { h: [9, 20] },
  'árvore de sombra do pasto': { h: [8, 15], l: [9, 18] },
  'moita': { h: [0.7, 3] },
  'buriti': { h: [14, 26] },
  'cupinzeiro': { h: [0.6, 2.4] },
  'pedra': { l: [0.3, 2.5] },
  'casa': { h: [4.0, 6.2], l: [6, 10.5] },
  'capela (com a torre)': { h: [10, 15], l: [8, 14] },
  'poço': { h: [1.8, 3.0] },
  'cerca do curral': { h: [1.3, 1.9] },
  'cerca da horta': { h: [0.8, 1.3] },
  'milho': { h: [1.8, 2.8] },
  'girassol': { h: [1.5, 3.0] },
  'moinho (com as pás)': { h: [10, 16] },
  'boi nelore': { h: [1.35, 1.75], l: [2.3, 3.0] },
  'capivara': { h: [0.45, 0.7], l: [1.0, 1.4] },
  'garça-branca': { h: [0.85, 1.05] },
  'seriema': { h: [0.7, 0.95] },
  'galinha': { h: [0.3, 0.55] },
  'arara (envergadura)': { l: [0.9, 1.3] },
  'passarinho do bando (envergadura)': { l: [0.15, 0.4] },
  'borboleta (envergadura, na régua)': { l: [0.1, 0.18] },
  'libélula (envergadura, na régua)': { l: [0.1, 0.16] },
  'peixe': { l: [0.25, 0.45] },
  'ema': { h: [1.3, 1.65] },
  'lobo-guará': { h: [0.95, 1.25], l: [1.3, 1.65] },
  'tamanduá-bandeira': { h: [0.55, 0.9], l: [1.8, 2.3] },
  'anta': { h: [0.9, 1.25], l: [1.8, 2.3] },
  'onça-pintada': { h: [0.65, 0.95], l: [1.6, 2.4] },
  'canela-de-ema': { h: [0.8, 2.0] },
  'paiol': { h: [3.6, 5.5], l: [3.5, 5.5] },
  'fardo de feno (pilha)': { h: [0.9, 1.6] },
  'espantalho': { h: [1.6, 2.1] },
  'carroça de boi': { h: [1.2, 1.8], l: [3.5, 5.5] },
  'cerca do aprisco': { h: [0.8, 1.3] },
  'ovelha': { h: [0.65, 1.0], l: [1.0, 1.45] },
  'tucano': { l: [0.45, 0.68] },
  'joão-de-barro (na régua)': { l: [0.19, 0.28] },
  'ninho de joão-de-barro': { l: [0.22, 0.4] },
  'martim-pescador': { l: [0.3, 0.45] },
};
export const tag = (o, name, scale) => { o.userData.regua = name; if (scale) o.userData.reguaScale = scale; return o; };

function measure(o) {
  if (o.isInstancedMesh || o.userData.reguaGeo) { const g = o.geometry; g.computeBoundingBox(); const b = g.boundingBox, s = o.userData.reguaScale || 1;
    return { h: b.max.y * s, l: Math.max(b.max.x - b.min.x, b.max.z - b.min.z) * s }; }
  const undo = o.userData.reguaRest ? o.userData.reguaRest() : null;   // gente sentada ou agachada é medida em pé
  const ry = o.rotation.y; o.rotation.y = 0; o.updateMatrixWorld(true);
  const b = new THREE.Box3(), cb = new THREE.Box3();
  o.traverse(c => { if ((c.isMesh || c.isLineSegments) && !c.isSprite && !c.userData.noRegua && c.visible !== false) { if (c.isSkinnedMesh) { c.computeBoundingBox(); cb.copy(c.boundingBox).applyMatrix4(c.matrixWorld); } else { c.geometry.computeBoundingBox(); cb.copy(c.geometry.boundingBox).applyMatrix4(c.matrixWorld); } b.union(cb); } });
  o.rotation.y = ry; if (undo) undo(); o.updateMatrixWorld(true);
  return { h: b.max.y - o.getWorldPosition(new THREE.Vector3()).y, l: Math.max(b.max.x - b.min.x, b.max.z - b.min.z) };
}
export function audit(scene) {
  const got = {};
  scene.traverse(o => { const n = o.userData.regua; if (!n) return; const m = measure(o); const r = got[n] || (got[n] = { n: 0, h: [1e9, -1e9], l: [1e9, -1e9] });
    r.n++; r.h = [Math.min(r.h[0], m.h), Math.max(r.h[1], m.h)]; r.l = [Math.min(r.l[0], m.l), Math.max(r.l[1], m.l)]; });
  const rows = [];
  for (const [name, ref] of Object.entries(TABELA)) { const r = got[name]; if (!r) { rows.push({ name, ok: null }); continue; }
    let ok = true; const out = [];
    for (const k of ['h', 'l']) if (ref[k]) { const [a, b] = r[k], [lo, hi] = ref[k], fine = a >= lo * 0.97 && b <= hi * 1.03; ok = ok && fine;
      out.push(`${k === 'h' ? 'alt.' : 'compr.'} ${fmt(a)}${b - a > 0.05 ? '–' + fmt(b) : ''} (real ${fmt(lo)}–${fmt(hi)})${fine ? '' : ' ⚠'}`); }
    rows.push({ name, n: r.n, ok, txt: out.join(' · ') }); }
  return rows;
}
const fmt = v => v >= 1 ? v.toFixed(1).replace('.', ',') + ' m' : Math.round(v * 100) + ' cm';

// boneco de referência de 1,70 m (camisa terracota, calça azul), em pé, de frente para a câmera
export function person(mat) {
  const g = new THREE.Group(), C = (h, c) => { const m = mat.clone(); m.color = new THREE.Color(c); return m; };
  const skin = C(0, 0xc08a62), shirt = C(0, 0xc0583a), pants = C(0, 0x3a5a8a), hat = C(0, 0xe2cf8a);
  const add = (geo, m, x, y, z) => { const me = new THREE.Mesh(geo, m); me.position.set(x, y, z); me.castShadow = true; me.userData.noRegua = false; g.add(me); return me; };
  for (const s of [-1, 1]) add(new THREE.CapsuleGeometry(0.075, 0.68, 4, 8), pants, s * 0.1, 0.43, 0);
  add(new THREE.CapsuleGeometry(0.17, 0.42, 4, 10), shirt, 0, 1.12, 0).scale.set(1, 1, 0.62);
  for (const s of [-1, 1]) add(new THREE.CapsuleGeometry(0.05, 0.55, 4, 6), shirt, s * 0.24, 1.06, 0).rotation.z = s * 0.08;
  add(new THREE.SphereGeometry(0.11, 12, 10), skin, 0, 1.53, 0);
  add(new THREE.CylinderGeometry(0.2, 0.2, 0.02, 14), hat, 0, 1.63, 0); add(new THREE.CylinderGeometry(0.1, 0.12, 0.07, 12), hat, 0, 1.67, 0);
  return tag(g, 'pessoa (referência)');
}
