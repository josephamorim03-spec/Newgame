# 07 - Seeds, Mapas e Conteúdo

## Seeds como parte do jogo

Toda partida é reproduzível por seed.

A seed determina:

- topologia do mapa;
- posições de Ruínas;
- posições de Marcos;
- iniciativa;
- ordem dos Conselhos/Doutrinas se aplicável.

Nenhuma rolagem escondida deve acontecer durante a resolução de uma jogada.

## Geração de mapa

Procedural não significa aleatório sem restrição.

O gerador deve produzir um **problema estratégico válido**.

### Restrições iniciais

- Capitais em extremos opostos;
- caminhos múltiplos entre os lados;
- pelo menos dois acessos relevantes ao centro;
- nenhum Marco trivialmente melhor para o primeiro jogador;
- Ruínas distribuídas entre centro e flancos;
- oportunidades suficientes para cluster urbano em ambos os lados;
- pelo menos um gargalo contestável com rota alternativa;
- distância total semelhante das Capitais aos principais objetivos.

## Validação automática

Toda seed gerada deve ser analisada antes de ser aceita.

Checar:

- conectividade;
- simetria aproximada de acesso, não necessariamente visual;
- número de regiões alcançáveis em N turnos;
- distância a Ruínas e Marcos;
- centralidade dos gargalos;
- potencial mínimo de Vila/Cidade para ambos;
- ausência de vitória quase forçada por iniciativa.

Seeds ruins são descartadas.

## Conteúdo pós-MVP

Só depois do núcleo validado:

### Novos Mandatos

Exemplos:

- Monumentalidade;
- Diversidade;
- Fronteira;
- Rede Cultural.

A partida continua usando apenas três Mandatos.

### Características de terreno

Podem existir depois:

- rio;
- floresta;
- planalto.

Devem alterar decisão espacial sem criar uma economia paralela.

### Novas Doutrinas

Pool cresce devagar e por função, não por raridade.

### Mapas autorais

Além de seeds procedurais, mapas desenhados manualmente podem funcionar como desafios ou referência de balanceamento.

## Desafios de seed

Uma seed compartilhável é um excelente formato porque preserva o problema estratégico.

Modos futuros:

- desafiar amigo na mesma seed;
- ranking de Renome por seed;
- replay de lado invertido;
- melhor de duas partidas trocando as Capitais.

Não transformar isso em daily/FOMO obrigatório.
