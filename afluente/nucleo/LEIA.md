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

**Ajuste de ritmo (v5.1):** simulando o começo do vale 3D (as 11 peças da prévia), 63% das jogadas não faziam nada acontecer e o pedido de lavoura travava o jogo (136 abertos no fim de 60 vales, 24 atendidos), porque a nascente já começa quase toda gasta. Mudou:
- **Pedido de lavoura:** pede 1 lavoura com água no nível 1, 2 no nível 2 e assim por diante (era o nível + 1). Fica menos provável quando o rio não tem água sobrando.
- **Paciência:** 9 jogadas sem nenhum avanço e a vila troca de pedido. A plaquinha mostra ⏳ quando faltam 3.
- **Peças de um pedido atendido:** 2 até o nível 2, 1 nos níveis 3 e 4, nenhuma depois. Sem esse freio, com a paciência, a pilha virava bola de neve: em 10% dos vales a partida passava de 300 jogadas.

**Números do simulador** (bot guloso, 20 vales): só checam se as regras se sustentam, não se divertem.

| Medida | Valor |
|---|---|
| Duração | mediana 34 jogadas (90% até 38) |
| Pessoas | mediana 36 (antes 20) |
| Pedidos atendidos | 6 por partida (antes 4) |
| Vazão no fim | 12, todas usadas: a água fica no limite |
| Jogadas que ligam um olho-d'água | 11% |
| Jogadas em que nada acontece | 37% (eram 42%) |
| Vila que troca de pedido | 8% das jogadas |
| No começo do vale 3D | 6 pedidos e 30 pessoas por partida (eram 3 e 14), o primeiro na jogada 3 (era a 7), e 50% de jogadas quietas (eram 63%) |
| Bot ao acaso | quase não atende pedido e acaba em ~22 jogadas: jogar bem faz diferença |

**No vale 3D:** o núcleo v5 roda também no tabuleiro 3D da prévia (`../prototipo3d/js/board5.js`), que agora o usa por padrão (`?jogo=v3` volta às regras antigas). Na tela aparecem:
- a vazão no placar (💧 usada/total);
- as plaquinhas dos pedidos sobre as vilas, com o que a peça escolhida muda;
- os olhos-d'água como poços claros no chão;
- "sem água" sobre quem ficou seco, e "seca na seca" nas últimas jogadas antes da seca;
- as casas douradas onde a peça na mão ajuda um pedido;
- a escolha de pacote. A vila atendida ganha uma casa nova no vale, e gente nova chega a pé de fora do vale para morar nela (`arrive` em `../prototipo3d/js/people.js`). Essas pessoas passam o dia entre a casa, a roça, a beira do rio e a vizinhança: almoçam na porta, proseiam no fim da tarde e entram em casa de noite e na chuva.

**Tela limpa (jogo contemplativo):**
- No alto, uma pílula com 👥 pessoas, 💧 água em uso/total, 🧩 peças e a estação. Tocando nela, aparece a explicação.
- Embaixo fica só a peça na mão (toque para girar), com a próxima em miniatura. O botão "Colocar" aparece apenas com uma casa escolhida.
- As plaquinhas do mapa são só ícone e número (🌾 0/2, +2💧, 🥀 sem água, ☀️ vai secar), e tocar nelas mostra o texto.
- O painel de clima, os botões de girar e a linha de hora/vento/quadros só aparecem com `?debug`.

**Escarpa da cachoeira:** é um paredão de pedra só perto da queda. Longe dela vira encosta, cada vez mais larga, com contorno irregular e ressalto de pedra. Casa, roça e árvore não nascem no barranco íngreme (`cliffSlope` em `world.js`).

**Desempenho:** no degrau de qualidade cheio, tudo é refeito a cada quadro. Nos degraus mais leves (que o jogo escolhe sozinho pelos quadros por segundo), o reflexo da água e o mapa de sombras são refeitos a cada 2 ou 3 quadros. As texturas usam filtragem anisotrópica, e os bichos longe da câmera não consultam o chão.

