# 06 — Retenção, social, Daily e UGC

O objetivo não é criar obrigação diária.

O objetivo é criar **coisas que o jogador queira comparar, testar e compartilhar**.

---

# 1. O objeto social fundamental é a run

Cada run deve poder virar:
- seed;
- replay;
- card de resultado;
- desafio;
- discussão.

Não precisamos de avatar social ou chat global.

---

# 2. Seeds

Toda run:
- seed reproduzível;
- código curto compartilhável.

Exemplo:
```text
RB-7F3K-91Q
```

A seed deve controlar:
- estado inicial;
- fila;
- encontros;
- drafts;
- RNG de Anomalias.

Versões do jogo precisam ser registradas para replay consistente.

---

# 3. Replay

Como o jogo é turn-based, replay pode armazenar principalmente:
- seed;
- versão;
- ações;
- escolhas de draft.

Exemplo:

```text
R1 +1
R2 -1
PICK Protocol_031
R3 +1
...
```

Isso torna replay:
- pequeno;
- barato;
- verificável;
- útil para leaderboard.

---

# 4. Daily

Mesmo conjunto para todos.

Daily deve durar pouco.

Exemplo:
- 1 mini-ciclo;
- seed fixa;
- pool fixa;
- Frame fixo;
- 1 boss.

Rankings:
- Ruptura;
- ações;
- maior Cascata;
- bônus de Diretiva.

## O valor real do Daily

Não é “volte todo dia”.

É:
> “Como alguém fez 2,4 milhões com as mesmas peças que eu?”

Isso estimula aprendizado comunitário.

---

# 5. Ghost/replay do topo

Depois de concluir:
- jogador pode assistir top runs;
- sem necessidade de YouTube externo;
- speed controls;
- mostrar decisões de draft.

Isso transforma jogadores excelentes em tutoriais orgânicos.

---

# 6. Card de compartilhamento

Uma imagem pequena:

```text
RING//BREAK

Daily #317
Top 4.2%

Cascata ×32
PHASE / ECHO

Seed RB-7F3K-91Q
```

Não precisa mostrar tela poluída.

---

# 7. Forge — visão futura

A comunidade cria **problemas**, não scripts.

Campos:

```text
FRAME
ANOMALIA
BOARD PRESET
FAMÍLIAS
OBJETIVO
INTENTS
RESTRIÇÕES
RECOMPENSA/SCORING
```

Exemplos de objetivo:
- atingir Energia;
- criar 6 Locks;
- Cascata ×8;
- terminar com padrão;
- sobreviver 12 ações;
- limpar 5 Noise.

---

# 8. Compartilhamento de Challenge

Challenge gera código.

Outro jogador:
- toca;
- joga;
- retorna resultado.

Sem instalar mod.

Isso é essencial para mobile.

---

# 9. Rulepacks

Arquitetar Protocolos e Anomalias em blocos declarativos.

Exemplo conceitual:

```yaml
trigger: on_resonance
condition:
  tone: PULSE
action:
  type: rotate_ring
  target: adjacent
  amount: 1
```

Benefícios:
- criação interna rápida;
- balanceamento;
- Forge;
- conteúdo comunitário;
- cross-platform.

---

# 10. PC versus mobile

## Mobile
Permitir:
- Challenges;
- rulepacks aprovados;
- seeds;
- replays;
- cosméticos.

Evitar:
- código arbitrário.

## PC
Futuro:
- Workshop;
- rulepacks;
- ferramentas avançadas;
- talvez scripting sandboxed.

---

# 11. Curadoria

UGC sem curadoria vira ruído.

Necessário:
- likes;
- completion rate;
- report;
- tags;
- dificuldade;
- “Trending”;
- “Clever”;
- “Short”;
- “Hard”;
- “Build puzzle”.

O melhor conteúdo deve emergir.

---

# 12. Descoberta de conteúdo

Não mostrar 10 mil Challenges numa lista.

Oferecer:

```text
PARA VOCÊ
3 desafios

POPULAR ESTA SEMANA
3 desafios

DOS AMIGOS
...

DIFFICULTY: perto da sua
```

---

# 13. Métricas de retenção que importam para design

Além de D1/D7:

- percentual de derrotas seguido de retry em 30s;
- quantidade de runs por sessão;
- diversidade de famílias usadas;
- quantidade de seeds compartilhadas;
- replays assistidos;
- Challenges criados;
- Challenges concluídos por outros;
- tempo entre derrota e nova ação;
- número de runs até primeira “build memorável”.

---

# 14. A pergunta principal

> “O jogador terminou e ficou com alguma hipótese que quer testar?”

Se sim, há combustível para outra run.

Se não, adicionar reward diária provavelmente só mascara o problema.
