# LIMIAR

Codinome do jogo atualmente em desenvolvimento no repositório **Newgame**.

LIMIAR é um jogo de estratégia competitiva mobile em que duas civilizações disputam um mapa pequeno e persistente. Em cada turno existe uma decisão principal: **incorporar uma região adjacente ao próprio território**. A profundidade vem do valor contextual dessa região: posição, desenvolvimento automático, objetivos públicos, estratégia do rival e Doutrinas escolhidas durante a partida.

## North star

> Uma regra de ação simples deve gerar decisões difíceis porque o mesmo território pode servir a objetivos incompatíveis.

O jogador deve conseguir aprender o gesto em segundos e continuar descobrindo novas formas de avaliar o mesmo tabuleiro muitas partidas depois.

## Estado atual

Fase: **design canônico / pré-MVP**.

Hipótese de partida para o primeiro protótipo:

- mobile em retrato;
- 2 jogadores, inicialmente humano vs IA e hot-seat;
- 7 rodadas, 1 incorporação por jogador por rodada;
- mapa compartilhado de aproximadamente 29 regiões hexagonais;
- território persistente;
- três Mandatos públicos e roubáveis: Vanguarda, Urbanização e Sabedoria;
- dois Marcos de Prestígio no mapa;
- desenvolvimento automático por geometria: Posto -> Vila -> Cidade;
- duas Doutrinas públicas por jogador, escolhidas em Conselhos durante a partida;
- Prestígio decide a vitória; Renome mede a potência/beleza da engine e desempata;
- nenhuma resolução aleatória depois da decisão.

Os números são hipóteses de balanceamento, não compromissos permanentes.

## O que este repositório não deve virar

LIMIAR não é um 4X reduzido por compressão de menus. O objetivo é remover sistemas até restar apenas o que produz decisão:

- sem trabalhadores;
- sem produção por segundo;
- sem madeira/comida/ouro/pedra;
- sem exércitos individuais;
- sem HP;
- sem deck tradicional;
- sem mão de cartas;
- sem árvore tecnológica;
- sem espera de construção;
- sem energia mobile;
- sem autoplay;
- sem dezenas de upgrades simultâneos.

Espaço, tempo e oportunidade são os recursos principais.

## Documentação

- [00 - Visão e constituição](docs/00_VISAO_E_CONSTITUICAO.md)
- [01 - Loop e regras](docs/01_LOOP_E_REGRAS.md)
- [02 - Mapa, território e desenvolvimento](docs/02_MAPA_TERRITORIO_DESENVOLVIMENTO.md)
- [03 - Vitória, Mandatos e Renome](docs/03_VITORIA_MANDATOS_RENOME.md)
- [04 - Doutrinas e builds](docs/04_DOUTRINAS_E_BUILDS.md)
- [05 - Competição, counterplay e IA](docs/05_COMPETICAO_COUNTERPLAY_IA.md)
- [06 - UX mobile e gamefeel](docs/06_UX_MOBILE_E_GAMEFEEL.md)
- [07 - Seeds, mapas e conteúdo](docs/07_SEEDS_MAPAS_CONTEUDO.md)
- [08 - Balanceamento, solver e métricas](docs/08_BALANCEAMENTO_SOLVER_METRICAS.md)
- [09 - MVP e implementação](docs/09_MVP_IMPLEMENTACAO.md)
- [10 - Playtest e gates](docs/10_PLAYTEST_E_GATES.md)
- [11 - Inspirações, prior art e limites](docs/11_INSPIRACOES_PRIOR_ART.md)
- [12 - Decisões travadas e questões abertas](docs/12_DECISOES_E_QUESTOES_ABERTAS.md)

## Política de branches

A branch **main** é deliberadamente documental e representa apenas a direção canônica atual.

Projetos, protótipos e direções anteriores permanecem em branches próprias. O estado anterior da main foi preservado em:

- archive/pre-limiar-main-2026-10-06
- archive/kaiju-2048-2026-10-05
- oraculo/design-v0.2

Novos protótipos de LIMIAR devem nascer em branches próprias, por exemplo **limiar/prototype-v0.1**, e só conceitos estabilizados retornam à documentação da main.
