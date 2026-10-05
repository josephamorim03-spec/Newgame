# 09 — MVP, protótipo e plano de playtest

Não construir o jogo completo antes de responder:

> **Phase Lock é divertido?**

---

# 1. MVP v0 — somente brinquedo

Implementar:
- 3 anéis;
- 8 setores;
- 4 Tons;
- giro por swipe/mouse;
- Ressonância;
- Phase Lock;
- preview;
- refill;
- restart.

Sem:
- inimigo;
- meta;
- Protocolos.

Objetivo:
sentir o movimento.

## Critério
Depois de 3–5 minutos, jogador deve começar a antecipar propagação.

---

# 2. MVP v1 — puzzle com pressão

Adicionar:
- Energia-alvo;
- 1 Anomalia;
- 3 Integridades;
- 1 Intent de setor;
- vitória/derrota.

Nada mais.

Pergunta:
> O inimigo cria decisão ou apenas atrapalha?

---

# 3. MVP v2 — build

Adicionar 8 Protocolos.

Sugestão:
- 3 Phase;
- 2 Echo;
- 1 Prism;
- 1 Anchor;
- 1 Flux.

Máximo:
- 3 slots no protótipo inicial.

Run:
- 3 encontros.

Pergunta:
> O jogador consegue descrever sua build?

---

# 4. MVP v3 — mini-run

Adicionar:
- 6 encontros;
- 2 bosses;
- Draft;
- 3 famílias;
- Rewrite;
- stats pós-run.

Somente então testar retenção real.

---

# 5. Hipóteses de design

## H1 — compreensão
Jogador entende “gire e alinhe” em menos de 60s.

## H2 — Phase Lock
Até o terceiro encontro, consegue prever corretamente um movimento propagado sem tentativa.

## H3 — escolha
Jogador não trata Lock apenas como punição; usa intencionalmente para montar jogadas.

## H4 — identidade
Ao fim da mini-run, consegue responder:
> “o que sua build fazia?”

## H5 — derrota
Depois de perder, consegue dizer uma decisão que mudaria.

## H6 — replay
Uma parcela relevante inicia outra run imediatamente sem reward extrínseca.

## H7 — legibilidade
Erros de controle são muito menos frequentes que erros de decisão.

---

# 6. Métricas iniciais

Não são benchmarks de mercado; são alvos internos.

### Primeira Ressonância
< 30–60s.

### Primeiro Phase Lock compreendido
< 5 min.

### Tempo médio por decisão após onboarding
2–8s.

### Dead turns percebidos
muito baixos.

### Run
12–20 min.

### Retry
medir percentual que inicia nova run em até 30s após derrota.

### Build diversity
medir concentração de Protocolos vencedores.

---

# 7. Perguntas de entrevista

Depois da sessão:

1. Sem olhar, explique o que um Phase Lock faz.
2. Qual foi sua jogada mais legal?
3. Em que momento você sentiu que sua build mudou?
4. Quando perdeu, por quê?
5. Alguma animação pareceu demorada?
6. Houve momento em que não sabia o que fazer?
7. Qual Protocolo você gostaria de encontrar numa nova run?
8. Você quer jogar a mesma seed ou outra?
9. O que você acha que jogadores melhores fariam diferente?

A pergunta 9 é especialmente importante.
Se a resposta for “ter mais sorte”, temos problema.

---

# 8. Experimentos A/B internos

## Teste A — 4 versus 5 Tons
Medir:
- dead time;
- compreensão;
- frequência de Ressonância;
- profundidade.

## Teste B — Lock automático versus carga armazenada
Expectativa:
carga armazenada deve ser mais planejável.

## Teste C — refill 3 versus 6 visível
Medir:
- decisão;
- análise excessiva;
- sensação de injustiça.

## Teste D — preview completo versus parcial
Medir:
- clareza;
- suspense;
- tempo de decisão.

## Teste E — 3 versus 5 slots de Protocolo
Medir:
- identidade;
- complexidade;
- substituição.

---

# 9. Kill criteria

Devemos estar dispostos a matar a ideia se:

- jogadores evitam Phase Locks sempre;
- preview não torna propagação intuitiva;
- o melhor movimento é quase sempre óbvio;
- Protocolos aumentam números sem mudar decisões;
- ameaças obrigam jogar contra o puzzle;
- depois de 10 runs tudo converge.

---

# 10. Pivot criteria

Se girar anéis for bom mas Lock não:
- manter geometria;
- testar outros vínculos temporários.

Se Lock for bom mas tripla Ressonância trivial:
- testar padrões alternativos;
- sequência;
- pares com polaridade.

Se a mecânica for boa mas combate ruim:
- trocar Anomalia por objetivos de puzzle;
- manter sistema.

Não jogar fora o núcleo junto com a camada que falhou.

---

# 11. O protótipo ideal não precisa ser bonito

Precisa ter:
- 60 fps;
- toque gostoso;
- preview perfeito;
- som básico;
- logs;
- seed.

Arte sofisticada antes disso atrapalha diagnóstico.

---

# 12. Próximo marco recomendado

Criar um protótipo web/mobile extremamente pequeno com:

- board jogável;
- geração seeded;
- Phase Lock;
- Resonance;
- fila;
- 8 Protocolos;
- 1 Anomalia;
- telemetria local em JSON.

Esse protótipo deve permitir testar 20–30 runs antes de investir no GDD de conteúdo final.
