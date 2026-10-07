# 01 — Loop e gameplay

## Unidade de jogo: a Visão

Uma **Visão** é uma rodada autocontida de aproximadamente 15–40 segundos.

## 1. CONTEMPLAR

O mapa aparece inteiro por 1–3 segundos.

Sem overlay grande. O jogador reconhece entidades, intenções e relações espaciais.

## 2. DESTINO

O jogo executa automaticamente o futuro original — o que ocorreria sem intervenção.

Duração alvo: 2–4 segundos.

Funções:

- ensinar regras pelo comportamento;
- estabelecer baseline causal;
- reduzir tutorial textual;
- criar referência contrafactual.

## 3. REBOBINAR

A resolução volta rapidamente ao estado inicial.

Projétil retorna, peças reaparecem, movimentos desfazem.

Objetivo:

> "Isso ainda não aconteceu. Era apenas o futuro sem você."

## 4. DECLARAR

As opções aparecem sem esconder o mapa.

Exemplo:

```text
PRESSÁGIO        260
A colidirá com B.

VISÃO            520
A torre destruirá C.

PROFECIA       1.080
A torre ativará X;
X destruirá exatamente B e C.
```

## 5. INTERVIR

A profecia escolhida fica compacta no topo.

O jogador usa:

### IMPULSO
Mover uma Figura uma célula ortogonal.

### DESVIO
Alterar a direção de uma Figura ou Torre em 90°.

Undo/redo livre.

## 6. REVELAR

O botão principal é **REVELAR**.

Ao tocar:

- micro-haptic;
- UI de edição recolhe;
- estado trava;
- resolução começa.

É um compromisso:

> "Eu afirmo que este é o futuro."

## 7. TESTEMUNHAR

Ordem conceitual:

1. MOVER
2. COLIDIR
3. DISPARAR
4. REAGIR

A regra precisa ser sempre consistente.

## 8. VEREDITO

Sucesso:

```text
PROFECIA CUMPRIDA
840
1 INTERVENÇÃO
```

Falha:

```text
PROFECIA QUEBRADA
B deixou a área antes da explosão.
```

## Ritmo emocional

```text
ler
↓
"pera..."
↓
escolher algo ousado
↓
editar pouco
↓
hesitar
↓
REVELAR
↓
assistir
↓
"eu sabia"
```

## Sem limite fixo de ações

Não usar "você tem 2 movimentos".

A pergunta é:

> **Quanto do presente eu realmente preciso mudar?**

O jogador pode continuar intervindo, mas cada diferença final reduz o valor.

## Undo não pune

O score usa apenas o estado final.

Experimentação de interface não é intervenção ficcional.

## Boa Visão

Tem:

- leitura rápida;
- pelo menos duas profecias plausíveis;
- cadeia legível;
- oportunidade de melhorar uma solução;
- mais de uma abordagem quando possível.

Má Visão exige:

- tentativa cega;
- exceção obscura;
- precisão de dedo;
- solução única escondida.
