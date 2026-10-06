const fs=require('node:fs');
const path=require('node:path');
const root=path.resolve(__dirname,'..');
let html=fs.readFileSync(path.join(root,'index.html'),'utf8');
const css=fs.readFileSync(path.join(root,'src/style.css'),'utf8');
const favicon=fs.readFileSync(path.join(root,'favicon.svg'),'utf8');
html=html.replace(/<link rel="icon" type="image\/svg\+xml" href="favicon\.svg(?:\?v=[^"]+)?">/,'<link rel="icon" href="data:image/svg+xml,'+encodeURIComponent(favicon)+'">');
html=html.replace(/<link rel="stylesheet" href="src\/style\.css(?:\?v=[^"]+)?">/,'<style>'+css+'</style>');
for(const file of ['core.js','anomalies.js','game.js']) {
 const js=fs.readFileSync(path.join(root,'src',file),'utf8').replaceAll('</script','<\\/script');
 html=html.replace(new RegExp('<script src="src/'+file.replace('.', '\\.')+'(?:\\?v=[^"]+)?"></script>'),'<script>'+js+'</script>');
}
fs.writeFileSync(path.join(root,'ring-break-standalone.html'),html);
console.log('Standalone criado: ring-break-standalone.html');
