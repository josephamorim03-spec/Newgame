# AFLUENTE — Game Design Document v0.3

**Status:** especificação do primeiro protótipo, com regras testadas em simulador (não é jogo implementado).
**Data:** 14 de outubro de 2026.
**Gênero:** puzzle diário de paisagem.
**Plataforma:** navegador mobile em retrato (PWA), iOS e Android.
**Duração-alvo:** 3–5 minutos por vale.
**Princípio:** *você desenha o rio com o dedo; a cheia mostra o que você construiu.*

> **Em uma frase:** a cada dia, um vale novo e igual para todo mundo; em 20 cartas você planta campos, bosques e povoados e **cava canais arrastando o dedo** para levar a água da nascente até a foz — quatro Cheias atravessam o vale, despertam o que estiver ao alcance da água e fazem a colheita.

---

## 0. Por que existe uma v0.3

A v0.2 foi implementada num simulador (`afluente/sim/`) e jogada por bots em 120 vales gerados. O resultado contrariou o próprio documento em pontos centrais:

| Achado na v0.2 (simulado) | Número |
|---|---|
| A nascente tem uma porta só; qualquer peça desalinhada na célula da frente **mata a água da partida inteira**, e a regra de "remanso" permite isso | 74% das partidas do bot aleatório; 5% do guloso |
| A foz praticamente nunca é alcançada | 0% (guloso) e **4%** (bot que protege e estende o rio) |
| O Pulso de Vida, núcleo da "ativação retroativa", **nunca acontece** | 0% da pontuação em todos os bots |
| A pontuação premia mosaico, não água: pares de terreno igual (`E`) | 25% a 73% dos pontos |
| Rios ativos ao fim da partida | 2,9 (guloso) e 7,8 (bot de rio) de 18 peças com rio |

A causa é estrutural: rio em peça com encaixe forma **um único caminho com uma única ponta**. Com 14 de 32 peças sem rio e rotação obrigatória, a ponta morre cedo. E uma rede seca só se liga à água se duas portas coincidirem exatamente — por isso o Pulso não aparece.

A v0.3 mantém a identidade (vale, nascente, foz, ecologia campo–bosque–povoado, seeds determinísticas, sem monetização predatória) e troca o mecanismo da água.

### O que mudou

| v0.2 | v0.3 | Por quê |
|---|---|---|
| Rio impresso em peças, com rotação | **Canal cavado com o dedo**, a partir da água | Gesto nativo do toque; não existe "peça errada"; a ponta do rio nunca morre por azar |
| 32 turnos, 6–12 min | **20 turnos, 3–5 min** | Cabe numa fila; formato diário |
| Pontuação do tabuleiro final + Pulso | **4 Cheias** (turnos 5, 10, 15, 20) que colhem o que está produtivo | O *quando* passa a importar: água cedo rende em mais Cheias |
| Pulso de Vida como bônus opcional | **A Cheia é a cascata**: a água só corre pelos canais novos na Cheia | O espetáculo acontece 4 vezes por partida, sem depender de jogada rara |
| Foz: +15 uma vez | Foz ligada: **+1 por terreno produtivo em cada Cheia seguinte** | Chegar cedo vale mais; é decisão de rota e de tempo |
| 12 seeds curadas, "Novo vale" | **Vale do dia** igual para todos + arquivo | Hábito sem energia, resultado comparável e compartilhável |
| Replanejar, Undo após confirmar | Mão de 3 + **próxima carta visível**; prévia antes de confirmar; sem Undo depois | O Undo da v0.2 revelava cartas ocultas; a prévia exata já evita erro de toque |
| `E` (pares iguais), 9 grandezas | 5 grandezas, todas ligadas à água | Pontua o que o jogo é sobre |

---

## 1. Fantasia e pilares

Um vale do Cerrado no fim da seca. Há uma nascente numa borda e a foz na borda oposta. O jogador não administra nada: **desenha o caminho da água** e decide o que plantar ao longo dele.

1. **O dedo é o rio.** Cavar é arrastar. Nenhum botão de girar, nenhum joystick.
2. **A cheia revela.** Entre as Cheias você prepara; na Cheia a água corre pelos leitos novos e o vale acorda. É o momento de recompensa, visual e sonoro.
3. **Um vale por dia, igual para todos.** Mesmo mapa, mesmas cartas, mesma ordem. Ninguém tem vantagem de sorte; a comparação é justa.

