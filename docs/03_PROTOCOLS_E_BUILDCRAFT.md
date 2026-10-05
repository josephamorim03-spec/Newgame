# 03 — Protocolos e Buildcraft

Protocolos são o equivalente sistêmico ao que Jokers, relíquias e itens fazem em outros jogos — mas devem obedecer a uma regra mais rígida:

> **Um bom Protocolo muda como o jogador pensa sobre uma regra.**

Evitar encher o jogo de:
- +5% Energia;
- +3 dano;
- +10% chance.

Números podem existir, mas devem acompanhar uma mudança de decisão.

---

# 1. Slots

Proposta:
- máximo 5 Protocolos ativos.

Razões:
- legível no mobile;
- suficiente para sinergia;
- obriga substituição;
- permite identidade de run.

Quando os 5 slots estão ocupados:
- escolher novo Protocolo exige substituir um;
- nenhum “inventário reserva” no modo padrão.

---

# 2. Famílias

Uma run não usa o catálogo inteiro.

Ela recebe 3 ou 4 famílias ativas.

Isso cria:
- variedade global;
- baixa complexidade local;
- maior densidade de sinergia;
- menos diluição de pool.

## Famílias propostas

### PHASE
Manipula Phase Locks e propagação.

### ECHO
Retriggers e Cascatas.

### PRISM
Redefine o que conta como Ressonância.

### ANCHOR
Estabilidade, proteção e posição.

### RUPTURE
Quebra, purificação e destruição produtiva.

### INERTIA
Recompensa não mover, timing e preparo.

### MIRROR
Cópia, simetria e setor oposto.

### FLUX
Fila, refill e manipulação de Tons.

### SURGE
Risco voluntário e multiplicadores.

Não liberar todas no início.

---

# 3. Filosofia Pack-based

Em vez de uma pool de 200 Protocolos:

```text
catálogo total: 200
↓
famílias ativas na run: 4
↓
pool real da run: ~35–50
```

O jogador consegue formar um modelo mental da run.

Pergunta desejada:
> “O que dá para construir com estas famílias?”

Pergunta indesejada:
> “Qual das 700 coisas pode aparecer agora?”

---

# 4. Draft

Após a maioria dos encontros:

```text
PROTOCOLO

[ A ]     [ B ]     [ C ]

Rewrite: 1
```

- escolher 1;
- tocar/hover mostra texto detalhado;
- segurar mostra interações conhecidas no Atlas;
- Rewrite troca as três opções.

Draft deve levar poucos segundos para veterano.

---

# 5. Raridade

Raridade não é somente força.

### Common
- simples;
- muda uma pequena relação;
- ajuda a construir direção.

### Rare
- exige condição;
- cria payoff maior;
- conecta sistemas.

### Singularity
- altera uma regra estrutural;
- normalmente 0–2 por run;
- pode definir a identidade inteira da build.

---

# 6. Exemplos — PHASE

## Counterweight
Quando um Phase Lock é consumido:
- +3 Energia.

Simples, mas incentiva usar Locks.

## Residual Phase
Após consumir a última carga de uma aresta:
- 25% de chance de conservar 1 carga.

**Observação:** chance pode ser substituída por condição determinística se playtest indicar frustração.

## Full Mesh
Se as duas arestas possuem carga:
- Cascata recebe +1 estágio ao iniciar.

Conecta topologia com scoring.

## Differential Drive — Singularity
Phase Locks passam a propagar movimento no **mesmo** sentido.

A run inteira precisa ser reaprendida.

---

# 7. Exemplos — ECHO

## Aftertone
A primeira Ressonância de cada encontro repete 50% da Energia sem consumir glifos novamente.

## Reverb
Ressonância criada por refill aumenta o próximo multiplicador de Cascata.

## Feedback
Cada onda consecutiva aumenta Energia da família dominante naquele turno.

## Infinite Room — Singularity
A Cascata deixa de possuir cap padrão, mas cada onda adiciona Heat à Anomalia.

Cria fantasia de “quebrar o jogo” com risco.

---

# 8. Exemplos — PRISM

## Triad
Uma vez por ação, três Tons **todos diferentes** contam como Ressonância fraca.

## Complement
Dois Tons iguais + um terceiro específico podem ressoar.

## Spectrum
Após ressoar um Tom, o próximo Tom diferente recebe bônus.

