# CRONOMOTOR — Research Review do Core Loop

## Tese
O núcleo atual está no cruzamento de cinco famílias:
- **Dicey Dungeons**: valores aleatórios viram matéria-prima; o jogador decide onde alocá-los.
- **Threes / 2048 / Triple Town**: combinação de valores iguais e importância da posição.
- **Into the Breach**: inimigo anuncia a intenção; o turno vira um problema legível.
- **Luck Be a Landlord / Balatro**: runs emergem de sinergias; peças úteis isoladamente e combinações que alteram regras.
- **Desktop Dungeons**: combate compacto como puzzle de recursos, não como troca longa de HP.

## O que especialistas reforçam
### Dicey Dungeons
Terry Cavanagh descreve o melhor ponto como a mistura de aleatoriedade com plano deliberado. Protótipos falharam quando geravam uma “avalanche” de efeitos difícil de entender; funcionaram quando o jogador conseguia planejar uma sequência e quando dados sobrando não pareciam desperdício.
Fonte: https://www.gamedeveloper.com/design/witch-craft-how-i-dicey-dungeons-i-balances-chance-and-predictability

### Into the Breach
Subset priorizou regras claras, ataques inimigos telegráficos e a sensação de que a derrota foi consequência da própria decisão. Também evitou uma tática universal, fazendo armas/objetivos exigirem adaptação.
Fonte: https://www.gamedeveloper.com/game-platforms/road-to-the-igf-subset-games-i-into-the-breach-i-

### Threes
O refinamento veio de retirar ideias, preservar legibilidade e impedir uma estratégia dominante simples. O conceito de “topology management” é especialmente relevante: aleatoriedade precisa existir junto de ferramentas de mitigação.
Fonte: https://www.wired.com/2014/05/threes-game-design/

## Jogos antigos/parentes úteis
### Triple Town
Merge espacial de peças idênticas; profundidade vem de planejar várias jogadas adiante e do uso de uma única reserva. O merge muda o tabuleiro e cria custo de oportunidade.
Fonte: https://en.wikipedia.org/wiki/Triple_Town

### Desktop Dungeons
Sessões compactas (~10 min) tratam combate como puzzle de recursos. Foi premiado por design e mostra que um loop curto pode ter alta profundidade se cada gasto for irreversível/importante.
Fonte: https://en.wikipedia.org/wiki/Desktop_Dungeons

### Puzzle Quest / Drop7 / Peggle
São referências secundárias: Puzzle Quest prova que puzzle + combate pode sustentar progressão; Drop7 reforça curva de habilidade a partir de regras pequenas; Peggle mostra que incerteza pode ser divertida quando o jogador sente autoria no resultado.

## Opinião pública e comunidade
### Luck Be a Landlord
Discussões da comunidade mostram uma tensão útil: jogadores frustrados podem sentir RNG excessivo, enquanto jogadores experientes argumentam que o jogo recompensa “trabalhar com o que veio” e manter o pool enxuto. A lição é não exigir uma combinação rara específica para a run funcionar.
Fonte: https://steamcommunity.com/app/1404850/discussions/0/7221029098487466788/

## Mods aclamados e o que ensinam
### Cryptid (Balatro)
O próprio projeto se define como “unbalanced” e a comunidade gosta da capacidade de quebrar o jogo com combinações absurdas. Isso mostra o valor de módulos que alteram regras, não apenas +10% de dano. Mas relatos também mostram o perigo de cadeias automáticas/animations que demoram demais.
Fontes:
- https://github.com/SpectralPack/Cryptid
- https://www.reddit.com/r/balatro/comments/1hkyzt7/the_cryptid_mod_is_completely_unbalanced_but_it/

### Downfall (Slay the Spire)
Fan expansion com recepção extremamente positiva; preserva a gramática do jogo-base, mas cria personagens com regras exclusivas. O Hermit, por exemplo, faz a **posição na mão** importar; outros personagens introduzem sistemas próprios em vez de apenas inflar números.
Fonte: https://store.steampowered.com/app/1865780/Downfall__A_Slay_the_Spire_Fan_Expansion/

## Diagnóstico do Cronomotor atual

### Pontos fortes
1. **Turno atômico**: montar → escolher uma saída → inimigo resolve.
2. **Intent telegráfico**: alinhado com Into the Breach.
3. **Input aleatório + alocação deliberada**: alinhado com Dicey Dungeons.
4. **Fusão imediatamente legível**: regra simples com payoff forte.
5. **Pistão vs Barreira**: decisão binária fácil de ler no mobile.
6. **Gamefeel causal**: animação/som já explicam encaixe, fusão, ataque e bloqueio.

### Pontos fracos
1. **Fusão é quase sempre estritamente boa**: preserva valor e ainda aumenta Calor.
2. **Posicionamento ainda é raso**: maior peça à esquerda favorece ataque; maior à direita favorece defesa. Pouca “topology management”.
3. **Calor ainda é bônus abstrato**: falta custo real.
4. **Inimigo só varia número de ataque**: pode surgir uma estratégia repetitiva.
5. **Não há mitigação explícita do RNG além da escolha de câmara**.
6. **Ainda não existe build/run layer**: sem módulos que mudem regras.
7. **Efeitos não podem crescer a ponto de atrasar resolução**, lição reforçada por mods extremos como Cryptid.

## Próximos passos — ordem recomendada
### P0 — Estabilidade
Transformar busy/over em uma fase explícita:
PLAYER_INPUT → PLAYER_RESOLVE → ENEMY_RESOLVE → PLAYER_INPUT → VICTORY/DEFEAT.

### P1 — Fazer Calor virar trade-off
- Fusão: +1 Calor.
- Calor fortalece Pistão.
- Calor reduz eficiência da Barreira.
- Após uma ação: -1 Calor.
Isso faz a fusão deixar de ser automaticamente correta.

### P2 — Mitigação leve do RNG
Adicionar **uma única Próxima Peça visível** ou uma Reserva de 1 peça. Não ambos inicialmente.

### P3 — Topologia
Depois de validar P1/P2, fazer posição importar além do bônus:
- Núcleo pode transferir/ventilar pressão;
- ou fusão depende de adjacência;
- ou efeitos de módulo dependem de esquerda/centro/direita.

### P4 — Inimigos com verbos
Apenas depois do loop ficar sólido:
- ATAQUE
- MARTELO (ataque menor + trava uma câmara no próximo turno)
- SOBRECARGA (ataque menor + adiciona Calor)
Tudo telegráfico. Nunca “avalanche” de efeitos.

### P5 — Módulos de run
Inspirados em Balatro/Downfall/Cryptid: poucos módulos, mas cada um muda regra.
Exemplos:
- Núcleo ventila 1 Calor ao receber peça par.
- Fusão na esquerda conserva uma peça.
- Barreira pode usar Calor como bloqueio em vez de sofrer penalidade.
- Primeiro componente ímpar no Pistão conta duas vezes.

## Regra de ouro
**Todo componente deve ser útil sozinho; sinergia deve ser bônus emergente, não requisito.**
