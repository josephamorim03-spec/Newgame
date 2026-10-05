# 01 — Gameplay Core

Este documento define a versão de referência da mecânica. Alterações devem ser testadas contra esta base.

---

# 1. Tabuleiro

## Estrutura padrão

- 3 anéis concêntricos:
  - Externo — R1
  - Médio — R2
  - Interno — R3
- 8 setores radiais.
- Cada anel possui 8 slots.
- Cada slot contém um **Tom**.
- Cada ação manual gira exatamente um anel em exatamente um setor:
  - horário;
  - anti-horário.

Representação abstrata:

```text
setor:     0 1 2 3 4 5 6 7
R1:        ● ◆ ▲ ■ ● ▲ ◆ ■
R2:        ▲ ◆ ■ ● ● ◆ ■ ▲
R3:        ■ ● ▲ ◆ ● ■ ▲ ◆
```

No jogo real, isso é mostrado radialmente.

## Tons

MVP:
- 4 Tons;
- sempre diferenciados por **cor + forma**;
- nenhum Tom tem poder intrínseco na regra-base.

Isso é intencional.

A profundidade deve nascer primeiro da geometria e das relações, não de quatro páginas de habilidades.

Protocolos posteriores podem reinterpretar Tons.

---

# 2. Ação do jogador

## Mobile
O jogador encosta em um anel e arrasta levemente:
- direita/horário;
- esquerda/anti-horário.

O movimento “encaixa” em um setor.

Arrastar mais longe **não** executa múltiplos turnos de uma vez no modo padrão.

## PC
Suporte:
- mouse drag;
- roda + seleção de anel;
- Q/A, W/S, E/D ou remapeável;
- gamepad.

## Preview antes do commit

Enquanto o dedo/mouse ainda está pressionado:

1. o anel selecionado mostra posição fantasma;
2. Phase Locks ativos mostram engrenamento/onda;
3. anéis que serão arrastados mostram setas;
4. Ressonâncias diretas previstas brilham;
5. o jogador solta para confirmar.

A previsão não precisa revelar toda cascata futura.

---

# 3. Ressonância

## Regra base

Se, após a resolução do movimento, os três slots de um mesmo setor possuem o mesmo Tom:

```text
R1    ●
R2    ●
R3    ●
      ↓
RESSONÂNCIA
```

A Ressonância:
1. gera Energia;
2. ativa Protocolos;
3. consome os três glifos;
4. repõe os slots;
5. pode iniciar uma Cascata.

## Valor base inicial

MVP:
- 1 Ressonância = 10 Energia.

Números são provisórios.

O importante é a relação.

## Ressonâncias simultâneas

Se dois ou mais setores ressoam no mesmo estado:
- todos resolvem na mesma **onda**;
- todos contam para a mesma etapa de Cascata.

---

# 4. Refill

Após uma Ressonância, os slots consumidos recebem novos Tons.

## Regra proposta

Existe uma fila compartilhada.

O jogador vê os próximos 6 Tons.

Ordem de preenchimento:
1. setores ressonantes em ordem horária, iniciando no marcador 12h;
2. dentro do setor: R1 → R2 → R3.

A ordem é sempre igual e pode ser consultada.

## Por que mostrar a fila

Permite planejamento avançado sem exigir cálculo externo.

O iniciante pode ignorar.

O veterano pode usar.

## Por que não mostrar a fila inteira

Queremos previsibilidade local, não resultado total previamente calculado.

---

# 5. Cascata

Depois do refill, o tabuleiro volta a verificar Ressonâncias.

Se o refill gerou outra Ressonância:
- ela resolve automaticamente;
- constitui a próxima onda da mesma ação.

Multiplicador-base candidato:

```text
onda 1  ×1
onda 2  ×2
onda 3  ×4
onda 4  ×8
...
```

Isso ainda precisa de playtest.

Objetivo:
- cascata rara o bastante para parecer especial;
- não tão rara que ninguém construa em torno dela.

## Regra de segurança

O motor deve possuir limite técnico de resolução de cadeia para evitar loop infinito.

O jogo pode permitir loop “funcionalmente infinito” no modo BREAK, mas a engine deve detectar repetição de estado.

---

# 6. Phase Lock — a mecânica-identidade

A versão inicial da ideia “dois iguais acoplam” foi refinada para evitar imprevisibilidade.

## Formação

Quando, depois da resolução, dois anéis **adjacentes** possuem o mesmo Tom no mesmo setor, mas não existe uma Ressonância completa:

```text
R1    ●
R2    ●    → novo alinhamento parcial
R3    ▲
```

o jogo pode gerar uma carga de **Phase Lock** entre R1 ↔ R2.

Da mesma forma para R2 ↔ R3.

### Regra importante

