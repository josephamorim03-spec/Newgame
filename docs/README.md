# RING//BREAK — Gameplay Design Bible
**Codinome de projeto — v0.3 — 05/10/2026**

> **Tese central:** o jogador não volta porque ainda existe conteúdo para consumir.  
> Ele volta porque ainda existe uma ideia que quer testar.

RING//BREAK é um puzzle roguelike de runs curtas, pensado desde o início para **mobile + PC**, com um núcleo tátil extremamente simples e uma profundidade que emerge da interação entre poucas regras.

O jogador gira três anéis concêntricos contendo glifos. Alinhamentos completos geram **Ressonâncias**. Alinhamentos parciais criam **Phase Locks**: cargas que conectam temporariamente anéis e fazem com que o movimento de um altere o movimento dos outros. Ao longo da run, Protocolos modificam essas regras, até que cada partida se transforme em uma pequena “máquina” criada pelo próprio jogador.

## A ideia que precisa sobreviver a qualquer redesign

O diferencial não é “usar círculos”, “ser roguelike” ou “ter combinações”.

O diferencial é:

> **O jogador constrói uma build que muda o próprio espaço de movimentos disponíveis.**

Uma boa build não serve apenas para causar mais dano. Ela modifica:
- quais padrões contam como Ressonância;
- como os anéis respondem ao toque;
- como um movimento se propaga;
- como ameaças podem ser neutralizadas;
- como cascatas se formam;
- como o jogador interpreta o mesmo tabuleiro.

Se removermos isso, o projeto perde sua identidade.

## Fantasia do jogador

No minuto 1:
> “Giro um anel e alinho três símbolos.”

Na hora 1:
> “Consigo preparar uma Ressonância usando um Phase Lock.”

Na hora 10:
> “Vou criar este Lock para contrarrotacionar o anel médio e preparar duas Ressonâncias.”

Na hora 100:
> “Esta build converte Phase Locks em Echo, então quero intencionalmente construir uma malha instável e quebrá-la em cascata.”

## Objetivos de produto

- primeira ação significativa em menos de 5 segundos;
- regra-base explicável em uma frase;
- nenhuma necessidade de história longa;
- uma run padrão de aproximadamente 12–20 minutos;
- modos de 4–8 minutos para mobile/daily;
- replay baseado em **domínio + combinatória + adaptação**, e não grind;
- progressão que abre novas possibilidades, não bônus permanentes;
- experiência boa com uma mão no celular;
- mouse, teclado e gamepad no PC;
- conteúdo comunitário futuro baseado em regras seguras e compartilháveis.

## Documentos

1. `00_DIRECAO_E_PILARES.md` — visão, público, princípios e anti-princípios.
2. `01_GAMEPLAY_CORE.md` — regras formais do tabuleiro, Ressonância, Phase Lock e resolução de turnos.
3. `02_ENCONTROS_E_ANOMALIAS.md` — ameaças, intents, bosses e objetivos.
4. `03_PROTOCOLS_E_BUILDCRAFT.md` — famílias de Protocolos, drafts, slots e exemplos.
5. `04_ESTRUTURA_DA_RUN.md` — duração, forks, recompensas e ritmo.
6. `05_PROGRESSAO_E_DIFICULDADE.md` — unlocks, Atlas, Interferência e desafios.
7. `06_RETENCAO_SOCIAL_UGC.md` — daily, seeds, replays, desafios e Forge.
8. `07_UI_GAMEFEEL_ARTE.md` — controles, feedback audiovisual e direção visual.
9. `08_BALANCEAMENTO_E_REGRAS_DE_CONTEUDO.md` — RNG, agência, complexidade e guardrails.
10. `09_MVP_E_PLAYTEST.md` — primeiro protótipo, hipóteses e critérios de sucesso.
11. `10_ORIGINALIDADE_E_REFERENCIAS.md` — o que estamos absorvendo, o que evitar e colisões de mercado.

## Estado das decisões

### Travado para o primeiro protótipo
- 3 anéis;
- 8 setores por anel;
- 4 Tons;
- giro de 1 setor por ação;
- Ressonância = três Tons iguais no mesmo raio;
- Phase Lock = alinhamento parcial entre anéis adjacentes;
- movimento propagado previsível;
- 1 Anomalia simples;
- Protocolos passivos;
- restart instantâneo.

### Candidato forte, mas deve ser validado
- refill visível;
- 5 slots de Protocolo;
- 3–4 famílias ativas por run;
- cascata com multiplicador;
- Intents geométricos;
- objetivo de Energia;
- Atlas de Interações;
- Daily seed.

### Adiado
- Forge completo;
- Workshop/modding;
- multiplayer;
- quarta camada de anel;
- progressão cosmética extensa;
- narrativa;
- grandes quantidades de conteúdo.

O MVP deve provar o **pensamento emergente** antes de qualquer expansão.
