# 08 — Balanceamento, RNG e regras para expansão

Este jogo pode morrer por excesso de conteúdo tão facilmente quanto por falta dele.

---

# 1. RNG como gerador de problemas

Usar RNG para:
- fila;
- Draft;
- Anomalias;
- forks;
- estado inicial.

Dar ao jogador ferramentas para navegar:
- preview;
- famílias locais;
- Rewrite;
- forks;
- Protocolos de Flux;
- conhecimento.

## Teste mental

Se uma derrota pode ser explicada apenas por:
> “não veio X”

há risco.

Perguntar:
> “que decisão anterior poderia ter reduzido essa dependência?”

---

# 2. Controle da pool

Catálogo grande não deve ser pool grande.

Regra:
- 3–4 famílias por run;
- Protocolos off-family raros;
- Singularity controlada.

Adicionar 50 Protocolos sem aumentar curadoria pode reduzir replay ao diluir sinergias.

---

# 3. Budget de complexidade

Cada nova feature consome orçamento.

### Base permitida em tela
- 3 anéis;
- Tons;
- 2 arestas de Lock;
- fila;
- 1 Intent;
- até 5 Protocolos.

Antes de adicionar outro recurso persistente, provar que ele cria decisões suficientes.

---

# 4. Número de Tons

MVP: 4.

Motivo:
- baixa barreira;
- reconhecimento rápido;
- disponibilidade alta de combinação.

Uma simulação simples de tabuleiros aleatórios 3×8 mostrou, aproximadamente:
- 4 Tons: ~91% dos estados tinham ao menos uma rotação simples capaz de formar alguma Ressonância;
- 5 Tons: ~80%;
- 6 Tons: ~68%.

Isso não modela o jogo completo, mas sugere uma boa razão para começar com 4.

A dificuldade deve vir de:
- posição;
- Phase Locks;
- ameaça;
- escolha;

e não de passar vários turnos sem poder fazer algo interessante.

---

# 5. Board generation

Não confiar em random puro.

Gerador deve:
- evitar Ressonância automática no frame inicial;
- garantir opções suficientes;
- evitar estado trivial perfeito;
- distribuir Tons razoavelmente.

Meta inicial:
- 2–4 ações significativas num estado neutro.

---

# 6. Balancear opções, não resultados idênticos

Nem toda build precisa:
- pontuar igual;
- ter curva igual;
- lidar igual com todo boss.

Mas nenhuma família deve:
- resolver tudo sozinha;
- ser claramente superior em quase toda seed.

---

# 7. Build forte versus build automática

Uma build pode ser extremamente forte.

Problema começa quando:
- decisões deixam de importar cedo demais.

Teste:
> Depois que a build “entrou online”, o jogador ainda faz escolhas relevantes?

Se não:
- adicionar trade-off;
- encurtar encontro;
- criar Anomalias que mudam contexto;
- não simplesmente nerfar números.

---

# 8. Protocolos quebrados

Quando um combo raro produz algo absurdo, perguntar:

1. exigiu planejamento?
2. foi raro?
3. jogador entendeu por que aconteceu?
4. é divertido?
5. prejudica competição?

Se 1–4 = sim e 5 = não:
provavelmente preservar.

Se destrói leaderboard:
- banir do Standard competitivo;
- manter em BREAK/Endless;
- separar ruleset.

---

# 9. Balanceamento por oferta

Às vezes o problema não é força do item.

É frequência.

Ferramentas:
- raridade;
- famílias;
- condições de oferta;
- exclusões;
- cap;
- Singularity.

Evitar nerfar efeito divertido se diminuir disponibilidade resolve.

---

# 10. Informação versus suspense

Mostrar:
- movimento direto;
- locks consumidos;
- intent;
- fila imediata;
- valores dos Protocolos.

Não obrigatoriamente mostrar:
- score final de toda cascata;
- refill infinito;
- solução ótima.

O jogador precisa poder pensar:
> “acho que isso basta.”

Esse pequeno suspense é valioso.

---

# 11. Telemetria necessária

Registrar:
- ação escolhida;
- alternativas disponíveis;
- Ressonâncias;
- Locks criados/consumidos;
- duração de decisão;
- dano recebido;
- Protocolos oferecidos/escolhidos;
- Rewrite;
- causa de morte;
- estado da fila;
- Cascatas;
- seed.

Sem isso, balanceamento sistêmico vira opinião.

---

# 12. Sinais de convergência ruim

Alerta se:
- um Protocolo é escolhido >70% quando oferecido;
- uma família domina vitórias;
- jogador resetta frequentemente até encontrar combinação;
- mesma sequência de Protocolos aparece em grande parte das vitórias;
- Anomalias específicas anulam famílias inteiras.

Os thresholds exatos serão definidos por dados.

---

# 13. Anti-content-bloat checklist

Antes de adicionar qualquer item:

- usa regra existente?
- interage com pelo menos 3 coisas?
- tem caso em que não é a melhor escolha?
- muda comportamento?
- possui tooltip curto?
- é visualmente legível?
- aumenta decisões ou só aumenta pool?

Se falhar em várias:
cortar.

---

# 14. Segurança contra loops

Como Protocolos podem provocar:
- giro;
- refill;
- Ressonância;
- outro giro;

o engine precisa usar uma fila de eventos determinística.

Cada evento:
```text
source
trigger
priority
target
effect
generation_depth
```

Detecção:
- state hash;
- depth cap;
- repetição de estado.

Modo BREAK pode converter loop detectado em:
> ENGINE BREAK

e resolver pontuação de forma segura, em vez de travar o jogo.
