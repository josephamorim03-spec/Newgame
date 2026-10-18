# Afluente publicado

`index.html` é o jogo empacotado (`sh afluente/prototipo3d/empacotar.sh ../publicar`). O `vercel.json` na raiz desta
branch manda a Vercel publicar só esta pasta, sem build (`ignoreCommand: exit 1` libera o deploy da branch).
Para atualizar: rode o empacotar, faça commit e push.