**Não fazer:** física de fluidos, volume de água, estações, economia de recursos, energia, anúncios entre partidas, streak punitivo, loot box.

---

## 2. Contrato de uma partida

| Item | Regra |
|---|---|
| Vale | Hexágonos; disco de raio 4 (61) menos 10 células de borda = 51 células: nascente, foz, 4 rochas, 45 livres |
| Baralho | 20 cartas: Campo ×6, Bosque ×5, Povoado ×3, Canal-2 ×2, Canal-3 ×3, Canal-4 ×1 |
| Mão | 3 cartas + a **próxima** carta visível. Repõe após cada jogada |
| Turno | Jogar uma carta, ou **deixar passar** (descartar uma carta da mão sem jogar). No simulador, os bots só passaram quando não havia jogada legal (0,5–0,9 vez por partida) |
| Cheias | Ao fim dos turnos 5, 10, 15 e 20 |
| Fim | Após o turno 20 e a 4ª Cheia. Não há derrota |
| Pontuação | Soma das 4 Cheias |
| Seed | Define vale, rochas, nascente, foz e ordem do baralho. Nada é sorteado durante a partida |

## 3. As duas jogadas

### 3.1 Plantar (carta de Terreno)

Arraste a carta da mão até uma célula livre **vizinha de qualquer coisa já no vale** (terreno, canal ou nascente). Ela fica ali para sempre.

| Terreno | Produz em cada Cheia, se estiver ao alcance da água |
|---|---|
| Campo | 2, **+1** se tocar um Bosque vivo |
| Bosque | 1, **+1** se tocar outro Bosque vivo |
| Povoado | 3, mas só se também tocar um **Campo** irrigado (povoado precisa de comida, não só de água) |

"Ao alcance da água" = vizinho de um canal, da nascente ou da foz ligada. A água não passa de terreno para terreno.

### 3.2 Cavar (carta de Canal-L)

Encoste o dedo em qualquer célula com água (nascente, canal ou foz já ligada) e **arraste** por até **L** células livres e contíguas. O traço se encaixa no centro dos hexágonos; dá para voltar o dedo para desfazer o traço antes de soltar. Ao soltar, aparece a prévia; um toque em ✓ confirma.

- Canal nunca atravessa terreno, rocha ou a si mesmo.
- O traço pode terminar na foz: a foz fica **ligada**.
- Pode-se cavar menos que L.
- Todo canal parte da água, logo **não existe rede seca**: tudo que é cavado recebe água na próxima Cheia.

## 4. Cheia e pontuação

Ao fim dos turnos 5, 10, 15 e 20:

1. A água sai da nascente e corre pelos leitos cavados desde a última Cheia (animação de 1–2 s, frente de água em ordem de distância).
2. Terrenos ao alcance da água despertam (brotos, copas, fumaça de cozinha nos povoados).
3. Conta-se a colheita:

```text
Cheia = 2·C + 1·B + 3·V + 1·X_CB + 1·X_BB + (foz ligada ? 1·(C + B + V) : 0)

C    = campos irrigados
B    = bosques vivos (irrigados)
V    = povoados prósperos (irrigados E vizinhos de campo irrigado)
X_CB = campos irrigados que tocam ao menos um bosque vivo
X_BB = bosques vivos que tocam ao menos outro bosque vivo
```

Pontuação final = Cheia₁ + Cheia₂ + Cheia₃ + Cheia₄. Tudo é inteiro e discreto: a mesma sequência de ações produz o mesmo resultado em qualquer aparelho.

**O dilema central:** cada Cheia conta o vale *naquele momento*. Um Campo irrigado antes da 1ª Cheia rende 4 vezes; o mesmo Campo depois da 3ª rende uma vez. Mas cavar cedo rumo à foz gasta canais que poderiam passar ao lado dos campos, e plantar perto da nascente agora pode bloquear a rota mais curta para a foz depois. Espaço, ordem e rota competem entre si.

## 5. Vale do dia, par e compartilhamento

- **Um vale por data**, igual para todos. A primeira partida do dia é a que vale para o resultado; depois, pode-se rejogar à vontade (modo treino).
- **Par do dia:** pontuação obtida pelo bot planejador na validação da seed. É a referência de "jogou bem", sem ranking global obrigatório.
- **Resultado compartilhável** (texto curto, sem spoiler do mapa):

