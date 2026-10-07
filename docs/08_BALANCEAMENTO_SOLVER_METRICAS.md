# 08 - Balanceamento, Solver e Métricas

## Objetivo

Balancear LIMIAR não significa fazer todas as ações valerem o mesmo.

Significa impedir que uma política simples domine estados variados.

## Agentes heurísticos

Criar bots propositalmente estreitos:

### EXPANSIONISTA

Maximiza Vanguarda e distância.

### URBANO

Maximiza promoções.

### ARQUEÓLOGO

Prioriza Ruínas.

### NEGADOR

Prioriza retirar valor futuro do rival.

### FLEX

Maximiza número/qualidade de opções futuras.

### HÍBRIDO

Avalia Prestígio esperado sem preferência fixa.

Rodar milhares de seeds.

Se um agente estreito vence consistentemente o HÍBRIDO, existe risco de estratégia dominante.

## Métrica principal: sensibilidade contextual

Partir do mesmo estado S.

Alterar apenas uma variável:

- Doutrina;
- Mandato atual;
- posição de uma Ruína;
- ação anterior do rival;
- rodada restante.

Recalcular a melhor jogada.

Queremos que a ação ótima mude frequentemente quando uma condição material muda, mas permaneça estável diante de detalhes irrelevantes.

Isso mede profundidade melhor que número de sistemas.

## Dominância de política

Para cada estado amostrado, classificar a melhor ação por motivação primária:

- expandir;
- desenvolver;
- capturar objetivo;
- negar;
- preparar futuro.

Nenhuma categoria deve explicar a maioria esmagadora dos melhores movimentos em todo o corpus.

## Métricas alvo iniciais

Hipóteses para playtest:

- vantagem do primeiro jogador entre 48% e 55%;
- nenhuma Doutrina acima de aproximadamente 55% de win rate ajustado por contexto;
- nenhuma Doutrina escolhida acima de 70% quando oferecida em estados diversos;
- ao menos 25% das partidas com troca de titular de Mandato;
- ao menos 20% das boas jogadas com baixo ganho imediato de Renome;
- duração mediana 5 a 8 min;
- jogador novo entende a ação principal em menos de 60 s;
- após derrota, maioria consegue apontar uma decisão alternativa concreta.

Os números são instrumentos, não dogmas.

## Solver

Como cada jogador possui apenas 7 ações, versões reduzidas podem ser resolvidas exaustivamente.

Usos:

- verificar seeds injustas;
- detectar vitórias forçadas muito cedo;
- medir valor real de Doutrinas;
- encontrar regiões universalmente dominantes;
- testar compensação de iniciativa;
- comparar regras de empate de Mandato.

O solver não deve mostrar a solução ao jogador.

## Regret clarity

Após uma partida, registrar internamente:

- momento de maior swing de Prestígio;
- oportunidades negadas;
- Mandatos perdidos;
- jogadas cujo valor ótimo divergia muito da escolhida.

A interface pós-jogo pode futuramente mostrar uma ou duas viradas, nunca uma análise que transforme o jogo em planilha.

## Sinal de sistema ruim

Se o jogador melhora principalmente por memorizar tier lists de Doutrinas, e não por ler o mapa e o rival, o meta tomou o lugar da estratégia.
