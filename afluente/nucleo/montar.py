# Monta afluente-nucleo-v5.html: um arquivo só (regras + tabuleiro), que abre direto no navegador, sem servidor.
import re
pag = open('index.html', encoding='utf-8').read()
reg = open('regras.js', encoding='utf-8').read()
reg = re.sub(r'^export ', '', reg, flags=re.M)
i = pag.index('<script type="module">')
head, body = pag[:i], pag[i:]
body = re.sub(r"^import \{[^}]*\} from './regras.js';\n", '', body.replace('<script type="module">\n', '<script>\n(() => {\n', 1), flags=re.M)
body = body.replace('</script>', '})();\n</script>', 1)
body = body.replace('<script>\n(() => {\n', '<script>\n(() => {\n' + reg + '\n', 1)
out = '<!doctype html>\n<html lang="pt-BR">\n<head>\n<meta name="viewport" content="width=device-width, initial-scale=1, viewport-fit=cover">\n' + head + '</head>\n<body>\n' + body + '</body>\n</html>\n'
# o cabeçalho tem tags de corpo (canvas, painéis): separa o que é head do que é body
h_end = out.index('</style>') + len('</style>')
out = out[:h_end] + '\n</head>\n<body>' + out[h_end:].replace('</head>\n<body>\n', '', 1)
open('afluente-nucleo-v5.html', 'w', encoding='utf-8').write(out)
print(len(out))
