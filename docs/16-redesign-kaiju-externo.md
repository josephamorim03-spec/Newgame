# 16 — Redesign: Kaiju Externo + Mech Modular

## Tese

Kaiju 2048 deve ser primeiro um **2048 tático**.

O tabuleiro pertence a três coisas:
- blocos numéricos;
- o Mech do jogador;
- marcas/obstáculos produzidos pela ameaça.

O Kaiju fica **fora do grid**. Ele não disputa espaço como uma peça comum: ele lê o tabuleiro, escolhe um alvo por uma regra conhecida e projeta uma ameaça espacial telegráfica.

A complexidade deve existir principalmente **antes da missão**, na escolha de build. Durante a missão o turno continua curto.

## Loop de turno

Cada turno segue este contrato:

1. O Kaiju revela ou mantém sua intenção.
2. O jogador tem **1 deslize obrigatório**.
3. O jogador pode usar **0 ou 1 reação** no turno, antes ou depois do deslize.
4. O jogador confirma.
5. O Kaiju resolve exatamente a área já mostrada.
6. O próximo bloco nasce.
7. Verifica-se a condição de vitória.

Não há mão, energia, status empilhados, relíquias aleatórias nem loja dentro da missão.

### Undo

Enquanto o jogador ainda não confirmou, pode desfazer o turno inteiro no protótipo. Não há informação escondida entre o início do turno e a confirmação, portanto o undo reforça o caráter de puzzle.

## Informação do próximo bloco

Por padrão o jogador vê **o valor** do próximo bloco, mas não a casa.

A casa só é sorteada depois da resolução do ataque, entre as casas vazias.

Um módulo de cabeça pode revelar a posição futura; isso transforma informação em escolha de build, em vez de sobrecarregar todos os jogadores.

## Contrato de telegrafia

Toda intenção possui quatro campos visíveis:

- **ALVO:** maior bloco ou Mech.
- **FORMA:** linha, coluna, diagonal, cruz, 2×2 ou 3×3.
- **EFEITO:** destruir, atingir Reator, selar.
- **TEMPO:** resolve este turno ou está carregando para o próximo.

O alvo e as células da ameaça são congelados quando a intenção é criada. O jogo nunca retargeta escondido depois do jogador agir.

Mover o bloco, mover o Mech ou alterar o grid pode fazer o ataque errar. Isso é habilidade do jogador, não exploit.

## Gramática de ataques

### Alvos permitidos

Para manter previsibilidade, Kaijus usam somente:
- **Maior bloco:** empate resolvido por regra fixa visível.
- **Mech:** coordenada do Mech no momento da telegráfica.

### Formas

#### Linha
Linha inteira que contém a coordenada alvo.

#### Coluna
Coluna inteira que contém a coordenada alvo.

#### Diagonal
Diagonal através da coordenada alvo. Um Kaiju pode usar /, barra invertida, ou ambas no especial.

#### Cruz
Centro + células ortogonais imediatamente adjacentes.

Exemplo centro (3,3):
- (3,3)
- (2,3)
- (4,3)
- (3,2)
- (3,4)

#### 2×2
Quadrante de quatro células ancorado na posição telegráfica. O padrão exato fica desenhado no grid antes da confirmação.

#### 3×3
Quadrado centrado na coordenada alvo e **recortado pelos limites do tabuleiro**.

Exemplo em (4,4):
- (3,3), (3,4), (4,3), (4,4)

No centro pode atingir 9 das 16 células. Por isso 3×3 é tratado como ataque especial carregado.

## Ataques normais e especiais

Ataque normal:
- é anunciado no início do turno;
- resolve após a confirmação;
- Descarga pode cancelá-lo.

Ataque especial:
- é anunciado com **um turno completo de antecedência**;
- mostra contador CARREGANDO 1;
- a área fica marcada desde a preparação;
- não pode ser cancelado pela Descarga;
- pode ser evitado por movimentação, reconfiguração do grid ou proteção direta de tile.

A força do especial vem da geometria, não de números maiores de dano.

## Dano

- Ataque em bloco: destrói o bloco, salvo proteção.
- Ataque na célula do Mech: Reator -2.
- O Reator recebe dano no máximo uma vez por intenção.
- Vida do Reator persiste dentro de uma campanha curta.

## Selo / trava de tile

Habilidade avançada de Kaiju.

Regras:
1. Só pode escolher uma célula que continha um bloco no momento da telegráfica.
2. Mira o maior bloco permitido pela regra do Kaiju.
3. O especial é avisado um turno antes.
4. Na resolução, o bloco permanece visível, mas vira um **bloco selado**.
5. Bloco selado não se move, não funde e funciona como parede.
6. O selo guarda o valor original como dificuldade. Ex.: 8 🔒.
7. Para quebrar o selo, o jogador precisa produzir **qualquer fusão cujo resultado seja maior ou igual ao valor do selo**.
8. Ao quebrar, o bloco original permanece na casa e volta a funcionar normalmente.
9. Se houver múltiplos selos no futuro, a primeira versão libera o selo mais antigo compatível.

Isso cria uma dívida topológica sem apagar silenciosamente o progresso do jogador.

