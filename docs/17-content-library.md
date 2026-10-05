# 17 — Biblioteca de Conteúdo: Kaijus, Objetivos e Unlocks

Este documento transforma o redesign em uma linguagem reutilizável. A variedade deve vir da combinação de poucas regras legíveis.

# 1. Biblioteca de objetivos

Todos os objetivos são avaliados **após a resolução inimiga**.

## Família A — Marco

**Assegure N**
- termine uma resolução com pelo menos um tile maior ou igual a N.
- exemplos: 16, 32, 64, 128.

## Família B — Quantidade

**Mantenha K × N**
- termine com pelo menos K tiles exatamente N.
- exemplos: 3 × 4; 4 × 4; 2 × 16.

Isso força o jogador a evitar fundir cedo demais.

## Família C — Sequência

**Monte 2–4–8**
- três células contíguas em linha ou coluna;
- sequência ascendente ou descendente vale;
- diagonal não vale na versão base.

Versões:
- 2–4–8
- 4–8–16
- 2–4–8–16

## Família D — Pares

**Preserve dois N**
- termine com dois tiles de mesmo valor sem fundi-los.

## Família E — Linha calibrada

**Linha alvo**
- uma linha ou coluna precisa conter um conjunto específico.
- exemplo: qualquer ordem contendo 4, 4, 8.
- usar somente em conteúdo avançado; UI deve desenhar os slots.

## Família F — Sobrevivência numérica

**Proteja o núcleo**
- um tile específico criado ou selecionado como carga deve sobreviver X resoluções.

# 2. Regras de objetivo

- uma missão tem **um único objetivo principal**;
- desafio extra nunca bloqueia progresso;
- objetivo deve ser representado visualmente;
- evitar soma total porque exige cálculo mental pouco visual;
- evitar condições com mais de quatro valores simultâneos;
- objetivo deve conversar com o Kaiju e com as peças recém-liberadas.

# 3. Vocabulário de Kaijus

Cada Kaiju é uma combinação de:
- alvo;
- forma;
- ritmo;
- especial.

## K01 — Artilheiro

ALVO: maior bloco.

NORMAL:
- linha horizontal através da coordenada alvo.

ESPECIAL:
- tiro de precisão no maior tile;
- carrega um turno;
- destrói somente a célula alvo;
- ignora Descarga.

ENSINA:
- sair da linha;
- sacrificar tile para Descarga;
- Aegis.

## K02 — Perfurador

ALVO: maior bloco.

NORMAL:
- coluna vertical.

ESPECIAL:
- duas colunas previamente telegráficas.

ENSINA:
- mesma gramática do Artilheiro com orientação diferente.

## K03 — Ceifador

ALVO: maior bloco.

NORMAL:
- uma diagonal através do alvo.

ESPECIAL:
- X: ambas as diagonais que passam pelo alvo;
- carrega um turno.

ENSINA:
- diagonais e valor do posicionamento.

## K04 — Devastador

ALVO: maior bloco.

NORMAL:
- cruz de cinco células, recortada na borda.

ESPECIAL:
- impacto 3×3;
- carrega um turno;
- não cancelável por Descarga.

ENSINA:
- preservar múltiplos espaços;
- Cryo/Aegis;
- tirar objetivo da zona de impacto.

## K05 — Perseguidor

ALVO: Mech.

NORMAL:
- 2×2 telegráfico próximo da posição do Mech.

ESPECIAL:
- varredura de duas regiões 2×2 consecutivas, ambas reveladas antes.

ENSINA:
- movimento do Mech;
- usar o Mech como parede sem ficar preso.

## K06 — Carcereiro

ALVO: maior bloco.

NORMAL:
- linha ou coluna simples, definida no briefing.

ESPECIAL — SELO:
- telegráfa o maior bloco um turno antes;
- na resolução sela aquela célula;
- valor fica visível;
- tile fica imóvel e vira parede;
- uma fusão maior ou igual ao valor do selo quebra a trava.

ENSINA:
- criar fusões com propósito;
- administrar dívida topológica.

## K07 — Arquiteto (chefe)

ALVO:
- alterna de forma visível entre maior bloco e Mech.

NORMAL:
- ciclo Linha → Coluna → Cruz.

ESPECIAL:
- alterna entre 3×3 carregado e Selo do maior bloco.
- ciclo completo é mostrado no briefing e HUD.
- nenhuma rolagem secreta na primeira versão.

# 4. Chassis e Mechs

No primeiro escopo, Mech é principalmente montagem modular.

## Atlas
- chassis inicial;
- Mech é parede móvel;
- sem bônus oculto.

## Bastion
- chassis fixo;
- não implementar até existir compensação espacial clara.

## Raptor
- identidade visual de mobilidade;
- projetado para Vetorial/Strider.

## Relay
- identidade de transposição;
- indicado para Transpositor/Permutador.

Um chassis não precisa adicionar efeito só porque existe.

# 5. Progressão sugerida

## Tutorial / Missão 1
Kaiju: Artilheiro.
Objetivo: Assegure 16.
Build:
- Óptica Base;
- Descarga;
- Passo Padrão.

## Missão 2
Kaiju: Artilheiro.
Objetivo: Assegure 32 após ataque.
Unlock:
- Âncora Criogênica.

## Missão 3
Kaiju: Perfurador.
Objetivo: 3 × 4.
Unlock:
- Preditor de Queda.

## Missão 4
Kaiju: Ceifador.
Objetivo: sequência 2–4–8.
Unlock:
- Pernas Vetoriais.

## Missão 5
Kaiju: Devastador.
Objetivo: Assegure 64.
Unlock:
- Campo Aegis.

## Missão 6
Kaiju: Perseguidor.
Objetivo: dois 16 simultâneos.
Unlock:
- Strider.

## Missão 7
Kaiju: Carcereiro.
Objetivo: 4–8–16 em linha/coluna.
Unlock:
- Transpositor.

## Chefe
Kaiju: Arquiteto.
Objetivo: Assegure 128.
Build:
- todas as peças desbloqueadas;
- ciclo completo do chefe visível antes da montagem.

# 6. Matriz de sinergia

## Cryo
Bom contra:
- linha/coluna;
- cruz;
- objetivos de sequência;
- impedir que peça essencial escape no slide.

Fraco contra:
- especial que mira a própria célula congelada.

## Aegis
Bom contra:
- tiro de precisão;
- 3×3;
- missão de preservar tile.

Fraco contra:
- selo;
- múltiplas ameaças distribuídas.

## Movimento
Bom contra:
- Perseguidor;
- ataque centrado no Mech;
- usar Mech como barreira móvel.

## Descarga
Bom contra:
- normal perigoso imediato.

Custo:
- destrói seu próprio recurso 2048.

Fraco contra:
- especiais não canceláveis.

## Preditor
Bom contra:
- objetivos de arranjo;
- grids congestionados.

# 7. Não adicionar agora

- raridade de peça;
- chips/moeda;
- loja;
- dano percentual;
- crítico;
- status em Kaiju;
- cartas;
- deck;
- consumíveis;
- múltiplos Kaijus simultâneos;
- procedural complexo de objetivo;
- upgrades numéricos permanentes.

A variedade deve vir de:
**objetivo × Kaiju × build × estado do 2048**.
