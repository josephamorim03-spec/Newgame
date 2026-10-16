# Afluente, núcleo v5: o rio é o orçamento

Protótipo jogável para testar se a regra nova diverte, antes de levá-la ao vale 3D.

**O que mudou em relação ao jogo de hoje:**
- **Sai a mata ciliar:** a regra "a mata segura a água na seca" deixa de existir.
- **O rio vira o recurso:**
  - ele tem vazão (💧);
  - cada lavoura ou vila encostada nele gasta 1;
  - a água chega primeiro em quem está mais perto da nascente;
  - ligar o rio a um olho-d'água do mapa soma a vazão dele.
- **Do `../DIVERSAO_v4.md` ficam:**
  - as vilas que pedem uma coisa por vez e crescem;
  - a escolha entre dois pacotes de peças.
- **A seca:** cada nascente dá metade (4 vira 2), e a tela mostra antes quanto e quem vai secar. O botão 💧 do topo mostra o vale na seca.
- **Primeira partida:** dicas curtas aparecem na hora em que cada coisa acontece (nascente, olho-d'água, peça seca, seca chegando, seca, chuva). `python3 montar.py` gera `afluente-nucleo-v5.html`, um arquivo só que abre direto no navegador.

**Arquivos:**
- `regras.js`: o motor, sem desenho.
- `index.html`: o tabuleiro 2D jogável, publicado como Artifact (abre com um servidor local, por exemplo `python3 -m http.server`).
- `teste.mjs`: o teste de regras. Ele joga 200 vales, ao acaso e de forma gulosa, passando a vez às vezes de propósito, e confere:
  - a pilha, que nunca fica negativa, e o fim, que vem só quando ela acaba;
  - o relógio das estações, inclusive quando a vez passa;
  - que um pedido novo nunca nasce cumprido;
  - que a prévia da peça bate com o que acontece ao colocar ("a vila cresce", água na peça).

  Uso: `node teste.mjs 200`.
- `sim.mjs`: o simulador. Uso: `node sim.mjs 10 guloso`.

**Números do simulador** (bot guloso, 10 vales): só checam se as regras se sustentam, não se divertem.

| Medida | Valor |
|---|---|
| Duração | mediana 35 jogadas |
| Vazão no fim | 14, das quais 13 usadas: a água fica no limite |
| Pedidos atendidos | 5 por partida |
| Jogadas que ligam um olho-d'água | 13% |
| Jogadas em que nada acontece | 38% (eram 44% no jogo de hoje) |
| Bot ao acaso | não atende nenhum pedido e acaba em 20 jogadas: jogar bem faz diferença |

**No vale 3D:** o núcleo v5 roda também no tabuleiro 3D da prévia (`../prototipo3d/js/board5.js`), que agora o usa por padrão (`?jogo=v3` volta às regras antigas). Na tela aparecem:
- a vazão no placar (💧 usada/total);
- as plaquinhas dos pedidos sobre as vilas, com o que a peça escolhida muda;
- os olhos-d'água como poços claros no chão;
- "sem água" sobre quem ficou seco, e "seca na seca" nas últimas jogadas antes da seca;
- as casas douradas onde a peça na mão ajuda um pedido;
- a escolha de pacote. A vila atendida ganha uma casa nova no vale, e gente nova chega a pé de fora do vale para morar nela (`arrive` em `../prototipo3d/js/people.js`). Essas pessoas passam o dia entre a casa, a roça, a beira do rio e a vizinhança: almoçam na porta, proseiam no fim da tarde e entram em casa de noite e na chuva.

**Som** (`../prototipo3d/js/som.js`): é todo sintetizado, sem arquivos.
- Ele destrava no primeiro toque em qualquer lugar da página.
- No iPhone ele toca mesmo com a chave de silencioso: pede a sessão de reprodução e, nos iOS antigos, usa um `<audio>` mudo em laço.
- Ao fundo fica o murmúrio do rio, que diminui quando a água acaba. De dia cantam passarinhos e o bem-te-vi, na seca a cigarra, de noite o grilo, e na chuva entra o chiado dela.
- `__som.teste('thud')` no console mede o volume de um efeito.

O vale começa com as 11 peças montadas à mão da prévia. Para isso, `Game` aceita `start`, e sem `start` continua igual. Mesma semente: `?vale=nome`.

