#!/bin/sh
# Empacota o vale 3D (núcleo v5) para publicar: um index.html só (three.js, módulos e atmos.js embutidos) e um zip
# pronto para arrastar no Netlify (app.netlify.com/drop). Uso: sh empacotar.sh [pasta_de_saida]
# Precisa do esbuild (o npx baixa na primeira vez) e do python3.
cd "$(dirname "$0")" || exit 1
OUT=${1:-dist}; mkdir -p "$OUT"; T=$(mktemp -d)
# script clássico (iife) e não módulo: no iPhone, aberto como arquivo local (Arquivos, Edge/Chrome "external-file"), o
# módulo embutido não rodava; sintaxe até Safari 15; nomes de função preservados para a mensagem de erro dizer onde foi
npx --yes esbuild js/main.js --bundle --format=iife --target=es2020,safari15 --alias:three=./js/three.module.min.js --minify-whitespace --minify-syntax --outfile="$T/b.js" --log-level=warning || exit 1
python3 - "$T/b.js" "$OUT/index.html" <<'PY'
import sys,re
B,O=sys.argv[1:3]
h=open('index.html',encoding='utf-8').read();atm=open('js/atmos.js',encoding='utf-8').read();b=open(B,encoding='utf-8').read().replace('</script','<\\/script')
h=re.sub(r'<script src="js/atmos.js"></script>',lambda m:'<script>\n'+atm+'\n</script>',h)
h=re.sub(r'<script type="importmap">.*?</script>\s*<script type="module" src="js/main.js"></script>',lambda m:'<script>\n'+b+'\n</script>',h,flags=re.S)
h=h.replace('<title>Afluente · prévia 3D</title>','<title>Afluente · o vale da nascente</title>')
h=h.replace('</title>','</title>\n<link rel="icon" href="data:image/svg+xml,%3Csvg%20xmlns=%27http://www.w3.org/2000/svg%27%20viewBox=%270%200%2024%2024%27%3E%3Cpath%20d=%27M12%202.6c2.8%203.5%204.6%205.9%204.6%208.4a4.6%204.6%200%200%201-9.2%200c0-2.5%201.8-4.9%204.6-8.4Z%27%20transform=%27translate%280%203.4%29%20scale%281%29%27%20fill=%27%235fb0dc%27%20stroke=%27%2321403c%27%20stroke-width=%271.6%27%20stroke-linejoin=%27round%27/%3E%3Cpath%20d=%27M9.6%2014.4a3%203%200%200%200%202.2%202.6%27%20transform=%27translate%280%200%29%27%20fill=%27none%27%20stroke=%27%23e6f6ff%27%20stroke-width=%271.6%27%20stroke-linecap=%27round%27/%3E%3C/svg%3E">',1)
assert 'js/main.js' not in h and 'importmap' not in h
open(O,'w',encoding='utf-8').write(h);print(O, round(len(h)/1e6,2),'MB')
PY
rm -rf "$T"
(cd "$OUT" && rm -f afluente-netlify.zip && python3 -c "import zipfile;z=zipfile.ZipFile('afluente-netlify.zip','w',zipfile.ZIP_DEFLATED);z.write('index.html');z.close()") && echo "$OUT/afluente-netlify.zip"
