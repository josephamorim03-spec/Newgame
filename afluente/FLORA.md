# Vegetação do vale: o motor de flora

Código: `prototipo3d/js/flora.js` (fichas e plantio), ligado em `prototipo3d/js/main.js` (peças do vale) e em
`board5.js` / `board3d.js` (peças que o jogador encaixa).

## Os buritis estavam certos?

- **Espécie e lugar: sim.** O buriti (*Mauritia flexuosa*) é a palmeira da vereda: chão encharcado, na beira do
  córrego e em volta da nascente. A peça se chama "Vereda e pasto", então o buritizal na faixa molhada e o pasto
  no seco são coerentes com o nome.
- **Altura: dentro do real.** O adulto tinha 16 a 21 m (o tronco mais os leques), e o buriti adulto tem 15 a 25 m
  (há casos de até 30 m). Uma casa tem 5 m, e a régua métrica do protótipo mantém essa proporção.
- **O que estava errado:**
  - Os buritis eram todos adultos e do mesmo tamanho. Um buritizal tem muitos jovens: o buriti passa anos só
    como uma touceira de leques, sem tronco.
  - Seis palmeiras formavam um anel perfeito em volta da nascente, o que não acontece na natureza.
  - O número de árvores era fixo e escrito à mão para cada peça, sem relação com o espaço livre de verdade.

## Como o motor decide

Cada espécie tem uma **ficha** com estes campos:

| campo | o que é |
|---|---|
| `alt` | altura real do adulto (m), para conferência com a régua |
| `idades` | mistura de jovens e adultos (chance × escala do modelo) |
| `hab(e)` | o quanto um ponto serve à espécie (0 a 1). Lê a distância da água e da lagoa, o chão pedregoso, a inclinação, o alto da escarpa, a beira do trilho e o respingo da cachoeira |
| `dens` | plantas por hectare no habitat bom |
| `min`, `max` | o mínimo e o máximo viáveis numa peça (só onde a espécie ocorre) |
| `esp` | espaço da copa (m), a distância mínima até a vizinha |
| `jeito` | `faixa` acompanha a água; `touceira` nasce em grupos; `isolada` fica longe de outras grandes; `esparsa` se espalha |

Cada **peça** diz quais espécies tem e com que peso, de acordo com o nome dela (tabela `PECA`). A peça do jogador
segue o setor de cada borda (mata, campo/cerrado, vila, lavoura), e a água traz o buritizal (`pecaJogador`).

O plantio de uma peça segue estes passos:

1. A peça é varrida num grid de 1,5 m. Os pontos onde não dá para plantar (casa, roça, caminho, barranco íngreme)
   ficam fora.
2. Para cada espécie, a **área de possibilidade** é a soma das células, cada uma pesada pelo `hab` daquele ponto.
3. A meta é `área × densidade × peso da peça`, presa entre `min` e `max`.
4. Os pontos são sorteados com mais chance onde o lugar é melhor, respeitando o espaço da copa e o jeito da espécie.
5. O resultado fica em `t.flora`, com a meta, quantas plantas couberam, a área, o mínimo e o máximo. No navegador:
   `window.__flora`.

As densidades reais não cabem no desenho. Um cerrado típico tem 600 a 1.200 árvores/ha e uma mata de galeria tem
1.000 a 1.500/ha, mas uma peça tem cerca de 0,1 ha. Por isso a densidade da ficha é a de uma fisionomia mais aberta,
e o `max` é o teto que o aparelho aguenta e que deixa a peça legível de cima.

## As fichas

| espécie | altura real | densidade (/ha) | mín–máx por peça | copa (m) | onde vive |
|---|---|---|---|---|---|
| buriti | 15–25 m (35% jovens sem tronco) | 220 | 3–10 | 4,5 | vereda: 0,4 a 5 m da água, chão plano |
| árvore da mata de galeria | 10–22 m | 320 | 8–22 | 4,4 | 1,5 a 15 m do rio, em capões |
| pinheiro-bravo (*Podocarpus*) | 10–20 m | 120 | 2–7 | 4,5 | chão drenado, prefere o alto da escarpa |
| árvore de sombra do pasto / quintal | 8–15 m | 12 | 1–3 | 10 | seco e plano, isolada |
| pequizeiro | 6–10 m | 90 | 3–8 | 6 | cerradão e cerrado, chão seco |
| ipê (amarelo, rosa, branco) | 6–12 m | 15 | 1–2 | 7 | seco, isolado |
| árvore do cerrado (pau-terra, lixeira…) | 3–8 m | 160 | 4–14 | 5 | seco, até no pedregoso |
| lobeira | 2–5 m | 70 | 1–7 | 3,5 | seco, gosta de beira de trilho |
| moita | 0,7–3 m | 140 | 2–12 | 2,2 | quase tudo, em grupos |
| canela-de-ema | 0,8–2 m | 600 | 3–14 | 1,4 | só no afloramento de pedra do cerrado |
| cupinzeiro | 0,6–2,4 m | 60 | 2–9 | 3 | pasto e campo secos e planos (no brejo não tem) |
| pedra | 0,3–1,5 m | 120 | 0–10 | 1,6 | afloramento, pé de escarpa, uma ou outra no campo |

Nenhuma espécie de mais de 4 m cresce na zona de respingo da cachoeira (rocha molhada e vento de água). Ali ficam
só moita e pedra, e a queda continua à vista.

## O que cada peça tem

| peça | espécies (peso) |
|---|---|
| Vereda e pasto | buriti 1, cupinzeiro 1, moita 0,5, ipê 0,4, lobeira 0,4, árvore do cerrado 0,35 |
| Mata de galeria | árvore da mata 1, moita 1, pinheiro-bravo 0,4, buriti 0,35 |
| Pasto | sombra 1, cupinzeiro 1, lobeira 0,8, ipê 0,5, pedra 0,5, moita 0,3, árvore do cerrado 0,2 |
| Cerrado | árvore do cerrado 1, canela-de-ema 1, pedra 1, ipê 0,9, moita 0,9, cupinzeiro 0,7, lobeira e pequi 0,3 |
| Cerradão | pequi 1, moita 1, árvore do cerrado 0,9, lobeira 0,7, ipê 0,6, cupinzeiro 0,4, árvore da mata 0,15 |
| Cachoeira | pinheiro-bravo 1, moita 0,8, pedra 0,8, árvore da mata 0,6, buriti 0,3 |
| Lagoa | buriti 0,8, moita 0,8, árvore da mata 0,45 |
| Vila | sombra 1,8 (mangueira e jabuticabeira do quintal), moita 0,5, ipê 0,3 |
| Praça | sombra 2,5 (árvores plantadas), ipê 0,7, moita 0,5 |
| Lavoura, Trigo e roça | só na divisa, se sobrar chão fora da roça |