## Vitória e derrota

Objetivos são verificados **depois da resolução do Kaiju**. Não basta montar a condição; é preciso assegurá-la.

Derrota:
- Reator chega a 0;
- limite de turnos termina sem objetivo;
- estado de grid sem qualquer deslize possível e sem reação capaz de criar um deslize.

Ao perder:
- TENTAR NOVAMENTE mantém a build;
- ALTERAR BUILD volta à tela de preparação da mesma missão.

## Briefing de missão

Antes do primeiro turno, sempre mostrar:

### Kaiju
- retrato/nome;
- regra de alvo;
- ataque normal;
- especial;
- frequência/carregamento;
- qualquer regra excepcional.

### Objetivo
Uma única condição principal, visual.

### Limite
Número de turnos disponível.

### Build
O jogador escolhe seu Mech/peças **depois** de conhecer Kaiju e objetivo.

Isso transforma a escolha de build em resposta estratégica, não em adivinhação.

## Mech modular

O Mech é montado por peças. A arte deve refletir a mecânica equipada.

### Slots

#### Cabeça — informação
Sempre passiva. Não consome reação.

#### Braços — manipulação
Oferecem uma reação ativa.

#### Pernas — movimentação
Definem a reação de movimento.

#### Tronco — chassis
Define identidade visual e, em conteúdo avançado, uma regra estrutural simples.

No combate existe **um único orçamento de reação**. Mesmo que braços e pernas ofereçam ações diferentes, o jogador usa no máximo uma por turno.

## Módulos iniciais

### Cabeças

**Óptica Base**
- mostra somente valor do próximo bloco.

**Preditor de Queda**
- mostra valor + casa em que o próximo bloco nascerá.

**Scanner de Carga**
- mostra especiais do Kaiju um turno antes do normal.

**Analisador de Prioridade**
- em empate de maior bloco, mostra explicitamente qual será considerado alvo.

### Braços

**Descarga**
- consome um bloco adjacente ao Mech;
- cancela a intenção normal daquele turno;
- não cancela especiais carregados.
- sem cooldown: o custo é perder o tile.

**Âncora Criogênica**
- escolhe um bloco;
- até a resolução, ele não se move e funciona como parede;
- um bloco igual pode colidir com ele e fundir na sua posição;
- a fusão permanece naquela célula;
- gelo termina após a resolução do turno.

**Campo Aegis**
- protege um bloco contra uma resolução de ataque;
- o bloco pode se mover; a proteção acompanha o bloco;
- se fundir, o resultado herda a proteção;
- após proteger ou ao fim do turno, o campo some;
- entra em recarga por um turno após uso.

**Repulsor**
- move um bloco ortogonalmente uma casa para uma célula vazia;
- não funde.

**Permutador**
- troca a posição de dois blocos ortogonalmente adjacentes;
- ambos preservam valor e estados;
- habilidade avançada.

### Pernas

**Passo Padrão**
- Mech move uma casa ortogonal vazia.

**Pernas Vetoriais**
- uma casa ortogonal ou diagonal vazia.

**Strider**
- até duas casas em linha reta, sem atravessar blocos/obstáculos.

**Transpositor**
- troca de posição com um bloco ortogonalmente adjacente.

**Âncora Pesada**
- Mech não se move.
- só entra quando houver uma contrapartida clara no chassis.

## Filosofia de balanceamento de módulos

Módulos não dão +20%.
Eles mudam **regras espaciais**.

Pergunta de qualidade:
> Esta peça permite ao jogador resolver um problema de uma forma que a build anterior não conseguia?

Se a resposta for apenas “faz o mesmo com número maior”, não é um bom módulo.

## Progressão

Sem chips e sem loja no primeiro escopo.

Conteúdo é liberado ao concluir missões:
- novos braços;
- novas pernas;
- novas cabeças;
- novos chassis;
- novos Kaijus;
- novos tipos de objetivo.

Nenhuma melhoria permanente de dano ou HP.

A progressão aumenta o vocabulário do jogador, não sua força bruta.

## Montagem visual do Mech

O sprite final é composto por camadas:
1. pernas;
2. tronco;
3. braços;
4. cabeça;
5. FX/acento.

Exemplos:
- Strider => pernas altas/finas;
- Vetorial => juntas diagonais/propulsores laterais;
- Transpositor => pernas com anéis/teleporte;
- Cryo => braço com reservatório azul;
- Aegis => braço com emissor de escudo;
- Descarga => canhão/condutor pesado;
- Preditor => cabeça com antena/sensor;
- Scanner => visor ampliado.

Assim o jogador reconhece a build sem abrir menu.

## Escopo recomendado para o próximo protótipo

Vertical slice seguinte:
- Kaiju externo;
- objetivo “assegure 32”;
- Artilheiro de linha;
- 1 especial 3×3 carregado;
- Mech modular com Passo Padrão, Descarga, Âncora Criogênica, Campo Aegis e Preditor de Queda;
- briefing pré-missão;
- retry / alterar build;
- undo antes de confirmar.

Só depois validar:
- Perseguidor;
- Devastador;
- selo de tile;
- sequência 2–4–8;
- múltiplos chassis.