```text
Afluente #47 — 112 (par 108)
🌊 foz no turno 7
Cheias 12 · 26 · 34 · 40
🌾6 🌳5 🏘️2
```

A sequência das Cheias conta a história da partida: quem começou rápido, quem guardou para o fim.

- **Arquivo** de vales anteriores para quem quer jogar mais. É o caminho natural de monetização (assinatura ou compra única), se houver — nunca energia ou anúncio entre partidas.

## 6. Interface (retrato, uma mão)

- **Topo:** número do vale, turno `7/20`, pontuação, marcador das próximas Cheias (●●○○).
- **Centro (~70%):** o vale. 9 hexágonos na largura ≈ 42 pt por célula num iPhone de 390 pt — no limite do alvo de toque, compensado por: traço que se encaixa em centros, prévia antes de confirmar, e zoom por pinça opcional.
- **Rodapé:** 3 cartas grandes + a próxima carta, menor e esmaecida. Botão discreto "deixar passar".
- **Prévia exata:** terrenos que despertarão na próxima Cheia ganham um ícone de broto; povoados que ficarão sem campo mostram o ícone apagado; o número `+N` mostra quanto a próxima Cheia renderia. A prévia é calculada pela mesma função pura do motor.
- **Sem Undo após confirmar.** Antes de confirmar, tudo é reversível (arrastar de volta, soltar fora).
- **Acessibilidade:** estados nunca só por cor (água tem movimento e textura; terrenos produtivos têm ícone); opção de reduzir movimento; áudio só após o primeiro gesto.

## 7. Arte, som e gamefeel

Mantém a direção da v0.2: 2D com leve profundidade, diorama contínuo, Cerrado, luz de fim de tarde. O orçamento de espetáculo vai quase todo para a **Cheia**:

| Momento | Visual | Som |
|---|---|---|
| Plantar | Encaixe curto (≤180 ms) | Nota de madeira |
| Cavar | A terra se abre sob o dedo, célula a célula | Raspado suave por célula |
| Cheia | Água corre pelos leitos novos; despertares em ordem de distância da nascente | Frase musical que cresce com o número de despertares |
| Foz ligada | O rio inteiro brilha uma vez | Acorde especial |

## 8. Validador e geração de vales

Como os canais são livres, a validação é barata e automática — não há ordem de peças rotacionadas para casar. Cada seed candidata passa por:

1. **Geometria:** 45 células livres conexas; caminho mais curto nascente→foz ≤ 60% do comprimento total de canal do baralho (17 células).
2. **Bots de referência** (já existem no simulador): aleatório, guloso, planejador em três estilos (colheita, foz, preparação).
3. **Critérios de rejeição:**
   - o planejador não alcança a foz;
   - o guloso faz ≥ 75% do par (vale trivial);
   - o par fica fora da faixa típica (muito acima ou abaixo da mediana dos últimos 30 dias);
   - mais de 2 "deixar passar" forçados para o planejador (baralho travado).
4. **Par do dia** = melhor pontuação entre os estilos do planejador.

Isso permite gerar o calendário com meses de antecedência e revisar só os vales que um humano marcar como sem graça.

## 9. Evidência do simulador

Configuração final, 80 vales gerados, mesmos vales para todos os bots:

| Bot | Pontos (média ± dp) | Foz alcançada | Turno mediano da foz |
|---|---:|---:|---:|
| Aleatório | 37,8 ± 14,2 | 11% | 17 |
| Guloso (só o ganho imediato) | 59,4 ± 18,6 | 29% | 15 |
| Planejador — colheita | **110,8** ± 26,1 | 90% | 8 |
| Planejador — foz primeiro | 109,6 ± 24,7 | 90% | 7 |
| Planejador — preparar terreno seco | 99,0 ± 25,2 | 86% | 8 |

Leitura:

- **Há habilidade:** jogar melhor quase triplica a pontuação do aleatório e dobra a do guloso. Na v0.2 o guloso fazia 2/3 do melhor bot.
- **A foz é alcançável:** nos 10% em que o planejador falhou, o caminho mais curto era de 7–8 células para 17 disponíveis — erro do bot, não vale impossível.
- **Duas estratégias empatam** (colheita e foz primeiro, 1% de diferença): não há caminho único óbvio.
- **Testado e descartado:** um bônus opcional por despertar ≥3 terrenos de uma vez ("Florada", dobrando a produção deles). Mesmo dobrando, os planejadores só o buscaram em 0,2 jogadas por partida — preparar terreno seco custa Cheias demais. Por isso a cascata virou evento fixo (a Cheia) em vez de recompensa opcional.