**Bichos:** o esqueleto e o movimento ficam em `../prototipo3d/js/bicho.js`, e as espécies em `especies.js`.
- Cada bicho é uma malha só, com pele que dobra nas juntas.
- As pernas têm três partes. Na pata da frente o joelho dobra para a frente, na de trás o jarrete dobra para trás, e a ave dobra o "calcanhar" para trás.
- O casco pisa no chão do mapa e acompanha o terreno, e o corpo inclina com o morro.
- O passo muda com a velocidade: anda, trota ou galopa.
- O rabo se mexe em corrente e a orelha mexe.
- Na água rasa cada pisada abre um anel (`aguafx.js`).
- O gado bebe no cocho do curral ou na beira do rio, a capivara e a anta nadam, e a garça dá o bote com respingo.

**O juiz dos bichos** (`../prototipo3d/js/juiz.js`, relatório em `../prototipo3d/JUIZ.md`): mede cada espécie e compara com o bicho de verdade.
- **Forma:**
  - proporções (altura do dorso, comprimento, peito, cabeça) contra fichas das espécies;
  - faces do avesso, triângulos degenerados e quina da silhueta.
- **Pose:**
  - perna da frente reta parada e ângulo do jarrete (150–160°, pelos guias de conformação);
  - perna que sai do tronco e pele que dobra demais nas juntas;
  - focinho que alcança o capim.
- **Movimento:**
  - casco que patina, afunda ou flutua no apoio;
  - ordem das pisadas (sequência lateral do andar) e fração de apoio;
  - passada proporcional à altura, troca andar→trote perto de Froude 0,4–0,5 e corpo que balança demais.
- **Comportamento:** quanto do tempo cada bicho pasta, anda, fica parado ou nada (contra a referência), e bicho travado.

Para rodar: `sh prototipo3d/empacotar.sh` e depois `node sim/juiz_bichos.js prototipo3d/dist/index.html`. No console, `__juiz.julgar()`.

O que ele achou e já foi corrigido:
- faces do avesso no alto das pernas;
- andar em sequência diagonal (o certo é a lateral);
- casco escorregando (agora a pata fica cravada onde pisou, e ombro e quadril abrem para o lado);
- altura do corpo que agora sai das pernas no chão: o corpo sobe e desce como no pêndulo invertido do andar;
- ombro e quadril que deslizam com o passo;
- trote decidido pelo número de Froude;
- bicho preso que girava no lugar;
- tamanhos das espécies.

A malha ganhou 25% mais segmentos no computador (75% no celular). A nota média foi de 87 para 96.

**Crianças na lagoa** (`people.js`, ofício `lagoa`):
- Nadam cachorrinho de cabeça para fora.
- Pulam da beira, de bomba ou de braços para cima.
- Pescam com vara, linha e boia: a boia afunda quando o peixe belisca, e às vezes ele vem se debatendo na linha.
- Também brincam na margem.
- Nas horas quentes das águas preferem a água; de manhã, de tarde e no frio da seca, pescam ou brincam.
- O pescador do olho-d'água também ganhou linha, boia e peixe.

**Som** (`../prototipo3d/js/som.js`): é todo sintetizado, sem arquivos.
- Ele destrava no primeiro toque em qualquer lugar da página.
- No iPhone ele toca mesmo com a chave de silencioso: pede a sessão de reprodução e, nos iOS antigos, usa um `<audio>` mudo em laço.
- Ao fundo fica o murmúrio do rio, que diminui quando a água acaba. De dia cantam passarinhos e o bem-te-vi, na seca a cigarra, de noite o grilo, e na chuva entra o chiado dela.
- `__som.teste('thud')` no console mede o volume de um efeito.

O vale começa com as 11 peças montadas à mão da prévia. Para isso, `Game` aceita `start`, e sem `start` continua igual. Mesma semente: `?vale=nome`.

