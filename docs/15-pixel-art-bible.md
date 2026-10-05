# 15 — Pixel Art Bible — Kaiju 2048

## Objetivo
Este documento é a fonte de verdade visual do projeto. O jogo usa pixel art limpa, silhuetas fortes, paleta limitada e feedback tático legível. **Clareza vem antes de detalhe.**

## Correções aplicadas ao rascunho original

### 1. Paleta
A lista original ultrapassava bastante a meta declarada de 32–40 cores porque cada tile tinha Base + Sombra + Highlight próprios, além de UI, entidades e FX.

A versão de produção usa **39 cores mestre**. Tiles continuam tendo três níveis visuais, mas sombras/highlights reutilizam cores da paleta em vez de criar três cores exclusivas para cada valor.

### 2. Resolução e mobile
A resolução lógica de produção continua **640×360 (16:9)** para o jogo PC. O protótipo HTML permanece responsivo para celular; ele não deve ser simplesmente esticado para 640×360 em portrait.

- PC/final: canvas lógico 640×360, escala inteira.
- Teste mobile: composição adaptativa usando os mesmos assets/paleta.
- Nunca usar interpolação bilinear em sprites.

### 3. Tamanho de sprite
- célula lógica: 32×32
- tile: 32×32
- Mech: 28×28
- Kaiju normal: 28×28
- chefe: 36×36 com overflow controlado
- carta: 48×64
- ícones: 8×8 / 12×12 / 16×16

## Paleta mestre
A paleta importável está em `assets/palettes/kaiju_2048.gpl`.

### Base / UI
| Nome | Hex |
|---|---|
| BG Deep | #0D0D1A |
| BG Mid | #1A1A2E |
| BG Light | #2A2A3A |
| Grid Line | #3A3A5A |
| UI Panel | #15152A |
| UI Border | #5A5A7A |
| Text Primary | #F0F0F8 |
| Text Secondary | #A0A0B8 |
| Ink Dark | #101018 |

### Valores
| Valor | Base |
|---:|---|
| 2 | #B8B8C8 |
| 4 | #7EC8E3 |
| 8 | #5FD068 |
| 16 | #FFD93D |
| 32 | #FF8C42 |
| 64 | #FF4C4C |
| 128 | #B14CFF |
| 256 | #9B30FF |
| 512 | #FFD700 |
| 1024 | #FF1493 |
| 2048 | #00FFCC |

### Entidades
| Uso | Base |
|---|---|
| Mech | #4FE0E0 |
| Mech highlight | #80F0F0 |
| Mech shadow | #3098A0 |
| Artilheiro | #6B2D8C |
| Esmagador | #4A7C3A |
| Parasita | #D44A8C |
| Arquiteto | #8B0000 |

### FX
| Uso | Cor |
|---|---|
| Dano | #FF2020 |
| Cura | #40FF80 |
| Energia | #FFD93D |
| Congelamento | #80D0FF |
| Queimadura | #FF6A20 |
| Atordoamento | #C080FF |
| Shine | #FFFFFF |

### Tons compartilhados
Sombras e highlights devem preferir os tons mestre já disponíveis: #101018, #2A2A3A, #3A3A5A, #A0A0B8, #F0F0F8, #FFFFFF. Quando um material exigir uma segunda cor específica, ela precisa ser promovida formalmente à paleta antes de entrar em produção.

## Tiles
Silhueta comum para todos os valores.

- cantos cortados em 2 px;
- contorno escuro 1–2 px;
- highlight superior/esquerdo;
- sombra inferior/direita;
- número central dominante;
- nenhum gradiente suave;
- sem blur;
- sem antialiasing.

### Animações
| Estado | Frames alvo |
|---|---:|
| Idle | 1–2 |
| Spawn | 4 |
| Merge | 6 |
| Destroy | 4 |
| Bump | 4 |

Fusão: compressão → flash de 1 frame → overshoot → assentamento.

## Mech
Silhueta compacta e reconhecível em preto.

- 28×28;
- corpo ciano;
- reator/olhos amarelos;
- contorno escuro 1 px;
- idle: 4 frames, deslocamento máximo 1 px;
- walk: 4;
- attack: 4;
- hit: 2;
- death: 6.

## Kaijus

### Artilheiro
- roxo;
- forma vertical/alongada;
- canhão traseiro;
- espinhos dorsais;
- olhos vermelhos;
- leitura: alcance.

### Esmagador
- verde;
- muito largo;
- braços grandes;
- centro de massa baixo;
- leitura: peso e destruição.

### Parasita
- rosa;
- irregular;
- tentáculos;
- boca circular;
- leitura: consumo.

### Arquiteto
- 36×36;
- preto/vermelho escuro;
- cinco pontas/coroa;
- núcleo vermelho;
- leitura: chefe que altera regras.

## Telegrafia
Telegrafia é informação de gameplay, não decoração.

| Tipo | Cor | Forma |
|---|---|---|
| dano | #FF2020 | célula/linha + símbolo de impacto |
| movimento | #FFD700 | seta + célula |
| consumo | #D44A8C | boca/anel |
| invocação | #B14CFF | círculo/runa |

O jogador deve compreender a intenção mesmo em escala de cinza: **cor + símbolo + padrão**.

## Cartas
48×64 no canvas lógico.

Categorias:
- Movimento: #7EC8E3
- Ataque: #FF4C4C
- Defesa: #5FD068
- Manipulação: #B14CFF
- Especial: #FFD93D

A carta precisa comunicar em ordem:
1. custo;
2. verbo;
3. alvo;
4. resultado.

Arte é secundária no MVP.

## Relíquias
- ícone 24×24;
- painel 48×48;
- moldura comum usa UI Border;
- rara usa #FFD700;
- símbolo central simples e reconhecível.

## Gamefeel
| Evento | Shake | Observação |
|---|---:|---|
| fusão 4–16 | 1 px / 0,1 s | quase tátil |
| fusão 32–64 | 3 px / 0,2 s | payoff |
| fusão 128+ | 5 px / 0,35 s | evento raro |
| dano no Reator | 4 px / 0,25 s | flash vermelho |
| kill | 3 px / 0,2 s | partículas |
| chefe | até 6 px / 0,4 s | reservado |

Evitar shake em seleções, hover e ações comuns.

## Regras de ouro
1. Silhueta primeiro.
2. Nada de blur em sprites.
3. Escala inteira.
4. Uma fonte de luz: superior esquerda.
5. Máximo de três níveis por superfície.
6. Antialiasing desligado.
7. Tudo importante alinhado ao grid.
8. A paleta é fechada: mudança exige revisão deste documento.
9. Efeitos nunca escondem o estado tático.
10. Pixel art não significa excesso de ruído: áreas de descanso visual são obrigatórias.

## Pipeline
### Fase 1 — prova visual
- tile 2 / 4 / 8 / 16;
- Mech idle;
- Artilheiro idle;
- Esmagador idle;
- um frame de carta por categoria;
- telegraph overlay.

### Fase 2 — vertical slice
- todos os valores;
- animações principais do Mech;
- 3 Kaijus normais;
- FX essenciais;
- HUD e cartas.

### Fase 3 — produção
- Arquiteto;
- animações completas;
- relíquias;
- cenários;
- variações ambientais.

## Referências
- Into the Breach — silhueta e telegráfica.
- Balatro — impacto e leitura de cartas.
- Loop Hero — economia de pixels/paleta.
- Nuclear Throne — impacto.
- Enter the Gungeon — personalidade de sprite.
- Katana ZERO — uso disciplinado de efeitos.
