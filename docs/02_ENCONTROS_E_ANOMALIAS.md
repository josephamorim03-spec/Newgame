# 02 — Encontros, Anomalias e pressão tática

O puzzle precisa de uma razão para o jogador não buscar apenas a maior Ressonância possível.

Essa razão são as **Anomalias**.

Anomalias não devem funcionar como inimigos de RPG tradicional. Sua função principal é **modificar a pergunta que o mesmo tabuleiro está fazendo**.

---

# 1. Estrutura do encontro padrão

Um encontro possui:

- Meta de Ruptura — Energia necessária;
- Integridade do Core — margem de erro;
- Anomalia — regra/comportamento;
- Intent — próxima ameaça;
- Protocolos ativos do jogador;
- Diretiva opcional — desafio de bônus.

Exemplo:

```text
ANOMALIA: NEEDLE

Ruptura      42 / 80
Integridade  ● ● ●

Intent:
em 2 ações → perfura setor 5

Diretiva:
vença com pelo menos 1 Phase Lock restante
```

---

# 2. Vitória

No encontro-base:

> acumular Energia suficiente para romper a Anomalia.

Energia vem principalmente de Ressonâncias.

Ao atingir o limiar:
- encontro termina imediatamente;
- ameaças pendentes não resolvem;
- recompensa aparece sem tela intermediária longa.

---

# 3. Derrota

MVP:
- 3 pontos de Integridade por encontro;
- dano reduz Integridade;
- chegar a 0 termina a run.

A Integridade volta ao máximo no próximo encontro.

## Por que não usar HP persistente inicialmente

O sistema central já possui:
- tabuleiro;
- Locks;
- fila;
- Protocolos;
- Intents.

HP persistente adicionaria uma camada de attrition antes de sabermos se ela melhora o jogo.

Pode ser testado em dificuldade avançada depois.

---

# 4. Intent

Toda ameaça precisa ser telegráfica.

O jogador deve saber:
- quando ocorrerá;
- onde ocorrerá;
- qual efeito causará.

Ele não precisa saber como resolver.

## Exemplos geométricos

### Spoke Strike
```text
em 2 ações:
atinge R1/R2/R3 do setor 4
```

### Arc Strike
```text
em 1 ação:
atinge R1 nos setores 6,7,0
```

### Ring Pulse
```text
em 3 ações:
corrompe 2 glifos do R2
```

### Frequency Hunt
```text
em 2 ações:
atinge todos os ▲
```

### Lock Breaker
```text
em 1 ação:
remove 1 carga de cada Phase Lock
```

---

# 5. Como neutralizar ameaças sem criar dez botões

A regra deve preferir respostas através do próprio puzzle.

Exemplos:

### Ataque posicional
A ameaça mira uma posição física.
O jogador pode mover um glifo valioso para fora da área.

### Charge Beam
O setor ameaçado pode ser desativado se uma Ressonância ocorrer nele antes do countdown chegar a zero.

### Lock Parasite
A Anomalia mira uma aresta Phase Lock.
O jogador pode consumir a carga antes que ela seja drenada.

### Frequency Corruption
O ataque marca um Tom.
O jogador pode consumir os glifos daquele Tom em Ressonâncias.

O inimigo cria uma **restrição temporária** sobre as regras que já existem.

---

# 6. Dano versus corrupção

Nem todo erro deve tirar Integridade.

Alternar consequências aumenta profundidade.

### Dano
- simples;
- legível;
- bom para onboarding.

### Corrupção
Transforma um glifo em `Noise`.

Noise:
- não completa Ressonância normal;
- pode ser removido ao participar de um efeito específico.

### Jam
Um anel não pode ser escolhido manualmente na próxima ação.
Ainda pode mover por Phase Lock.

Isso é interessante porque não “desliga” completamente o sistema.

### Fracture
Um setor não pode gerar Phase Lock até ser limpo.

---

# 7. Arquétipos de Anomalia

## 7.1 Hunter
Mira setores de alto valor.

Ensina:
- reposicionamento;
- não acumular tudo em um lugar.

## 7.2 Parasite
Alimenta-se de Phase Locks.

Ensina:
- criar e gastar Locks com timing.

## 7.3 Mirror
Replica sua última ação ou ameaça o setor oposto.

Ensina:
- pensar em simetria.

## 7.4 Static
Bloqueia temporariamente um anel.

Ensina:
- utilizar propagação indireta.

## 7.5 Noise
Introduz glifos corrompidos.

Ensina:
- purificação;
- valor de Protocolos de transformação.

## 7.6 Auditor
Pune repetir sempre o mesmo Tom.

Ensina:
- diversificação.

## 7.7 Predator
Ataca o setor com maior potencial de Energia.

Ensina:
- criar iscas;
- dispersar poder.

## 7.8 Clock
Possui countdowns curtos e previsíveis.

Ensina:
- eficiência de ação.

---

# 8. Bosses

Boss não deve significar apenas “200 Energia em vez de 80”.

Cada boss deve introduzir uma regra que muda a resolução do puzzle.

## Boss — The Divider

A Energia é dividida em três selos:

```text
● 0/25
▲ 0/25
■ 0/25
```

Ressonâncias de um Tom só danificam seu selo.

Objetivo:
não forçar uma única build monotônica.

---

## Boss — The Mirror

Setores opostos estão conectados.

Quando ocorre Ressonância no setor 2:
- setor 6 é alterado.

O jogador pode usar isso a favor.

---

## Boss — The Clamp

Um dos anéis fica bloqueado manualmente por 2 ações e alterna ao longo da luta.

Phase Locks ainda conseguem movê-lo.

Esse boss funciona quase como uma prova de domínio do sistema central.

---

## Boss — The Hunger

Consome o Phase Lock com mais cargas periodicamente.

Quanto mais Locks você oferece, mais forte fica.

Mas certas janelas expõem multiplicador de Ruptura.

Cria dilema:
- guardar;
- gastar;
- sacrificar.

---

# 9. Fases de boss

No máximo 2 fases no jogo-base.

Uma boa fase 2 deve:
- reinterpretar algo aprendido na fase 1;

não:
- adicionar um minigame completamente novo.

---

# 10. Diretivas opcionais

Cada encontro pode possuir uma Diretiva de bônus.

Exemplos:
- vença sem sofrer dano;
- termine com 2 Locks;
- consiga Cascata ×4;
- não use o anel interno manualmente;
- ressoe os quatro Tons;
- vença em até 8 ações.

Recompensa:
- Rewrite;
- escolha extra;
- cosmético/recorde em modos apropriados.

Diretivas não devem ser necessárias para concluir a run.

Servem para:
- ensinar estratégias;
- oferecer autocontrole de dificuldade;
- gerar variação.

---

# 11. Regra para criação de novas Anomalias

Antes de aprovar uma Anomalia, preencher:

1. Qual comportamento do jogador ela tenta alterar?
2. Qual regra existente ela usa?
3. Existe contrajogo?
4. O Intent é legível em menos de 2 segundos?
5. Ela favorece mais de uma solução?
6. Ela continua interessante na décima aparição?

Se a resposta à pergunta 2 for “nenhuma; criamos um sistema novo”, reconsiderar.

---

# 12. Objetivos alternativos — pós-MVP

Podem existir em Challenges/Forge:

- sobreviver N ações;
- criar X Locks;
- atingir uma Cascata específica;
- limpar Noise;
- terminar com padrão geométrico;
- ressoar sequência de Tons;
- não consumir certo Lock.

O modo principal deve manter um objetivo dominante simples para reduzir carga cognitiva.
