# 05 - Competição, Counterplay e IA

## Competição sem combate convencional

A agressão em LIMIAR acontece por cinco mecanismos:

1. **corrida**: chegar primeiro a Ruína ou Marco;
2. **negação**: ocupar uma região que o rival desejava;
3. **bloqueio**: alterar a fronteira possível do rival;
4. **superação**: roubar um Mandato;
5. **sinalização**: Doutrinas públicas revelam intenções que podem ser contestadas.

Nenhum deles requer HP.

## A pergunta estratégica

Uma região não deve ser avaliada apenas como:

> quanto ela vale para mim?

Também:

> quanto ela vale para ele se eu deixar?

Essa é a principal diferença entre um puzzle espacial e um jogo competitivo.

## Counterplay obrigatório

Toda rota forte precisa ter resposta plausível.

### Contra Vanguarda

- ocupar gargalos;
- forçar desvios;
- tomar Marcos em sua rota;
- ganhar Urbanização enquanto o rival gasta ações em expansão;
- usar Doutrinas que valorizem contato/fronteira.

### Contra Urbanização

- disputar regiões que completam clusters;
- roubar Sabedoria e Marcos enquanto ele compacta;
- expandir para reduzir futuras opções centrais;
- usar Mandatos temporariamente neutros para diminuir seu Prestígio.

### Contra Sabedoria

- antecipar Ruínas de alta centralidade;
- forçar o rival a se esticar demais;
- usar a própria posição das Ruínas para construir Vanguarda;
- negar rotas de conexão.

## IA

O primeiro adversário deve jogar pelas mesmas regras e enxergar a mesma informação.

Nada de bônus ocultos, recursos extras ou teletransporte.

### Avaliação candidata

Para cada região válida:

~~~
valor =
  ganho de Prestígio imediato
+ mudança esperada nos Mandatos
+ desenvolvimento criado
+ valor de Ruína/Marco
+ opções futuras abertas
+ sinergia de Doutrinas
+ negação ao jogador
- vulnerabilidade criada
- perda de flexibilidade
~~~

O peso não deve ser fixo em todos os estados. Perto do fim, Prestígio e negação ganham importância.

## Busca

Como cada turno possui poucas regiões válidas e apenas 7 ações por jogador, o estado é pequeno o bastante para:

- heurística rápida no protótipo;
- minimax de 2 a 4 plies posteriormente;
- solver completo para cenários pequenos e validação offline.

A IA não precisa fingir ser humana. Precisa gerar decisões que obriguem o jogador a reconsiderar o plano.

## Dificuldade

A dificuldade ideal vem de profundidade de busca e qualidade de avaliação.

Não aumentar:

- Prestígio recebido;
- número de ações;
- efeitos de Doutrina;
- informação disponível.

## Intenção visível para onboarding

No modo tutorial/iniciante, a interface pode indicar até duas regiões de **interesse provável do rival**.

Isso não revela a jogada escolhida. Ensina o jogador a ler ameaça e valor de negação.

Deve poder ser removido em dificuldades maiores.

## Hot-seat

O MVP deve permitir hot-seat desde cedo.

Se o jogo funciona apenas contra uma IA que cria tensão artificial por heurísticas, ainda não validamos a competição do sistema.