Somente alinhamentos **novos**, formados pela ação atual, podem gerar carga.

Manter a mesma dupla alinhada por vários turnos não produz carga repetidamente.

## Capacidade

MVP:
- R1↔R2: máximo 2 cargas;
- R2↔R3: máximo 2 cargas.

Visual:

```text
R1 ║●●║ R2 ║●○║ R3
     2        1
```

---

# 7. Consumo de Phase Lock

Quando um anel é girado manualmente e existe um Phase Lock carregado conectando-o a um anel adjacente:

- o anel adjacente gira 1 setor;
- em direção oposta;
- 1 carga é consumida.

Exemplo:

```text
ação: R1 ↻

Lock R1↔R2 ativo

resultado:
R1 ↻
R2 ↺
R3 —
```

---

# 8. Propagação

Se os dois links estão ativos:

```text
R1 ↔ R2 ↔ R3
```

e o jogador gira R1 ↻:

```text
R1 ↻
R2 ↺
R3 ↻
```

As duas cargas atravessadas são consumidas.

Se o jogador gira R2 ↻:

```text
R1 ↺
R2 ↻
R3 ↺
```

Cada anel pode mover no máximo uma vez nessa propagação-base.

## Razão

Essa regra cria a sensação de “máquina construída” sem permitir loops de movimento incontroláveis.

Protocolos avançados podem quebrar essa limitação.

---

# 9. Prioridade de resolução do turno

A ordem deve ser determinística.

## Fase A — intenção
Jogador arrasta e recebe preview.

## Fase B — movimento
1. movimento manual;
2. propagação por Phase Lock;
3. consumo de cargas.

## Fase C — Resonance Check
Detectar Ressonâncias completas.

## Fase D — resolução
1. gerar Energia;
2. executar Protocolos;
3. consumir glifos;
4. refill;
5. verificar nova onda;
6. repetir até estabilizar.

## Fase E — novos Locks
Após a cascata terminar:
- detectar novos alinhamentos parciais;
- gerar no máximo 1 carga por aresta por ação-base, salvo Protocolos.

## Fase F — Anomalia
- reduzir countdowns;
- resolver Intent pronto;
- gerar próximo Intent.

## Fase G — novo turno
UI volta ao estado totalmente controlável.

---

# 10. Um exemplo completo

Estado:

```text
Phase Lock:
R1-R2 = 1
R2-R3 = 1
```

O jogador gira R1 ↻.

Preview informa:

```text
R1 ↻
R2 ↺
R3 ↻
```

Após o movimento:

```text
setor 3:
R1 ●
R2 ●
R3 ●
```

Ressonância.

Ela consome os três.

Fila:
```text
▲ ■ ▲ ◆ ● ■
```

Os slots são preenchidos.

O refill cria outra combinação.

Segunda onda:
- ×2.

Um Protocolo “Aftertone” repete 50% da Energia da segunda onda.

Depois da estabilização, surge um novo alinhamento parcial R2/R3.

O jogo adiciona 1 Phase Lock para o próximo turno.

Uma única ação:
- gastou dois Locks;
- movimentou os três anéis;
- criou duas ondas;
- disparou Protocolo;
- produziu um novo Lock.

Isso é a experiência-alvo.

---

# 11. Dead turns

Não queremos que o jogador frequentemente veja seis movimentos e nenhum avance nada.

Gerador de tabuleiro e refill precisam ser controlados.

### Heurística inicial
Em estado neutro deve haver normalmente:
- 2–4 movimentos que criam Ressonância ou novo Phase Lock;
- pelo menos uma alternativa defensiva relevante quando há Intent.

Simulação simples com tabuleiro 3×8 totalmente aleatório sugere que quatro Tons produzem alta disponibilidade de jogadas de Ressonância de um passo. Isso é desejável no onboarding: o desafio deve estar em **qual** jogada escolher, não em encontrar qualquer jogada.

Essa simulação não substitui playtest do estado persistente.

---

# 12. Estados especiais — não MVP

Reservar arquitetura para:

- **Locked:** glifo não gira com seu anel;
- **Shielded:** ignora uma corrupção;
- **Noise:** não pertence a nenhum Tom;
- **Wild:** pode completar múltiplos Tons;
- **Charged:** aumenta Energia;
- **Fractured:** slot com comportamento hostil;
- **Inverted Lock:** movimento propagado no mesmo sentido;
- **Heavy Lock:** move 2 setores.

Não colocar todos no primeiro protótipo.

---

# 13. A regra de ouro

O jogador deve conseguir prever:

> “Se eu fizer esta ação, quais anéis se movem diretamente?”

Ele não precisa prever perfeitamente:

> “Qual será o estado depois de seis ativações emergentes?”

A primeira é estratégia.

A segunda pode permanecer descoberta.
