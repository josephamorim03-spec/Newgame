#!/bin/sh
# Gera prototipo/index.html (documento completo) a partir de prototipo/afluente.html (página do Artifact).
cd "$(dirname "$0")/../prototipo" || exit 1
{ head -9 /dev/stdin; cat afluente.html; printf '\n</body>\n</html>\n'; } <<'H' > index.html
<!doctype html>
<html lang="pt-BR">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width,initial-scale=1,viewport-fit=cover">
<meta name="theme-color" content="#cfe6de">
<style>:root{padding-top:env(safe-area-inset-top,0px);padding-bottom:env(safe-area-inset-bottom,0px)}body{margin:0}[hidden]{display:none!important}</style>
</head>
<body>
H
