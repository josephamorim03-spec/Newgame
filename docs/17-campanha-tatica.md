# 17 — Campanha tática (regras canônicas)

Este documento descreve a versão jogável atual. Os documentos anteriores preservam a evolução do projeto; em caso de conflito, este e `game-core.js` prevalecem.

## Princípio

O 2048 é a arma e também o quebra-cabeça. O Kaiju aparece de frente, fora da grade 4×4, anuncia seu padrão e observa a jogada. O robô ocupa uma casa da grade, serve de barreira física para os blocos e aparece em destaque com PV e ações abaixo dela. O jogador vê a consequência exata antes de confirmar; nada nasce numa casa reservada.

## Início de missão e progressão

Antes de cada tentativa, o briefing apresenta o Kaiju, a mira, o ataque comum, o especial, a meta, o limite e o desafio extra. Escolhe-se um chassis, cabeça, braço e perna disponíveis. Uma fase concluída libera a seguinte; cada vitória conta uma vez para desbloqueios. Derrota oferece tentar de novo ou trocar a build. O progresso da campanha fica no armazenamento local do navegador.

| Vitória já obtida | Peça liberada |
| --- | --- |
| 0 | Atlas (10 PV), Óptica, Descarga, Passo |
| 1 | Cryo |
| 2 | Preditor, Vetorial |
| 3 | Flux (8 PV), Aegis |
| 4 | Scanner, Strider |
| 5 | Permutador |
| 6 | Transpositor |

Flux repara 1 PV na primeira fusão de 16 ou mais de cada turno, até seu máximo. Óptica mostra área e consequência; Preditor acrescenta o próximo padrão; Scanner mostra a maior fusão de cada direção.

## Turno

1. O Kaiju escolhe um alvo no começo do turno: maior bloco (empate pela primeira casa em ordem de leitura) ou robô. A forma e as casas da área ficam travadas; uma fuga ou fusão pode mudar quem será atingido dentro dela, nunca mover a área escondida.
2. Faça exatamente um deslize **que altere a grade**. Blocos iguais fundem uma vez por deslize, como no 2048. Robô, bloco selado e bloco ancorado dividem os corredores.
3. Use até uma reação de braço **ou** perna, antes ou depois do deslize. Cryo só pode ocorrer antes. A ação sem alvo legal não é consumida. Desfazer restaura o início do turno antes de confirmar.
4. Ao confirmar, resolve-se o ataque anunciado ou seu preparo; depois checam-se derrota e vitória, nessa ordem. A meta só vale se ainda estiver presente após a resolução.
5. Se continuar, nasce o valor anunciado (2 ou 4) numa casa vazia diferente da do robô. A casa só é sorteada nesse momento; se a grade estiver cheia, o valor espera uma vaga. Começa o próximo turno.

Ataque comum tenta destruir o maior bloco da área (a cruz tenta até dois, em ordem decrescente). Um especial de área tenta atingir todos os blocos da área. Bloco protegido ou selado absorve o golpe sem ser removido; o ataque não troca automaticamente para outro alvo. O robô sofre 1 PV em área comum e 2 PV em especial; o selo não causa dano direto. Descarga remove um bloco adjacente e cancela apenas ataque comum, nunca especial. Quando o Kaiju **prepara** um especial, não ataca nesse turno; a área anunciada é a do turno seguinte. A proteção Aegis acompanha o bloco ao deslizar e a fusão resultante, e expira após a resolução; fica indisponível durante o turno seguinte ao uso.

O jogo termina em derrota se o robô chegar a 0 PV, expirar o limite sem cumprir a meta, ou não houver deslize possível nem depois de alguma reação legal. Sem carta, energia, relíquia ou casa futura de spawn no tabuleiro.

## Peças do robô

| Braço | Efeito |
| --- | --- |
| Descarga | Remove um bloco adjacente e cancela ataque comum. |
| Cryo | Ancora um bloco adjacente por um turno; ele não se desloca, mas aceita uma fusão igual na própria casa. |
| Aegis | Protege um bloco adjacente na resolução atual; acompanha movimento e fusão. Recarga de um turno. |
| Permutador | Troca um bloco adjacente ao robô com outro bloco adjacente ao primeiro. |

| Perna | Efeito |
| --- | --- |
| Passo | Move uma casa ortogonal vazia. |
| Vetorial | Move uma ou duas casas em linha reta sem atravessar bloco. |
| Strider | Move uma casa vazia inclusive na diagonal. |
| Transpositor | Troca o robô com um bloco ortogonal adjacente. |

## Kaijus e formas

| Kaiju | Mira | Padrão |
| --- | --- | --- |
| Artilheiro | Maior bloco | Linha horizontal. |
| Perfurador | Maior bloco | Coluna. |
| Ceifador | Maior bloco | Diagonais alternadas; prepara X completo. |
| Devastador | Maior bloco | Cruz de cinco casas; prepara área 3×3. |
| Perseguidor | Robô | Área 2×2 que contém o robô ao anunciar. |
| Carcereiro | Maior bloco | Alvo único/coluna; prepara selo. |
| Arquiteto | Maior bloco ou robô, conforme aviso | Ciclo anunciado de linha, coluna, cruz, 3×3 e selo. |

Áreas nas bordas são recortadas à grade. O X usa as duas diagonais que atravessam a casa marcada. O selo só prende um bloco que já estava na casa marcada quando o ataque foi anunciado; se ele sair, o selo falha. Um bloco selado fica imóvel e imune. Qualquer fusão que produza valor **igual ou maior** que o valor marcado libera o selo, mesmo em outra casa. Nunca se sela uma casa antes vazia.

## Fases

| # | Fase | Meta obrigatória | Limite | Extra |
| --- | --- | --- | --- | --- |
| 1 | Subestação | Preservar 32+ | 16 | Terminar em até 8 turnos |
| 2 | Coluna Zero | Preservar pelo menos quatro blocos 4 | 15 | Terminar com 7+ PV |
| 3 | Fio da Navalha | Alinhar 2–4–8 (ou inverso) em linha/coluna | 16 | Terminar em até 9 turnos |
| 4 | Zona de Impacto | Preservar 64+ | 22 | Não usar Descarga |
| 5 | Caçada | Preservar pelo menos dois blocos 16 | 19 | Terminar com 6+ PV |
| 6 | Cativeiro | Alinhar 4–8–16 (ou inverso) em linha/coluna | 21 | Terminar em até 12 turnos |
| 7 | Núcleo Final | Preservar 64+ | 24 | Terminar com 6+ PV |

Os extras são opcionais: dão uma marca própria no mapa, mas não bloqueiam a próxima fase.

## Interface, arte e som

O layout é vertical e rolável em mobile: ameaça no topo, meta/turno, grade 4×4, depois robô/PV/ações. Swipe exige uma direção dominante; toque curto ou diagonal ambíguo não gasta o deslize. Todos os comandos também têm botão. Ameaça, alvo efetivo, proteção/âncora/selo e área em preparo têm marcas diferentes; o texto prevê blocos perdidos e PV antes da confirmação. Arte em SVG com bordas pixeladas permite escala nítida; o robô é montado em camadas visuais ligadas às peças da build. Sons são sintetizados localmente via Web Audio, têm alternância de mudo e não dependem de rede. Movimento reduzido do sistema desativa animações fortes.

## Verificação

`node --test tests/*.test.js` cobre fusão, geometria, reação, escudo, selo, spawn e prioridades de fim de turno. A verificação visual deve incluir 320×568, 390×844 e desktop, briefing, turno, resultado, som desligado e ausência de rolagem horizontal.
