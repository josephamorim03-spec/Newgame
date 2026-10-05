const {test}=require('node:test');
const assert=require('node:assert/strict');
const art=require('../src/anomalies');
test('each anomaly has a distinct self-contained vector silhouette',()=>{
  const renderings=Object.keys(art.characters).map(kind=>art.svg(kind));
  assert.equal(new Set(renderings).size,4);
  for(const svg of renderings){assert.ok(svg.startsWith('<svg'));assert.ok(svg.includes('class="enemy-body"'));assert.ok(svg.includes('linearGradient'));assert.ok(!/<script|<image|href=/.test(svg));}
  assert.ok(art.svg('needle').includes('enemy-eye'));
  assert.ok(art.svg('parasite').includes('parasite-claws'));
  assert.ok(art.svg('clamp').includes('left-jaw'));
});
test('portrait and inspector do not share gradient IDs; unknown kind falls back safely',()=>{
  const ids=svg=>[...svg.matchAll(/\bid="([^"]+)"/g)].map(m=>m[1]);
  for(const kind of Object.keys(art.characters)){
    const a=ids(art.svg(kind,'main')),b=ids(art.svg(kind,'inspect'));assert.ok(a.every(id=>!b.includes(id)));
  }
  assert.equal(art.svg('<invalid>'),art.svg('free'));
  assert.ok(!art.svg('needle','"><script>').includes('<script>'));
});
