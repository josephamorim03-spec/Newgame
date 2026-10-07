# 02 - Mapa, Território e Desenvolvimento

## Princípio

O mapa é simultaneamente:

- tabuleiro;
- economia;
- mercado compartilhado;
- memória das decisões;
- fonte de conflito.

Não existe uma camada econômica separada para justificar o mapa.

## Tamanho

Hipótese MVP: aproximadamente **29 regiões hexagonais** em uma forma vertical compacta adequada à tela em retrato.

O número exato deve ser calibrado para produzir primeiro contato entre fronteiras por volta das rodadas 3 a 5 sem obrigar um único corredor.

## Elementos do mapa

O MVP precisa apenas de:

- Capital A;
- Capital B;
- regiões comuns;
- 5 Ruínas;
- 2 Marcos;
- geografia que produza gargalos e alternativas.

Biomas, rios, montanhas e efeitos locais ficam fora do primeiro teste. Eles só entram se adicionarem decisões que o mapa atual não consegue produzir.

## Território

Uma região incorporada passa a pertencer ao jogador permanentemente no MVP.

Isso cria:

- corrida;
- bloqueio;
- escassez;
- rotas exclusivas;
- custo de oportunidade irreversível.

Captura direta pode ser testada depois, mas não deve ser necessária para a competição funcionar.

## Desenvolvimento automático

Toda região comum controlada começa como **Posto**.

Promoções são consequência da geometria, não de gasto de recursos.

Hipótese inicial:

- Posto -> Vila quando possui pelo menos 3 vizinhos controlados pelo mesmo jogador;
- Vila -> Cidade quando possui pelo menos 5 vizinhos controlados pelo mesmo jogador.

A Capital conta como vizinho amigo, mas não pontua como Vila ou Cidade.

Promoções são permanentes.

## Por que isso existe

O sistema deve criar um conflito natural:

- expansão longa melhora Vanguarda;
- expansão compacta cria desenvolvimento;
- Ruínas puxam o jogador para posições específicas;
- Marcos criam corrida;
- o rival ocupa espaços que poderiam completar seu padrão.

Não é necessário impor penalidades artificiais para fazer estratégias competirem.

## Cascatas

Uma única incorporação pode promover mais de uma região.

Exemplo:

~~~
antes                 depois

  A                      A
 A x A       ->         V V V
  A                      A
~~~

O novo território x completa vizinhanças suficientes para promover regiões adjacentes.

Isso é desejável: uma ação simples pode produzir uma reação visual forte e compreensível.

## Valor posicional sobreposto

O mesmo hexágono pode ser simultaneamente:

- a extensão máxima de Vanguarda;
- o terceiro vizinho necessário para criar uma Vila;
- a passagem para uma Ruína;
- um bloqueio de acesso do rival;
- uma região importante para uma Doutrina;
- a única casa que preserva duas opções futuras.

Esse valor sobreposto é o principal gerador de profundidade.

## Frontline

A fronteira não é uma entidade separada. É o conjunto de regiões neutras adjacentes ao território atual.

Expandir modifica imediatamente a próxima fronteira.

A interface deve tornar claro que uma aquisição também compra **opções futuras**.

## Geografia saudável

Um mapa bom possui:

- ao menos dois caminhos plausíveis para o centro;
- nenhuma região central que seja universalmente dominante;
- Ruínas distribuídas de forma a criar rotas diferentes;
- Marcos suficientemente valiosos para disputar, mas não obrigatórios;
- oportunidades de expansão longa e de compactação;
- gargalos com contornos possíveis.

Um mapa ruim é aquele em que o primeiro a ocupar uma única região determina a partida inteira.