**Limites desta evidência:** bots não são pessoas. O planejador olha dois lances à frente com heurística; um humano bom pode ser melhor ou diferente. Os números servem para eliminar regras quebradas e calibrar o ponto de partida, não para provar diversão.

Para reproduzir: `cd afluente/sim && python3 final3.py` (v0.3) e `python3 stats.py` (v0.2).

## 10. Riscos e hipóteses abertas

| Risco | Como verificar | Ajuste previsto |
|---|---|---|
| Foz vira obrigação, não decisão (90% dos bons a alcançam) | Playtest: as pessoas hesitam na rota? | Foz mais longe em alguns dias; rochas formando gargalo; vales "sem foz" ocasionais |
| Bosque (1 ponto) é fraco demais | Taxa de "deixar passar" com Bosque na mão | Bosque 2, ou +1 por bosque vizinho em vez de bônus binário |
| Hexágono pequeno demais para o dedo | Taxa de traços corrigidos antes de soltar | Vale de raio 3 + 2 (menos células) ou zoom automático durante o arrasto |
| Partidas parecidas entre dias | Variedade de pares e de formas de rede | Variar posição da nascente/foz, rochas e mix de cartas por dia da semana |
| A Cheia a cada 5 turnos parece interrupção | Tempo de animação e opção de acelerar | Animação ≤ 2 s, toque acelera |

## 11. Roadmap por gates

1. **Regras jogáveis (1–2 semanas):** motor puro em TypeScript portado do simulador, vale abstrato, arrastar para plantar e cavar, Cheias com contagem. Teste: 5 pessoas jogam 3 vales cada no próprio celular.
2. **Vale do dia:** seed por data, validador automático no build, par, tela de resultado e texto para compartilhar.
3. **Prazer:** animação da Cheia, som, arte do Cerrado, salvamento de partida em andamento.
4. **Teste aberto:** 20–30 pessoas por duas semanas. Métrica principal: quantas voltam no dia seguinte sem lembrete.

**Stack sugerida:** TypeScript + Vite + Canvas 2D, sem engine (o tabuleiro é discreto e pequeno), PWA, `localStorage` com `try/catch` para progresso. O motor de regras não depende da renderização e roda os mesmos testes do simulador.

## 12. Testes de aceitação do motor

1. Mesma seed + mesmas ações ⇒ mesmo estado e mesma pontuação, bit a bit.
2. Canal só começa em célula vizinha de água; só ocupa células livres; não se cruza; comprimento ≤ L.
3. Canal que termina na foz a liga; a foz ligada conta como água.
4. Terreno só é plantado em célula livre vizinha de algo no vale.
5. Irrigação alcança só vizinhos de água, nunca vizinhos de vizinhos.
6. Povoado sem Campo irrigado vizinho produz 0, mesmo irrigado.
7. Sinergias contam por peça beneficiada, não por par (Campo com 3 Bosques vivos ganha +1, não +3).
8. Cheias ocorrem exatamente ao fim dos turnos 5, 10, 15, 20, e só elas pontuam.
9. A prévia `+N` é igual ao que a próxima Cheia renderia se nada mais mudasse.
10. "Deixar passar" consome o turno e a carta, e repõe a mão.
11. Com a mão sem jogada legal, só "deixar passar" fica disponível.
12. Toda seed publicada passou pelo validador e tem par registrado.

## 13. O que saiu, e por quê

- **Rotação de peças:** era a causa da água morta e exigia botões.
- **Pares de terreno igual (`E`):** pontuavam mosaico, não água.
- **Pulso de Vida como pontos:** não acontecia em jogo real; virou espetáculo da Cheia.
- **Replanejar e Undo após confirmar:** a próxima carta visível e a prévia cobrem o mesmo problema, e o Undo vazava informação.
- **32 turnos e 12 seeds curadas à mão:** substituídos por 20 turnos e validação automática diária.

---

**Frase de produto:** *Afluente — desenhe o rio, espere a cheia.*
