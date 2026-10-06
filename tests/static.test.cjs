'use strict';
const assert=require('assert');
const fs=require('fs');
const path=require('path');
const root=path.join(__dirname,'..');
const read=p=>fs.readFileSync(path.join(root,p),'utf8');

for(const file of ['run-synergies.js','run-a.js','run-b.js','run-c.js','run-d.js','atlas-a.js','atlas-b.js','atlas-c.js','tools/calibrate-atlas.js','tools/calibrate-runs.js','tools/verify-route.js']){
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
