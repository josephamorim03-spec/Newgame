#!/bin/sh
# Gera prototipo/afluente3d.html: o jogo (afluente.html) com o tabuleiro em 3D (jogo3d/vale3d.js + three.js da
# prévia 3D) embutido num arquivo só, que abre direto no navegador. Precisa do esbuild (npx baixa na primeira vez).
cd "$(dirname "$0")/.." || exit 1
npx --yes esbuild jogo3d/vale3d.js --bundle --format=iife --minify \
  --alias:three=./prototipo3d/js/three.module.min.js --outfile=jogo3d/vale3d.bundle.js --log-level=warning || exit 1
node - <<'JS'
const fs=require('fs');
const page=fs.readFileSync('prototipo/afluente.html','utf8'),b=fs.readFileSync('jogo3d/vale3d.bundle.js','utf8').replace(/<\/script/gi,'<\\/script');
const i=page.indexOf('<script>');if(i<0)throw new Error('sem <script> no afluente.html');
const head=`<!doctype html>
<html lang="pt-BR">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width,initial-scale=1,viewport-fit=cover">
<meta name="theme-color" content="#cfe6de">
<style>:root{padding-top:env(safe-area-inset-top,0px);padding-bottom:env(safe-area-inset-bottom,0px)}body{margin:0}[hidden]{display:none!important}</style>
</head>
<body>
`;
const out=head+page.slice(0,i).replace('<title>Afluente</title>','<title>Afluente 3D</title>')+'<script>\n'+b+'\n</script>\n'+page.slice(i)+'\n</body>\n</html>\n';
fs.writeFileSync('prototipo/afluente3d.html',out);console.log('prototipo/afluente3d.html: '+(out.length/1e6).toFixed(2)+' MB');
JS
rm -f jogo3d/vale3d.bundle.js
