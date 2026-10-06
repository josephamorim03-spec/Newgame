'use strict';
const assert=require('assert');
const fs=require('fs');
const path=require('path');
const root=path.join(__dirname,'..');
const read=p=>fs.readFileSync(path.join(root,p),'utf8');

for(const file of ['knot-audio.js','gamefeel.js','share.js','run-synergies.js','run-a.js','run-b.js','run-c.js','run-d.js','atlas-a.js','atlas-b.js','atlas-c.js','tools/calibrate-atlas.js','tools/calibrate-runs.js','tools/verify-route.js']){
  assert.doesNotThrow(()=>new Function(read(file)),file+' should parse');
}

for(const htmlFile of ['index.html','run.html','atlas.html']){
  const html=read(htmlFile),ids=[...html.matchAll(/\bid="([^"]+)"/g)].map(m=>m[1]);
  assert.equal(new Set(ids).size,ids.length,htmlFile+' should not contain duplicate ids');
  for(const m of html.matchAll(/(?:src|href)="([^"]+)"/g)){
    const ref=m[1];
    if(/^https?:|^#|^data:/.test(ref))continue;
    const clean=ref.split(/[?#]/)[0];
    assert(fs.existsSync(path.join(root,clean)),`${htmlFile} references missing local file ${clean}`);
  }
}

for(const htmlFile of ['run.html','atlas.html']){
  const html=read(htmlFile);
  assert(html.includes('maximum-scale=1'),'gameplay viewport must prevent pinch relayout in '+htmlFile);
  assert(html.includes('user-scalable=no'),'gameplay viewport must stay fixed during touch gestures in '+htmlFile);
}
assert(read('gamefeel.js').includes('--game-board-size'),'gameplay surface must lock its initial board size');
assert(read('knot-audio.js').includes('flushPending'),'audio events must survive a suspended mobile AudioContext');

const manifest=JSON.parse(read('manifest.webmanifest'));
assert.equal(manifest.display,'standalone','manifest must install standalone');
assert(manifest.icons.some(i=>i.sizes==='192x192'&&i.type==='image/png'),'manifest needs a 192px PNG icon');
assert(manifest.icons.some(i=>i.sizes==='512x512'&&i.type==='image/png'),'manifest needs a 512px PNG icon');
for(const htmlFile of ['index.html','run.html','atlas.html']){
  const html=read(htmlFile);
  assert(html.includes('rel="manifest"'),htmlFile+' must link the web app manifest');
  assert(html.includes('rel="apple-touch-icon"'),htmlFile+' must expose an Apple touch icon');
}
for(const asset of ['favicon.svg','apple-touch-icon.png','icon-192.png','icon-512.png','manifest.webmanifest']){
  assert(fs.existsSync(path.join(root,asset)),'missing install asset '+asset);
}

const runHtml=read('run.html');
assert(runHtml.indexOf('run-synergies.js')<runHtml.indexOf('run-a.js'),'synergy module must load before Run core');
assert(read('atlas-b.js').trimStart().startsWith("'use strict';"),'atlas-b.js must stay in strict mode');

const atlas=read('atlas-a.js');
const versions=Object.fromEntries([...atlas.matchAll(/\{id:'([a-z]+)',version:(\d+)/g)].map(m=>[m[1],Number(m[2])]));
assert.equal(Object.keys(versions).length,12,'all Atlas maps need explicit versions');
assert.equal(versions.mirror,2);
assert.equal(versions.ritual,2);
assert.equal(versions.focus,2);

console.log('Static repository integrity checks passed.');
