# Dice Duel: técnicas do Aranhaverso (avaliação e plano)

> Pergunta: vale a pena trazer para o Dice Duel animações, efeitos e identidade visual no espírito do
> *Homem-Aranha no Aranhaverso*? Resposta curta: **vale, como sotaque, não como identidade.** As técnicas do filme
> vêm da impressão em papel (retícula, cores desencaixadas, quadros segurados), e o Dice Duel já é papel, feltro e
> fichas. A parte do filme que não cabe é o glitch, o ruído e a energia de cidade: o tom do jogo é aconchegante
> (`docs/design.md` §6–7: "nada no som deve assustar", "perder também é aconchegante").

## 1. Por que faz sentido (e onde não faz)

**A favor:**
- **O jogo já tem as duas chapas.** As cores dos jogadores são azul (`--voce` #6fbfd3) e rosa (`--rival` #ec8fa8):
  quase o ciano e o magenta da impressão. O "desencaixe" das cores do filme, feito com essas duas, vira o duelo
  desenhado: você e o rival saindo do registro por um instante.
- **Os pips já são bolinhas.** A retícula (os pontinhos da impressão barata de gibi) é a mesma forma do dado.
- **O som já fala em onomatopeias.** O `design.md` §7 descreve o som como "plonc", "fump", "fuuu", "tchã-rã".
  Escrever essas palavras na tela, em poucos momentos, junta som e imagem e ainda ajuda quem joga sem som.
- **A técnica mais famosa do filme é sobre aprender.** Miles se move "em dois" (12 quadros por segundo, cada desenho
  segurado por dois quadros) enquanto aprende, e "em uns" (24) quando domina. No Dice Duel, a corrente curta pode
  disparar em dois e a corrente de 5 ou 6 em uns: o lance fica mais fluido quanto melhor ele é. É barato e conta algo.
- **Picos raros pedem um quadro congelado.** Sinfonia e Virada já são os momentos mais raros; uma pausa curta em
  "quadro de gibi" (hit-stop) os separa dos disparos comuns.
- **A Loja vende estilo.** Uma mesa e uma skin de dado "de gibi" encaixam na progressão sem mexer em força
  (`docs/progressao.md`: só cosméticos, todo cosmético pago com um equivalente ganho jogando).

**Contra (e por isso só sotaque):**
- **Glitch, aberração cromática forte e ruído** brigam com o tom. O filme teve aviso de fotossensibilidade.
- **Tela partida, caixas de legenda e tipografia de gibi em tudo** trocariam a cara do jogo e do onboarding que a
  v0.14 acabou de acertar.
- **Desempenho no celular:** filtros SVG (`feTurbulence`, `feDisplacementMap`) a cada quadro pesam. Tudo aqui é CSS
  (gradientes, `text-shadow`, Web Animations) e o canvas de partículas que já existe.
- **Marca:** nada de aranha, teia, logo, nome ou letreiro do filme. A gente usa a técnica (de domínio público, é
  impressão de gibi), não a propriedade. Por isso o nome interno é **"impresso"**, e o cosmético se chama **Gibi**.

## 2. As técnicas, uma a uma

| Técnica do filme | O que é | No Dice Duel | Onde |
|---|---|---|---|
| Animar em dois / em uns | segurar cada pose por 2 quadros; em uns, fluido | **sim**: a cascata do disparo de 2 a 4 dados anda em passos; de 5 e 6, fluida. A rolagem 3D **não** (é física gravada, ficaria travada) | `Fx.contagem`, cascata em `js/jogo.js` ~1140–1170 |
| Retícula (Ben-Day) | pontos de tinta no lugar do degradê | **sim**, sutil: no clarão do disparo de 4+ e no selo final de 5 e 6 | `Fx.clarao`, `.clarao` e `.contagem.n5/.n6.final` em `css/estilo.css` |
| Desencaixe de cores | as chapas de cor saem do registro | **sim, em 2 lugares**: a armadilha revelada (o "?" vira carta) e o "+N" que estoura no placar. Só azul e rosa, 150 ms, volta ao registro | `case 'revelou'` (~1223), `Fx.orbes` → placar (~1180) |
| Onomatopeia desenhada | o som escrito no quadro | **sim, 4 momentos**: ruptura "plonc" (pequena, caindo), Bolso que salva "fump", disparo de 5+ "fuuu!", armadilha "tchã!" | `case 'ruptura'` (~1197), `'salvo'` (~1206), disparo, `'revelou'` |
| Quadro congelado | a ação para num painel com moldura | **sim, só Sinfonia e Virada**: 250 ms de pausa visual com borda de tinta e retícula, depois segue | `e.L === 6` (~1170), vitória com `e.virada` (~1243) |
| Linhas de velocidade / *smear* | rastro desenhado do movimento | **talvez**: no voo dos pontos até o placar e da carta jogada | `Fx.orbes`, `Fx.voar` |
| Cada personagem com seu estilo | cada aranha anima de um jeito | **depois**: a Diana em dois (ágil, de gato), a Dona Coruja em uns (calma) | falas, avatares |
| Tela partida em painéis | dois quadros lado a lado | **depois**: só no versus (Você × rival) | janela do versus |
| Glitch, *kirby krackle*, tremor contínuo | ruído dimensional | **não** | — |

## 3. O plano

### Fase 0: protótipo atrás de uma bandeira (feita)
- `Fx.cfg.impresso`: `?impresso=1` na URL liga e fica guardado no aparelho (`diceduel.impresso`); `?impresso=0` desliga.
  Sem a bandeira, nada muda (a ordem das chamadas e o tempo da festa são os de antes).
- Três coisas, em `js/efeitos.js` (`reticula`, `desencaixe`, `quadro`) e no fim do bloco do clarão em `css/estilo.css`:
  - **anel de retícula** no clarão do disparo de 4+, na cor de quem disparou (azul ou rosa), abrindo em 6 poses seguradas;
  - **desencaixe** na armadilha revelada: a chamada e o painel de quem armou ganham as chapas azul e rosa fora do
    registro, em 3 poses (420 ms), e voltam;
  - **quadro congelado** na Sinfonia: 260 ms com tudo parado (as animações da página e as partículas; os orbes empurram
    o relógio deles), moldura de papel com fio de tinta e retícula nas bordas. O tremor e as chamadas ("Sinfonia!",
    "Harmonia!") vêm quando a imagem volta a andar. O relógio da vez, a rede e o motor não param.
    Ele vem depois do impacto que a partida já tem (`Fx.impacto`, 150 ms na corrente de 6): o impacto incha a corrente,
    o quadro congela a tela. Se, somados, os 410 ms parecerem travamento, o quadro passa a substituir o impacto.
- `node tools/impresso_demo.js` grava a mesma sequência sem e com (celular, 390 px) em `builds/impresso/`
  (`sem.webm`, `com.webm` e quadros). **Decidir olhando; se não ficar melhor, para aqui.**

### Fase 1: o sotaque no jogo de sempre (feita)
Ligado por padrão (`?impresso=0` desliga no aparelho, para comparar; `?impresso=1` volta a ligar). Tudo em
`js/efeitos.js`, `css/estilo.css` e nos eventos de `js/jogo.js`; nada nas regras nem no servidor.

| Momento | O que acontece |
|---|---|
| Disparo de 2 a 4 | a cascata dos dados e o selo que conta (+1, +2, +4) andam **em dois**: poses seguradas (`steps`) em vez de deslizar. A corrente curta é "desenho de quem está aprendendo" |
| Disparo de 4+ | o clarão ganha o **anel de retícula** na cor de quem disparou (fase 0) |
| Disparo de 5 e 6 | cascata e selo **fluidos**, selo final em mel com retícula clara, e a onomatopeia "FUUU!" (6: "FUUUM!", maior) quando a festa estoura |
| Sinfonia e Virada | o **quadro congelado** (260 ms, moldura de papel e retícula nas bordas); a chamada vem depois |
| "+N" de 4 ou mais no placar | chega com as chapas azul e rosa fora do registro e assenta |
| Armadilha revelada | chamada e painel fora do registro (fase 0) e "TCHÃ!" na cor do dono |
| Salvo (Bolso ou Âncora) | "ufa!", pequeno e verde-claro |
| Ruptura de 2+ | "plonc", pequeno, sem as chapas, **caindo** devagar: a ruptura continua gentil |

**Regras do sotaque:**
- **Uma onomatopeia por lance:** outra que chegue em menos de 700 ms fica de fora.
- **Só papel, tinta, azul e rosa:** a Fredoka que já carrega (nada novo na CSP); a retícula é desenhada num canvas uma
  vez por cor (`data:`, já permitido).
- **Obedece aos Ajustes:** sem "Animações" ou com "reduzir movimento", nada disso aparece; sem "Brilhos e confete",
  nem retícula, nem quadro, nem onomatopeia.
- **Sem pisca-pisca:** no máximo um clarão e um quadro congelado por lance.

**A medir no teste com gente:** se o quadro congelado (somado ao impacto de 150 ms) lê como festa ou como travamento;
se as onomatopeias são lidas ou viram ruído; se a cascata em dois parece "estilo" ou "o celular engasgou".

### Fase 2: o cosmético Gibi (2 a 3 dias)
Para quem quiser o estilo inteiro, sem impor a ninguém:
- **Mesa Gibi** (Loja, ~250 moedas): feltro com retícula, chamadas viram caixas de legenda (retângulo, borda de tinta),
  onomatopeias maiores, toda cascata em dois até o quinto dado.
- **Dado Retícula** (Loja): marfim com contorno de tinta e pips de retícula. A skin já vale na corrente, no Bolso, na
  Mesa e na rolagem 3D.
- **Equivalente ganho jogando** (regra da progressão): a Mesa Gibi também como presente de um nível novo (o 7, que hoje
  não dá nada).
- Mexe em: `R.CATALOGO` (`shared/regras.js`, o servidor valida as compras), `MESAS_VISUAL` / `DADOS` (`js/jogo.js`),
  classe `mesa-gibi` no `body` e o bloco de CSS dela; teste de compra em `tools/fumaca.js` e na API.

### Fase 3 (talvez): o estilo por personagem e o versus em painéis
Só se a Fase 1 passar no teste com gente.

## 4. Como verificar
- `node tools/fumaca.js`, `node tools/estreia_e2e.js` (as chamadas do guia não podem atrasar), `node tools/layout.js`
  (onomatopeia e quadro não vazam em 360 px), `node tools/vercel_local.js` (CSP), `python3 tools/empacotar.py`.
- Num iPhone de verdade: a cascata de 6 com o quadro congelado não pode cair abaixo de 60 qps.
- **No teste com 5 a 8 pessoas** (`design.md` §9): o quadro congelado da Sinfonia lê como festa ou como travamento?
  As onomatopeias são lidas ou viram ruído? Alguém sente que "deixou de ser aconchegante"?

## 5. Recomendação
Fases 0 e 1 feitas. A Fase 2 vale depois do teste com gente: é o lugar
certo para o estilo inteiro, porque quem escolhe é o jogador.
