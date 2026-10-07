# 04 — Solver e geração

## Princípio

ORÁCULO não deve gerar "mapas aleatórios".

Deve gerar ou selecionar **estados com futuros interessantes**.

## Estratégia v0.2

Não começar por procedural completo.

Fluxo recomendado:

1. criar 15–30 cenários à mão;
2. validar cada um pelo simulador;
3. enumerar intervenções;
4. extrair automaticamente profecias possíveis;
5. selecionar as melhores três.

## Simulador determinístico

```text
simulate(state) -> outcome
```

Entrada:

```text
State {
  boardSize
  entities[]
}
```

Saída:

```text
Outcome {
  finalState
  eventLog[]
  causalGraph
}
```

Mesma entrada = mesma saída.

## Event log

Exemplo:

```text
MOVE(A, 1,1 -> 1,2)
FIRE(T)
HIT(T, X)
TRIGGER(X)
DESTROY(X, B)
DESTROY(X, C)
```

Cada evento possui:

- tipo;
- ator;
- alvo;
- fase;
- evento causal pai.

## Grafo causal

```text
FIRE(T)
   ↓
HIT(T, X)
   ↓
TRIGGER(X)
  ↙       ↘
DESTROY B DESTROY C
```

Usos:

- gerar profecias;
- medir profundidade;
- explicar falhas;
- destacar causalidade pós-resolução.

## Espaço de intervenção

MVP:

```text
custo <= 3
```

BFS por custo é suficiente no início.

Deduplicar por hash do estado editado.

## Extração de profecias

Gerar candidatos de:

- colisões nominais;
- destruição por fonte;
- ativação por fonte;
- contagem de vítimas;
- sobrevivência contextual;
- cadeias causa → ativação → destruição.

## Rejeitar candidata quando

- já ocorre no Destino;
- depende de edge case;
- não é visualmente legível;
- exige regra não ensinada;
- é semanticamente equivalente a outra;
- o texto fica grande;
- sucesso/falha é difícil de perceber.

## Qualidade

```text
quality =
  profundidade_causal
+ especificidade
+ distância_de_intervenção
+ pluralidade_de_solução
+ saliência_visual
- carga_cognitiva
- penalidade_de_texto
```

Não maximizar dificuldade. Maximizar escolha interessante.

## Três opções

Bom:

1. colisão A/B;
2. Torre destrói C;
3. Torre ativa X e X destrói B/C.

Ruim:

1. X mata 1;
2. X mata 2;
3. X mata 3.

## Procedural futuro

```text
GERAR ESTADO
  ↓
SIMULAR DESTINO
  ↓
ENUMERAR INTERVENÇÕES
  ↓
EXTRAIR FUTUROS
  ↓
GERAR PROFECIAS
  ↓
AVALIAR QUALIDADE
  ↓
ACEITAR / DESCARTAR
```

## Seeds

Assinatura sugerida:

```text
oracle_v1:<ruleset>:<seed>
```

Mudança de simulação incrementa ruleset.
