# 04 — Estrutura da run, ritmo e economia de decisão

O jogo deve produzir runs com começo, transformação e clímax sem depender de narrativa escrita.

A “história” da run é a máquina que o jogador construiu.

---

# 1. Duração-alvo

## Run padrão
**12–20 minutos**

## Quick
**5–8 minutos**

## Daily
**4–8 minutos**

## Endless
Sem limite rígido.

Esses números são metas de playtest, não dogma.

---

# 2. Estrutura padrão proposta

Três Ciclos.

Cada Ciclo:

```text
Encontro
   ↓
fork
 ↙   ↘
Encontro / Distortion
   ↓
Draft
   ↓
Boss do Ciclo
   ↓
Singularity / grande escolha
```

Total aproximado:
- 6 encontros normais;
- 3 bosses;
- drafts rápidos entre eles.

Se duração ultrapassar consistentemente 20 min, reduzir encontros antes de acelerar combate artificialmente.

---

# 3. Forks

Não usar mapa enorme cheio de ícones no MVP.

Após um encontro:

```text
ROTA

A — PARASITE
ameaça: Phase Locks
recompensa: tendência PHASE

B — STATIC
ameaça: anel bloqueado
recompensa: tendência ANCHOR
```

O jogador sabe:
- risco;
- tema da ameaça;
- tendência de recompensa.

Não sabe exatamente:
- Protocolo que virá.

Isso produz planejamento sem análise excessiva.

---

# 4. Distortion

Nodo opcional de alto risco.

Exemplo:

> Anomalia começa com Intent 1 ação mais rápido.  
> Recompensa: escolha entre 4 Protocolos + Rewrite.

Distortion é a versão sistêmica de “elite”.

Precisa alterar regra, não só HP.

---

# 5. Recompensa normal

Depois de vencer:
- Draft 1 de 3 Protocolos.

Em determinados pontos:
- Calibration em vez de Protocolo.

---

# 6. Calibration

Escolha uma:

### Purge
Remover um Protocolo.

### Reframe
Trocar uma família secundária da pool por outra.

### Rewrite+
Ganhar tokens de reroll.

### Tune
Modificar uma propriedade pequena da fila ou do tabuleiro por este Ciclo.

No MVP, usar apenas Purge + Rewrite.

---

# 7. Rewrite

Economia propositalmente pequena.

Proposta inicial:
- começa a run com 1 Rewrite;
- bosses dão +1;
- Diretivas podem dar +1;
- cap 3.

Gastar 1:
- rerrola as três opções de Draft.

Não criar moeda de centenas.

Queremos que o jogador pense:
> “vale gastar meu Rewrite agora?”

e não:
> “tenho 2.843 moedas.”

---

# 8. Famílias ativas da run

No início:

```text
PHASE
ECHO
ANCHOR
+
1 família variável
```

Isso é exemplo, não regra final.

Alternativa preferível para versão completa:

- 1 família ligada ao Frame escolhido;
- 2 famílias sorteadas;
- 1 família oferecida entre duas opções.

Assim o jogador recebe:
- identidade;
- adaptação;
- uma pequena escolha antes da run.

Não fazer um setup de cinco minutos antes de começar.

---

# 9. Curva interna da run

## Minuto 0–3 — orientação
- 0–1 Protocolos;
- board ainda compreensível;
- jogador identifica direção.

## Minuto 3–8 — formação
- 2–3 Protocolos;
- primeira sinergia real;
- começa a construir propósito.

## Minuto 8–14 — identidade
- slots quase cheios;
- escolha de substituição;
- boss força adaptação.

## Final — expressão
- a máquina deve fazer algo que não fazia no começo;
- possível power spike;
- boss final testa domínio.

---

# 10. O jogo não deve garantir uma build

Se o jogador decide no início:
> “vou fazer Echo”

e ignora todas as outras oportunidades, o sistema deve poder puni-lo.

Draft deve frequentemente dizer:
> “o jogo está oferecendo outra coisa — você vai adaptar?”

Não:
> “escolhi classe Echo, logo só preciso clicar em todas as cartas Echo.”

---

# 11. Mas também não deve negar agência

Ferramentas:
- famílias locais;
- Rewrite;
- forks com tendência de recompensa;
- Purge;
- Singularity coerentes.

O jogador não controla tudo, mas pode **navegar a variância**.

---

# 12. Singularity

Ao derrotar boss de Ciclo:
- escolha 1 de 2 ou 3 Protocolos Singularity.

Eles devem mudar a run.

Exemplos:
- Locks giram no mesmo sentido;
- padrões de três Tons diferentes ressoam;
- anel interno não pode ser movido manualmente;
- Cascata pode exceder cap.

Esse é o momento “minha build entrou online”.

---

# 13. Último boss

O último boss deve perguntar:

> “Você realmente entende a máquina que construiu?”

Ele não precisa counterar a build diretamente.

Deve pressionar:
- timing;
- adaptabilidade;
- leitura dos próprios Protocolos.

Evitar boss que simplesmente invalida uma família inteira.

---

# 14. Pós-run

Tela curta:

```text
RUPTURA COMPLETA

Build: PHASE / ECHO
Maior Cascata: ×16
Phase Locks criados: 31
Movimento mais valioso: turno 42
Protocolo dominante: Feedback

[ NOVA RUN ]
[ REPLAY ]
[ DETALHES ]
```

Botão principal:
**NOVA RUN**

Um toque deve começar outra seed com mínima fricção.

---

# 15. Run perdida

Mostrar:
- causa final;
- 2–4 métricas úteis;
- botão Retry;
- botão Nova Seed.

Não escrever:
> “Você deveria ter feito X.”

Informar:
> “O Intent atingiu setor 6. Havia 2 glifos corrompidos nesse setor.”

O jogador forma a hipótese.
