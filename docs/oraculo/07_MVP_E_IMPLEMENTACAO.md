# 07 — MVP e implementação

## Hipótese

> **Ver o Destino, declarar um contrafactual e concretizá-lo com pouca intervenção é divertido e gera vontade de melhorar a solução?**

## Escopo obrigatório

- mobile-first;
- grade 4×4;
- Figuras;
- Torre;
- Bomba;
- Pilar;
- simulação determinística;
- Destino;
- rewind;
- três profecias;
- IMPULSO;
- DESVIO;
- undo/redo;
- valor por custo final;
- REVELAR;
- resolução causal;
- veredito;
- retry;
- seed/versionamento.

## Desejável

- solver custo <= 3;
- profecias do event log;
- destaque do primeiro elo quebrado;
- melhor solução local.

## Fora do MVP

- conta;
- backend;
- leaderboard online;
- multiplayer;
- loja;
- meta;
- procedural completo;
- 5×5;
- entidades avançadas.

## Arquitetura sugerida

```text
state.js
rules.js
simulate.js
events.js
causality.js
edits.js
solver.js
prophecies.js
scenario.js
render.js
input.js
audio.js
game.js
```

Evitar controlador monolítico.

## Estado

```js
{
  ruleset: "oracle_v1",
  seed: "...",
  board: { w: 4, h: 4 },
  entities: [
    { id: "A", type: "actor", x: 1, y: 1, dir: "S", alive: true }
  ]
}
```

## Simulação pura

```js
const outcome = simulate(state)
```

`simulate` não depende de DOM, áudio, frame rate ou input.

A UI apenas reproduz `outcome.eventLog`.

## Event sourcing

```js
[
  { type: "move", actor: "A", from: [1,1], to: [1,2] },
  { type: "fire", source: "T" },
  { type: "hit", source: "T", target: "X", causedBy: 1 },
  { type: "trigger", actor: "X", causedBy: 2 },
  { type: "destroy", source: "X", target: "B", causedBy: 3 }
]
```

## Solver

MVP:

- BFS;
- custo máximo 3;
- hash de estado;
- cache;
- extração de candidatos;
- deduplicação semântica.

Pode ser precomputado por cenário.

## Conteúdo de teste

- 20 cenários hand-authored;
- 3 profecias verificadas por cenário;
- pelo menos 5 cenários com múltiplas soluções para a profecia alta.

## Testes obrigatórios

### Determinismo
```text
simulate(S) == simulate(S)
```

### Imutabilidade
Simular não muta estado original.

### Possibilidade
Toda profecia oferecida tem solução conhecida.

### Contrafactualidade
Nenhuma profecia já é verdadeira no Destino.

### Score
Mesmo estado final = mesmo custo/score, independente do histórico de gestos.

### Seed
Mesma seed + ruleset = mesmo cenário.

## Definition of Done v0.2

- mapa visível antes da escolha;
- Destino legível;
- rewind;
- profecias possíveis;
- undo sem punição;
- nenhum preview de sucesso;
- falha explicável;
- replay da seed;
- resolução sem RNG.