## White Noise — Singularity
Noise passa a funcionar como Wild, mas Ressonâncias contendo Noise aceleram Intent.

---

# 9. Exemplos — ANCHOR

## Clamp
A primeira corrupção de cada encontro é anulada.

## Fixed Point
Escolha um setor no início do encontro.
O glifo do anel médio nesse setor pode permanecer fixo durante uma rotação manual.

Precisa de UX extremamente clara.

## Fortress
Ressonância no setor ameaçado concede escudo temporário ao setor oposto.

---

# 10. Exemplos — RUPTURE

## Clean Break
Consumir um Phase Lock remove 1 Noise aleatório.

## Shrapnel
Purificar Noise gera Energia.

## Fracture Engine
Quando um slot hostil é limpo, o anel correspondente gira automaticamente.

Potencial de cascata.

---

# 11. Exemplos — INERTIA

## Stillness
Se um anel não foi escolhido manualmente nas últimas 2 ações:
- sua próxima Ressonância recebe bônus.

Ele ainda pode ter se movido por Phase Lock.

## Stored Motion
Cada ação em que R3 não é escolhido carrega o Core.
Ao escolher R3, descarrega Energia.

## Dead Center — Singularity
O anel interno não pode mais ser escolhido manualmente.
Em compensação, todo Phase Lock que o move gera bônus.

Transforma a run.

---

# 12. Exemplos — MIRROR

## Reflection
Ressonância no setor X gera 25% da Energia no setor oposto como Echo.

## Symmetry
Se dois setores opostos possuem o mesmo padrão de Tons:
- +1 Phase Lock em uma aresta disponível.

## Looking Glass — Singularity
Toda propagação por Phase Lock é espelhada para a outra aresta quando possível.

---

# 13. Exemplos — FLUX

## Foretell
Fila visível aumenta de 6 para 9.

Isso é poder informacional.

## Recode
Uma vez por encontro, tocar na fila permite trocar os dois próximos Tons.

Único exemplo de ativo candidato; testar com cuidado.

## Recycle
Tons consumidos têm chance/condição de voltar ao final da fila.

## Loaded Future — Singularity
Fila torna-se totalmente determinística por um ciclo, mas Intent também acelera.

---

# 14. Exemplos — SURGE

Família deliberadamente avançada.

## Redline
Ressonâncias consecutivas na mesma ação recebem mais Energia, mas a Anomalia ganha 1 Heat.

## Dare
Ao iniciar encontro, escolha:
- normal;
- Overdrive.

Overdrive melhora recompensa se vencer sem dano.

## Critical Mass — Singularity
Quando a Cascata alcança ×8, todas as próximas ondas dobram Energia e todo Intent reduz seu countdown.

---

# 15. Protocolos não devem resolver decisões

Ruim:
> “Se existir uma Ressonância disponível, destaque a melhor.”

Bom:
> “Mostre quantas cargas de Lock serão consumidas.”

Ruim:
> “Auto-gire para o maior dano.”

Bom:
> “Mostre o preview de propagação.”

---

# 16. Compatibilidade e tags

Cada Protocolo deve possuir tags internas:

```text
trigger:
  resonance
  phase_consume
  refill
  intent
  turn_end

affects:
  movement
  scoring
  queue
  threat
  glyph
  lock

family:
  phase
```

Isso permite:
- balanceamento;
- busca;
- Forge;
- modding futuro;
- detecção automática de possíveis sinergias.

---

# 17. Regras de conteúdo

Um novo Protocolo deve satisfazer pelo menos uma:

1. torna uma ação antes ruim em ação interessante;
2. cria nova forma de converter recurso;
3. muda topologia/movimento;
4. altera valor de um estado já existente;
5. cria trade-off;
6. abre uma build reconhecível.

Se ele apenas aumentar um número, precisa justificar por que existe.

---

# 18. Vanilla versus BREAK

O produto deve aceitar dois desejos da comunidade.

## Standard
- balanceado;
- comparável;
- Daily;
- leaderboards;
- Singularity controlada.

## BREAK
- limites relaxados;
- pools experimentais;
- combinações absurdas;
- pontuação exponencial;
- sem promessa séria de equilíbrio competitivo.

Isso evita nerfar toda diversão para preservar ranking.
