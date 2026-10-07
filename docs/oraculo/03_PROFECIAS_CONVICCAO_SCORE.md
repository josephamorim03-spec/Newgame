# 03 — Profecias, Convicção e score

## Profecia

Uma profecia é uma afirmação verificável sobre o futuro.

Fraco:

- "Mate 2."
- "Faça 100 pontos."
- "Sobreviva."

Forte:

- "A colidirá com B."
- "A Torre destruirá C."
- "A Torre ativará X."
- "X destruirá exatamente B e C."
- "T ativará X; X destruirá B; A sobreviverá."

A profecia descreve **relações e causalidade**.

## Gramática interna

O solver trabalha com predicados estruturados.

```text
COLLIDES(A, B)
DESTROYS(T, C)
TRIGGERS(T, X)
SURVIVES(A)
SOURCE_OF_DESTRUCTION(X, C)
COUNT_DESTROYED_BY(X) = 2
AND(P1, P2)
```

A apresentação textual é derivada da estrutura.

## Faixas de oferta

### PRESSÁGIO
Relação simples.

### VISÃO
Uma causa intermediária ou condição específica.

### PROFECIA
Cadeia maior, "exatamente", sobrevivência + destruição ou múltiplos elos.

Nunca mostrar o mínimo de intervenções.

## Contrafactualidade

Rejeitar candidata se ela já acontece no Destino original.

A profecia deve exigir mudança de futuro.

## Possibilidade

Toda profecia oferecida precisa ter ao menos uma solução conhecida pelo solver dentro do horizonte suportado.

## Convicção

Convicção representa elegância:

> menos adulteração do presente = visão mais forte.

Modelo inicial:

```text
valor_atual = round(valor_base × 0,78^custo)
```

Exemplo, base 1.000:

- custo 0 → 1.000
- custo 1 → 780
- custo 2 → 608
- custo 3 → 474
- custo 4 → 370

Calibrar em playtest.

## Valor base

Pode considerar internamente:

- custo mínimo conhecido;
- profundidade causal;
- especificidade;
- restrições;
- pluralidade de soluções;
- saliência visual.

Não premiar quantidade de palavras.

## Falha

Profecia quebrada:

- dá 0 na Visão;
- não tira HP;
- não encerra run;
- não reduz recurso permanente.

## Score da run

```text
score_run = soma(valor_das_7_visões)
```

Só.

## Repetição

Salvar por seed:

- profecia;
- valor base;
- custo final;
- score;
- assinatura do estado final.

A pergunta desejada é:

> "eu fiz em 3; será que dá em 2?"
