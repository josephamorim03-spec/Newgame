# 05 — UX mobile e gamefeel

## Plataforma

Mobile vertical, prioridade para telas próximas ao iPhone 13 Pro.

- um polegar deve bastar;
- alvos grandes;
- sem hover;
- sem precisão subpixel;
- sem scroll durante a Visão;
- safe areas respeitadas.

## Hierarquia visual

1. tabuleiro;
2. entidades e intenções;
3. profecia ativa;
4. valor;
5. controles.

HUD nunca compete com causalidade.

## Direção visual

> **mesa ritualística + autômato mecânico + marfim + latão + carvão**

Evitar:

- neon sci-fi genérico;
- partículas em excesso;
- glow em tudo;
- card-game UI;
- estética infantil.

Cor deve ser redundante com forma/símbolo.

## Destino

Executa uma vez automaticamente.

Durante preparação, botão pequeno **DESTINO** permite rever somente o futuro original.

Nunca mostrar o futuro alterado.

## Rewind

Assinatura de produto:

- rápido;
- reverso;
- som próprio;
- sem loading;
- sem fade.

Comunica:

```text
fato observado → possibilidade editável
```

## Escolha da profecia

Bottom sheet parcial:

- mapa continua visível;
- três opções no máximo;
- texto curto;
- nenhum preview de sucesso.

## IMPULSO

Arrastar entidade uma casa.

Feedback:

- destino válido acende;
- inválido não aceita;
- snap ao centro;
- undo disponível.

## DESVIO

Interação direta com a seta.

Testar:

- swipe curto esquerda/direita;
- ou toque seguido de escolha de direção adjacente.

Evitar botão global "ROTACIONAR".

## Profecia ativa

```text
✦ PROFECIA
T → X → B + C

VALOR 780
```

## REVELAR

Botão principal.

Ao tocar:

1. haptic leve;
2. botão contrai;
3. edição recolhe;
4. 80–120 ms de silêncio;
5. resolução.

Sem confirmação modal.

## Gamefeel

Exemplo:

```text
A move      tick
B move      tick
T dispara   SHNK
X ativa     pausa 80 ms
explosão    BOOM
silêncio    120 ms
veredito
```

Gamefeel serve causalidade.

## Sucesso

Após resolver, destacar por 300–600 ms apenas o caminho relevante:

```text
T → X → {B,C}
```

## Falha

Replay curto + primeiro elo quebrado.

Exemplo:

> **B saiu da área antes da explosão.**

Evitar tela vermelha, "FAIL" e punição longa.

## Tutorial

### Visão 1
2 Figuras; uma profecia; sugestão visual de IMPULSO.

### Visão 2
DESVIO.

### Visão 3
Primeira escolha entre três profecias.

Meta: decisões reais em menos de 2 minutos.
