'use strict';
// Presentation only: geometry, scoring and route validation remain in each mode.
const KnotFeel = (() => {
  let currentState, noticeTimer;
  const reduced = () => typeof matchMedia === 'function' && matchMedia('(prefers-reduced-motion: reduce)').matches;
  const svg = (tag, attrs) => {
    const el = document.createElementNS('http://www.w3.org/2000/svg', tag);
    for (const [key, value] of Object.entries(attrs)) el.setAttribute(key, value);
    return el;
  };
  function begin(state, nodes, layers) {
    if (state === currentState) return;
    currentState = state;
    nodes.replaceChildren();
    layers.forEach(layer => layer.replaceChildren());
    document.querySelector('#fx').replaceChildren();
    document.querySelector('#pulses').replaceChildren();
    clearTimeout(noticeTimer);
  }
  function node(parent, id) {
    let el = parent.querySelector(`[data-node="${id}"]`);
    if (!el) {
      el = document.createElement('button');
      el.dataset.node = id;
      parent.appendChild(el);
    }
    return el;
  }
  function press(el) {
    if (reduced()) return;
    el.classList.remove('pin-press');
    void el.offsetWidth;
    el.classList.add('pin-press');
    setTimeout(() => el.classList.remove('pin-press'), 220);
  }
  function geometry(state, loops, edges, junctions) {
    const polygons = state.loopsData || state.loops.map(loop => loop.points);
    for (let i = loops.children.length; i < polygons.length; i++) {
      const poly = svg('polygon', {points: polygons[i].map(p => `${p.x},${p.y}`).join(' '), class: 'loop-fill'});
      poly.style.fill = `hsla(${14 + i * 28},42%,72%,${.12 + Math.min(.12,i*.015)})`;
      loops.appendChild(poly);
    }
    for (let i = edges.children.length; i < state.edges.length; i++) {
      const e = state.edges[i];
      const line = svg('line', {x1:e.a.x,y1:e.a.y,x2:e.b.x,y2:e.b.y,pathLength:1,class:'edge'+(e.echo?' echo':'')});
      edges.appendChild(line);
      if (e.echo && i > 0 && !reduced()) {
        const previous = edges.children[i-1];
        previous.classList.add('echo-response');
        setTimeout(() => previous.classList.remove('echo-response'), 420);
      }
    }
    for (let i = junctions.children.length; i < state.junctions.length; i++) {
      const j = state.junctions[i];
      junctions.appendChild(svg('circle',{cx:j.x,cy:j.y,r:10,class:'junction'}));
    }
  }
  function toast(layer, text, big) {
    let el = layer.querySelector('.feel-notice');
    if (!el) {
      el = document.createElement('div');
      el.className = 'feel-notice';
      el.setAttribute('role','status');
      layer.appendChild(el);
    }
    // A single notice collects simultaneous rewards instead of overlapping them.
    const messages = el._messages || [];
    if (!messages.includes(text)) messages.push(text);
    el._messages = messages.slice(-3);
    el.textContent = el._messages.join(' · ');
    el.classList.toggle('is-big', !!big || el.classList.contains('is-big'));
    clearTimeout(noticeTimer);
    noticeTimer = setTimeout(() => el.remove(), 1400);
  }
  function gain(layer, point, score) {
    const el = document.createElement('span');
    el.className = 'loop-gain';
    el.textContent = '+' + Math.round(score).toLocaleString('pt-BR');
    el.style.left = point.x + 'px';
    el.style.top = point.y + 'px';
    layer.appendChild(el);
    setTimeout(() => el.remove(), 1000);
  }
  function mapPreview(points) {
    // Show the actual pin layout, without implying a solution route.
    return `<svg class="map-preview" viewBox="0 0 1000 1000" aria-hidden="true"><circle cx="500" cy="500" r="360" class="preview-guide"/>${points.map(p=>`<circle cx="${p[0]}" cy="${p[1]}" r="23"/>`).join('')}</svg>`;
  }
  return {begin,node,geometry,press,toast,gain,mapPreview,reduced};
})();
