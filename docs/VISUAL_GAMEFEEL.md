# CRONOMOTOR — Visual & Gamefeel Bible

## Direção escolhida: Quadrinhos dinâmicos
A referência principal é o resultado 1: graphic novel agressiva nos picos de ação, preservando o mundo cozy-industrial/steampunk. A inspiração em Spider-Verse vem da gramática visual — composição, timing, impressão, offsets e frames de impacto — sem copiar personagens ou layouts específicos.

## Regra central
**Idle é legível; ação quebra a página.** Halftone forte, linhas cinéticas, deformação, offset cromático e onomatopeias entram por 80–450 ms quando existe causa mecânica.

## Hierarquia
1. Rei da Caldeira domina o terço superior e comunica ameaça.
2. Cronomotor ocupa o centro como objeto físico.
3. Peças são manipuláveis e têm peso.
4. Pistão vermelho e Barreira azul são as decisões finais do turno.
5. Matemática detalhada fica escondida no “?”, enquanto botões mostram só o resultado.

## Cor funcional
Ataque = vermelho/laranja; defesa = ciano/azul; fusão/calor = âmbar/dourado; neutro = latão, grafite e papel envelhecido. Fundo frio e dessaturado faz a máquina parecer um abrigo quente.

## Motion grammar
**Seleção:** 80–140 ms; sobe, inclina, glow curto; clique metálico agudo.
**Encaixe:** 220–300 ms; movimento contínuo até receptáculo, overshoot e clack grave.
**Fusão:** 300–450 ms; compressão → impact frame → expansão → novo valor; FUSÃO!, faíscas e calor.
**Pistão:** antecipação → fluxo → recoil → THOOM! → hit-stop → reação do Rei.
**Barreira:** carga → campo ciano → KLANG! → golpe absorvido ou atravessa.
**Ataque inimigo:** antecipação do boss; bloqueado = flash frio; dano = burst creme/vermelho + shake + BAM!.

## Áudio
WebAudio por enquanto. Camadas curtas de transiente metálico, corpo grave, vapor/energia e impacto. Cada ação precisa de assinatura própria; evitar sons longos.

## Interface
Sem fórmula durante a partida. Jogador vê DANO N e BLOQUEIO N. O “?” abre o Manual de Oficina em papel impresso com a regra curta.

## Restrições
- Sem halftone permanente na tela inteira.
- Sem neon indiscriminado.
- Não animar tudo simultaneamente.
- Não adicionar HUD sem função decisória.
- Efeitos não podem comprometer input/estado.
- prefers-reduced-motion reduz shake, flashes e deslocamentos.

## Critério de qualidade
Deve ser possível entender visualmente qual peça foi usada, onde entrou, se fundiu, qual saída foi acionada e se o golpe inimigo foi bloqueado ou atravessou.
