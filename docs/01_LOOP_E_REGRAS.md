# 01 - Loop e Regras

## Unidade atômica

No turno do jogador:

1. o mapa destaca as regiões neutras adjacentes ao seu território;
2. o jogador toca ou arrasta até uma região;
3. um preview mostra consequências imediatas;
4. o jogador confirma;
5. a região é incorporada;
6. o desenvolvimento geométrico é recalculado;
7. Mandatos, Prestígio, Renome e Doutrinas são resolvidos;
8. o turno passa ao adversário.

Não existe botão de atacar, produzir, coletar ou encerrar turno.

## Estrutura da partida

Hipótese MVP:

- 2 jogadores;
- 7 rodadas;
- cada rodada contém uma ação territorial de cada jogador;
- 14 incorporações totais;
- mapa inicial totalmente visível;
- nenhuma captura direta de território no MVP;
- regiões ocupadas permanecem ocupadas.

O primeiro jogador é definido pela seed. Compensações de iniciativa serão testadas, não presumidas.

## Jogada válida

Uma região neutra é válida quando compartilha pelo menos uma borda com qualquer região do jogador.

Exceções só podem existir através de Doutrinas explicitamente legíveis.

## Resolução

A ordem é fixa:

1. incorporar região;
2. resolver característica local;
3. promover Postos/Vilas/Cidades afetados;
4. recalcular métricas dos Mandatos;
5. transferir Mandatos se necessário;
6. resolver efeitos de Doutrina;
7. calcular Renome;
8. verificar fim da partida.

Efeitos não devem disparar em ordem arbitrária. A UI deve mostrar a mesma sequência.

## Conselho de Doutrinas

Após as rodadas 2 e 4 acontece um Conselho curto.

Hipótese inicial:

- aparecem 3 Doutrinas públicas;
- cada jogador escolhe uma;
- a escolha é visível;
- a Doutrina escolhida deixa de estar disponível para o outro naquele Conselho;
- em empate de Prestígio, quem atuou em segundo na rodada escolhe primeiro;
- fora do empate, o jogador atrás em Prestígio escolhe primeiro;
- cada jogador termina a partida com no máximo 2 Doutrinas.

O Conselho é uma exceção deliberada à regra de uma ação por turno porque cria escassez compartilhada e revela intenção estratégica.

## Informação

Tudo que pode mudar a decisão atual deve estar visível:

- territórios de ambos;
- níveis de desenvolvimento;
- Ruínas e Marcos;
- Mandatos e seus líderes;
- Doutrinas dos dois jogadores;
- número de rodadas restantes;
- preview da consequência imediata da região selecionada.

Não há porcentagens escondidas de sucesso.

## Empates locais

Para Mandatos:

- só existe titular quando um jogador está estritamente à frente;
- empate torna o Mandato neutro;
- o Prestígio daquele Mandato deixa temporariamente ambos.

Essa regra torna ultrapassagem e defesa mais interessantes do que a retenção automática pelo incumbente.

## Fim

A partida termina após a última ação da rodada 7.

Vence quem possui mais Prestígio no estado final.

Desempates, nesta ordem:

1. Renome;
2. número total de Cidades;
3. número de Ruínas;
4. se ainda igual, empate legítimo.

Vitória antecipada militar não faz parte do MVP. Se os testes mostrarem que estratégias econômicas conseguem ignorar demais o oponente, uma condição de Pressão/Dominação será prototipada separadamente, não adicionada por reflexo.
